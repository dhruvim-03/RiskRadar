import os
import sys
import numpy as np
import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from app.model_loader import model_manager
from training.train import generate_synthetic_ulb_dataset, train_pipeline
from app.feature_engineering import engineer_dataset_features, FEATURE_NAMES
from sklearn.metrics import precision_recall_curve, auc

def test_model_quality_pr_auc_floor():
    """
    Model quality regression test:
    PR-AUC on a held-out test set must stay above a fixed floor (e.g. 0.85).
    Fails CI if a model retrain regresses badly.
    """
    # Ensure active model is loaded
    if model_manager.model is None:
        model_manager.load_active_model()

    # Generate held-out test dataset
    df = generate_synthetic_ulb_dataset(n_samples=1500, fraud_rate=0.04)
    featured_df = engineer_dataset_features(df)

    X_test = featured_df[FEATURE_NAMES]
    y_test = featured_df["Class"].values

    probs = model_manager.model.predict_proba(X_test)[:, 1]
    precision, recall, _ = precision_recall_curve(y_test, probs)
    pr_auc = float(auc(recall, precision))

    print(f"\nHeld-out test set PR-AUC: {pr_auc:.4f}")
    assert pr_auc >= 0.80, f"Model quality regressed below acceptable floor: PR-AUC was {pr_auc:.4f}, expected >= 0.80"
