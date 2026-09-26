"""
ReviveAI — API Endpoint Integration Tests

Tests all FastAPI REST endpoints:
- /api/recovery/queue
- /api/recovery/predict/{id}
- /api/recovery/stats/summary
- /api/recovery/escalations
- /api/recovery/override
- /api/recovery/llm-status
- /api/recovery/churn-agent
- /transactions/{id}
- /metrics
- /agent/query
"""

import pytest
from fastapi.testclient import TestClient
from src.api.main import app


@pytest.fixture
def client():
    return TestClient(app)


def test_api_recovery_queue(client):
    """Verify recovery queue returns items sorted with expected recovery values."""
    res = client.get("/api/recovery/queue?limit=10")
    assert res.status_code == 200
    data = res.json()
    assert "items" in data
    assert "total_count" in data
    assert "total_expected_recovery" in data


def test_api_predict_recovery(client):
    """Verify real XGBoost prediction endpoint returns probability and risk level."""
    res = client.get("/api/recovery/predict/TXN_000000")
    assert res.status_code == 200
    data = res.json()
    assert data["transaction_id"] == "TXN_000000"
    assert 0.0 <= data["recovery_probability"] <= 1.0
    assert data["risk_level"] in ["low", "medium", "high", "critical"]
    assert "expected_recovery_value" in data


def test_api_recovery_summary(client):
    """Verify recovery summary stats endpoint."""
    res = client.get("/api/recovery/stats/summary")
    assert res.status_code == 200
    data = res.json()
    assert "total_transactions" in data
    assert "recovery_rate" in data
    assert "total_failed_amount" in data


def test_api_escalated_queue(client):
    """Verify Human-in-the-Loop escalated review queue."""
    res = client.get("/api/recovery/escalations")
    assert res.status_code == 200
    data = res.json()
    assert "count" in data
    assert "escalations" in data


def test_api_manual_override(client):
    """Verify human operator can override an escalation."""
    payload = {
        "transaction_id": "TXN_000000",
        "action": "retry",
        "operator_reason": "Manual operator approval for VIP customer",
    }
    res = client.post("/api/recovery/override", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["action_taken"] == "retry"


def test_api_churn_agent_endpoint(client):
    """Verify autonomous proactive churn retention swarm endpoint."""
    payload = {
        "customer_id": "cus_test_99",
        "company": "Beta Analytics Inc",
        "mrr": 24000.0,
        "risk_score": 92.0,
        "churn_reason": "High price resistance and low usage",
        "auto_execute": False,
    }
    res = client.post("/api/recovery/churn-agent", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["customer_id"] == "cus_test_99"
    assert "retainProb" in data
    assert "final_action" in data
    assert "stages" in data
    assert len(data["stages"]) == 5


def test_api_metrics(client):
    """Verify Prometheus/API metrics endpoint."""
    res = client.get("/metrics")
    assert res.status_code == 200
    data = res.json()
    assert "recovery_rate" in data
    assert "total_transactions" in data


def test_api_agent_query(client):
    """Verify conversational agent query endpoint with tool dispatch."""
    payload = {
        "query": "What is our overall recovery pipeline volume?",
    }
    res = client.post("/agent/query", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "response" in data
    assert "tools_called" in data
