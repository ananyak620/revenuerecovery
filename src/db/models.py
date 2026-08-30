"""
ReviveAI — Database ORM Models

SQLAlchemy models for the revenue recovery system.
Covers customers, transactions, payment failures, recovery attempts,
agent decisions, and audit trail.
"""

from datetime import datetime, timezone
from enum import Enum as PyEnum

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import DeclarativeBase, relationship


def _utc_now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


class Base(DeclarativeBase):
    """Base class for all ORM models."""
    pass


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class PaymentMethod(str, PyEnum):
    UPI = "upi"
    CREDIT_CARD = "credit_card"
    DEBIT_CARD = "debit_card"
    NETBANKING = "netbanking"
    WALLET = "wallet"


class FailureReason(str, PyEnum):
    AUTHENTICATION_FAILURE = "authentication_failure"
    INSUFFICIENT_FUNDS = "insufficient_funds"
    CARD_EXPIRED = "card_expired"
    NETWORK_ERROR = "network_error"
    BANK_DECLINED = "bank_declined"
    FRAUD_FLAG = "fraud_flag"
    TECHNICAL_ERROR = "technical_error"
    LIMIT_EXCEEDED = "limit_exceeded"


class SubscriptionType(str, PyEnum):
    STARTER = "starter"
    PROFESSIONAL = "professional"
    BUSINESS = "business"
    ENTERPRISE = "enterprise"


class RecoveryStatus(str, PyEnum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    RECOVERED = "recovered"
    FAILED = "failed"
    ESCALATED = "escalated"
    ABANDONED = "abandoned"


class RecoveryAction(str, PyEnum):
    RETRY = "retry"
    NOTIFY_CUSTOMER = "notify_customer"
    ESCALATE = "escalate"
    UPDATE_PAYMENT = "update_payment"
    OFFER_ALTERNATIVE = "offer_alternative"
    NO_ACTION = "no_action"


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------

class Customer(Base):
    """Customer entity with profile and engagement metrics."""

    __tablename__ = "customers"

    id = Column(String(20), primary_key=True)  # CUS_XXXXX
    tenure_days = Column(Integer, nullable=False, default=0)
    subscription_type = Column(Enum(SubscriptionType), nullable=False)
    industry = Column(String(50))
    region = Column(String(20))
    device_type = Column(String(20))
    customer_ltv = Column(Float, default=0.0)
    previous_success_rate = Column(Float, default=0.5)
    historical_recovery_rate = Column(Float, default=0.5)
    support_tickets_last_30d = Column(Integer, default=0)
    days_since_last_login = Column(Integer, default=0)
    nps_score = Column(Float, default=5.0)
    created_at = Column(DateTime, default=_utc_now)
    updated_at = Column(DateTime, default=_utc_now, onupdate=_utc_now)

    # Relationships
    transactions = relationship("Transaction", back_populates="customer")


class Transaction(Base):
    """A failed payment transaction — the core entity for recovery."""

    __tablename__ = "transactions"

    id = Column(String(20), primary_key=True)  # TXN_XXXXXX
    customer_id = Column(String(20), ForeignKey("customers.id"), nullable=False)
    amount = Column(Float, nullable=False)
    payment_method = Column(Enum(PaymentMethod), nullable=False)
    failure_reason = Column(Enum(FailureReason), nullable=False)
    retry_count = Column(Integer, default=0)
    time_since_failure_hours = Column(Float, default=0.0)
    hour_of_day = Column(Integer, default=0)
    day_of_week = Column(Integer, default=0)
    is_weekend = Column(Boolean, default=False)
    recovered = Column(Boolean, default=False)
    recovery_probability = Column(Float, nullable=True)  # ML prediction
    expected_recovery_value = Column(Float, nullable=True)  # amount * probability
    created_at = Column(DateTime, default=_utc_now)

    # Relationships
    customer = relationship("Customer", back_populates="transactions")
    recovery_attempts = relationship("RecoveryAttempt", back_populates="transaction")
    decisions = relationship("RecoveryDecision", back_populates="transaction")


class RecoveryAttempt(Base):
    """A single recovery action taken on a failed payment."""

    __tablename__ = "recovery_attempts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    transaction_id = Column(String(20), ForeignKey("transactions.id"), nullable=False)
    action = Column(Enum(RecoveryAction), nullable=False)
    status = Column(Enum(RecoveryStatus), default=RecoveryStatus.PENDING)
    retry_number = Column(Integer, default=1)
    scheduled_at = Column(DateTime, nullable=True)
    executed_at = Column(DateTime, nullable=True)
    result_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=_utc_now)

    # Relationships
    transaction = relationship("Transaction", back_populates="recovery_attempts")


class RecoveryDecision(Base):
    """
    Audit trail — every decision the AI agent makes is logged here.
    This is critical for guardrails and explainability.
    """

    __tablename__ = "recovery_decisions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    transaction_id = Column(String(20), ForeignKey("transactions.id"), nullable=False)
    audit_id = Column(String(30), unique=True, nullable=False)  # REC-XXXXXX

    # ML outputs
    ml_recovery_probability = Column(Float, nullable=True)
    ml_expected_recovery_value = Column(Float, nullable=True)

    # LLM outputs
    llm_diagnosis = Column(Text, nullable=True)
    llm_recommended_action = Column(String(50), nullable=True)
    llm_reasoning = Column(Text, nullable=True)
    llm_confidence = Column(Float, nullable=True)

    # Agent decision
    final_action = Column(Enum(RecoveryAction), nullable=False)
    action_approved = Column(Boolean, default=False)  # policy engine check

    # Policy engine
    policy_check_passed = Column(Boolean, default=True)
    policy_violations = Column(Text, nullable=True)  # JSON list of violations

    # Outcome
    outcome = Column(Enum(RecoveryStatus), nullable=True)
    amount_recovered = Column(Float, default=0.0)

    created_at = Column(DateTime, default=_utc_now)

    # Relationships
    transaction = relationship("Transaction", back_populates="decisions")
