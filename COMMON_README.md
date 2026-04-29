# GearSwap Common Runbook

This file is the single reference to run all modules and manage important operational info.

## 1) Project Modules

- `frontend` - Next.js app (buyer/seller/admin UI)
- `backend` - Main GraphQL API (Node.js + TypeScript)
- `worker` - Background jobs from backend image
- `admin-backend` - FastAPI admin API
- `recommendation-ai-service` - FastAPI GenAI recommendation microservice
- `catalog-service` - Catalog/inventory microservice
- `payment-service` - Payment webhook/event microservice
- `notification-service` - Notification consumer
- `search-indexer-service` - Search sync consumer
- `analytics-service` - Analytics event sink
- Infrastructure: `mongo`, `redis`, `kafka`, `zookeeper`, `typesense`, `kafka-ui`

---

## 2) Quick Start (Recommended)

Run everything with Docker:

```bash
docker compose up -d --build
```

Check status:

```bash
docker compose ps
```

Stop everything:

```bash
docker compose down
```

Validate compose config:

```bash
docker compose config
```

---

## 3) Main URLs and Ports

- Frontend: `http://localhost:3000`
- GraphQL API: `http://localhost:4000/graphql`
- Admin API: `http://localhost:8000`
- Recommendation AI service: `http://localhost:9010`
- Payment service: `http://localhost:9001`
- Catalog service: `http://localhost:9002`
- Typesense: `http://localhost:8108`
- Kafka UI: `http://localhost:8080`
- MongoDB: `localhost:27017`
- Redis: `localhost:6379`
- Kafka broker: `localhost:9092`

---

## 4) Health Checks / Smoke Tests

Recommendation AI:

```bash
curl http://localhost:9010/health
```

Admin API:

```bash
curl http://localhost:8000/
```

GraphQL API smoke:

```bash
curl -X POST http://localhost:4000/graphql -H "Content-Type: application/json" -d "{\"query\":\"{ __typename }\"}"
```

---

## 5) Local Dev Commands (Without Docker)

### Backend

```bash
cd backend
npm install
npm run dev
```

### Backend worker

```bash
cd backend
npm run worker:dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Admin backend (Python)

```bash
cd admin-backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Recommendation AI service (Python)

```bash
cd recommendation-ai-service
pip install -r requirements.txt
uvicorn app.main:app --reload --port 9010
```

### Other Node microservices

```bash
cd catalog-service && npm install && npm start
cd payment-service && npm install && npm start
cd notification-service && npm install && npm start
cd search-indexer-service && npm install && npm start
cd analytics-service && npm install && npm start
```

---

## 6) Build/Test Validation Commands

Backend build:

```bash
cd backend
npm run build
```

Backend contract test:

```bash
cd backend
npm test -- recommendation-events.test.ts
```

Frontend production build:

```bash
cd frontend
npm run build
```

Python compile sanity:

```bash
python -m compileall admin-backend
python -m compileall recommendation-ai-service/app recommendation-ai-service/scripts
```

---

## 7) Recommendation System Notes

- Backend strategy env:
  - `RECOMMENDATION_STRATEGY=redis|hybrid|ab`
  - `RECOMMENDATION_HYBRID_TRAFFIC_PERCENT=0..100`
- AI service endpoint:
  - `RECOMMENDATION_AI_SERVICE_URL`
  - `RECOMMENDATION_AI_TIMEOUT_MS`
- AI service listens to events:
  - `product.created`, `product.updated`, `product.deleted`
  - `cart.updated`
  - `order.checkout.initiated`
  - `user.registered`
- Event contract reference:
  - `recommendation-ai-service/docs/recommendation-events.md`

---

## 8) Key Files to Check First

- Infra orchestration: `docker-compose.yml`
- Backend env template: `backend/.env.example`
- Main backend config: `backend/src/config/environment.ts`
- Recommendation backend integration: `backend/src/modules/recommendation/recommendation.service.ts`
- Recommendation service config: `recommendation-ai-service/.env`
- Recommendation service docs: `recommendation-ai-service/README.md`
- Root architecture overview: `product-recom.md`

---

## 9) Common Troubleshooting

- Frontend build fails with missing icon package:
  - Run: `cd frontend && npm install`
- GraphQL GET fails with CSRF warning:
  - Use POST with `Content-Type: application/json`.
- Recommendation API returns fallback-heavy results:
  - Set `OPENAI_API_KEY` in `recommendation-ai-service/.env`
  - Verify AI service health and Kafka connectivity.
- Services not starting:
  - Run `docker compose ps`
  - Inspect logs with `docker compose logs <service-name> --tail=200`

---

## 10) Suggested Daily Workflow

1. `docker compose up -d --build`
2. Check `docker compose ps`
3. Run smoke tests (Section 4)
4. Develop in target module
5. Re-run module build/tests from Section 6
6. `docker compose down` when done
