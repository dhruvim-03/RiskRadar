import os
import sys
import json
import logging
from datetime import datetime
from typing import Dict, Any, Optional

import numpy as np
import pandas as pd
import joblib
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import precision_recall_curve, auc, classification_report, confusion_matrix
import xgboost as xgb
import shap

# Ensure parent directory is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from app.feature_engineering import FEATURE_NAMES, engineer_dataset_features

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("train")

def generate_synthetic_ulb_dataset(n_samples: int = 5000, fraud_rate: float = 0.02) -> pd.DataFrame:
    """
    Generates a realistic ULB Credit Card dataset matching the Time, V1-V28, Amount, Class structure.
    Used for out-of-the-box local training when the 150MB creditcard.csv is not pre-downloaded.
    """
    logger.info(f"Generating synthetic ULB-representative dataset with {n_samples} transactions...")
    np.random.seed(42)

    # Time in seconds spanning 48 hours (0 to 172800)
    time_arr = np.sort(np.random.uniform(0, 172800, size=n_samples))
    
    # Amount log-normally distributed
    amount_arr = np.round(np.random.exponential(scale=85.0, size=n_samples) + 1.0, 2)

    # Class (imbalanced fraud)
    n_fraud = int(n_samples * fraud_rate)
    is_fraud = np.zeros(n_samples, dtype=int)
    fraud_indices = np.random.choice(n_samples, size=n_fraud, replace=False)
    is_fraud[fraud_indices] = 1

    # V1-V28 PCA components
    pca_data = {}
    for i in range(1, 29):
        # Base standard normal
        v = np.random.randn(n_samples)
        # Add correlation with fraud for key components known in ULB (V1, V2, V4, V11, V14)
        if i in [1, 2, 4, 11, 14]:
            multiplier = -2.5 if i in [1, 14] else 2.5
            v[fraud_indices] += multiplier
        pca_data[f"v{i}"] = v

    # Higher amounts on fraud transactions
    amount_arr[fraud_indices] = np.maximum(amount_arr[fraud_indices], np.random.uniform(200.0, 3000.0, size=n_fraud))

    df_dict = {"Time": time_arr, "Amount": amount_arr, "Class": is_fraud}
    df_dict.update(pca_data)
    df = pd.DataFrame(df_dict)
    logger.info(f"Dataset ready. Total: {len(df)}, Fraud: {is_fraud.sum()} ({fraud_rate*100:.1f}%)")
    return df

