from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.health import router as health_router
from app.api.routes.recommend import router as recommend_router
from app.core.config import settings
from app.services.runtime import event_consumer


app = FastAPI(
    title="GearSwap Recommendation AI Service",
    version="0.1.0",
    description="GenAI-assisted recommendation microservice for GearSwap.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router, tags=["health"])
app.include_router(recommend_router, prefix="/v1/recommend", tags=["recommend"])


@app.on_event("startup")
async def startup_events() -> None:
    if settings.KAFKA_ENABLED:
        await event_consumer.start()


@app.on_event("shutdown")
async def shutdown_events() -> None:
    if settings.KAFKA_ENABLED:
        await event_consumer.stop()

