# Real-Time Transaction Fraud Detection System

> A production-grade financial fraud detection platform with real-time scoring, SHAP-based feature explainability, and automated Population Stability Index (PSI) data-drift monitoring.

Built with a **Java 17 / Spring Boot 3** backend, an internal **Python 3.11+ / FastAPI** ML microservice (XGBoost + SHAP TreeExplainer), a **React 18 + TypeScript** fintech dashboard, and a **PostgreSQL 15** relational datastore.

---

## Architecture Overview

The system follows a strict layered architecture where Spring Boot is the single source of truth for business logic, persistence, and authorization, while the Python ML service is an internal-only compute microservice:

```
┌────────────────────────────────┐
│   React 18 + Vite Frontend     │  (Port 5173)
│   (Analyst & Admin Surfaces)   │
└───────────────┬────────────────┘
                │  REST / JSON (JWT Bearer Auth)
                ▼
┌────────────────────────────────┐
│   Spring Boot 3.3 Backend      │  (Port 8080)
│  - Security & Stateless JWT    │
│  - FeatureEngineeringService   │
│  - DriftMonitoringService      │
│  - Spring Data JPA + WebClient │
└───────┬────────────────┬───────┘
        │                │
        │ Internal REST  │ SQL
        ▼                ▼
┌──────────────────┐  ┌──────────────────┐
│ Python ML Svc    │  │ PostgreSQL 15    │
│ (FastAPI :8000)  │  │ (fraud_db :5432) │
│ - XGBoost        │  │ - transactions   │
│ - SHAP Explainer │  │ - fraud_scores   │
│ - Retrain Engine │  │ - drift_metrics  │
└──────────────────┘  │ - model_versions │
                      │ - users          │
                      └──────────────────┘
```

---

## Key Design & Engineering Decisions

### 1. Leakage-Free Temporal Velocity Features
A major point of failure in production fraud systems is **target/data leakage** during feature calculation.
- In `FeatureEngineeringService.java`, rolling aggregation queries strictly enforce `transaction_time < :currentTransactionTime`.
- When calculating 1-hour transaction velocity, 24-hour velocity, 24-hour rolling average amount, and time since last transaction, **the current transaction and any subsequent transactions are strictly excluded**.
- This is verified by `FeatureEngineeringServiceTest.java` and `test_feature_engineering.py` in CI.

### 2. Explainability via SHAP TreeExplainer
Black-box fraud flags are unusable for analysts.
- Every scored transaction is processed through a fitted `shap.TreeExplainer` on the production XGBoost tree structure.
- The top 5 signed feature contributions are returned:
  - **Positive contribution (red)**: Pushes probability towards fraud.
  - **Negative contribution (green)**: Pushes probability towards legitimate.
- Displayed in the UI using an accessible directional split bar chart.

### 3. Population Stability Index (PSI) Drift Monitoring
Data distributions naturally drift over time as consumer behaviors and fraud attack patterns evolve.
- Baseline decile distributions are computed and serialized at model training time (`reference_distribution.json`).
- A periodic scheduled job (`DriftMonitoringService.java`, running via `@Scheduled`) compares recent live feature windows against the baseline:
  $$\text{PSI} = \sum_{i=1}^{10} (A_i - E_i) \times \ln\left(\frac{A_i}{E_i}\right)$$
- If $\text{PSI} > 0.20$, the feature is flagged as `threshold_breached = true`, triggering visual alerts on the Drift Monitoring dashboard.

### 4. Handling Severe Class Imbalance
- Credit card fraud datasets typically have $<0.5\%$ positive class instances.
- The training pipeline (`train.py`) utilizes `scale_pos_weight = count(negative) / count(positive)` in XGBoost.
- Optimization and evaluation are judged strictly on **PR-AUC (Precision-Recall Area Under Curve)** rather than misleading raw Accuracy.

### 5. Role-Based Access Control (RBAC)
Two roles are enforced via stateless JWT and Spring Security `@PreAuthorize`:
- **`ANALYST`**: Reviews real-time transactions, inspects SHAP explanations, monitors drift trends, and records feedback (`is_confirmed_fraud`).
- **`ADMIN`**: Inherits all Analyst capabilities, plus access to the Model Management control room to inspect historical version metrics and trigger background retraining runs.