def train_pipeline(
    csv_path: Optional[str] = None,
    models_dir: str = "./models",
    output_version: str = "v1"
) -> Dict[str, Any]:
    """
    Complete end-to-end training pipeline:
    1. Load / generate data
    2. Engineer leakage-free temporal features
    3. Temporal train/test split (no lookahead bias)
    4. Train baseline Logistic Regression
    5. Train production XGBoost with scale_pos_weight
    6. Fit SHAP TreeExplainer
    7. Evaluate PR-AUC, precision, recall
    8. Serialize model.joblib, shap_explainer.pkl, metadata.json, and reference_distribution.json
    """
    logger.info(f"Starting model training pipeline for version: {output_version}")

    # 1. Load data
    if csv_path and os.path.exists(csv_path):
        logger.info(f"Loading dataset from {csv_path}")
        df = pd.read_csv(csv_path)
    else:
        # Check standard locations
        candidate_paths = [
            "./data/creditcard.csv",
            "../data/creditcard.csv",
            "../../data/creditcard.csv"
        ]
        found_path = next((p for p in candidate_paths if os.path.exists(p)), None)
        if found_path:
            logger.info(f"Found creditcard.csv at {found_path}")
            df = pd.read_csv(found_path)
        else:
            df = generate_synthetic_ulb_dataset(n_samples=5000, fraud_rate=0.03)

    # 2. Engineer features strictly respecting temporal ordering
    logger.info("Engineering leakage-free behavioral and velocity features...")
    featured_df = engineer_dataset_features(df)

    target_col = "Class" if "Class" in featured_df.columns else "is_fraud"
    X = featured_df[FEATURE_NAMES]
    y = featured_df[target_col].values

    # 3. Strict Temporal Train/Test Split (80% train, 20% test based on time)
    split_idx = int(len(featured_df) * 0.8)
    X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
    y_train, y_test = y[:split_idx], y[split_idx:]

    logger.info(f"Temporal Split: Train={len(X_train)} (Fraud={y_train.sum()}), Test={len(X_test)} (Fraud={y_test.sum()})")

    # 4. Baseline Logistic Regression
    logger.info("Fitting baseline Logistic Regression...")
    baseline_lr = LogisticRegression(max_iter=500, random_state=42)
    baseline_lr.fit(X_train.fillna(0), y_train)
    lr_probs = baseline_lr.predict_proba(X_test.fillna(0))[:, 1]
    lr_precision, lr_recall, _ = precision_recall_curve(y_test, lr_probs)
    lr_pr_auc = float(auc(lr_recall, lr_precision))
    logger.info(f"Baseline Logistic Regression PR-AUC: {lr_pr_auc:.4f}")

    # 5. Production XGBoost Classifier
    # scale_pos_weight for imbalance
    neg_count = (y_train == 0).sum()
    pos_count = max(1, (y_train == 1).sum())
    scale_weight = float(neg_count / pos_count)

    logger.info(f"Training XGBoost classifier (scale_pos_weight={scale_weight:.2f})...")
    xgb_model = xgb.XGBClassifier(
        n_estimators=100,
        max_depth=5,
        learning_rate=0.08,
        scale_pos_weight=scale_weight,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=42,
        eval_metric="logloss"
    )
    xgb_model.fit(X_train, y_train)

    # 6. Fit SHAP TreeExplainer
    logger.info("Fitting SHAP TreeExplainer on trained XGBoost model...")
    explainer = shap.TreeExplainer(xgb_model)

    # 7. Evaluation
    test_probs = xgb_model.predict_proba(X_test)[:, 1]
    precisions, recalls, thresholds = precision_recall_curve(y_test, test_probs)
    pr_auc_score = float(auc(recalls, precisions))
    logger.info(f"Production XGBoost PR-AUC: {pr_auc_score:.4f}")

    # Choose operating threshold (e.g. at risk tier cutoff 0.30 or best F1)
    operating_threshold = 0.30
    y_pred = (test_probs >= operating_threshold).astype(int)

    # Compute metrics at threshold
    tp = int(((y_pred == 1) & (y_test == 1)).sum())
    fp = int(((y_pred == 1) & (y_test == 0)).sum())
    fn = int(((y_pred == 0) & (y_test == 1)).sum())
    tn = int(((y_pred == 0) & (y_test == 0)).sum())

    prec_at_th = float(tp / (tp + fp)) if (tp + fp) > 0 else 0.0
    rec_at_th = float(tp / (tp + fn)) if (tp + fn) > 0 else 0.0

    logger.info(f"At threshold {operating_threshold}: Precision={prec_at_th:.4f}, Recall={rec_at_th:.4f}")

    # 8. Compute reference feature distributions (deciles) for PSI drift monitoring
    logger.info("Computing baseline feature deciles for drift monitoring...")
    reference_distribution = {}
    for col in FEATURE_NAMES:
        col_vals = X_train[col].dropna().values
        if len(col_vals) > 0:
            deciles = np.percentile(col_vals, np.linspace(10, 90, 9)).tolist()
            reference_distribution[col] = deciles

    # 9. Serialization
    target_dir = os.path.join(models_dir, output_version)
    os.makedirs(target_dir, exist_ok=True)

    model_path = os.path.join(target_dir, "model.joblib")
    explainer_path = os.path.join(target_dir, "shap_explainer.pkl")
    meta_path = os.path.join(target_dir, "metadata.json")
    dist_path = os.path.join(target_dir, "reference_distribution.json")

    joblib.dump(xgb_model, model_path)
    joblib.dump(explainer, explainer_path)

    metadata = {
        "version": output_version,
        "trained_at": datetime.utcnow().isoformat(),
        "pr_auc": round(pr_auc_score, 5),
        "precision": round(prec_at_th, 5),
        "recall": round(rec_at_th, 5),
        "baseline_lr_pr_auc": round(lr_pr_auc, 5),
        "operating_threshold": operating_threshold,
        "n_train": len(X_train),
        "n_test": len(X_test),
        "features": FEATURE_NAMES,
        "is_active": True
    }

    with open(meta_path, "w") as f:
        json.dump(metadata, f, indent=2)

    with open(dist_path, "w") as f:
        json.dump(reference_distribution, f, indent=2)

    logger.info(f"Artifacts successfully serialized to {target_dir}")
    return metadata

if __name__ == "__main__":
    train_pipeline(output_version="v1")
