from pydantic_settings import BaseSettings
from typing import Optional, List
import os


class Settings(BaseSettings):
    # App settings
    APP_NAME: str = "DragonBricks API"
    DEBUG: bool = False
    API_V1_PREFIX: str = "/api/v1"

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/dragonbricks"

    # JWT Authentication
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000"]

    # LLM API Keys (server-side, users don't need their own)
    OPENAI_API_KEY: Optional[str] = None
    ANTHROPIC_API_KEY: Optional[str] = None
    DEFAULT_LLM_PROVIDER: str = "openai"  # or "anthropic"
    DEFAULT_LLM_MODEL: str = "gpt-4o-mini"

    # Rate limiting
    RATE_LIMIT_PER_MINUTE: int = 60
    LLM_RATE_LIMIT_PER_MINUTE: int = 20

    # File storage (for program exports)
    STORAGE_PATH: str = "./storage"

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
