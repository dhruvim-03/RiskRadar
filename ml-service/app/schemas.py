from typing import Dict, List, Optional
from pydantic import BaseModel, Field

class ScoreRequest(BaseModel):
    account_id: str = Field(..., description="Account identifier")
    amount: float = Field(..., gt=0, description="Transaction amount (must be positive)")
    amount_log: float = Field(..., description="Natural log of amount + 1")
    hour_of_day: int = Field(..., ge=0, le=23, description="Hour of day (0-23 UTC)")
    tx_count_last_1h_per_account: float = Field(..., ge=0, description="Transaction count in past 1 hour")
    tx_count_last_24h_per_account: float = Field(..., ge=0, description="Transaction count in past 24 hours")
    avg_amount_last_24h_per_account: float = Field(..., ge=0, description="Average amount in past 24 hours")
    time_since_last_tx_per_account: float = Field(..., ge=0, description="Seconds since last transaction")
    raw_features: Optional[Dict[str, float]] = Field(default_factory=dict, description="Raw features including PCA v1-v28")

class ShapFeatureContribution(BaseModel):
    feature: str
    value: float
    contribution: float

class ScoreResponse(BaseModel):
    fraud_probability: float
    risk_tier: str
    shap_top_features: List[ShapFeatureContribution]
    model_version: str

class TrainResponse(BaseModel):
    job_id: str
    status: str

class ModelInfoResponse(BaseModel):
    version: str
    pr_auc: float
    precision: float
    recall: float
    features: List[str]
    trained_at: str
    is_active: bool
