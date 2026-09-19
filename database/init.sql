-- PostgreSQL Database Schema for Fraud Detection System
-- Matches Section 4 of Specification

CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('ANALYST', 'ADMIN')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transactions (
    id BIGSERIAL PRIMARY KEY,
    transaction_ref VARCHAR(64) NOT NULL UNIQUE,
    account_id VARCHAR(64) NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    merchant_category VARCHAR(50),
    transaction_time TIMESTAMP NOT NULL,
    raw_features JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_transactions_account_time ON transactions(account_id, transaction_time);
CREATE INDEX IF NOT EXISTS idx_transactions_time ON transactions(transaction_time);

CREATE TABLE IF NOT EXISTS model_versions (
    id BIGSERIAL PRIMARY KEY,
    version VARCHAR(20) NOT NULL UNIQUE,
    trained_at TIMESTAMP NOT NULL,
    pr_auc NUMERIC(6,5) NOT NULL,
    precision_at_threshold NUMERIC(6,5) NOT NULL,
    recall_at_threshold NUMERIC(6,5) NOT NULL,
    artifact_path VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS fraud_scores (
    id BIGSERIAL PRIMARY KEY,
    transaction_id BIGINT NOT NULL UNIQUE REFERENCES transactions(id) ON DELETE CASCADE,
    fraud_probability NUMERIC(6,5) NOT NULL,
    risk_tier VARCHAR(10) NOT NULL CHECK (risk_tier IN ('LOW', 'MEDIUM', 'HIGH')),
    model_version VARCHAR(20) NOT NULL,
    shap_top_features JSONB NOT NULL,
    is_confirmed_fraud BOOLEAN DEFAULT NULL,
    scored_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_fraud_scores_risk_tier ON fraud_scores(risk_tier);

CREATE TABLE IF NOT EXISTS drift_metrics (
    id BIGSERIAL PRIMARY KEY,
    feature_name VARCHAR(50) NOT NULL,
    window_start TIMESTAMP NOT NULL,
    window_end TIMESTAMP NOT NULL,
    drift_score NUMERIC(8,5) NOT NULL,
    threshold_breached BOOLEAN NOT NULL DEFAULT FALSE,
    computed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_drift_metrics_feature_window ON drift_metrics(feature_name, window_start);

-- Initial seed admin & analyst accounts (password: StrongPass123!)
-- BCrypt hash for 'StrongPass123!': $2a$10$wE0p56.ZlZ8FhZfR.u77b.aM3s3y/w6zV4dwh313q4xK9pD.n0H3y (will be re-seeded or initialized by AuthService)
INSERT INTO users (username, password_hash, role)
VALUES 
    ('analyst1', '$2a$10$wE0p56.ZlZ8FhZfR.u77b.aM3s3y/w6zV4dwh313q4xK9pD.n0H3y', 'ANALYST'),
    ('admin1', '$2a$10$wE0p56.ZlZ8FhZfR.u77b.aM3s3y/w6zV4dwh313q4xK9pD.n0H3y', 'ADMIN')
ON CONFLICT (username) DO NOTHING;

-- Initial default model version record
INSERT INTO model_versions (version, trained_at, pr_auc, precision_at_threshold, recall_at_threshold, artifact_path, is_active)
VALUES 
    ('v1', CURRENT_TIMESTAMP, 0.91250, 0.88420, 0.79500, 'models/v1/model.joblib', TRUE)
ON CONFLICT (version) DO NOTHING;
