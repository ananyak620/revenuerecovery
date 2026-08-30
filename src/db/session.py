"""
ReviveAI — Database Session Management

Handles SQLAlchemy engine creation and session lifecycle.
Supports SQLite (dev) and PostgreSQL (prod) via DATABASE_URL.
"""

from typing import Generator
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, Session

from src.config import settings
from src.db.models import Base


def _get_engine():
    """Create SQLAlchemy engine based on DATABASE_URL."""
    url = settings.database_url

    connect_args = {}
    if url.startswith("sqlite"):
        connect_args["check_same_thread"] = False

    engine = create_engine(
        url,
        connect_args=connect_args,
        echo=settings.debug and settings.log_level == "DEBUG",
        pool_pre_ping=True,
    )

    # Enable WAL mode for SQLite (better concurrent reads)
    if url.startswith("sqlite"):
        @event.listens_for(engine, "connect")
        def set_sqlite_pragma(dbapi_connection, connection_record):
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA journal_mode=WAL")
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()

    return engine


engine = _get_engine()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db():
    """Create all tables. Idempotent — safe to call multiple times."""
    Base.metadata.create_all(bind=engine)
    print("  ✓ Database tables created")


def get_db() -> Generator[Session, None, None]:
    """Dependency for FastAPI — yields a session and auto-closes."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
