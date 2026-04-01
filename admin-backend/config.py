from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    MONGODB_URI: str
    DATABASE_NAME: str = "gearswap"
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    CORS_ORIGINS: str = "http://localhost:3000"
    PORT: int = 8000

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
