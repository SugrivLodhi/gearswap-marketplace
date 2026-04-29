from functools import lru_cache
from typing import List

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    APP_ENV: str = "development"
    APP_PORT: int = 9010
    LOG_LEVEL: str = "INFO"

    CORS_ORIGINS: List[str] = Field(default_factory=lambda: ["http://localhost:3000"])

    OPENAI_API_KEY: str = ""
    OPENAI_EMBEDDING_MODEL: str = "text-embedding-3-small"
    OPENAI_CHAT_MODEL: str = "gpt-4.1-mini"
    OPENAI_TIMEOUT_SECONDS: float = 10.0

    REDIS_URL: str = "redis://localhost:6379/0"
    RECOMMENDATION_CACHE_TTL_SECONDS: int = 120

    MONGODB_URI: str = "mongodb://localhost:27017/gearswap"
    MONGODB_DB_NAME: str = "gearswap"
    RECOMMENDATION_CANDIDATE_POOL_SIZE: int = 500

    KAFKA_ENABLED: bool = True
    KAFKA_BOOTSTRAP_SERVERS: str = "kafka:9092"
    KAFKA_GROUP_ID: str = "recommendation-ai-service"
    KAFKA_CLIENT_ID: str = "gearswap-recommendation-ai-service"
    KAFKA_TOPICS: List[str] = Field(
        default_factory=lambda: [
            "product.created",
            "product.updated",
            "product.deleted",
            "cart.updated",
            "order.checkout.initiated",
            "user.registered",
        ]
    )

    DEFAULT_RECOMMENDATION_LIMIT: int = 8
    MAX_RECOMMENDATION_LIMIT: int = 24


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

