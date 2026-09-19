import os
import sys
import numpy as np
import pandas as pd
import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from app.feature_engineering import engineer_dataset_features, build_feature_vector, FEATURE_NAMES

def test_leakage_prevention_temporal_ordering():
    """
    CRITICAL LEAKAGE-PREVENTION TEST:
    Asserts that features computed for a transaction at timestamp T NEVER
    depend on or utilize transactions occurring at time >= T.
    
    Proof method:
    1. Compute features for a transaction sequence [T0, T1].
    2. Add a future fraudulent/high-volume transaction at T2 (T2 > T1).
    3. Recompute features.
    4. Assert that the engineered features for T0 and T1 remain strictly identical.
    """
    # Create an initial history of 2 transactions for account ACC-001
    initial_data = pd.DataFrame([
        {
            "Time": 1000,
            "Amount": 50.0,
            "account_id": "ACC-001",
            "v1": 0.1, "v2": 0.2, "Class": 0
        },
        {
            "Time": 2000,
            "Amount": 120.0,
            "account_id": "ACC-001",
            "v1": 0.3, "v2": 0.4, "Class": 0
        }
    ])

    # Run feature engineering on baseline
    df_baseline = engineer_dataset_features(initial_data)

    # Note features for transaction at Time = 2000
    t1_count1h_before = df_baseline.loc[1, "tx_count_last_1h_per_account"]
    t1_avgamt_before = df_baseline.loc[1, "avg_amount_last_24h_per_account"]
    t1_time_since_before = df_baseline.loc[1, "time_since_last_tx_per_account"]

    # Now introduce a future transaction at Time = 3000 (after T1) with extreme values
    augmented_data = pd.concat([
        initial_data,
        pd.DataFrame([{
            "Time": 3000,
            "Amount": 99999.0,
            "account_id": "ACC-001",
            "v1": -9.9, "v2": 9.9, "Class": 1
        }])
    ], ignore_index=True)

    df_augmented = engineer_dataset_features(augmented_data)

    # Features for transaction at Time = 2000 in the augmented dataset
    t1_count1h_after = df_augmented.loc[1, "tx_count_last_1h_per_account"]
    t1_avgamt_after = df_augmented.loc[1, "avg_amount_last_24h_per_account"]
    t1_time_since_after = df_augmented.loc[1, "time_since_last_tx_per_account"]

    # The future transaction at Time=3000 MUST NOT alter T1's features
    assert t1_count1h_before == t1_count1h_after == 1.0, "Leakage detected! tx_count_last_1h altered by future data."
    assert t1_avgamt_before == t1_avgamt_after == 50.0, "Leakage detected! avg_amount_last_24h altered by future data."
    assert t1_time_since_before == t1_time_since_after == 1000.0, "Leakage detected! time_since_last_tx altered by future data."

    # T0 (the first transaction) must strictly have 0 prior transactions and 0 past average
    assert df_augmented.loc[0, "tx_count_last_1h_per_account"] == 0.0
    assert df_augmented.loc[0, "avg_amount_last_24h_per_account"] == 0.0

def test_build_feature_vector_structure():
    """Verifies single-row vector matches FEATURE_NAMES structure."""
    vec = build_feature_vector(
        amount=150.0,
        amount_log=5.017,
        hour_of_day=14,
        tx_count_last_1h=2.0,
        tx_count_last_24h=5.0,
        avg_amount_last_24h=80.0,
        time_since_last_tx=350.0,
        raw_features={"v1": -1.2, "v2": 0.5}
    )
    assert isinstance(vec, pd.DataFrame)
    assert list(vec.columns) == FEATURE_NAMES
    assert vec.loc[0, "amount_log"] == 5.017
    assert vec.loc[0, "v1"] == -1.2
    assert vec.loc[0, "v2"] == 0.5
    assert vec.loc[0, "v3"] == 0.0 # defaulted correctly
