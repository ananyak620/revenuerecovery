"""
Tests for LangChain Agent, Tools, and FastAPI Endpoints.
Verifies tool invocation, Scikit-learn risk tier integration, and REST endpoints.
"""

import pytest
from fastapi.testclient import TestClient

from src.api.main import app
from src.agent.langchain_agent import (
    get_agent,
    get_risk_tier,
    query_pipeline_metrics,
    flag_for_review,
    search_failure_reason,
)


@pytest.fixture
def client():
    return TestClient(app)


def test_tool_get_risk_tier():
    """Verify get_risk_tier calls Scikit-learn/XGBoost predictor and returns risk tier."""
    import json
    res = get_risk_tier.invoke({"transaction_id": "TXN_000000"})
    data = json.loads(res)
    assert data["found"] is True
    assert data["transaction_id"] == "TXN_000000"
    assert data["risk_tier"] in ["Critical", "High", "Medium", "Low"]
    assert "recovery_probability" in data
    assert "expected_recovery_value" in data


def test_tool_query_pipeline_metrics():
    """Verify query_pipeline_metrics pulls aggregate database metrics."""
    import json
    res = query_pipeline_metrics.invoke({"date_range": "all_time"})
    data = json.loads(res)
    assert data["total_transactions"] > 0
    assert "recovery_rate_pct" in data
    assert "total_pipeline_volume" in data


def test_tool_search_failure_reason():
    """Verify search_failure_reason returns root cause and rail info."""
    import json
    res = search_failure_reason.invoke({"transaction_id": "TXN_000000"})
    data = json.loads(res)
    assert data["found"] is True
    assert "failure_reason" in data
    assert "root_cause" in data
    assert "payment_method" in data


def test_tool_flag_for_review():
    """Verify flag_for_review logs an escalation into the review queue."""
    import json
    res = flag_for_review.invoke({"transaction_id": "TXN_000000", "reason": "Test escalation"})
    data = json.loads(res)
    assert data["success"] is True
    assert data["status"] == "in_human_review_queue"
    assert "REV-" in data["escalation_ticket_id"]


def test_agent_multi_tool_chaining():
    """Verify agent analyzes question, chains tools, and returns response."""
    agent = get_agent()
    query = "Why did transaction TXN_000000 fail, what is its risk tier, and should we retry it?"
    result = agent.query(query)
    assert "response" in result
    assert len(result["response"]) > 0
    assert "tools_called" in result
    tools = [t["tool"] for t in result["tools_called"]]
    # Should call both failure search and risk tier tools
    assert "search_failure_reason" in tools
    assert "get_risk_tier" in tools


def test_endpoint_metrics(client):
    """Verify GET /metrics endpoint returns pipeline stats."""
    response = client.get("/metrics")
    assert response.status_code == 200
    data = response.json()
    assert "recovery_rate" in data
    assert "total_transactions" in data
    assert "at_risk_revenue" in data


def test_endpoint_transaction_detail_with_risk_tier(client):
    """Verify GET /transactions/{id} endpoint returns detail + risk tier."""
    response = client.get("/transactions/TXN_000000")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == "TXN_000000"
    assert data["risk_tier"] in ["Critical", "High", "Medium", "Low"]
    assert "recommended_action" in data


