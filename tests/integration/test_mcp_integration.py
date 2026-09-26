"""
ReviveAI — MCP Server & Webhook Integration Tests
"""

import pytest
from src.agent.mcp_server import ReviveAIMCPServer


def test_integration_mcp_server_initialization():
    server = ReviveAIMCPServer()
    tools = server.get_tool_definitions()
    assert len(tools) >= 5
    tool_names = [t["name"] for t in tools]
    assert "check_payment" in tool_names
    assert "predict_recovery" in tool_names


def test_integration_mcp_resources():
    server = ReviveAIMCPServer()
    resources = server.get_resource_definitions()
    assert len(resources) >= 2
    uris = [r["uri"] for r in resources]
    assert "reviveai://policies/guardrails" in uris
