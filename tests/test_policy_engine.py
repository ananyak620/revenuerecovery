"""
ReviveAI — Policy Engine & Guardrail Tests

Verifies that the Razorpay Payment Recovery Policy guardrails strictly
enforce safety boundaries and block unsafe actions.
"""

import pytest
from src.agent.policy_engine import PolicyEngine, get_policy_engine


@pytest.fixture
def engine() -> PolicyEngine:
    return get_policy_engine()


def test_rule_1_max_retries_exceeded(engine: PolicyEngine):
    """POL-01: Auto-retry must be blocked when retry_count >= 5."""
    transaction = {"retry_count": 5, "failure_reason": "network_error", "amount": 1000}
    prediction = {"recovery_probability": 0.85}
    diagnosis = {"recommended_action": "retry"}

    result = engine.check(
        action="retry",
        transaction=transaction,
        prediction=prediction,
        diagnosis=diagnosis,
    )

    assert result.approved is False
    assert any("RETRY_LIMIT_EXCEEDED" in v for v in result.violations)
    assert result.modified_action == "escalate"


def test_rule_2_fraud_flag_blocked(engine: PolicyEngine):
    """POL-02: Auto-retry must be strictly blocked for fraud-flagged transactions."""
    transaction = {"retry_count": 0, "failure_reason": "fraud_flag", "amount": 2500}
    prediction = {"recovery_probability": 0.50}
    diagnosis = {"recommended_action": "retry"}

    result = engine.check(
        action="retry",
        transaction=transaction,
        prediction=prediction,
        diagnosis=diagnosis,
    )

    assert result.approved is False
    assert any("FRAUD_BLOCK" in v for v in result.violations)
    assert result.modified_action == "escalate"


def test_rule_3_high_amount_low_probability(engine: PolicyEngine):
    """POL-03: High amount (> 25k) with low probability (< 30%) requires escalation."""
    transaction = {"retry_count": 1, "failure_reason": "bank_declined", "amount": 45000}
    prediction = {"recovery_probability": 0.15}
    diagnosis = {"recommended_action": "retry"}

    result = engine.check(
        action="retry",
        transaction=transaction,
        prediction=prediction,
        diagnosis=diagnosis,
    )

    assert result.approved is False
    assert any("HIGH_AMOUNT_LOW_PROBABILITY" in v for v in result.violations)
    assert result.modified_action == "escalate"


def test_rule_4_stale_failure(engine: PolicyEngine):
    """POL-04: Transactions older than 7 days (168h) must not be silently retried."""
    transaction = {
        "retry_count": 1,
        "failure_reason": "network_error",
        "amount": 1200,
        "time_since_failure_hours": 190,
    }
    prediction = {"recovery_probability": 0.75}
    diagnosis = {"recommended_action": "retry"}

    result = engine.check(
        action="retry",
        transaction=transaction,
        prediction=prediction,
        diagnosis=diagnosis,
    )

    assert result.approved is False
    assert any("STALE_FAILURE" in v for v in result.violations)
    assert result.modified_action == "notify_customer"


def test_rule_5_notification_warning(engine: PolicyEngine):
    """POL-05: Warning triggered when retried 2+ times."""
    transaction = {
        "retry_count": 2,
        "failure_reason": "authentication_failure",
        "amount": 3000,
        "time_since_failure_hours": 4,
    }
    prediction = {"recovery_probability": 0.80}
    diagnosis = {"recommended_action": "retry"}

    result = engine.check(
        action="retry",
        transaction=transaction,
        prediction=prediction,
        diagnosis=diagnosis,
    )

    assert result.approved is True
    assert any("NOTIFICATION_RECOMMENDED" in w for w in result.warnings)


def test_rule_6_cooldown_warning(engine: PolicyEngine):
    """POL-06: Warning triggered if retry attempted within 2 hours of failure."""
    transaction = {
        "retry_count": 0,
        "failure_reason": "network_error",
        "amount": 2000,
        "time_since_failure_hours": 0.5,
    }
    prediction = {"recovery_probability": 0.90}
    diagnosis = {"recommended_action": "retry"}

    result = engine.check(
        action="retry",
        transaction=transaction,
        prediction=prediction,
        diagnosis=diagnosis,
    )

    assert result.approved is True
    assert any("RETRY_TOO_SOON" in w for w in result.warnings)


def test_valid_compliant_action_passes(engine: PolicyEngine):
    """Valid normal transaction should pass all checks cleanly."""
    transaction = {
        "retry_count": 1,
        "failure_reason": "authentication_failure",
        "amount": 4999,
        "time_since_failure_hours": 6.0,
    }
    prediction = {"recovery_probability": 0.85}
    diagnosis = {"recommended_action": "retry"}

    result = engine.check(
        action="retry",
        transaction=transaction,
        prediction=prediction,
        diagnosis=diagnosis,
    )

    assert result.approved is True
    assert len(result.violations) == 0
    assert result.modified_action is None
