"""
ReviveAI — Transaction Routes

CRUD endpoints for payment transactions.
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, Float
from sqlalchemy.orm import Session

from src.db.session import get_db
from src.db.models import Transaction, Customer
from src.api.schemas import TransactionResponse, TransactionList

router = APIRouter(prefix="/api/transactions", tags=["transactions"])


from src.ml.predict import get_predictor


def _enrich_transaction_response(txn: Transaction) -> TransactionResponse:
    resp = TransactionResponse.model_validate(txn)
    if resp.recovery_probability is not None and not resp.risk_tier:
        prob = resp.recovery_probability
        if int(txn.retry_count or 0) >= 5:
            resp.risk_tier = "Critical"
            resp.recommended_action = "no_action"
        elif prob >= 0.7:
            resp.risk_tier = "Low"
            resp.recommended_action = "retry"
        elif prob >= 0.4:
            resp.risk_tier = "Medium"
            resp.recommended_action = "notify_customer"
        elif prob >= 0.2:
            resp.risk_tier = "High"
            resp.recommended_action = "escalate"
        else:
            resp.risk_tier = "Critical"
            resp.recommended_action = "no_action"
    elif not resp.risk_tier:
        try:
            predictor = get_predictor()
            pred = predictor.predict({
                "transaction_id": txn.id,
                "amount": txn.amount,
                "payment_method": txn.payment_method.value if hasattr(txn.payment_method, "value") else str(txn.payment_method),
                "failure_reason": txn.failure_reason.value if hasattr(txn.failure_reason, "value") else str(txn.failure_reason),
                "retry_count": txn.retry_count,
            })
            resp.risk_tier = pred.get("risk_level", "medium").capitalize()
            resp.recommended_action = pred.get("recommended_action")
            if resp.recovery_probability is None:
                resp.recovery_probability = pred.get("recovery_probability")
            if resp.expected_recovery_value is None:
                resp.expected_recovery_value = pred.get("expected_recovery_value")
        except Exception:
            resp.risk_tier = "Medium"
            resp.recommended_action = "notify_customer"
    return resp


@router.get("/", response_model=TransactionList)
def list_transactions(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    failure_reason: Optional[str] = None,
    payment_method: Optional[str] = None,
    recovered: Optional[bool] = None,
    min_amount: Optional[float] = None,
    max_amount: Optional[float] = None,
    sort_by: str = Query("amount", pattern="^(amount|retry_count|time_since_failure_hours|recovery_probability)$"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$"),
    db: Session = Depends(get_db),
):
    """
    List failed payment transactions with filtering, sorting, and pagination.
    """
    query = db.query(Transaction)

    # Filters
    if failure_reason:
        query = query.filter(Transaction.failure_reason == failure_reason)
    if payment_method:
        query = query.filter(Transaction.payment_method == payment_method)
    if recovered is not None:
        query = query.filter(Transaction.recovered == recovered)
    if min_amount is not None:
        query = query.filter(Transaction.amount >= min_amount)
    if max_amount is not None:
        query = query.filter(Transaction.amount <= max_amount)

    # Count before pagination
    total = query.count()

    # Sort
    actual_sort_by = sort_by.default if hasattr(sort_by, "default") else sort_by
    if not isinstance(actual_sort_by, str):
        actual_sort_by = "amount"

    actual_sort_order = sort_order.default if hasattr(sort_order, "default") else sort_order
    if not isinstance(actual_sort_order, str):
        actual_sort_order = "desc"

    sort_col = getattr(Transaction, actual_sort_by, Transaction.amount)
    query = query.order_by(sort_col.desc() if actual_sort_order == "desc" else sort_col.asc())

    # Paginate
    offset = (page - 1) * page_size
    items = query.offset(offset).limit(page_size).all()

    return TransactionList(
        total=total,
        items=[_enrich_transaction_response(t) for t in items],
        page=page,
        page_size=page_size,
    )


@router.get("/stats/failure-reasons")
def failure_reason_stats(db: Session = Depends(get_db)):
    """Get transaction counts and recovery rates by failure reason."""
    results = (
        db.query(
            Transaction.failure_reason,
            func.count(Transaction.id).label("count"),
            func.avg(Transaction.recovered.cast(Float)).label("recovery_rate"),
            func.avg(Transaction.amount).label("avg_amount"),
        )
        .group_by(Transaction.failure_reason)
        .all()
    )

    return [
        {
            "failure_reason": r.failure_reason,
            "count": r.count,
            "recovery_rate": round(float(r.recovery_rate or 0), 4),
            "avg_amount": round(float(r.avg_amount or 0), 2),
        }
        for r in results
    ]


@router.get("/customer/{customer_id}", response_model=TransactionList)
def get_customer_transactions(
    customer_id: str,
    db: Session = Depends(get_db),
):
    """Get all transactions for a specific customer."""
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail=f"Customer {customer_id} not found")

    txns = db.query(Transaction).filter(Transaction.customer_id == customer_id).all()
    return TransactionList(
        total=len(txns),
        items=[_enrich_transaction_response(t) for t in txns],
    )


@router.get("/{transaction_id}", response_model=TransactionResponse)
def get_transaction(transaction_id: str, db: Session = Depends(get_db)):
    """Get a single transaction by ID with risk tier."""
    txn = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    if not txn:
        raise HTTPException(status_code=404, detail=f"Transaction {transaction_id} not found")
    return _enrich_transaction_response(txn)