def test_endpoint_agent_query(client):
    """Verify POST /agent/query runs query through agent."""
    response = client.post(
        "/agent/query",
        json={"query": "What is our overall recovery rate and pipeline health?"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "response" in data
    assert "tools_called" in data
    tools = [t["tool"] for t in data["tools_called"]]
    assert "query_pipeline_metrics" in tools


# ---------------------------------------------------------------------------
# Phase 4: Rigorous Tool Calling & Boundary Defense Tests
# ---------------------------------------------------------------------------

def test_tool_validate_and_execute_valid_inputs():
    """Verify tool executes cleanly with strictly validated Pydantic models."""
    from src.agent.tools import AgentTools

    tools = AgentTools()

    # Valid check_payment
    res_check = tools.validate_and_execute("check_payment", {"transaction_id": "TXN_000000"})
    assert "found" in res_check

    # Valid schedule_retry
    res_retry = tools.validate_and_execute("schedule_retry", {
        "transaction_id": "TXN_000000",
        "delay_hours": 4.0,
    })
    assert res_retry.get("success") is True
    assert res_retry.get("delay_hours") == 4.0

    # Valid send_notification
    res_notify = tools.validate_and_execute("send_notification", {
        "transaction_id": "TXN_000000",
        "customer_id": "CUS_000000",
        "message": "Payment retry notice",
    })
    assert res_notify.get("success") is True
    assert res_notify.get("notification_sent") is True

    # Valid create_escalation
    res_esc = tools.validate_and_execute("create_escalation", {
        "transaction_id": "TXN_000000",
        "reason": "VIP account failure",
        "priority": "high",
    })
    assert res_esc.get("success") is True
    assert res_esc.get("escalation_created") is True


def test_tool_validate_and_execute_invalid_and_missing_inputs():
    """Verify malformed arguments and missing required fields are safely caught."""
    from src.agent.tools import AgentTools

    tools = AgentTools()

    # Missing required field: transaction_id
    res_missing = tools.validate_and_execute("check_payment", {})
    assert res_missing.get("success") is False
    assert res_missing.get("validation_failed") is True
    assert "validation error" in res_missing.get("error", "").lower()

    # Missing field: message in send_notification
    res_missing_msg = tools.validate_and_execute("send_notification", {
        "transaction_id": "TXN_000000",
        "customer_id": "CUS_000000",
    })
    assert res_missing_msg.get("success") is False
    assert res_missing_msg.get("validation_failed") is True

    # Out of range delay_hours (> 168h max)
    res_out_of_range = tools.validate_and_execute("schedule_retry", {
        "transaction_id": "TXN_000000",
        "delay_hours": 999.0,
    })
    assert res_out_of_range.get("success") is False
    assert res_out_of_range.get("validation_failed") is True

    # Negative delay_hours (< 0)
    res_neg = tools.validate_and_execute("schedule_retry", {
        "transaction_id": "TXN_000000",
        "delay_hours": -5.0,
    })
    assert res_neg.get("success") is False
    assert res_neg.get("validation_failed") is True

    # Invalid enum pattern for priority
    res_bad_enum = tools.validate_and_execute("create_escalation", {
        "transaction_id": "TXN_000000",
        "reason": "VIP check",
        "priority": "super_urgent_custom",
    })
    assert res_bad_enum.get("success") is False
    assert res_bad_enum.get("validation_failed") is True


def test_tool_validate_and_execute_unknown_tool():
    """Verify unknown tool request fails safely without raising exceptions."""
    from src.agent.tools import AgentTools

    tools = AgentTools()
    res = tools.validate_and_execute("non_existent_hack_tool", {"foo": "bar"})
    assert res.get("success") is False
    assert "unknown tool" in res.get("error", "").lower()


def test_tool_validate_and_execute_timeout_handling(monkeypatch):
    """Verify long-running tool calls trigger timeout boundary safely."""
    import time
    from src.agent.tools import AgentTools

    tools = AgentTools()

    def slow_check(transaction_id: str):
        time.sleep(0.5)
        return {"found": True}

    monkeypatch.setattr(tools, "check_payment", slow_check)

    res = tools.validate_and_execute(
        "check_payment",
        {"transaction_id": "TXN_000000"},
        timeout_seconds=0.1,
    )
    assert res.get("success") is False
    assert res.get("timeout") is True
    assert "timed out" in res.get("error", "").lower()


def test_tool_validate_and_execute_safe_failure_on_exception(monkeypatch):
    """Verify internal tool exceptions are safely trapped without crashing agent."""
    from src.agent.tools import AgentTools

    tools = AgentTools()

    def crashing_tool(transaction_id: str, delay_hours: float = 6.0):
        raise ConnectionResetError("Simulated database network drop")

    monkeypatch.setattr(tools, "schedule_retry", crashing_tool)

    res = tools.validate_and_execute("schedule_retry", {
        "transaction_id": "TXN_000000",
        "delay_hours": 2.0,
    })
    assert res.get("success") is False
    assert "simulated database network drop" in res.get("error", "").lower()

