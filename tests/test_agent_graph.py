"""
ReviveAI — LangGraph StateGraph Architecture Tests

Tests state transitions, node execution, reflection/self-correction loop,
loop termination bounds, and Human-in-the-Loop (HITL) gate enforcement.
"""

import pytest
from src.agent.graph import get_recovery_graph, build_recovery_graph
from src.agent.state import RecoveryState


@pytest.mark.asyncio
async def test_langgraph_compilation():
    """Verify LangGraph compiles without structural schema errors."""
    graph = build_recovery_graph()
    assert graph is not None


@pytest.mark.asyncio
async def test_langgraph_missing_transaction_id_terminates_safely():
    """Verify router terminates immediately if transaction_id is missing."""
    graph = get_recovery_graph()
    initial_state = {"transaction_id": ""}
    result = await graph.ainvoke(initial_state)

    assert result.get("terminated") is True
    assert result.get("final_action") == "no_action"
    assert "error" in result
    assert "Missing transaction_id" in result.get("error", "")


@pytest.mark.asyncio
async def test_langgraph_autonomous_recovery_flow():
    """
    Verify complete autonomous path for standard recoverable payment:
    Init -> Router -> Detective -> RAG -> Strategist -> Auditor -> HITL(Approved) -> Communicator -> Execution -> END.
    """
    graph = get_recovery_graph()
    initial_state = {
        "transaction_id": "TXN_000000",
        "auto_execute": True,
        "context_override": {
            "amount": 2499.0,
            "payment_method": "upi",
            "failure_reason": "authentication_failure",
            "retry_count": 0,
            "customer_ltv": 12000.0,
            "days_since_last_login": 1,
        },
    }

    result = await graph.ainvoke(initial_state)

    assert result.get("terminated") is True
    assert result.get("churn_category") == "involuntary_churn"
    assert result.get("hitl_status") == "AUTONOMOUS_APPROVED"
    assert result.get("final_action") == "retry"
    assert result.get("proposed_plan", {}).get("action") == "retry"
    assert result.get("policy_evaluation", {}).get("approved") is True
    assert "outreach" in result
    assert "magic_link" in result["outreach"]
    assert len(result.get("trace", [])) >= 7
    assert len(result.get("deliberation_log", [])) >= 6


@pytest.mark.asyncio
async def test_langgraph_hitl_gate_for_high_value_transaction():
    """
    Verify high-value transactions (> ₹25,000) pause autonomous execution
    and flag state as PENDING_OPERATOR_APPROVAL.
    """
    graph = get_recovery_graph()
    initial_state = {
        "transaction_id": "TXN_000000",
        "auto_execute": True,
        "context_override": {
            "amount": 75000.0,  # High-ticket VIP invoice
            "payment_method": "netbanking",
            "failure_reason": "authentication_failure",
            "retry_count": 0,
        },
    }

    result = await graph.ainvoke(initial_state)

    assert result.get("hitl_required") is True
    assert result.get("hitl_status") == "PENDING_OPERATOR_APPROVAL"
    assert result.get("final_action") == "escalate"
    # Execution should be deferred due to pending human review
    exec_res = result.get("execution_result", {})
    assert exec_res.get("executed") is False
    assert "HITL approval pending" in exec_res.get("reason", "")


@pytest.mark.asyncio
async def test_langgraph_reflection_loop_self_correction():
    """
    Verify reflection loop between Auditor and Strategist:
    Voluntary churn proposes 25% discount -> Auditor rejects (exceeds 20% margin cap) ->
    Strategist self-corrects to 15% -> Auditor approves -> Workflow proceeds.
    """
    graph = get_recovery_graph()
    initial_state = {
        "transaction_id": "TXN_000000",
        "auto_execute": False,
        "context_override": {
            "amount": 4999.0,
            "failure_reason": "customer_cancellation",
            "days_since_last_login": 45,  # triggers voluntary churn
        },
    }

    result = await graph.ainvoke(initial_state)

    # Churn category should be voluntary
    assert result.get("churn_category") == "voluntary_churn"
    # Auditor must have triggered revision and ultimately approved the corrected plan
    assert result.get("revision_count") >= 1
    assert result.get("proposed_plan", {}).get("discount_percent") <= 20.0
    assert result.get("policy_evaluation", {}).get("approved") is True


@pytest.mark.asyncio
async def test_langgraph_loop_bounded_max_revisions(monkeypatch):
    """
    Verify the reflection loop cannot run infinitely.
    If Auditor persistently rejects, the graph terminates after max_revisions (3)
    and falls back to safe escalation.
    """
    graph = get_recovery_graph()
    from src.agent.policy_engine import PolicyEngine, PolicyCheckResult

    def persistent_rejection(self, action, transaction, prediction, diagnosis):
        return PolicyCheckResult(
            approved=False,
            violations=["TEST_POL: Persistent simulated violation"],
            modified_action="escalate",
        )

    monkeypatch.setattr(PolicyEngine, "check", persistent_rejection)

    initial_state = {
        "transaction_id": "TXN_000000",
        "auto_execute": False,
        "context_override": {"amount": 3000.0, "failure_reason": "network_error"},
    }

    result = await graph.ainvoke(initial_state)

    assert result.get("revision_count") <= 3
    # When revisions are exhausted, it must break to HITL gate/escalation
    assert result.get("final_action") == "escalate"
    assert result.get("terminated") is True
