"""
ReviveAI — FastAPI Application

Main API entry point. Mounts all route modules and configures middleware.

Usage:
    uvicorn src.api.main:app --reload --port 8000
"""

from contextlib import asynccontextmanager

from pathlib import Path
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from src.config import settings
from fastapi import Depends
from sqlalchemy.orm import Session
from src.db.session import init_db, get_db
from src.api.routes import transactions, recovery, dashboard, webhooks, agent


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    print("\n⚡ ReviveAI API starting up...")
    init_db()
    print("✓ Database initialized")
    print(f"✓ Environment: {settings.app_env}")
    print(f"✓ OpenAI Model: {settings.openai_model}")
    print(f"✓ API ready at http://{settings.api_host}:{settings.api_port}")
    print()
    yield
    print("\n⚡ ReviveAI API shutting down...")


app = FastAPI(
    title="ReviveAI API",
    description=(
        "AI/ML-powered Revenue Recovery Agent API with LangChain tool-calling, "
        "OpenAI API integration, Scikit-learn ML scoring, and payment pipeline analytics."
    ),
    version="0.2.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS — allow Vite dev server (:5173), frontend (:3000), and all origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

app.include_router(agent.router)
app.include_router(transactions.router)
app.include_router(recovery.router)
app.include_router(dashboard.router)
app.include_router(webhooks.router)


@app.get("/metrics", tags=["metrics"])
@app.get("/api/metrics", tags=["metrics"])
def get_pipeline_metrics(db: Session = Depends(get_db)):
    """Pipeline health and recovery stats."""
    from src.api.routes.dashboard import get_dashboard_stats
    return get_dashboard_stats(db=db)


@app.get("/transactions/{transaction_id}", tags=["transactions"])
def get_transaction_by_id(transaction_id: str, db: Session = Depends(get_db)):
    """Transaction detail + ML risk tier."""
    return transactions.get_transaction(transaction_id=transaction_id, db=db)


@app.get("/transactions", tags=["transactions"])
def list_transactions_alias(
    page: int = 1,
    page_size: int = 50,
    db: Session = Depends(get_db),
):
    """List transactions alias."""
    return transactions.list_transactions(page=page, page_size=page_size, db=db)


@app.get("/health", tags=["health"])
@app.head("/health", tags=["health"])
async def health_check():
    from src.api.schemas import HealthCheck
    return HealthCheck(
        environment=settings.app_env,
        llm_available=bool(settings.openai_api_key or settings.has_gemini_key),
    )


# Static and Frontend File Serving
ROOT_DIR = Path(__file__).resolve().parent.parent.parent
INDEX_FILE = ROOT_DIR / "index.html"

# Mount static asset folders if they exist
for folder in ["pages", "components", "utils", "data"]:
    folder_path = ROOT_DIR / folder
    if folder_path.exists():
        app.mount(f"/{folder}", StaticFiles(directory=str(folder_path)), name=folder)

@app.get("/style.css")
@app.head("/style.css")
async def get_style():
    if (ROOT_DIR / "style.css").exists():
        return FileResponse(str(ROOT_DIR / "style.css"))
    return {"error": "not found"}

@app.get("/app.js")
@app.head("/app.js")
async def get_app():
    if (ROOT_DIR / "app.js").exists():
        return FileResponse(str(ROOT_DIR / "app.js"))
    return {"error": "not found"}

@app.get("/", tags=["root"])
@app.head("/", tags=["root"])
async def root():
    """Serve the ReviveAI Galaxy UI with 6 cards, tables, and multi-agent workspace."""
    if INDEX_FILE.exists():
        return FileResponse(str(INDEX_FILE))
    return {
        "app": settings.app_name,
        "version": "0.2.0",
        "docs": "/docs",
        "status": "running",
    }
