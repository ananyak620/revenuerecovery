"""
ReviveAI — LangGraph Agent State Definition

Defines the typed dictionary and reducers representing the full lifecycle
of a revenue recovery mission across all agents and guardrails.
"""

from typing import Annotated, Any, Dict, List, Optional
from typing_extensions import TypedDict
import operator


def merge_dicts(a: Dict[str, Any], b: Dict[str, Any]) -> Dict[str, Any]:
    """Reducer to merge dictionary states."""
    res = dict(a)
    res.update(b)
    return res


class RecoveryState(TypedDict, total=False):
    """
    Typed state object for the ReviveAI LangGraph State Machine.
    Passed and mutated through each node in the recovery graph.
    """
    # Core identifiers & inputs
    transaction_id: str
    customer_id: str
    auto_execute: bool
    context_override: Optional[Dict[str, Any]]

    # Telemetry & Feature context
    context: Annotated[Dict[str, Any], merge_dicts]
    
    # ML Scoring
    ml_prediction: Dict[str, Any]

    # Forensic Analysis (Detective)
    churn_category: str
    churn_hypothesis: str
    diagnosis: str

    # Long-Term Memory & Context (RAG)
    rag_playbook: Optional[Dict[str, Any]]
    rag_citations: List[str]

    # Strategy Formulation (Strategist)
    proposed_plan: Dict[str, Any]

    # Safety Guardrails & Validation (Auditor)
    policy_evaluation: Dict[str, Any]
    critique: Optional[str]
    revision_count: int
    max_revisions: int

    # Human-in-the-Loop (HITL) Gate
    hitl_required: bool
    hitl_status: str  # "AUTONOMOUS_APPROVED" | "PENDING_OPERATOR_APPROVAL" | "OPERATOR_OVERRIDDEN"

    # Outreach & Messaging (Communicator)
    outreach: Optional[Dict[str, Any]]

    # Execution & Audit Trail
    final_action: str
    execution_result: Optional[Dict[str, Any]]
    
    # Traceability & Event logging
    trace: Annotated[List[str], operator.add]
    deliberation_log: Annotated[List[Dict[str, Any]], operator.add]

    # Error handling & Safe termination
    error: Optional[str]
    terminated: bool
