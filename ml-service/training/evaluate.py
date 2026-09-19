import os
import sys
import json
import logging
from typing import Dict, Any
import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import precision_recall_curve, roc_auc_score, auc, confusion_matrix, classification_report

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from app.feature_engineering import FEATURE_NAMES

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("evaluate")

def evaluate_model(
    model_path: str,
    test_df: pd.DataFrame,
    target_col: str = "Class"
) -> Dict[str, Any]:
    """
    Evaluates a saved XGBoost model against test DataFrame.
    """
    logger.info(f"Loading model from {model_path}")
    model = joblib.load(model_path)

    X_test = test_df[FEATURE_NAMES]
    y_test = test_df[target_col].values

    probs = model.predict_proba(X_test)[:, 1]
    precisions, recalls, thresholds = precision_recall_curve(y_test, probs)
    pr_auc_score = float(auc(recalls, precisions))
    roc_auc = float(roc_auc_score(y_test, probs))

    # Evaluate at standard threshold 0.30
    preds = (probs >= 0.30).astype(int)
    cm = confusion_matrix(y_test, preds).tolist()
    report = classification_report(y_test, preds, output_dict=True)

    results = {
        "pr_auc": round(pr_auc_score, 5),
        "roc_auc": round(roc_auc, 5),
        "confusion_matrix": cm,
        "classification_report": report
    }

    logger.info(f"Evaluation results: PR-AUC={pr_auc_score:.4f}, ROC-AUC={roc_auc:.4f}")
    return results
