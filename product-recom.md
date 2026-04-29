# Product Recommendation Microservice (GenAI + OpenAI + Python + FastAPI)

## 1) Current Codebase Fit (What You Already Have)

Your repository already has a recommendation baseline:

- `backend/src/modules/recommendation/recommendation.service.ts` uses Redis co-occurrence logic.
- `backend/src/workers/recommendation.worker.ts` updates recommendation graph asynchronously.
- `frontend/components/RecommendedProducts.tsx` renders recommendation cards.
- `docker-compose.yml` already runs Kafka, Redis, MongoDB, API, worker, and one FastAPI service (`admin-api`).

This is a good foundation. The new GenAI service should be a **separate microservice** that complements (not replaces immediately) the current Redis strategy.

---

## 2) Goal for the New Service

Build a standalone `recommendation-ai-service` that:

- Ingests user/product/cart/order signals.
- Creates embeddings and ranking features.
- Uses OpenAI models for semantic relevance and optional reranking.
- Exposes low-latency APIs to get recommendations.
- Can be consumed by your existing Node GraphQL backend.

---

## 3) Recommended High-Level Architecture

1. **FastAPI service (Python)**
   - Owns recommendation APIs, feature preparation, model orchestration.

2. **Feature + event ingestion layer**
   - Consume Kafka events (`cart_updated`, `order_created`, `product_updated`, etc.).
   - Optional fallback: batch sync from MongoDB.

3. **Vector store / embedding index**
   - Start with PostgreSQL + pgvector (recommended).
   - Alternatives: Qdrant, Weaviate, Pinecone.

4. **Online cache**
   - Redis for hot results and request-level caching.

5. **OpenAI integration**
   - Embeddings model for product/user representation.
   - Chat/completion model only for explanation, query rewrite, or cold-start reasoning.

6. **Orchestration from existing API**
   - Existing GraphQL backend calls this service via internal HTTP/gRPC.
   - Frontend remains unchanged except optional metadata fields.

---

## 4) Functional Requirements

### Core recommendation use-cases

- `Related products` on product details page.
- `Inspired by cart` for cart page (already present in UI).
- `Personalized for you` on homepage.
- `Similar items by text intent` (semantic query, e.g., "budget gaming mouse").

### API endpoints (minimum)

- `GET /health`
- `POST /v1/recommend/cart`
  - input: `user_id`, `cart_items`, `limit`, `context`
- `POST /v1/recommend/product`
  - input: `product_id`, `user_id?`, `limit`
- `POST /v1/recommend/home`
  - input: `user_id`, `limit`
- `POST /v1/reindex/product`
  - update a product embedding/features
- `POST /v1/events/ingest`
  - optional if not consuming Kafka directly

### Ranking behavior

- Combine at least 3 signals:
  - collaborative (co-occurrence/orders),
  - semantic similarity (embedding/vector),
  - business weights (stock, margin, seller quality, recency).
- Add diversity rule (avoid same brand/category dominance).
- Exclude out-of-stock and soft-deleted products.

---

## 5) Non-Functional Requirements

- **Latency**: P95 < 250ms for recommendation endpoints.
- **Availability**: 99.9% target for read endpoints.
- **Scalability**: horizontal pods/containers; stateless API.
- **Observability**: structured logs + metrics + traces.
- **Resilience**:
  - timeout and retry policy to OpenAI,
  - graceful fallback to existing Redis recommendations if OpenAI fails.

---

## 6) Data Requirements

### Required product fields

- `product_id`, `title`, `description`, `category`, `brand`, `price`, `attributes`, `seller_id`, `stock`, `is_active`.

### Required user interaction signals

- views, clicks, add-to-cart, remove-from-cart, purchase, ratings (if any), timestamp.

### Event contracts (Kafka topics suggested)

- `product.created`
- `product.updated`
- `cart.updated`
- `order.created`
- `order.completed`
- `inventory.updated`

Each event should include:

- unique `event_id`, `event_type`, `occurred_at`, `entity_id`, `tenant/marketplace id` (if multi-tenant), payload schema version.

---

## 7) OpenAI-Specific Requirements

### Model usage strategy

- Use embeddings model for:
  - product vectors,
  - optional user/session intent vectors,
  - semantic retrieval.
- Use generative model only where it adds value:
  - cold-start candidate generation,
  - recommendation explanation text,
  - query rewrite/intent extraction.

### Prompt and safety controls

- Strict prompt templates in code (versioned).
- No PII in prompts.
- Add token budget limits per request.
- Validate and sanitize model output (schema-validated JSON).

