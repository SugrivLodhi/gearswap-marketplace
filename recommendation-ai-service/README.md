# Recommendation AI Service

FastAPI microservice for GenAI-powered product recommendations.

## Run locally

```bash
cd recommendation-ai-service
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 9010
```

## Endpoints

- `GET /health`
- `POST /v1/recommend/cart`
- `POST /v1/recommend/product`
- `POST /v1/recommend/home`

## Notes

- Service reads products from MongoDB and returns real product IDs.
- Uses OpenAI embeddings when `OPENAI_API_KEY` is set.
- Falls back to lexical + business heuristic ranking when OpenAI is unavailable.
- Consumes Kafka domain events to refresh product embeddings and user preference signals.
- Uses `cart.updated` events for low-latency pre-checkout preference shaping.
- Applies category diversity controls to avoid recommendation repetition.
- Event contract reference: `docs/recommendation-events.md`.

## Evaluation and Load Testing

- Offline quality eval:
  - `python scripts/offline_eval.py --api-base http://localhost:9010 --sample-users 50 -k 10`
- Load test:
  - `python scripts/load_test.py --api-base http://localhost:9010 --requests 200 --concurrency 20 -k 8`
