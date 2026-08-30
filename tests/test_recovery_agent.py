"""
ReviveAI — Recovery Agent & Tools Tests

Verifies agent workflow execution, tool invocation, safety guards,
and audit trail logging.
"""

import asyncio
import pytest
from src.agent.tools import AgentTools
from src.agent.recovery_agent import RecoveryAgent


@pytest.fixture
def tools() -> AgentTools:
    return AgentTools()


def test_agent_tools_logging(tools: AgentTools):
    """Verify tool calls are properly recorded in the audit action log."""
    decision_payload = {"test_event": "verification", "amount": 1000}
    res = tools.log_decision(decision_payload)

    assert res["logged"] is True
    log = tools.get_action_log()
    assert len(log) >= 1
    assert log[-1]["tool"] == "log_decision"
    assert log[-1]["input"] == decision_payload


def test_tool_descriptions_schema():
    """Verify get_tool_descriptions provides schema definitions for LLM tool-calling."""
    descs = AgentTools.get_tool_descriptions()
    assert isinstance(descs, list)
    assert len(descs) >= 5
    tool_names = [t["name"] for t in descs]
    assert "check_payment" in tool_names
    assert "schedule_retry" in tool_names
    assert "create_escalation" in tool_names
    assert "send_notification" in tool_names


def test_agent_nonexistent_transaction_fails_safely():
    """Verify agent returns safe error dict when transaction does not exist."""
    agent = RecoveryAgent()
    res = asyncio.run(agent.process_payment("NON_EXISTENT_TXN_99999", auto_execute=False))

    assert "error" in res
    assert res.get("status") == "failed"
