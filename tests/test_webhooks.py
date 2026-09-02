"""
ReviveAI — Webhook Ingestion & Event Simulation Tests

Verifies:
1. Razorpay payment failure event parsing.
2. Stripe payment failure event parsing.
3. Live simulation endpoint executing full autonomous recovery.
"""

import pytest
from fastapi.testclient import TestClient

from src.api.main import app


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def test_simulate_webhook_event(client: TestClient):
    """Verify simulate endpoint triggers full recovery pipeline and returns decision."""
    payload = {
        "amount": 7500.0,
        "payment_method": "upi",
        "failure_reason": "authentication_failure",
        "auto_execute": True,
    }
    resp = client.post("/api/webhooks/simulate", json=payload)
    assert resp.status_code == 200
    data = resp.json()

    assert data["status"] == "completed"
    assert data["transaction_id"].startswith("sim_txn_")
    assert "agent_decision" in data
    decision = data["agent_decision"]
    assert "recovery_probability" in decision
    assert decision["policy_approved"] is True
    assert decision["final_action"] in ("retry", "notify_customer", "escalate")


def test_razorpay_webhook_ingestion(client: TestClient):
    """Verify Razorpay payment.failed webhook parsing."""
    payload = {
        "event": "payment.failed",
        "id": "evt_test_rzp_123",
        "payload": {
            "payment": {
                "entity": {
                    "id": "pay_test_9988",
                    "amount": 500000,  # 5000 INR in paise
                    "method": "card",
                    "error_code": "BAD_REQUEST_ERROR",
                    "email": "customer@example.com",
                }
            }
        },
    }
    resp = client.post("/api/webhooks/razorpay", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "processing"
    assert data["transaction_id"] == "pay_test_9988"


def test_stripe_webhook_ingestion(client: TestClient):
    """Verify Stripe payment_intent.payment_failed webhook parsing."""
    payload = {
        "type": "payment_intent.payment_failed",
        "id": "evt_stripe_456",
        "data": {
            "object": {
                "id": "pi_test_stripe_77",
                "amount": 499900,
                "customer": "cus_test_123",
            }
        },
    }
    resp = client.post("/api/webhooks/stripe", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "processing"
    assert data["transaction_id"] == "pi_test_stripe_77"


def test_llm_status_endpoint(client: TestClient):
    """Verify LLM status endpoint exposes model-agnostic provider details."""
    resp = client.get("/api/recovery/llm-status")
    assert resp.status_code == 200
    data = resp.json()
    assert "active_provider" in data
    assert "fallback_ready" in data
    assert data["fallback_ready"] is True
