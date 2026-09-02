"""
ReviveAI — Webhook Ingestion & Simulation Routes

Handles real-time payment failure event ingestion from payment gateways
(Razorpay, Stripe) and provides an event simulation endpoint for live testing.
"""

import asyncio
from datetime import datetime, timezone
import random
import uuid
from typing import Any, Dict, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, Header, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from src.db.session import get_db, SessionLocal
from src.db.models import Transaction, Customer, PaymentMethod, FailureReason, SubscriptionType
from src.agent.recovery_agent import RecoveryAgent
from src.config import settings

router = APIRouter(prefix="/api/webhooks", tags=["webhooks"])


class SimulateWebhookRequest(BaseModel):
    amount: float = Field(default=4999.0, description="Transaction amount in INR")
    payment_method: str = Field(default="upi", description="card, upi, netbanking, wallet")
    failure_reason: str = Field(
        default="authentication_failure",
        description="authentication_failure, network_error, insufficient_funds, card_expired, bank_declined, fraud_flag",
    )
    customer_id: Optional[str] = Field(default=None, description="Optional customer ID")
    auto_execute: bool = Field(default=True, description="Whether to execute recovery action automatically")


class WebhookResponse(BaseModel):
    event_id: str
    status: str
    message: str
    transaction_id: str
    agent_decision: Optional[Dict[str, Any]] = None


def _ensure_customer_exists(db: Session, customer_id: str) -> Customer:
    """Ensure customer record exists in DB to satisfy foreign key constraints."""
    cust = db.query(Customer).filter(Customer.id == customer_id).first()
    if not cust:
        cust = Customer(
            id=customer_id,
            tenure_days=120,
            subscription_type=SubscriptionType.STARTER,
            industry="Technology",
            region="IN",
            device_type="mobile",
            customer_ltv=12000.0,
            previous_success_rate=0.88,
            historical_recovery_rate=0.75,
            support_tickets_last_30d=1,
            days_since_last_login=2,
            nps_score=8.0,
        )
        db.add(cust)
        db.commit()
    return cust


async def _run_recovery_in_background(transaction_id: str, auto_execute: bool):
    """Background task to run agent recovery pipeline asynchronously."""
    agent = RecoveryAgent()
    await agent.process_payment(transaction_id, auto_execute=auto_execute)


