"""
ReviveAI — Policy Engine & Guardrails

Prevents unsafe financial actions by validating all
AI recommendations against a set of rules before execution.

This is the critical safety layer between LLM recommendations
and actual payment operations.
"""

from dataclasses import dataclass, field
from typing import Optional


@dataclass
class PolicyCheckResult:
    """Result of a policy engine check."""
    approved: bool
    violations: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    modified_action: Optional[str] = None  # If policy overrides the action
    reason: str = ""


class PolicyEngine:
    """
    Rule-based policy engine that validates every AI decision.

    Rules:
    1. Max retry limit: Never retry more than 5 times
    2. Fraud block: Never auto-retry fraud-flagged payments
    3. Amount threshold: Escalate amounts > ₹25,000 with low probability
    4. Time window: Don't retry if failure > 7 days old
    5. Notification requirement: Must notify after 2+ failures
    6. Cool-down: Minimum 2 hours between retries
    """

    # Configurable limits
    MAX_RETRIES = 5
    FRAUD_BLOCK = True
    HIGH_AMOUNT_THRESHOLD = 25_000
    HIGH_AMOUNT_MIN_PROBABILITY = 0.30
    MAX_FAILURE_AGE_HOURS = 168  # 7 days
    NOTIFICATION_AFTER_RETRIES = 2
    MIN_RETRY_INTERVAL_HOURS = 2

    def check(
        self,
        action: str,
        transaction: dict,
        prediction: dict,
        diagnosis: dict,
    ) -> PolicyCheckResult:
        """
        Validate a recommended action against all policies.

        Args:
            action: Recommended action (retry, notify_customer, escalate, no_action)
            transaction: Raw transaction data
            prediction: ML prediction output
            diagnosis: LLM diagnosis output

        Returns:
            PolicyCheckResult with approval status and any violations
        """
        violations = []
        warnings = []
        modified_action = None

        retry_count = transaction.get("retry_count", 0)
        failure_reason = transaction.get("failure_reason", "")
        amount = transaction.get("amount", 0)
        time_since = transaction.get("time_since_failure_hours", 0)
        probability = prediction.get("recovery_probability", 0)

        # ─── Rule 1: Max retry limit ────────────────────────────
        if action == "retry" and retry_count >= self.MAX_RETRIES:
            violations.append(
                f"RETRY_LIMIT_EXCEEDED: Already retried {retry_count} times "
                f"(max: {self.MAX_RETRIES}). Cannot retry."
            )
            modified_action = "escalate"

        # ─── Rule 2: Fraud block ────────────────────────────────
        if action == "retry" and failure_reason == "fraud_flag":
            violations.append(
                "FRAUD_BLOCK: Cannot auto-retry fraud-flagged payments. "
                "Requires manual review by risk team."
            )
            modified_action = "escalate"

        # ─── Rule 3: High amount + low probability ──────────────
        if (
            action == "retry"
            and amount > self.HIGH_AMOUNT_THRESHOLD
            and probability < self.HIGH_AMOUNT_MIN_PROBABILITY
        ):
            violations.append(
                f"HIGH_AMOUNT_LOW_PROBABILITY: Amount ₹{amount:,.0f} exceeds "
                f"₹{self.HIGH_AMOUNT_THRESHOLD:,.0f} with only "
                f"{probability:.0%} recovery probability. Escalation required."
            )
            modified_action = "escalate"

        # ─── Rule 4: Stale failure ──────────────────────────────
        if action == "retry" and time_since > self.MAX_FAILURE_AGE_HOURS:
            violations.append(
                f"STALE_FAILURE: Payment failed {time_since:.0f} hours ago "
                f"(max: {self.MAX_FAILURE_AGE_HOURS}h). Too old for retry."
            )
            modified_action = "notify_customer"

        # ─── Rule 5: Notification requirement ───────────────────
        if action == "retry" and retry_count >= self.NOTIFICATION_AFTER_RETRIES:
            warnings.append(
                f"NOTIFICATION_RECOMMENDED: {retry_count} retries attempted. "
                f"Customer should be notified regardless of retry outcome."
            )

        # ─── Rule 6: Minimum interval (informational) ──────────
        if action == "retry" and time_since < self.MIN_RETRY_INTERVAL_HOURS:
            warnings.append(
                f"RETRY_TOO_SOON: Only {time_since:.1f}h since failure. "
                f"Recommended minimum: {self.MIN_RETRY_INTERVAL_HOURS}h."
            )

        # ─── Determine final result ─────────────────────────────
        approved = len(violations) == 0

        if not approved and modified_action:
            reason = (
                f"Action '{action}' BLOCKED. Modified to '{modified_action}'. "
                f"Violations: {'; '.join(violations)}"
            )
        elif approved and warnings:
            reason = f"Action '{action}' APPROVED with warnings: {'; '.join(warnings)}"
        elif approved:
            reason = f"Action '{action}' APPROVED. All policy checks passed."
        else:
            reason = f"Action '{action}' BLOCKED. {'; '.join(violations)}"

        return PolicyCheckResult(
            approved=approved,
            violations=violations,
            warnings=warnings,
            modified_action=modified_action,
            reason=reason,
        )

    def get_rules_summary(self) -> list[dict]:
        """Return all active rules for documentation/UI display."""
        return [
            {
                "rule": "MAX_RETRIES",
                "description": f"Maximum {self.MAX_RETRIES} retry attempts per payment",
                "action_on_violation": "Escalate to customer success",
            },
            {
                "rule": "FRAUD_BLOCK",
                "description": "Never auto-retry fraud-flagged payments",
                "action_on_violation": "Escalate to risk team for manual review",
            },
            {
                "rule": "HIGH_AMOUNT_LOW_PROBABILITY",
                "description": f"Escalate amounts > ₹{self.HIGH_AMOUNT_THRESHOLD:,} with < {self.HIGH_AMOUNT_MIN_PROBABILITY:.0%} probability",
                "action_on_violation": "Escalate for human decision",
            },
            {
                "rule": "STALE_FAILURE",
                "description": f"Don't retry failures older than {self.MAX_FAILURE_AGE_HOURS}h",
                "action_on_violation": "Notify customer instead",
            },
            {
                "rule": "NOTIFICATION_REQUIRED",
                "description": f"Customer notification required after {self.NOTIFICATION_AFTER_RETRIES}+ retries",
                "action_on_violation": "Warning — notification recommended",
            },
            {
                "rule": "RETRY_COOLDOWN",
                "description": f"Minimum {self.MIN_RETRY_INTERVAL_HOURS}h between retries",
                "action_on_violation": "Warning — retry may be too soon",
            },
        ]


# Singleton
_engine: Optional[PolicyEngine] = None


def get_policy_engine() -> PolicyEngine:
    global _engine
    if _engine is None:
        _engine = PolicyEngine()
    return _engine
