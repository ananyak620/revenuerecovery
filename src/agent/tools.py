"""
ReviveAI — Agent Tools

Tool definitions for the Recovery Agent.
Each tool is a callable that the agent can invoke during its workflow.
Tools follow a consistent interface for logging and auditability.
"""

from datetime import datetime, timedelta, timezone
from typing import Any

from src.db.models import (
    Customer,
    RecoveryAction,
    RecoveryAttempt,
    RecoveryStatus,
    Transaction,
)
from src.db.session import SessionLocal


def _utc_now() -> datetime:
    """Return timezone-aware or UTC-compatible datetime."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


class AgentTools:
    """
    Collection of tools the Recovery Agent can call.

    Each tool:
    - Takes structured input
    - Returns structured output
    - Logs what it did
    - Is safe to call (no side effects without policy approval)
    """

    def __init__(self) -> None:
        self.action_log: list[dict[str, Any]] = []

    def _log(
        self,
        tool_name: str,
        input_data: dict[str, Any],
        output_data: dict[str, Any],
    ) -> None:
        """Log every tool call for audit trail."""
        self.action_log.append({
            "tool": tool_name,
            "timestamp": _utc_now().isoformat(),
            "input": input_data,
            "output": output_data,
        })

    def check_payment(self, transaction_id: str) -> dict[str, Any]:
        """Retrieve current payment status and details."""
        db = SessionLocal()
        result: dict[str, Any]
        try:
            txn = db.query(Transaction).filter(Transaction.id == transaction_id).first()
            if not txn:
                result = {
                    "found": False,
                    "error": f"Transaction {transaction_id} not found",
                }
            else:
                pm = (
                    txn.payment_method.value
                    if hasattr(txn.payment_method, "value")
                    else str(txn.payment_method)
                )
                fr = (
                    txn.failure_reason.value
                    if hasattr(txn.failure_reason, "value")
                    else str(txn.failure_reason)
                )

                amount_val = getattr(txn, "amount", 0.0)
                retry_val = getattr(txn, "retry_count", 0)
                time_val = getattr(txn, "time_since_failure_hours", 0.0)
                hour_val = getattr(txn, "hour_of_day", 0)
                day_val = getattr(txn, "day_of_week", 0)
                is_weekend_val = getattr(txn, "is_weekend", False)
                rec_prob = getattr(txn, "recovery_probability", None)
                exp_rec = getattr(txn, "expected_recovery_value", None)

                result = {
                    "found": True,
                    "transaction_id": str(txn.id),
                    "customer_id": str(txn.customer_id),
                    "amount": float(amount_val) if amount_val is not None else 0.0,
                    "payment_method": pm,
                    "failure_reason": fr,
                    "retry_count": int(retry_val) if retry_val is not None else 0,
                    "recovered": bool(txn.recovered),
                    "time_since_failure_hours": (
                        float(time_val) if time_val is not None else 0.0
                    ),
                    "hour_of_day": int(hour_val) if hour_val is not None else 0,
                    "day_of_week": int(day_val) if day_val is not None else 0,
                    "is_weekend": int(bool(is_weekend_val)),
                    "recovery_probability": (
                        float(rec_prob) if rec_prob is not None else None
                    ),
                    "expected_recovery_value": (
                        float(exp_rec) if exp_rec is not None else None
                    ),
                }
        except Exception as e:
            result = {
                "found": False,
                "error": str(e),
            }
        finally:
            db.close()

        self._log("check_payment", {"transaction_id": transaction_id}, result)
        return result

    def get_customer_history(self, customer_id: str) -> dict[str, Any]:
        """Retrieve customer profile and transaction history."""
        db = SessionLocal()
        result: dict[str, Any]
        try:
            customer = db.query(Customer).filter(Customer.id == customer_id).first()
            if not customer:
                result = {
                    "found": False,
                    "error": f"Customer {customer_id} not found",
                }
            else:
                txns = (
                    db.query(Transaction)
                    .filter(Transaction.customer_id == customer_id)
                    .all()
                )
                total = len(txns)
                recovered = sum(1 for t in txns if bool(t.recovered))
                sub_type = (
                    customer.subscription_type.value
                    if hasattr(customer.subscription_type, "value")
                    else str(customer.subscription_type)
                )

                tenure_val = getattr(customer, "tenure_days", 0)
                ltv_val = getattr(customer, "customer_ltv", 0.0)
                prev_rate_val = getattr(customer, "previous_success_rate", 0.5)
                hist_rec_val = getattr(customer, "historical_recovery_rate", 0.5)
                tickets_val = getattr(customer, "support_tickets_last_30d", 0)
                login_val = getattr(customer, "days_since_last_login", 0)
                nps_val = getattr(customer, "nps_score", 5.0)

                result = {
                    "found": True,
                    "customer_id": str(customer.id),
                    "tenure_days": int(tenure_val) if tenure_val is not None else 0,
                    "subscription_type": sub_type,
                    "industry": str(customer.industry or "saas"),
                    "region": str(customer.region or "metro"),
                    "device_type": str(customer.device_type or "mobile"),
                    "customer_ltv": float(ltv_val) if ltv_val is not None else 0.0,
                    "previous_success_rate": (
                        float(prev_rate_val) if prev_rate_val is not None else 0.5
                    ),
                    "historical_recovery_rate": (
                        float(hist_rec_val) if hist_rec_val is not None else 0.5
                    ),
                    "support_tickets_last_30d": (
                        int(tickets_val) if tickets_val is not None else 0
                    ),
                    "days_since_last_login": (
                        int(login_val) if login_val is not None else 0
                    ),
                    "nps_score": float(nps_val) if nps_val is not None else 5.0,
                    "total_transactions": total,
                    "recovered_transactions": recovered,
                    "customer_recovery_rate": (
                        round(recovered / total, 4) if total > 0 else 0.0
                    ),
                }
        except Exception as e:
            result = {
                "found": False,
                "error": str(e),
            }
        finally:
            db.close()

        self._log("get_customer_history", {"customer_id": customer_id}, result)
        return result

    def schedule_retry(
        self, transaction_id: str, delay_hours: float = 6.0
    ) -> dict[str, Any]:
        """Schedule a payment retry (simulated)."""
        scheduled_at = _utc_now() + timedelta(hours=delay_hours)

        db = SessionLocal()
        result: dict[str, Any]
        try:
            attempt = RecoveryAttempt(
                transaction_id=transaction_id,
                action=RecoveryAction.RETRY,
                status=RecoveryStatus.PENDING,
                scheduled_at=scheduled_at,
            )
            db.add(attempt)
            db.commit()
            db.refresh(attempt)

            attempt_id = getattr(attempt, "id", 0)
            result = {
                "success": True,
                "attempt_id": int(attempt_id) if attempt_id is not None else 0,
                "scheduled_at": scheduled_at.isoformat(),
                "delay_hours": float(delay_hours),
                "message": (
                    f"Retry scheduled for {scheduled_at.strftime('%Y-%m-%d %H:%M UTC')}"
                ),
            }
        except Exception as e:
            db.rollback()
            result = {"success": False, "error": str(e)}
        finally:
            db.close()

        self._log(
            "schedule_retry",
            {"transaction_id": transaction_id, "delay_hours": delay_hours},
            result,
        )
        return result

    def send_notification(
        self, transaction_id: str, customer_id: str, message: str
    ) -> dict[str, Any]:
        """Send a customer notification (simulated)."""
        db = SessionLocal()
        result: dict[str, Any]
        try:
            attempt = RecoveryAttempt(
                transaction_id=transaction_id,
                action=RecoveryAction.NOTIFY_CUSTOMER,
                status=RecoveryStatus.IN_PROGRESS,
                executed_at=_utc_now(),
                result_message=message,
            )
            db.add(attempt)
            db.commit()
            db.refresh(attempt)

            attempt_id = getattr(attempt, "id", 0)
            result = {
                "success": True,
                "attempt_id": int(attempt_id) if attempt_id is not None else 0,
                "notification_sent": True,
                "customer_id": customer_id,
                "channel": "email",
                "message_preview": (
                    message[:100] + "..." if len(message) > 100 else message
                ),
            }
        except Exception as e:
            db.rollback()
            result = {"success": False, "error": str(e)}
        finally:
            db.close()

        self._log(
            "send_notification",
            {
                "transaction_id": transaction_id,
                "customer_id": customer_id,
            },
            result,
        )
        return result

    def create_escalation(
        self, transaction_id: str, reason: str, priority: str = "high"
    ) -> dict[str, Any]:
        """Create an escalation ticket (simulated)."""
        db = SessionLocal()
        result: dict[str, Any]
        try:
            attempt = RecoveryAttempt(
                transaction_id=transaction_id,
                action=RecoveryAction.ESCALATE,
                status=RecoveryStatus.ESCALATED,
                executed_at=_utc_now(),
                result_message=f"Escalated: {reason}",
            )
            db.add(attempt)
            db.commit()
            db.refresh(attempt)

            attempt_id = getattr(attempt, "id", 0)
            result = {
                "success": True,
                "attempt_id": int(attempt_id) if attempt_id is not None else 0,
                "escalation_created": True,
                "priority": priority,
                "reason": reason,
                "assigned_to": "customer_success_team",
                "ticket_id": f"ESC-{transaction_id[-6:]}",
            }
        except Exception as e:
            db.rollback()
            result = {"success": False, "error": str(e)}
        finally:
            db.close()

        self._log(
            "create_escalation",
            {
                "transaction_id": transaction_id,
                "reason": reason,
                "priority": priority,
            },
            result,
        )
        return result

    def request_payment_update(
        self,
        transaction_id: str,
        customer_id: str,
        link_type: str = "hosted_portal",
    ) -> dict[str, Any]:
        """Send a direct link to the customer to update their card or payment method."""
        db = SessionLocal()
        result: dict[str, Any]
        try:
            attempt = RecoveryAttempt(
                transaction_id=transaction_id,
                action=RecoveryAction.UPDATE_PAYMENT,
                status=RecoveryStatus.IN_PROGRESS,
                executed_at=_utc_now(),
                result_message=f"Payment update link generated ({link_type})",
            )
            db.add(attempt)
            db.commit()
            db.refresh(attempt)

            attempt_id = getattr(attempt, "id", 0)
            result = {
                "success": True,
                "attempt_id": int(attempt_id) if attempt_id is not None else 0,
                "update_requested": True,
                "customer_id": customer_id,
                "update_url": (
                    f"https://pay.reviveai.io/update/{customer_id}?txn={transaction_id}"
                ),
                "channel": "email",
            }
        except Exception as e:
            db.rollback()
            result = {"success": False, "error": str(e)}
        finally:
            db.close()

        self._log(
            "request_payment_update",
            {"transaction_id": transaction_id, "customer_id": customer_id},
            result,
        )
        return result

    def offer_alternative_payment(
        self,
        transaction_id: str,
        customer_id: str,
        alternative_methods: list[str] | None = None,
    ) -> dict[str, Any]:
        """Offer alternative payment rails (UPI, Netbanking, Cards) to resolve declines."""
        methods = alternative_methods or ["upi", "netbanking"]
        db = SessionLocal()
        result: dict[str, Any]
        try:
            attempt = RecoveryAttempt(
                transaction_id=transaction_id,
                action=RecoveryAction.OFFER_ALTERNATIVE,
                status=RecoveryStatus.IN_PROGRESS,
                executed_at=_utc_now(),
                result_message=(
                    f"Alternative payment methods offered: {', '.join(methods)}"
                ),
            )
            db.add(attempt)
            db.commit()
            db.refresh(attempt)

            attempt_id = getattr(attempt, "id", 0)
            result = {
                "success": True,
                "attempt_id": int(attempt_id) if attempt_id is not None else 0,
                "alternatives_offered": methods,
                "customer_id": customer_id,
                "switch_url": f"https://pay.reviveai.io/switch/{transaction_id}",
            }
        except Exception as e:
            db.rollback()
            result = {"success": False, "error": str(e)}
        finally:
            db.close()

        self._log(
            "offer_alternative_payment",
            {"transaction_id": transaction_id, "methods": methods},
            result,
        )
        return result

    def log_decision(self, decision_data: dict[str, Any]) -> dict[str, Any]:
        """Log the agent's decision to the audit trail."""
        self._log("log_decision", decision_data, {"logged": True})
        return {"logged": True, "timestamp": _utc_now().isoformat()}

    def get_action_log(self) -> list[dict[str, Any]]:
        """Return the complete action log for this session."""
        return self.action_log.copy()

    @staticmethod
    def get_tool_descriptions() -> list[dict[str, Any]]:
        """Return tool descriptions (for LLM tool-calling context)."""
        return [
            {
                "name": "check_payment",
                "description": (
                    "Retrieve current payment status and transaction details"
                ),
                "parameters": {"transaction_id": "string"},
            },
            {
                "name": "get_customer_history",
                "description": (
                    "Retrieve customer profile, tenure, and payment history"
                ),
                "parameters": {"customer_id": "string"},
            },
            {
                "name": "schedule_retry",
                "description": (
                    "Schedule a payment retry with a specified delay"
                ),
                "parameters": {
                    "transaction_id": "string",
                    "delay_hours": "float (default 6.0)",
                },
            },
            {
                "name": "send_notification",
                "description": (
                    "Send a notification to the customer about their payment"
                ),
                "parameters": {
                    "transaction_id": "string",
                    "customer_id": "string",
                    "message": "string",
                },
            },
            {
                "name": "create_escalation",
                "description": (
                    "Create an escalation ticket for human review"
                ),
                "parameters": {
                    "transaction_id": "string",
                    "reason": "string",
                    "priority": "string",
                },
            },
            {
                "name": "request_payment_update",
                "description": (
                    "Send a direct payment update link to the customer "
                    "(e.g. expired card)"
                ),
                "parameters": {
                    "transaction_id": "string",
                    "customer_id": "string",
                },
            },
            {
                "name": "offer_alternative_payment",
                "description": (
                    "Offer alternative payment rails (UPI, Netbanking) when "
                    "current rail fails"
                ),
                "parameters": {
                    "transaction_id": "string",
                    "customer_id": "string",
                },
            },
            {
                "name": "log_decision",
                "description": "Log the agent's decision to the audit trail",
                "parameters": {"decision_data": "dict"},
            },
        ]
