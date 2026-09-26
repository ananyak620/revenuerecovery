"""
ReviveAI — Multi-Agent & LangGraph Tests
"""

import pytest
from src.agent.graph import get_recovery_graph
from src.agent.multi_agent_system import get_multi_agent_orchestrator


@pytest.mark.asyncio
async def test_agent_graph_standard_lifecycle():
    graph = get_recovery_graph()
    state = {
        "transaction_id": "TXN_000000",
        "auto_execute": False,
        "context_override": {
            "amount": 1500.0,
            "failure_reason": "authentication_failure",
        },
    }
    result = await graph.ainvoke(state)
    assert result.get("terminated") is True
    assert result.get("final_action") == "retry"


@pytest.mark.asyncio
async def test_agent_orchestrator_alias():
    orch = get_multi_agent_orchestrator()
    res = await orch.orchestrate("TXN_000000", auto_execute=False)
    assert "agent_decision" in res
    assert res["agent_decision"]["final_action"] in ["retry", "escalate", "notify_customer"]
