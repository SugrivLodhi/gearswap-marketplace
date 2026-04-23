from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    MONGODB_URI: str
    DATABASE_NAME: str = "gearswap"
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    CORS_ORIGINS: str = "http://localhost:3000"
    PORT: int = 8000
    KAFKA_ENABLED: bool = False
    KAFKA_BOOTSTRAP_SERVERS: str = "localhost:9092"
    KAFKA_CLIENT_ID: str = "gearswap-admin-api"
    CATALOG_SERVICE_BASE_URL: str = "http://catalog-service:9002"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
