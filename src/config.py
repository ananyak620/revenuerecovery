"""
ReviveAI — Configuration & Settings

Centralized settings management using pydantic-settings.
Reads from .env file and environment variables.
"""

import os
import sys
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

# Allow MLflow filestore if configured
os.environ.setdefault("MLFLOW_ALLOW_FILE_STORE", "true")

# Ensure UTF-8 output encoding across Windows terminals
if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    getattr(sys.stdout, "reconfigure")(encoding="utf-8", errors="replace")
if sys.stderr and hasattr(sys.stderr, "reconfigure"):
    getattr(sys.stderr, "reconfigure")(encoding="utf-8", errors="replace")


# Project root directory
ROOT_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT_DIR / "data"
MODELS_DIR = ROOT_DIR / "src" / "ml" / "models"


class Settings(BaseSettings):
    """Application settings loaded from .env file and environment variables."""

    model_config = SettingsConfigDict(
        env_file=str(ROOT_DIR / ".env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # --- App ---
    app_name: str = "ReviveAI"
    app_env: str = "development"
    debug: bool = True
    log_level: str = "INFO"

    # --- Database ---
    database_url: str = "sqlite:///./reviveai.db"

    # --- AI / GenAI (Model-Agnostic) ---
    # Provider options: "auto", "gemini", "openai_compatible", "ollama", "heuristic"
    llm_provider: str = "auto"
    llm_model: str = "gemini-2.0-flash"
    llm_base_url: str = ""
    gemini_api_key: str = ""
    openai_api_key: str = ""
    ollama_base_url: str = "http://localhost:11434"

    # --- Webhooks & Event Ingestion ---
    webhook_secret: str = "reviveai_sec_demo_2026"

    # --- MLflow ---
    mlflow_tracking_uri: str = "sqlite:///mlflow.db"

    # --- Redis (Phase 7+) ---
    redis_url: str = "redis://localhost:6379/0"

    # --- API ---
    api_host: str = "0.0.0.0"
    api_port: int = 8000

    @property
    def is_development(self) -> bool:
        return self.app_env == "development"

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"

    @property
    def has_gemini_key(self) -> bool:
        return bool(self.gemini_api_key)

    @property
    def has_openai_key(self) -> bool:
        return bool(self.openai_api_key)


# Singleton settings instance
settings = Settings()
