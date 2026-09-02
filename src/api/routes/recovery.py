"""
ReviveAI — Recovery Routes

Endpoints for the recovery queue, predictions, and agent processing.
These are the AI-powered endpoints.
"""

from typing import Any, cast, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from src.db.session import get_db
from src.db.models import Transaction
from src.agent.recovery_agent import RecoveryAgent
from src.api.schemas import (
    RecoveryQueue,
    RecoveryQueueItem,
    RecoveryPredictionResponse,
    AgentDecision,
    AgentProcessRequest,
)

router = APIRouter(prefix="/api/recovery", tags=["recovery"])


@router.get("/queue", response_model=RecoveryQueue)
def get_recovery_queue(
    limit: int = 50,
    db: Session = Depends(get_db),
):
    """
    Get the prioritized recovery queue.

    Sorted by expected_recovery_value DESC (Phase 3+)
    or by amount DESC (before ML is integrated).
    """
    # For now (pre-ML), prioritize by amount
    # After Phase 3, this will use expected_recovery_value
    query = (
        db.query(Transaction)
        .filter(Transaction.recovered == False)  # noqa: E712
        .order_by(Transaction.amount.desc())
        .limit(limit)
    )

    items = query.all()
    total = db.query(Transaction).filter(Transaction.recovered == False).count()  # noqa: E712

    queue_items = []
    total_expected = 0.0

    for item in items:
        txn: Any = item
        erv = float(txn.expected_recovery_value) if txn.expected_recovery_value is not None else float(txn.amount) * 0.5
        total_expected += erv

        queue_items.append(RecoveryQueueItem(
            transaction_id=str(txn.id),
            customer_id=str(txn.customer_id),
            amount=float(txn.amount),
            payment_method=str(txn.payment_method.value if hasattr(txn.payment_method, 'value') else txn.payment_method),
            failure_reason=str(txn.failure_reason.value if hasattr(txn.failure_reason, 'value') else txn.failure_reason),
            retry_count=int(txn.retry_count),
            recovery_probability=float(txn.recovery_probability) if txn.recovery_probability is not None else None,
            expected_recovery_value=float(txn.expected_recovery_value) if txn.expected_recovery_value is not None else None,
            time_since_failure_hours=float(txn.time_since_failure_hours),
        ))

    return RecoveryQueue(
        items=queue_items,
        total_count=int(total),
        total_expected_recovery=round(total_expected, 2),
    )


@router.get("/predict/{transaction_id}", response_model=RecoveryPredictionResponse)
def predict_recovery(transaction_id: str, db: Session = Depends(get_db)):
    """
    Predict recovery probability for a specific transaction.

    Phase 2: Returns placeholder prediction.
    Phase 3: Will use the trained XGBoost model.
    """
    txn_record = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    if not txn_record:
        raise HTTPException(status_code=404, detail=f"Transaction {transaction_id} not found")
    txn: Any = txn_record

    # --- Placeholder prediction logic (replaced by ML model in Phase 3) ---
    # Simple heuristic based on key features
    prob: float = 0.5

    # Retry count effect
    prob -= int(txn.retry_count) * 0.1

    # Failure reason effect
    reason_effects = {
        "authentication_failure": 0.15,
        "network_error": 0.12,
        "technical_error": 0.08,
        "insufficient_funds": -0.05,
        "limit_exceeded": -0.08,
        "card_expired": -0.15,
        "bank_declined": -0.20,
        "fraud_flag": -0.35,
    }
    failure_str = str(txn.failure_reason.value if hasattr(txn.failure_reason, 'value') else txn.failure_reason)
    prob += reason_effects.get(failure_str, 0.0)

    # Clamp
    prob = max(0.05, min(0.95, prob))

    # Risk level
    if prob >= 0.7:
        risk_level = "low"
        action = "retry"
    elif prob >= 0.4:
        risk_level = "medium"
        action = "notify_customer"
    elif prob >= 0.2:
        risk_level = "high"
        action = "escalate"
    else:
        risk_level = "critical"
        action = "no_action"

    erv = round(float(txn.amount) * prob, 2)

    return RecoveryPredictionResponse(
        transaction_id=str(txn.id),
        recovery_probability=round(prob, 4),
        expected_recovery_value=erv,
        risk_level=risk_level,
        recommended_action=action,
        confidence=0.3,  # low confidence until ML model is trained
    )


@router.get("/stats/summary")
def recovery_summary(db: Session = Depends(get_db)):
    """Quick recovery statistics."""
    from sqlalchemy import func

    total = db.query(func.count(Transaction.id)).scalar()
    recovered = db.query(func.count(Transaction.id)).filter(Transaction.recovered == True).scalar()  # noqa: E712
    not_recovered = total - recovered

    total_amount = db.query(func.sum(Transaction.amount)).scalar() or 0
    recovered_amount = (
        db.query(func.sum(Transaction.amount))
        .filter(Transaction.recovered == True)  # noqa: E712
        .scalar() or 0
    )

    return {
        "total_transactions": total,
        "recovered": recovered,
        "not_recovered": not_recovered,
        "recovery_rate": round(recovered / total, 4) if total > 0 else 0,
        "total_failed_amount": round(total_amount, 2),
        "recovered_amount": round(recovered_amount, 2),
        "at_risk_amount": round(total_amount - recovered_amount, 2),
    }


