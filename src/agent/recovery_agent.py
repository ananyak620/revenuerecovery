"""
ReviveAI — Recovery Agent Orchestrator

The main agent that processes failed payments through the full pipeline:
ML Prediction → LLM Diagnosis → Policy Check → Action Execution → Audit Log

This is the core of the agentic AI system.
"""

from datetime import datetime, timezone

from src.ml.predict import get_predictor
from src.ai.diagnosis import get_diagnosis_service
from src.agent.policy_engine import get_policy_engine
from src.agent.tools import AgentTools
from src.db.session import SessionLocal
from src.db.models import Transaction, RecoveryDecision


def _utc_now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


class RecoveryAgent:
    """
    Autonomous Revenue Recovery Agent.

    Workflow:
    1. Fetch transaction data
    2. Get ML recovery prediction
    3. Get LLM failure diagnosis
    4. Check policy engine
    5. Execute approved action (or escalate if blocked)
    6. Log decision to audit trail
    """

    def __init__(self):
        self.predictor = get_predictor()
        self.diagnosis_service = get_diagnosis_service()
        self.policy_engine = get_policy_engine()
        self.tools = AgentTools()

    async def process_payment(
        self, transaction_id: str, auto_execute: bool = False
    ) -> dict:
        """
        Process a single failed payment through the full recovery pipeline.

        Args:
            transaction_id: The failed payment to process
            auto_execute: If True, execute the action after policy check

        Returns:
            Complete decision record with audit trail
        """
        print(f"\n{'═' * 60}")
        print(f"  Recovery Agent — Processing {transaction_id}")
        print(f"{'═' * 60}")

        # ─── Step 1: Fetch Transaction ─────────────────────────
        print("\n  [1/6] Fetching transaction data...")
        payment_data = self.tools.check_payment(transaction_id)
        if not payment_data.get("found"):
            return {"error": f"Transaction {transaction_id} not found", "status": "failed"}

        # Also fetch customer history
        customer_data = self.tools.get_customer_history(payment_data.get("customer_id", ""))

        # Build full context
        txn_context = self._build_context(payment_data, customer_data)
        print(f"    ✓ Amount: ₹{payment_data['amount']:,.2f}")
        print(f"    ✓ Failure: {payment_data['failure_reason']}")
        print(f"    ✓ Retries: {payment_data['retry_count']}")

        # ─── Step 2: ML Prediction ─────────────────────────────
        print("\n  [2/6] Running ML prediction...")
        prediction = self.predictor.predict(txn_context)
        print(f"    ✓ Recovery probability: {prediction['recovery_probability']:.1%}")
        print(f"    ✓ Expected recovery: ₹{prediction['expected_recovery_value']:,.2f}")
        print(f"    ✓ Risk level: {prediction['risk_level']}")
        print(f"    ✓ Model: {prediction['model_used']}")

        # ─── Step 3: LLM Diagnosis ─────────────────────────────
        print("\n  [3/6] Running AI diagnosis...")
        diagnosis = await self.diagnosis_service.diagnose(txn_context, prediction)
        print(f"    ✓ Diagnosis: {diagnosis.get('diagnosis', 'N/A')[:80]}...")
        print(f"    ✓ Recommended: {diagnosis.get('recommended_action', 'N/A')}")
        print(f"    ✓ Temporary: {diagnosis.get('is_temporary', 'N/A')}")
        print(f"    ✓ Source: {diagnosis.get('source', 'N/A')}")

        # ─── Step 4: Policy Check ──────────────────────────────
        recommended_action = diagnosis.get("recommended_action", "no_action")
        print(f"\n  [4/6] Policy engine check for action: '{recommended_action}'...")
        policy_result = self.policy_engine.check(
            action=recommended_action,
            transaction=txn_context,
            prediction=prediction,
            diagnosis=diagnosis,
        )
        print(f"    ✓ Approved: {policy_result.approved}")
        if policy_result.violations:
            for v in policy_result.violations:
                print(f"    ✗ VIOLATION: {v}")
        if policy_result.warnings:
            for w in policy_result.warnings:
                print(f"    △ WARNING: {w}")

        # Determine final action
        final_action = (
            policy_result.modified_action
            if policy_result.modified_action
            else recommended_action
        )
        if final_action != recommended_action:
            print(f"    ⚠ Action modified: '{recommended_action}' → '{final_action}'")

        # ─── Step 5: Execute (if auto_execute) ─────────────────
        execution_result = None
        if auto_execute and policy_result.approved:
            print(f"\n  [5/6] Executing action: '{final_action}'...")
            execution_result = self._execute_action(
                final_action, transaction_id, txn_context, diagnosis
            )
            print(f"    ✓ Execution result: {execution_result.get('success', False)}")
        elif auto_execute and not policy_result.approved:
            print(f"\n  [5/6] Action BLOCKED by policy engine. Executing fallback...")
            execution_result = self._execute_action(
                final_action, transaction_id, txn_context, diagnosis
            )
        else:
            print(f"\n  [5/6] Action '{final_action}' ready (auto_execute=False)")

        # ─── Step 6: Log to Audit Trail ────────────────────────
        print("\n  [6/6] Logging decision to audit trail...")
        audit_id = f"REC-{transaction_id[-6:]}-{_utc_now().strftime('%H%M%S')}"

        decision_record = {
            "transaction_id": transaction_id,
            "audit_id": audit_id,
            "timestamp": _utc_now().isoformat(),

            # ML
            "recovery_probability": prediction["recovery_probability"],
            "expected_recovery_value": prediction["expected_recovery_value"],
            "risk_level": prediction["risk_level"],
            "model_used": prediction["model_used"],

            # LLM
            "diagnosis": diagnosis.get("diagnosis", ""),
            "root_cause": diagnosis.get("root_cause", ""),
            "is_temporary": diagnosis.get("is_temporary", False),
            "reasoning": diagnosis.get("action_reasoning", ""),
            "llm_confidence": diagnosis.get("confidence", 0),
            "llm_source": diagnosis.get("source", ""),

            # Policy
            "recommended_action": recommended_action,
            "policy_approved": policy_result.approved,
            "policy_violations": policy_result.violations,
            "policy_warnings": policy_result.warnings,

            # Final
            "final_action": final_action,
            "execution_result": execution_result,
            "action_log": self.tools.get_action_log(),

            "status": "executed" if execution_result else "pending",
        }

        self.tools.log_decision(decision_record)
        self._save_decision(decision_record)

        print(f"    ✓ Audit ID: {audit_id}")

        print(f"\n{'═' * 60}")
        print(f"  ✅ Agent Decision: {final_action.upper()}")
        print(f"     Recovery Probability: {prediction['recovery_probability']:.1%}")
        print(f"     Policy: {'✓ Approved' if policy_result.approved else '✗ Blocked'}")
        print(f"     Audit: {audit_id}")
        print(f"{'═' * 60}")

        return decision_record

    def _build_context(self, payment: dict, customer: dict) -> dict:
        """Merge payment and customer data into full context."""
        context = {**payment}
        if customer.get("found"):
            context.update({
                "customer_tenure_days": customer.get("tenure_days", 0),
                "subscription_type": customer.get("subscription_type", "starter"),
                "previous_success_rate": customer.get("previous_success_rate", 0.5),
                "historical_recovery_rate": customer.get("historical_recovery_rate", 0.5),
                "nps_score": customer.get("nps_score", 5),
                "support_tickets_last_30d": customer.get("support_tickets_last_30d", 0),
                "days_since_last_login": customer.get("days_since_last_login", 0),
                "device_type": customer.get("device_type", "mobile"),
                "region": customer.get("region", "metro"),
                "industry": customer.get("industry", "saas"),
                "customer_ltv": customer.get("customer_ltv", 5000),
            })
        # Add defaults for ML features that might be missing
        context.setdefault("customer_tenure_days", 0)
        context.setdefault("subscription_type", "starter")
        context.setdefault("previous_success_rate", 0.5)
        context.setdefault("historical_recovery_rate", 0.5)
        context.setdefault("nps_score", 5)
        context.setdefault("support_tickets_last_30d", 0)
        context.setdefault("days_since_last_login", 0)
        context.setdefault("retry_count", 0)
        context.setdefault("time_since_failure_hours", 1.0)
        now = _utc_now()
        context.setdefault("hour_of_day", now.hour)
        context.setdefault("day_of_week", now.weekday())
        context.setdefault("is_weekend", int(now.weekday() >= 5))
        context.setdefault("device_type", "mobile")
        context.setdefault("region", "metro")
        context.setdefault("industry", "saas")
        context.setdefault("customer_ltv", 5000)
        context.setdefault("amount", 0)
        return context

    def _execute_action(
        self, action: str, transaction_id: str, context: dict, diagnosis: dict
    ) -> dict:
        """Execute the decided action using agent tools."""
        customer_id = context.get("customer_id", "")

        if action == "retry":
            timing = diagnosis.get("optimal_retry_timing", "6 hours")
            delay = 6.0  # default
            if "1-2" in str(timing):
                delay = 1.5
            elif "2-6" in str(timing):
                delay = 4.0
            elif "24" in str(timing):
                delay = 24.0
            return self.tools.schedule_retry(transaction_id, delay)

        elif action == "notify_customer":
            message = diagnosis.get(
                "customer_communication",
                f"Your payment of ₹{context.get('amount', 0):,.0f} needs attention."
            )
            return self.tools.send_notification(transaction_id, customer_id, message)

        elif action == "escalate":
            reason = diagnosis.get("diagnosis", "Recovery agent escalation")
            return self.tools.create_escalation(transaction_id, reason)

        elif action == "update_payment":
            return self.tools.request_payment_update(transaction_id, customer_id)

        elif action == "offer_alternative":
            return self.tools.offer_alternative_payment(transaction_id, customer_id)

        elif action == "no_action":
            return self.tools.log_decision({
                "action": "no_action",
                "reason": "Recovery deemed unlikely — no further action",
                "transaction_id": transaction_id,
            })

        return {"success": False, "error": f"Unknown action: {action}"}

    def _save_decision(self, record: dict):
        """Persist decision to the database audit trail."""
        db = SessionLocal()
        try:
            decision = RecoveryDecision(
                transaction_id=record["transaction_id"],
                audit_id=record["audit_id"],
                ml_recovery_probability=record.get("recovery_probability"),
                ml_expected_recovery_value=record.get("expected_recovery_value"),
                llm_diagnosis=record.get("diagnosis"),
                llm_recommended_action=record.get("recommended_action"),
                llm_reasoning=record.get("reasoning"),
                llm_confidence=record.get("llm_confidence"),
                final_action=record.get("final_action", "no_action"),
                action_approved=record.get("policy_approved", False),
                policy_violations=str(record.get("policy_violations", [])),
            )
            db.add(decision)
            db.commit()
        except Exception as e:
            db.rollback()
            print(f"    ⚠ Failed to save decision: {e}")
        finally:
            db.close()


async def run_agent_on_transaction(transaction_id: str, auto_execute: bool = False) -> dict:
    """Convenience function to process a single transaction."""
    agent = RecoveryAgent()
    return await agent.process_payment(transaction_id, auto_execute)
