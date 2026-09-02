"""
ReviveAI — Pydantic Schemas

Request/response models for the FastAPI endpoints.
Strict validation using Pydantic v2.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


# ---------------------------------------------------------------------------
# Customer Schemas
# ---------------------------------------------------------------------------

class CustomerBase(BaseModel):
    id: str
    tenure_days: int
    subscription_type: str
    industry: Optional[str] = None
    region: Optional[str] = None
    customer_ltv: float = 0.0
    previous_success_rate: float = 0.5
    nps_score: float = 5.0


class CustomerResponse(CustomerBase):
    model_config = ConfigDict(from_attributes=True)

    historical_recovery_rate: float = 0.5
    support_tickets_last_30d: int = 0
    days_since_last_login: int = 0


# ---------------------------------------------------------------------------
# Transaction Schemas
# ---------------------------------------------------------------------------

class TransactionBase(BaseModel):
    id: str
    customer_id: str
    amount: float
    payment_method: str
    failure_reason: str
    retry_count: int = 0
    time_since_failure_hours: float = 0.0


class TransactionResponse(TransactionBase):
    model_config = ConfigDict(from_attributes=True)

    hour_of_day: int = 0
    day_of_week: int = 0
    is_weekend: bool = False
    recovered: bool = False
    recovery_probability: Optional[float] = None
    expected_recovery_value: Optional[float] = None
    created_at: Optional[datetime] = None


class TransactionList(BaseModel):
    total: int
    items: list[TransactionResponse]
    page: int = 1
    page_size: int = 50


# ---------------------------------------------------------------------------
# Recovery / Prediction Schemas
# ---------------------------------------------------------------------------

class RecoveryPredictionRequest(BaseModel):
    """Input for the ML recovery prediction endpoint."""
    transaction_id: str


class RecoveryPredictionResponse(BaseModel):
    """Output from the ML recovery prediction."""
    transaction_id: str
    recovery_probability: float = Field(..., ge=0.0, le=1.0)
    expected_recovery_value: float
    risk_level: str  # critical / high / medium / low
    recommended_action: str
    confidence: float = Field(..., ge=0.0, le=1.0)


class BatchPredictionRequest(BaseModel):
    """Predict recovery for multiple transactions."""
    transaction_ids: list[str] = Field(..., max_length=100)


class BatchPredictionResponse(BaseModel):
    predictions: list[RecoveryPredictionResponse]
    total_expected_recovery: float
    avg_probability: float


# ---------------------------------------------------------------------------
# Agent / Decision Schemas
# ---------------------------------------------------------------------------

class AgentDecision(BaseModel):
    """The full AI agent decision for a failed payment."""
    transaction_id: str
    audit_id: str

    # ML
    recovery_probability: float
    expected_recovery_value: float

    # LLM
    diagnosis: str
    reasoning: str
    llm_confidence: float

    # Decision
    recommended_action: str
    policy_approved: bool
    policy_violations: list[str] = []

    # Outcome
    final_action: str
    status: str


class AgentProcessRequest(BaseModel):
    """Request the agent to process a failed payment."""
    transaction_id: str
    auto_execute: bool = False  # If True, execute action after policy check


# ---------------------------------------------------------------------------
# Dashboard Schemas
# ---------------------------------------------------------------------------

class DashboardStats(BaseModel):
    """Aggregated dashboard statistics."""
    total_transactions: int
    total_failed_amount: float
    total_recovered_amount: float
    recovery_rate: float
    avg_recovery_probability: float
    at_risk_revenue: float
    expected_total_recovery: float

    # Breakdowns
    recovery_by_reason: dict[str, float]
    recovery_by_method: dict[str, float]
    recovery_by_retry_count: dict[int, float]

    # Counts
    pending_recovery: int
    in_progress: int
    recovered_count: int
    failed_count: int


class RecoveryQueueItem(BaseModel):
    """A single item in the recovery priority queue."""
    transaction_id: str
    customer_id: str
    amount: float
    payment_method: str
    failure_reason: str
    retry_count: int
    recovery_probability: Optional[float] = None
    expected_recovery_value: Optional[float] = None
    recommended_action: Optional[str] = None
    time_since_failure_hours: float = 0.0


class RecoveryQueue(BaseModel):
    """Prioritized recovery queue sorted by expected recovery value."""
    items: list[RecoveryQueueItem]
    total_count: int
    total_expected_recovery: float


# ---------------------------------------------------------------------------
# Health Check
# ---------------------------------------------------------------------------

class HealthCheck(BaseModel):
    status: str = "ok"
    app_name: str = "ReviveAI"
    version: str = "0.1.0"
    environment: str = "development"
    ml_model_loaded: bool = False
    llm_available: bool = False
    database_connected: bool = True
