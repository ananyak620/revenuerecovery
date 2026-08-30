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
    sort_col = getattr(Transaction, sort_by)
    query = query.order_by(sort_col.desc() if sort_order == "desc" else sort_col.asc())

    # Paginate
    offset = (page - 1) * page_size
    items = query.offset(offset).limit(page_size).all()

    return TransactionList(
        total=total,
        items=[TransactionResponse.model_validate(t) for t in items],
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
        items=[TransactionResponse.model_validate(t) for t in txns],
    )


@router.get("/{transaction_id}", response_model=TransactionResponse)
def get_transaction(transaction_id: str, db: Session = Depends(get_db)):
    """Get a single transaction by ID."""
    txn = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    if not txn:
        raise HTTPException(status_code=404, detail=f"Transaction {transaction_id} not found")
    return TransactionResponse.model_validate(txn)