@router.post("/process", response_model=AgentDecision)
async def process_transaction(request: AgentProcessRequest):
    """
    Run the full AI Recovery Agent pipeline on a failed transaction.
    (Fetch Context -> ML Prediction -> AI Diagnosis -> Policy Engine -> Execution -> Audit Log)
    """
    agent = RecoveryAgent()
    result = await agent.process_payment(request.transaction_id, auto_execute=request.auto_execute)
    if not result:
        raise HTTPException(status_code=404, detail=f"Transaction {request.transaction_id} not found")

    return AgentDecision(
        transaction_id=request.transaction_id,
        audit_id=str(result.get("audit_id", "")),
        recovery_probability=float(result.get("recovery_probability", 0.0)),
        expected_recovery_value=float(result.get("expected_recovery_value", 0.0)),
        diagnosis=str(result.get("diagnosis", "")),
        reasoning=str(result.get("reasoning", "")),
        llm_confidence=float(result.get("llm_confidence", 0.0)),
        recommended_action=str(result.get("recommended_action", "")),
        policy_approved=bool(result.get("policy_approved", False)),
        policy_violations=list(result.get("policy_violations", [])),
        final_action=str(result.get("final_action", "")),
        status=str(result.get("status", "completed")),
    )


@router.get("/escalations")
def get_escalated_queue(db: Session = Depends(get_db)):
    """
    Retrieve Human-in-the-Loop (HITL) review queue.
    Lists high-value or policy-blocked transactions requiring human review.
    """
    from src.db.models import RecoveryDecision, Escalation, EscalationStatus

    escalations = (
        db.query(Escalation)
        .filter(Escalation.status == EscalationStatus.OPEN)
        .order_by(Escalation.created_at.desc())
        .limit(20)
        .all()
    )

    items = []
    for esc in escalations:
        txn = db.query(Transaction).filter(Transaction.id == esc.transaction_id).first()
        items.append({
            "escalation_id": esc.id,
            "transaction_id": esc.transaction_id,
            "customer_id": txn.customer_id if txn else "unknown",
            "amount": float(txn.amount) if txn else 0.0,
            "failure_reason": str(txn.failure_reason.value if txn and hasattr(txn.failure_reason, 'value') else (txn.failure_reason if txn else 'unknown')),
            "reason": esc.reason,
            "priority": str(esc.priority.value if hasattr(esc.priority, 'value') else esc.priority),
            "created_at": str(esc.created_at),
        })

    return {
        "count": len(items),
        "escalations": items,
    }


class OverrideRequest(BaseModel):
    transaction_id: str
    action: str = Field(description="retry, notify_customer, block, resolve")
    operator_reason: str = Field(description="Reason for manual override")


@router.post("/override")
async def manual_override(req: OverrideRequest, db: Session = Depends(get_db)):
    """
    Execute human-in-the-loop manual override for an escalated transaction.
    """
    from src.agent.tools import AgentTools

    tools = AgentTools()
    tools.log_decision({
        "event": "manual_override",
        "transaction_id": req.transaction_id,
        "action": req.action,
        "operator_reason": req.operator_reason,
    })

    if req.action == "retry":
        res = tools.schedule_retry(req.transaction_id, delay_hours=1.0)
    elif req.action == "notify_customer":
        res = tools.send_notification("cust_hitl", f"Manual review resolution for payment {req.transaction_id}")
    else:
        res = {"status": "resolved", "action": req.action}

    return {
        "success": True,
        "transaction_id": req.transaction_id,
        "action_taken": req.action,
        "operator_reason": req.operator_reason,
        "details": res,
    }


@router.get("/llm-status")
def get_llm_status():
    """
    Retrieve active Model-Agnostic LLM Provider telemetry.
    """
    from src.ai.diagnosis import get_diagnosis_service
    svc = get_diagnosis_service()
    return svc.get_provider_status()


class LLMProviderSwitchRequest(BaseModel):
    provider: str = Field(description="gemini, ollama, openai_compatible, heuristic, auto")
    model: Optional[str] = Field(default=None, description="Optional model identifier")


@router.post("/llm-provider")
def set_llm_provider(req: LLMProviderSwitchRequest):
    """
    Dynamically switch active LLM reasoning engine between Gemini, Qwen/Gemma, or Heuristics.
    """
    from src.ai.llm_provider import get_llm_manager
    mgr = get_llm_manager()
    mgr.set_preferred_provider(req.provider, req.model)
    return mgr.get_active_provider_info()

