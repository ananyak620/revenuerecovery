"""
ReviveAI — Model Context Protocol (MCP) Server Tests

Verifies:
1. Tool definition registration and schemas.
2. Tool execution (predict, diagnose, metrics, customer history).
3. Resource reading.
4. JSON-RPC 2.0 protocol compliance.
"""

import pytest
from src.agent.mcp_server import ReviveAIMCPServer


@pytest.fixture
def mcp_server() -> ReviveAIMCPServer:
    return ReviveAIMCPServer()


def test_mcp_tool_definitions(mcp_server: ReviveAIMCPServer):
    """Verify standard MCP tools are registered with schemas."""
    tools = mcp_server.get_tool_definitions()
    assert len(tools) >= 6
    tool_names = [t["name"] for t in tools]
    assert "check_payment" in tool_names
    assert "get_customer_history" in tool_names
    assert "predict_recovery" in tool_names
    assert "diagnose_failure" in tool_names
    assert "execute_recovery_action" in tool_names
    assert "get_recovery_metrics" in tool_names


def test_mcp_resource_definitions(mcp_server: ReviveAIMCPServer):
    """Verify MCP resources are exposed."""
    resources = mcp_server.get_resource_definitions()
    uris = [r["uri"] for r in resources]
    assert "reviveai://policies/guardrails" in uris
    assert "reviveai://telemetry/summary" in uris


def test_mcp_read_resource_content(mcp_server: ReviveAIMCPServer):
    """Verify resource reading returns valid markdown and telemetry."""
    guardrails = mcp_server.read_resource("reviveai://policies/guardrails")
    assert "POL-01" in guardrails["text"]
    assert "POL-02" in guardrails["text"]

    telemetry = mcp_server.read_resource("reviveai://telemetry/summary")
    assert "recovered_revenue_mtd" in telemetry["text"]


@pytest.mark.asyncio
async def test_mcp_call_tool_metrics(mcp_server: ReviveAIMCPServer):
    """Verify tool call executes and returns structured JSON."""
    res = await mcp_server.call_tool("get_recovery_metrics", {})
    assert res["success"] is True
    assert "autonomous_recovery_rate" in res


@pytest.mark.asyncio
async def test_mcp_call_customer_history(mcp_server: ReviveAIMCPServer):
    """Verify get_customer_history tool returns structured response."""
    res = await mcp_server.call_tool("get_customer_history", {"customer_id": "nonexistent_cust"})
    assert "found" in res
    assert res["found"] is False


@pytest.mark.asyncio
async def test_mcp_json_rpc_initialize(mcp_server: ReviveAIMCPServer):
    """Verify JSON-RPC 2.0 initialize request."""
    req = {
        "jsonrpc": "2.0",
        "id": 42,
        "method": "initialize",
        "params": {},
    }
    resp = await mcp_server.handle_json_rpc(req)
    assert resp["jsonrpc"] == "2.0"
    assert resp["id"] == 42
    assert resp["result"]["serverInfo"]["name"] == "reviveai-mcp"
    assert "tools" in resp["result"]["capabilities"]
