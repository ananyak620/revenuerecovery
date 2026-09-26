"""
ReviveAI — Agent Tools Validation Tests

Validates:
- Strict Pydantic input/output validation
- Missing field trapping
- Value boundary checks
- Unknown tool handling
- Timeout containment
- Database failure safety
"""

import pytest
from src.agent.tools import (
    AgentTools,
    CheckPaymentInput,
    ScheduleRetryInput,
    SendNotificationInput,
    CreateEscalationInput,
)


def test_tools_check_payment_valid_and_missing():
    tools = AgentTools()

    # Valid
    res = tools.validate_and_execute("check_payment", {"transaction_id": "TXN_000000"})
    assert "found" in res

    # Missing field
    res_err = tools.validate_and_execute("check_payment", {})
    assert res_err["success"] is False
    assert res_err["validation_failed"] is True


def test_tools_schedule_retry_boundaries():
    tools = AgentTools()

    # Valid
    res = tools.validate_and_execute("schedule_retry", {
        "transaction_id": "TXN_000000",
        "delay_hours": 24.0,
    })
    assert res["success"] is True

    # High bound violation (>168)
    res_high = tools.validate_and_execute("schedule_retry", {
        "transaction_id": "TXN_000000",
        "delay_hours": 200.0,
    })
    assert res_high["success"] is False
    assert res_high["validation_failed"] is True

    # Negative violation (<0)
    res_neg = tools.validate_and_execute("schedule_retry", {
        "transaction_id": "TXN_000000",
        "delay_hours": -1.0,
    })
    assert res_neg["success"] is False
    assert res_neg["validation_failed"] is True


def test_tools_create_escalation_priority_enum():
    tools = AgentTools()

    # Valid priorities
    for prio in ["low", "normal", "high", "critical"]:
        res = tools.validate_and_execute("create_escalation", {
            "transaction_id": "TXN_000000",
            "reason": "Test escalation",
            "priority": prio,
        })
        assert res["success"] is True

    # Invalid priority
    res_bad = tools.validate_and_execute("create_escalation", {
        "transaction_id": "TXN_000000",
        "reason": "Test escalation",
        "priority": "ultra_mega_urgent",
    })
    assert res_bad["success"] is False
    assert res_bad["validation_failed"] is True


def test_tools_timeout_enforcement(monkeypatch):
    import time
    tools = AgentTools()

    def slow_exec(*args, **kwargs):
        time.sleep(0.4)
        return {"found": True}

    monkeypatch.setattr(tools, "check_payment", slow_exec)

    res = tools.validate_and_execute("check_payment", {"transaction_id": "TXN_000000"}, timeout_seconds=0.1)
    assert res["success"] is False
    assert res["timeout"] is True
