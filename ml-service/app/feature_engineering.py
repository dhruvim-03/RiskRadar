import numpy as np
import pandas as pd
from typing import Dict, List, Any

# Ordered list of 34 model features
ENGINEERED_COLUMNS = [
    "amount_log",
    "hour_of_day",
    "tx_count_last_1h_per_account",
    "tx_count_last_24h_per_account",
    "avg_amount_last_24h_per_account",
    "time_since_last_tx_per_account",
]

PCA_COLUMNS = [f"v{i}" for i in range(1, 29)]

FEATURE_NAMES = ENGINEERED_COLUMNS + PCA_COLUMNS

def build_feature_vector(
    amount: float,
    amount_log: float,
    hour_of_day: int,
    tx_count_last_1h: float,
    tx_count_last_24h: float,
    avg_amount_last_24h: float,
    time_since_last_tx: float,
    raw_features: Dict[str, Any]
) -> pd.DataFrame:
    """
    Builds a single-row DataFrame aligned with FEATURE_NAMES for XGBoost and SHAP.
    """
    row: Dict[str, float] = {
        "amount_log": float(amount_log if amount_log is not None else np.log1p(max(0.0, amount))),
        "hour_of_day": float(hour_of_day),
        "tx_count_last_1h_per_account": float(tx_count_last_1h),
        "tx_count_last_24h_per_account": float(tx_count_last_24h),
        "avg_amount_last_24h_per_account": float(avg_amount_last_24h),
        "time_since_last_tx_per_account": float(time_since_last_tx),
    }

    # Extract V1-V28 (handling lowercase and uppercase keys)
    for col in PCA_COLUMNS:
        val = 0.0
        if raw_features:
            upper_col = col.upper()
            if col in raw_features:
                val = float(raw_features[col])
            elif upper_col in raw_features:
                val = float(raw_features[upper_col])
        row[col] = val

    return pd.DataFrame([row], columns=FEATURE_NAMES)

def engineer_dataset_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Engineers behavioral and velocity features on a full dataset.
    CRITICAL: Strict temporal ordering is enforced.
    All rolling and lookback operations use closed='left' or shift(1)
    to strictly guarantee that transaction T never sees data from >= T.
    """
    data = df.copy()

    # Ensure temporal ordering
    if "Time" in data.columns:
        data = data.sort_values("Time").reset_index(drop=True)
    elif "time" in data.columns:
        data = data.sort_values("time").reset_index(drop=True)
    elif "transaction_time" in data.columns:
        data = data.sort_values("transaction_time").reset_index(drop=True)

    # Standardize column names
    time_col = "Time" if "Time" in data.columns else ("time" if "time" in data.columns else "transaction_time")
    amt_col = "Amount" if "Amount" in data.columns else ("amount" if "amount" in data.columns else None)

    if amt_col is not None:
        data["amount_log"] = np.log1p(np.maximum(0.0, data[amt_col].values))
    else:
        data["amount_log"] = 0.0

    # Hour of day (from Time seconds mod 86400 // 3600, or timestamp)
    if pd.api.types.is_numeric_dtype(data[time_col]):
        data["hour_of_day"] = ((data[time_col] % 86400) // 3600).astype(int)
    else:
        dt_series = pd.to_datetime(data[time_col])
        data["hour_of_day"] = dt_series.dt.hour

    # Standardize PCA columns to lowercase v1..v28
    for i in range(1, 29):
        lower_v = f"v{i}"
        upper_v = f"V{i}"
        if upper_v in data.columns and lower_v not in data.columns:
            data[lower_v] = data[upper_v]
        elif lower_v not in data.columns:
            data[lower_v] = 0.0

    # If dataset has no account_id, assign synthetic accounts to simulate velocity features realistically
    if "account_id" not in data.columns:
        # 5,000 synthetic recurring accounts distributed across dataset
        np.random.seed(42)
        data["account_id"] = np.random.choice([f"ACC-{i:05d}" for i in range(1, 5001)], size=len(data))

    # Strict Leakage-Free Velocity Feature Computation:
    # Convert time to datetime / seconds for rolling queries per account
    time_seconds = data[time_col].values if pd.api.types.is_numeric_dtype(data[time_col]) else \
        (pd.to_datetime(data[time_col]).astype("int64") // 10**9).values

    data["_time_sec"] = time_seconds

    # Calculate per-account strict prior metrics
    tx_count_1h = np.zeros(len(data), dtype=np.float32)
    tx_count_24h = np.zeros(len(data), dtype=np.float32)
    avg_amt_24h = np.zeros(len(data), dtype=np.float32)
    time_since_last = np.full(len(data), 86400.0, dtype=np.float32)

    # Group by account and compute rolling metrics using strictly PRIOR rows (shift/strictly less than)
    account_groups = data.groupby("account_id")
    amt_values = data[amt_col].values if amt_col else np.zeros(len(data))

    for _, indices in account_groups.groups.items():
        idx_arr = indices.values
        t_arr = time_seconds[idx_arr]
        a_arr = amt_values[idx_arr]

        # For each index in account group
        for i in range(len(idx_arr)):
            cur_idx = idx_arr[i]
            cur_t = t_arr[i]

            if i == 0:
                # First transaction for this account: 0 prior transactions
                tx_count_1h[cur_idx] = 0.0
                tx_count_24h[cur_idx] = 0.0
                avg_amt_24h[cur_idx] = 0.0
                time_since_last[cur_idx] = 86400.0
            else:
                # Prior transactions only: indices from 0 to i - 1
                prior_t = t_arr[:i]
                prior_a = a_arr[:i]

                # Strictly earlier: (cur_t - 3600 <= t < cur_t)
                mask_1h = (prior_t >= cur_t - 3600) & (prior_t < cur_t)
                tx_count_1h[cur_idx] = np.sum(mask_1h)

                # Strictly earlier: (cur_t - 86400 <= t < cur_t)
                mask_24h = (prior_t >= cur_t - 86400) & (prior_t < cur_t)
                count_24h = np.sum(mask_24h)
                tx_count_24h[cur_idx] = count_24h
                if count_24h > 0:
                    avg_amt_24h[cur_idx] = np.mean(prior_a[mask_24h])
                else:
                    avg_amt_24h[cur_idx] = 0.0

                time_since_last[cur_idx] = max(0.0, float(cur_t - prior_t[-1]))

    data["tx_count_last_1h_per_account"] = tx_count_1h
    data["tx_count_last_24h_per_account"] = tx_count_24h
    data["avg_amount_last_24h_per_account"] = avg_amt_24h
    data["time_since_last_tx_per_account"] = time_since_last

    data.drop(columns=["_time_sec"], inplace=True)
    return data
