"""
ReviveAI — Multi-Agent Autonomous System Tests

Tests the 4-Agent Collaboration Architecture:
1. Detective Agent (Forensics & Involuntary/Voluntary Churn Classification)
2. Strategist Agent (RAG Playbook integration & intervention planning)
3. Auditor Agent & Self-Correction Reflection Loop (Margin ceiling & rule validation)
4. Communicator Agent (Hyper-personalized outreach & magic link generation)
5. Multi-Agent Orchestrator (End-to-End Mission & HITL Gate)
"""

import pytest
import asyncio
from src.agent.tools import AgentTools
from src.agent.policy_engine import get_policy_engine
from src.ml.predict import get_predictor
from src.ai.diagnosis import get_diagnosis_service
from src.ai.rag_playbooks import get_playbook_store
from src.agent.multi_agent_system import (
    DetectiveAgent,
    StrategistAgent,
    AuditorAgent,
    CommunicatorAgent,
    MultiAgentOrchestrator,
    get_multi_agent_orchestrator,
)


@pytest.fixture
def orchestrator() -> MultiAgentOrchestrator:
    return get_multi_agent_orchestrator()


def test_rag_playbook_store_search():
    """Verify long-term memory RAG retrieves relevant recovery playbooks."""
    store = get_playbook_store()
    results = store.search("authentication_failure upi involuntary_churn", top_k=2)
    assert len(results) > 0
    assert any("UPI" in r.get("title", "") for r in results)


def test_detective_involuntary_vs_voluntary_classification():
    """Verify Detective Agent accurately segments churn taxonomy."""
    tools = AgentTools()
    predictor = get_predictor()
    diag = get_diagnosis_service()
    detective = DetectiveAgent(tools, predictor, diag)

    # Involuntary case
    inv_res = asyncio.run(detective.investigate(
        "test_txn_inv",
        context_override={"failure_reason": "authentication_failure", "days_since_last_login": 1}
    ))
    assert inv_res["churn_category"] == "involuntary_churn"

    # Voluntary case
    vol_res = asyncio.run(detective.investigate(
        "test_txn_vol",
        context_override={"failure_reason": "customer_cancellation", "days_since_last_login": 45}
    ))
    assert vol_res["churn_category"] == "voluntary_churn"


def test_auditor_rejects_excessive_discount_margin():
    """Verify Auditor Agent enforces margin guardrail (rejects discount > 20%)."""
    policy = get_policy_engine()
    auditor = AuditorAgent(policy)

    investigation = {
        "context": {"amount": 5000.0, "retry_count": 0, "failure_reason": "insufficient_funds"},
        "ml_prediction": {"recovery_probability": 0.6, "risk_level": "medium"},
        "diagnosis_text": "Temporary balance deficit",
    }

    # Plan with 25% discount (exceeds 20% margin cap)
    bad_plan = {
        "action": "offer_alternative",
        "discount_percent": 25.0,
        "delay_hours": 4.0,
    }

    audit = auditor.audit(bad_plan, investigation)
    assert audit["approved"] is False
    assert "POL-07-MARGIN-CAP" in audit["violations"]


def test_communicator_embeds_magic_link():
    """Verify Communicator Agent generates encrypted dynamic link."""
    tools = AgentTools()
    communicator = CommunicatorAgent(tools)

    investigation = {
        "context": {"amount": 4999.0},
        "customer_id": "cust_test_101",
        "transaction_id": "txn_test_101",
    }
    plan = {
        "action": "update_payment",
        "discount_percent": 0.0,
    }

    outreach = communicator.craft_and_dispatch(investigation, plan)
    assert "magic_link" in outreach
    assert "https://pay.reviveai.io/magic/txn_test_101" in outreach["magic_link"]


def test_orchestrator_hitl_gate_for_high_value(orchestrator: MultiAgentOrchestrator):
    """Verify HITL gate halts autonomous execution for high-ticket invoices (> ₹25k)."""
    mission = asyncio.run(orchestrator.execute_recovery_mission(
        "txn_enterprise_vip_1",
        auto_execute=True,
        context_override={"amount": 45000.0, "failure_reason": "corporate_card_limit_exceeded"}
    ))

    assert mission["hitl_status"] == "PENDING_OPERATOR_APPROVAL"
    assert mission["final_action"] == "escalate"
    assert len(mission["deliberation_log"]) >= 3
    assert len(mission["agent_trace"]) > 0
