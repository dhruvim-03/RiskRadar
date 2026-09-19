import os
import sys
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from app.main import app

client = TestClient(app)

def test_score_endpoint_valid_input():
    """Valid input returns a probability in [0,1] and a non-empty SHAP list."""
    payload = {
        "account_id": "ACC-99123",
        "amount": 450.0,
        "amount_log": 6.11,
        "hour_of_day": 15,
        "tx_count_last_1h_per_account": 2.0,
        "tx_count_last_24h_per_account": 5.0,
        "avg_amount_last_24h_per_account": 120.0,
        "time_since_last_tx_per_account": 300.0,
        "raw_features": {
            "v1": -1.5,
            "v2": 2.1,
            "v3": -0.8
        }
    }
    response = client.post("/score", json=payload)
    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"

    data = response.json()
    assert "fraud_probability" in data
    assert 0.0 <= data["fraud_probability"] <= 1.0
    assert data["risk_tier"] in ["LOW", "MEDIUM", "HIGH"]
    assert "shap_top_features" in data
    assert len(data["shap_top_features"]) > 0
    assert "feature" in data["shap_top_features"][0]
    assert "contribution" in data["shap_top_features"][0]
    assert "model_version" in data

def test_score_endpoint_malformed_input():
    """Malformed input returns 422 Unprocessable Entity."""
    # Negative amount violates gt=0 validation
    bad_payload = {
        "account_id": "ACC-99123",
        "amount": -50.0,
        "amount_log": 0.0,
        "hour_of_day": 26, # Invalid hour (> 23)
        "tx_count_last_1h_per_account": -1.0, # Violates ge=0
        "tx_count_last_24h_per_account": 0.0,
        "avg_amount_last_24h_per_account": 0.0,
        "time_since_last_tx_per_account": 0.0
    }
    response = client.post("/score", json=bad_payload)
    assert response.status_code == 422

def test_model_info_endpoint():
    """Model info endpoint returns active version and metrics."""
    response = client.get("/model/info")
    assert response.status_code == 200
    data = response.json()
    assert "version" in data
    assert "pr_auc" in data
    assert "features" in data
