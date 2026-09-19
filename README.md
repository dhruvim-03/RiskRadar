# Real-Time Transaction Fraud Detection System

Please refer to the complete documentation in [docs/README.md](docs/README.md).

### Quick Start
```bash
# Docker Compose
docker compose up --build

# Standalone manual run:
# Terminal 1 - ML Microservice
cd ml-service && uvicorn app.main:app --port 8000

# Terminal 2 - Spring Boot Backend
cd backend && mvn spring-boot:run

# Terminal 3 - React Frontend
cd frontend && npm run dev
```

### Access URLs
- **Frontend Dashboard**: http://localhost:5173
- **Backend API**: http://localhost:8080/api
- **Default Analyst**: `analyst1` / `StrongPass123!`
- **Default Admin**: `admin1` / `StrongPass123!`
