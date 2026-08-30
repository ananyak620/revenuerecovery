"""
ReviveAI — Dashboard Routes

Aggregated endpoints for the merchant dashboard (Phase 8 frontend).
"""

from fastapi import APIRouter, Depends
from sqlalchemy import func, case
from sqlalchemy.orm import Session

from src.db.session import get_db
from src.db.models import Transaction
from src.api.schemas import DashboardStats

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/stats", response_model=DashboardStats)
def get_dashboard_stats(db: Session = Depends(get_db)):
    """
    Compute aggregated dashboard statistics from the database.
    All metrics calculated in real-time from actual data.
    """
    # Base query
    total = db.query(func.count(Transaction.id)).scalar() or 0
    recovered_count = db.query(func.count(Transaction.id)).filter(
        Transaction.recovered == True  # noqa: E712
    ).scalar() or 0
    failed_count = total - recovered_count

    total_amount = db.query(func.sum(Transaction.amount)).scalar() or 0.0
    recovered_amount = db.query(func.sum(Transaction.amount)).filter(
        Transaction.recovered == True  # noqa: E712
    ).scalar() or 0.0

    at_risk = total_amount - recovered_amount
    recovery_rate = recovered_count / total if total > 0 else 0.0

    # Average ML prediction (will be populated in Phase 3)
    avg_prob = db.query(func.avg(Transaction.recovery_probability)).scalar()

    # Expected total recovery
    expected = db.query(func.sum(Transaction.expected_recovery_value)).scalar()

    # Recovery by failure reason
    reason_stats = (
        db.query(
            Transaction.failure_reason,
            func.avg(
                case((Transaction.recovered == True, 1.0), else_=0.0)  # noqa: E712
            ).label("rate"),
        )
        .group_by(Transaction.failure_reason)
        .all()
    )
    recovery_by_reason = {
        (r.failure_reason.value if hasattr(r.failure_reason, 'value') else str(r.failure_reason)):
        round(float(r.rate or 0), 4)
        for r in reason_stats
    }

    # Recovery by payment method
    method_stats = (
        db.query(
            Transaction.payment_method,
            func.avg(
                case((Transaction.recovered == True, 1.0), else_=0.0)  # noqa: E712
            ).label("rate"),
        )
        .group_by(Transaction.payment_method)
        .all()
    )
    recovery_by_method = {
        (m.payment_method.value if hasattr(m.payment_method, 'value') else str(m.payment_method)):
        round(float(m.rate or 0), 4)
        for m in method_stats
    }

    # Recovery by retry count
    retry_stats = (
        db.query(
            Transaction.retry_count,
            func.avg(
                case((Transaction.recovered == True, 1.0), else_=0.0)  # noqa: E712
            ).label("rate"),
        )
        .group_by(Transaction.retry_count)
        .all()
    )
    recovery_by_retry = {
        r.retry_count: round(float(r.rate or 0), 4)
        for r in retry_stats
    }

    # Pending / in-progress (will be more useful after Phase 5)
    pending = db.query(func.count(Transaction.id)).filter(
        Transaction.recovered == False  # noqa: E712
    ).scalar() or 0

    return DashboardStats(
        total_transactions=total,
        total_failed_amount=round(total_amount, 2),
        total_recovered_amount=round(recovered_amount, 2),
        recovery_rate=round(recovery_rate, 4),
        avg_recovery_probability=round(float(avg_prob or 0), 4),
        at_risk_revenue=round(at_risk, 2),
        expected_total_recovery=round(float(expected or 0), 2),
        recovery_by_reason=recovery_by_reason,
        recovery_by_method=recovery_by_method,
        recovery_by_retry_count=recovery_by_retry,
        pending_recovery=pending,
        in_progress=0,
        recovered_count=recovered_count,
        failed_count=failed_count,
    )