@router.post("/razorpay", response_model=WebhookResponse)
async def razorpay_webhook(
    payload: Dict[str, Any],
    background_tasks: BackgroundTasks,
    x_razorpay_signature: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    """
    Ingest Razorpay payment failure event (`payment.failed`).
    """
    event = payload.get("event", "payment.failed")
    if "payment.failed" not in event:
        return WebhookResponse(
            event_id=payload.get("id", str(uuid.uuid4())),
            status="ignored",
            message=f"Event {event} ignored (only payment.failed handled)",
            transaction_id="",
        )

    payment_entity = payload.get("payload", {}).get("payment", {}).get("entity", {})
    txn_id = payment_entity.get("id", f"pay_{uuid.uuid4().hex[:10]}")
    amount = float(payment_entity.get("amount", 200000)) / 100.0  # paise to INR
    method = payment_entity.get("method", "card")
    error_code = payment_entity.get("error_code", "BAD_REQUEST_ERROR")
    cust_id = payment_entity.get("email") or "cust_live_webhook"

    # Map Razorpay error code to failure reason
    failure_map = {
        "GATEWAY_ERROR": FailureReason.NETWORK_ERROR,
        "BAD_REQUEST_ERROR": FailureReason.AUTHENTICATION_FAILURE,
        "INSUFFICIENT_FUNDS": FailureReason.INSUFFICIENT_FUNDS,
        "EXPIRED_CARD": FailureReason.CARD_EXPIRED,
        "SUSPICIOUS_TRANSACTION": FailureReason.FRAUD_FLAG,
    }
    fail_reason = failure_map.get(error_code, FailureReason.AUTHENTICATION_FAILURE)

    _ensure_customer_exists(db, cust_id)

    # Persist failed transaction
    existing = db.query(Transaction).filter(Transaction.id == txn_id).first()
    if not existing:
        new_txn = Transaction(
            id=txn_id,
            customer_id=cust_id,
            amount=amount,
            payment_method=PaymentMethod.UPI if method == "upi" else PaymentMethod.CREDIT_CARD,
            failure_reason=fail_reason,
            retry_count=0,
            recovered=False,
            time_since_failure_hours=0.5,
            created_at=datetime.now(timezone.utc).replace(tzinfo=None),
        )
        db.add(new_txn)
        db.commit()

    # Trigger agent in background
    background_tasks.add_task(_run_recovery_in_background, txn_id, True)

    return WebhookResponse(
        event_id=payload.get("id", str(uuid.uuid4())),
        status="processing",
        message="Payment failure event ingested. Autonomous agent dispatched in background.",
        transaction_id=txn_id,
    )


@router.post("/stripe", response_model=WebhookResponse)
async def stripe_webhook(
    payload: Dict[str, Any],
    background_tasks: BackgroundTasks,
    stripe_signature: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    """
    Ingest Stripe payment failure event (`payment_intent.payment_failed` or `charge.failed`).
    """
    data_obj = payload.get("data", {}).get("object", {})
    txn_id = data_obj.get("id", f"pi_{uuid.uuid4().hex[:10]}")
    amount = float(data_obj.get("amount", 5000)) / 100.0
    cust_id = data_obj.get("customer") or "cust_stripe_live"

    _ensure_customer_exists(db, cust_id)

    existing = db.query(Transaction).filter(Transaction.id == txn_id).first()
    if not existing:
        new_txn = Transaction(
            id=txn_id,
            customer_id=cust_id,
            amount=amount,
            payment_method=PaymentMethod.CREDIT_CARD,
            failure_reason=FailureReason.AUTHENTICATION_FAILURE,
            retry_count=0,
            recovered=False,
            time_since_failure_hours=0.5,
            created_at=datetime.now(timezone.utc).replace(tzinfo=None),
        )
        db.add(new_txn)
        db.commit()

    background_tasks.add_task(_run_recovery_in_background, txn_id, True)

    return WebhookResponse(
        event_id=payload.get("id", str(uuid.uuid4())),
        status="processing",
        message="Stripe webhook processed. Recovery agent scheduled.",
        transaction_id=txn_id,
    )


@router.post("/simulate", response_model=WebhookResponse)
async def simulate_failure_webhook(req: SimulateWebhookRequest, db: Session = Depends(get_db)):
    """
    Simulate a live payment failure event and immediately execute the autonomous recovery pipeline.
    Perfect for interactive live demos and UI verification.
    """
    txn_id = f"sim_txn_{random.randint(10000, 99999)}"
    cust_id = req.customer_id or f"cust_{random.randint(100, 999)}"

    # Map string to enum
    method_map = {
        "card": PaymentMethod.CREDIT_CARD,
        "credit_card": PaymentMethod.CREDIT_CARD,
        "debit_card": PaymentMethod.DEBIT_CARD,
        "upi": PaymentMethod.UPI,
        "netbanking": PaymentMethod.NETBANKING,
        "wallet": PaymentMethod.WALLET,
    }
    reason_map = {
        "authentication_failure": FailureReason.AUTHENTICATION_FAILURE,
        "network_error": FailureReason.NETWORK_ERROR,
        "insufficient_funds": FailureReason.INSUFFICIENT_FUNDS,
        "card_expired": FailureReason.CARD_EXPIRED,
        "bank_declined": FailureReason.BANK_DECLINED,
        "fraud_flag": FailureReason.FRAUD_FLAG,
    }

    _ensure_customer_exists(db, cust_id)

    new_txn = Transaction(
        id=txn_id,
        customer_id=cust_id,
        amount=req.amount,
        payment_method=method_map.get(req.payment_method.lower(), PaymentMethod.UPI),
        failure_reason=reason_map.get(req.failure_reason.lower(), FailureReason.AUTHENTICATION_FAILURE),
        retry_count=0,
        recovered=False,
        time_since_failure_hours=1.0,
        created_at=datetime.now(timezone.utc).replace(tzinfo=None),
    )
    db.add(new_txn)
    db.commit()
    db.refresh(new_txn)

    # Immediately execute recovery agent
    agent = RecoveryAgent()
    decision = await agent.process_payment(txn_id, auto_execute=req.auto_execute)

    return WebhookResponse(
        event_id=f"evt_{uuid.uuid4().hex[:8]}",
        status="completed",
        message=f"Simulated payment failure for {txn_id} processed by Recovery Agent.",
        transaction_id=txn_id,
        agent_decision=decision,
    )
