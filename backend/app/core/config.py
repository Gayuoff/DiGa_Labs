from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime settings, read from environment variables or backend/.env."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_env: str = "local"
    cors_origins: list[str] = ["http://localhost:5173"]

    # AI: an AI Studio key for local dev, or Vertex AI on a GCP project for deployment.
    gemini_api_key: str | None = None
    google_genai_use_vertexai: bool = False
    google_cloud_project: str | None = None
    google_cloud_location: str = "us-central1"
    gemini_model: str = "gemini-2.5-flash"
    gemini_deep_model: str = "gemini-2.5-pro"
    gemini_embed_model: str = "gemini-embedding-001"


@lru_cache
def get_settings() -> Settings:
    return Settings()
