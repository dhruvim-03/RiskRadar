import os
import sys
import uuid
import logging
import threading
from datetime import datetime
from typing import Dict, Any

from fastapi import FastAPI, Header, HTTPException, BackgroundTasks, status
from fastapi.middleware.cors import CORSMiddleware

from .schemas import ScoreRequest, ScoreResponse, TrainResponse, ModelInfoResponse, ShapFeatureContribution
from .feature_engineering import build_feature_vector
from .model_loader import model_manager

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("ml_service")

INTERNAL_API_KEY = os.getenv("INTERNAL_API_KEY", "fraud-detection-internal-key-2026")
training_jobs: Dict[str, Dict[str, Any]] = {}

app = FastAPI(
    title="Fraud Detection ML Microservice",
    description="Inference, SHAP Explainability & Retraining Service",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def verify_internal_key(x_internal_api_key: str = Header(None)):
    """Verifies that requests originate from Spring Boot backend."""
    if INTERNAL_API_KEY and x_internal_api_key and x_internal_api_key != INTERNAL_API_KEY:
        logger.warning(f"Unauthorized request with invalid API key: {x_internal_api_key}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing X-Internal-Api-Key"
        )

@app.get("/health")
def health_check():
    return {"status": "UP", "active_model": model_manager.active_version}

@app.post("/score", response_model=ScoreResponse)
def score_transaction(request: ScoreRequest, x_internal_api_key: str = Header(None)):
    verify_internal_key(x_internal_api_key)
    logger.info(f"Received scoring request for account: {request.account_id}, amount: {request.amount}")

    try:
        # Build 34-feature vector
        feat_df = build_feature_vector(
            amount=request.amount,
            amount_log=request.amount_log,
            hour_of_day=request.hour_of_day,
            tx_count_last_1h=request.tx_count_last_1h_per_account,
            tx_count_last_24h=request.tx_count_last_24h_per_account,
            avg_amount_last_24h=request.avg_amount_last_24h_per_account,
            time_since_last_tx=request.time_since_last_tx_per_account,
            raw_features=request.raw_features or {}
        )

        prob, risk_tier, shap_top = model_manager.predict_score_and_explain(feat_df)

        response = ScoreResponse(
            fraud_probability=round(prob, 5),
            risk_tier=risk_tier,
            shap_top_features=[ShapFeatureContribution(**f) for f in shap_top],
            model_version=model_manager.active_version
        )
        logger.info(f"Scored transaction: prob={response.fraud_probability}, risk={response.risk_tier}")
        return response

    except Exception as e:
        logger.error(f"Scoring error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Inference error: {str(e)}"
        )

def run_retrain_task(job_id: str):
    """Executes retraining script in background and updates job status."""
    logger.info(f"Background retrain job {job_id} starting...")
    training_jobs[job_id]["status"] = "TRAINING"
    try:
        # Dynamically import and execute train script
        from ..training.train import train_pipeline
        metrics = train_pipeline(output_version=f"v{len(os.listdir(model_manager.models_dir)) + 1}")
        
        training_jobs[job_id]["status"] = "COMPLETED"
        training_jobs[job_id]["metrics"] = metrics
        training_jobs[job_id]["completed_at"] = datetime.utcnow().isoformat()
        
        # Reload newly produced model
        model_manager.load_active_model(metrics["version"])
        logger.info(f"Retrain job {job_id} successfully completed. New active version: {metrics['version']}")
    except Exception as e:
        logger.error(f"Retrain job {job_id} failed: {e}", exc_info=True)
        training_jobs[job_id]["status"] = "FAILED"
        training_jobs[job_id]["error"] = str(e)

@app.post("/train", response_model=TrainResponse, status_code=status.HTTP_202_ACCEPTED)
def trigger_training(background_tasks: BackgroundTasks, x_internal_api_key: str = Header(None)):
    verify_internal_key(x_internal_api_key)
    job_id = f"retrain-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:6]}"
    
    training_jobs[job_id] = {
        "job_id": job_id,
        "status": "STARTED",
        "created_at": datetime.utcnow().isoformat()
    }

    # Execute in background thread so endpoint returns immediately
    thread = threading.Thread(target=run_retrain_task, args=(job_id,), daemon=True)
    thread.start()

    logger.info(f"Retraining triggered with job id: {job_id}")
    return TrainResponse(job_id=job_id, status="STARTED")

@app.get("/train/status/{job_id}")
def get_job_status(job_id: str):
    if job_id not in training_jobs:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
    return training_jobs[job_id]

@app.get("/model/info", response_model=ModelInfoResponse)
def get_model_info():
    info = model_manager.get_info()
    return ModelInfoResponse(**info)