---

## API Specification

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Create an analyst or admin account |
| `POST` | `/api/auth/login` | Public | Authenticate and obtain JWT bearer token |
| `POST` | `/api/transactions` | Bearer JWT | Ingest transaction, compute features, score in real-time, return SHAP |
| `GET` | `/api/transactions` | Bearer JWT | Filterable, paginated transaction history (`riskTier`, `startDate`, `endDate`, `search`) |
| `GET` | `/api/transactions/{id}` | Bearer JWT | Full transaction detail with score and metadata |
| `GET` | `/api/transactions/{id}/explanation` | Bearer JWT | Top contributing SHAP features |
| `PATCH` | `/api/transactions/{id}/feedback` | Bearer JWT | Record analyst feedback (`isConfirmedFraud`) |
| `GET` | `/api/dashboard/summary` | Bearer JWT | Total counts, flagged rate, score distribution buckets, active model |
| `GET` | `/api/drift/metrics` | Bearer JWT | Historical PSI drift records per feature |
| `POST` | `/api/drift/compute` | Bearer JWT | On-demand trigger to compute latest PSI drift |
| `POST` | `/api/model/retrain` | ADMIN only | Trigger asynchronous model retraining |
| `GET` | `/api/model/versions` | Bearer JWT | List all trained model versions with PR-AUC and thresholds |

---

## Quickstart & Local Deployment

### Option A: Docker Compose (Recommended)

1. Copy environment template:
   ```bash
   cp .env.example .env
   ```

2. Build and launch all containers:
   ```bash
   docker compose up --build
   ```

3. Access services:
   - **Frontend UI**: [http://localhost:5173](http://localhost:5173)
   - **Backend API**: [http://localhost:8080](http://localhost:8080)
   - **ML Service (internal)**: [http://localhost:8000](http://localhost:8000)

4. Default credentials:
   - **Analyst**: `username: analyst1` / `password: StrongPass123!`
   - **Admin**: `username: admin1` / `password: StrongPass123!`

---

### Option B: Running Locally without Docker

#### 1. Start Python ML Microservice
```bash
cd ml-service
python -m pip install -r requirements.txt
python training/train.py   # Produces initial model v1 & SHAP explainer
uvicorn app.main:app --port 8000 --reload
```

#### 2. Start Spring Boot Backend
```bash
cd backend
# Runs with embedded H2 (in Postgres compatibility mode) or external Postgres
mvn spring-boot:run
```

#### 3. Start Frontend Dashboard
```bash
cd frontend
npm install
npm run dev
```

#### 4. Stream Sample Transactions (Demo Simulator)
To generate a stream of realistic legitimate and fraudulent transactions:
```bash
cd ml-service
python training/simulate_transactions.py --count 25 --delay 0.5 --fraud-ratio 0.20
```

---

## Automated Verification & Test Suites

### Backend Tests (JUnit 5 + Mockito + Testcontainers / H2)
Runs unit tests for token validation, leakage-free queries, and full end-to-end integration tests:
```bash
cd backend
mvn test
```
All 9 unit tests and 5 controller integration tests pass with 0 failures:
- `JwtUtilTest`: Token generation, validation, expiry rejection.
- `FeatureEngineeringServiceTest`: Proves $T_{\text{prior}} < T_{\text{current}}$ strict temporal ordering.
- `TransactionServiceTest`: Verifies business logic, risk tier mapping, and persistence.
- `TransactionControllerIT`: Complete contract and security tests (400, 401, 403, 409, 201).

### ML Service Tests (pytest)
```bash
cd ml-service
python -m pytest tests/ -v
```
- `test_feature_engineering.py`: Verifies temporal ordering and structure.
- `test_score_endpoint.py`: Tests valid and malformed requests (422 validation).
- `test_model_quality.py`: Asserts PR-AUC $\ge 0.80$ floor on held-out test sets.

### Frontend Build
```bash
cd frontend
npm run build
```
- Verifies full TypeScript type safety, React 18 component rendering, and Vite asset packaging.