### Cost controls

- Cache embeddings for unchanged products.
- Batch embedding jobs.
- Rate-limit per route and per caller service.
- Set daily and monthly usage alerts.

---

## 8) Security Requirements

- Service-to-service auth (JWT or mTLS).
- Internal network exposure only (no direct public access).
- Secrets from env/secret manager (`OPENAI_API_KEY`, DB URL, Kafka creds).
- Request validation via Pydantic models.
- Audit logs for recommendation requests and model calls.
- Data retention policy for event and feature data.

---

## 9) Suggested Tech Stack (Python Service)

- FastAPI
- Uvicorn / Gunicorn
- Pydantic v2
- `openai` Python SDK
- `httpx` (for internal service calls if needed)
- SQLAlchemy + Alembic (if using PostgreSQL)
- `pgvector` extension
- aiokafka (if direct Kafka consumption in Python)
- Redis client (`redis-py`)
- Prometheus instrumentation (`prometheus-fastapi-instrumentator`)
- pytest + pytest-asyncio

---

## 10) Suggested Folder Structure (New Microservice)

```text
recommendation-ai-service/
  app/
    api/
      routes/
        health.py
        recommend.py
        admin.py
    core/
      config.py
      security.py
      logging.py
    domain/
      entities/
      schemas/
      services/
    integrations/
      openai_client.py
      vector_store.py
      redis_cache.py
      kafka_consumer.py
    ranking/
      candidate_generation.py
      scoring.py
      reranking.py
    workers/
      embedding_worker.py
      sync_worker.py
    main.py
  tests/
  Dockerfile
  requirements.txt
  .env.example
```

---

## 11) Integration Plan with Existing Repo

1. Add new service in `docker-compose.yml` as `recommendation-ai-service`.
2. Existing Node backend (`cartRecommendations` resolver path) calls this service first.
3. If call fails or times out, fallback to current Redis recommendation service.
4. Gradually route traffic by feature flag:
   - 10% -> 30% -> 60% -> 100%.
5. Track CTR, add-to-cart rate, purchase conversion per recommendation source.

---

## 12) Frontend and Architecture Suggestions (Important for Scale)

- Keep UI components presentational (`ProductCard`, recommendation sections).
- Move all recommendation-fetching logic into reusable hooks (for your frontend standards):
  - `useCartRecommendations`
  - `useProductRecommendations`
  - `useHomeRecommendations`
- Keep API/business logic out of components.
- Maintain one stable backend contract so UI does not care if source is Redis or GenAI.

---

## 13) Phased Rollout Roadmap

### Phase 1 - MVP (1-2 weeks)

- FastAPI service + `recommend/cart` endpoint.
- Product embeddings + vector lookup.
- Node backend integration with fallback.
- Basic metrics and logs.

### Phase 2 - Quality (1-2 weeks)

- Hybrid ranking (co-occurrence + vector + business weights).
- A/B test bucket support.
- Caching optimization and latency tuning.

### Phase 3 - Advanced (2+ weeks)

- Session-aware personalization.
- LLM-based reranking for top-K candidates.
- Recommendation explanations ("Why this item").

---

## 14) Success Metrics (Must Track)

- CTR on recommendation widgets.
- Add-to-cart from recommendations.
- Conversion rate from recommendations.
- Revenue per session uplift.
- P95 endpoint latency.
- OpenAI cost per 1,000 recommendation requests.

---

## 15) Deployment Checklist

- [ ] Create `recommendation-ai-service` repo/folder.
- [ ] Add env vars:
  - [ ] `OPENAI_API_KEY`
  - [ ] `RECOM_DB_URL`
  - [ ] `REDIS_URL`
  - [ ] `KAFKA_BOOTSTRAP_SERVERS`
  - [ ] `SERVICE_JWT_SECRET` (or mTLS config)
- [ ] Add Dockerfile and health checks.
- [ ] Add CI tests (unit + contract + load smoke).
- [ ] Add dashboard/alerts for latency, error-rate, token usage, cost.
- [ ] Add fallback logic in Node GraphQL layer.
- [ ] Add feature flag for controlled rollout.

---

## Final Recommendation

For your current codebase, the best next step is a **hybrid recommendation architecture**:

1. Keep existing Redis co-occurrence as reliable fallback.
2. Add a separate FastAPI GenAI microservice for semantic and personalized ranking.
3. Integrate gradually via feature flags and strict metrics tracking.

This gives fast delivery, lower risk, and a clear path to production-grade AI recommendations.
