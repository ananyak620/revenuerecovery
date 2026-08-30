"""
ReviveAI — FastAPI Application

Main API entry point. Mounts all route modules and configures middleware.

Usage:
    uvicorn src.api.main:app --reload --port 8000
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.config import settings
from src.db.session import init_db
from src.api.routes import transactions, recovery, dashboard


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    # --- Startup ---
    print("\n⚡ ReviveAI API starting up...")
    init_db()
    print("✓ Database initialized")
    print(f"✓ Environment: {settings.app_env}")
    print(f"✓ Gemini API: {'configured' if settings.has_gemini_key else 'not configured (mock mode)'}")
    print(f"✓ API ready at http://{settings.api_host}:{settings.api_port}")
    print()

    yield

    # --- Shutdown ---
    print("\n⚡ ReviveAI API shutting down...")


app = FastAPI(
    title="ReviveAI API",
    description=(
        "AI/ML-powered Revenue Recovery Agent API. "
        "Predicts recovery probability, diagnoses payment failures, "
        "and executes bounded recovery workflows."
    ),
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS — allow frontend (Phase 8)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

app.include_router(transactions.router)
app.include_router(recovery.router)
app.include_router(dashboard.router)


@app.get("/", tags=["root"])
async def root():
    return {
        "app": settings.app_name,
        "version": "0.1.0",
        "docs": "/docs",
        "status": "running",
    }


@app.get("/health", tags=["health"])
async def health_check():
    from src.api.schemas import HealthCheck
    return HealthCheck(
        environment=settings.app_env,
        llm_available=settings.has_gemini_key,
    )
