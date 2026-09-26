"""
ReviveAI — Agent Routes

API endpoints for conversational revenue recovery and natural language diagnostic queries.
Runs queries through the LangChain / LangGraph agent with tool calling.
"""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from src.agent.langchain_agent import get_agent

router = APIRouter(prefix="", tags=["agent"])


class AgentQueryRequest(BaseModel):
    query: str = Field(..., description="Natural language question for the recovery agent")
    transaction_id: Optional[str] = Field(None, description="Optional transaction ID context")


class ToolCallDetail(BaseModel):
    tool: str
    input: Optional[Dict[str, Any]] = None
    output: Optional[Any] = None


class AgentQueryResponse(BaseModel):
    query: str
    response: str
    tools_called: List[ToolCallDetail] = []
    model: str
    mode: str


@router.post("/agent/query", response_model=AgentQueryResponse)
@router.post("/api/agent/query", response_model=AgentQueryResponse)
def run_agent_query(request: AgentQueryRequest):
    """
    Process a natural language question through the LangChain Recovery Agent.
    The agent autonomously decides which tools to call (e.g., get_risk_tier,
    query_pipeline_metrics, flag_for_review, search_failure_reason) and synthesizes
    an actionable recovery response.
    """
    if not request.query or not request.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty.")

    agent = get_agent()
    result = agent.query(request.query.strip(), transaction_id=request.transaction_id)
    return AgentQueryResponse(
        query=result.get("query", request.query),
        response=result.get("response", ""),
        tools_called=result.get("tools_called", []),
        model=result.get("model", "gpt-4o-mini"),
        mode=result.get("mode", "langchain"),
    )
