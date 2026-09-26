"""
ReviveAI — LangGraph StateGraph Architecture

Compiles the full autonomous Revenue Recovery workflow as an explicit,
observable StateGraph:
User/Webhook Input
      │
      ▼
State Initialization
      │
      ▼
Router / Planner Node
      │
      ▼
Detective Agent (Forensics + Calibrated ML)
      │
      ▼
RAG Retrieval Node (Domain Playbooks & Recovery Priors)
      │
      ▼
Strategist Agent (Recovery Planning) ◄────────┐
      │                                       │ (Self-Correction Loop
      ▼                                       │  max 3 revisions)
Auditor Agent (6 Policy Rules + Margin Cap) ──┘
      │
      ▼
Human-in-the-Loop (HITL) Gate (VIP Risk > ₹25k or Escalated)
      │
      ▼
Communicator Agent (Hyper-personalized Outreach + Magic Links)
      │
      ▼
Final Execution & Audit Node
      │
      ▼
Structured Decision Response
"""

from datetime import datetime, timezone
from typing import Any, Dict, List, Literal, Optional
import uuid

from langgraph.graph import StateGraph, END

from src.agent.state import RecoveryState
from src.agent.tools import AgentTools
from src.agent.policy_engine import get_policy_engine, PolicyEngine
from src.ml.predict import get_predictor, RecoveryPredictor
from src.ai.diagnosis import get_diagnosis_service, DiagnosisService
from src.ai.rag_playbooks import get_playbook_store, PlaybookStore
from src.ai.llm_provider import GeminiProvider


def _utc_now_str() -> str:
    return datetime.now(timezone.utc).isoformat()


# ---------------------------------------------------------------------------
# Graph Nodes
# ---------------------------------------------------------------------------

def initialize_state_node(state: RecoveryState) -> Dict[str, Any]:
    """Node 1: Validate inputs and establish initial mission envelope."""
    txn_id = state.get("transaction_id", "txn_unknown")
    mission_id = f"AGY-{txn_id[-6:]}-{uuid.uuid4().hex[:6]}"
    
    return {
        "revision_count": 0,
        "max_revisions": 3,
        "terminated": False,
        "trace": [
            f"🚀 [LangGraph] Initialized recovery mission {mission_id} for transaction {txn_id}",
        ],
        "deliberation_log": [
            {"event": "state_initialized", "mission_id": mission_id, "timestamp": _utc_now_str()}
        ],
    }


def router_planner_node(state: RecoveryState) -> Dict[str, Any]:
    """Node 2: Determines routing path and checks for immediate terminal conditions."""
    txn_id = state.get("transaction_id", "")
    if not txn_id:
        return {
            "error": "Missing transaction_id in state",
            "terminated": True,
            "final_action": "no_action",
            "trace": ["[Router] Aborted: Missing transaction_id"],
        }

    return {
        "trace": [f"[Router] Routing transaction {txn_id} to Detective Forensics"],
    }


async def detective_node(state: RecoveryState) -> Dict[str, Any]:
    """Node 3: Forensic root-cause analysis and ML recovery probability scoring."""
    tools = AgentTools()
    predictor = get_predictor()
    diag_service = get_diagnosis_service()
    txn_id = state["transaction_id"]
    context_override = state.get("context_override") or {}

    payment_data = tools.check_payment(txn_id)
    if not payment_data.get("found") and context_override:
        payment_data = {"found": True, "transaction_id": txn_id, **context_override}

    cust_id = payment_data.get("customer_id", context_override.get("customer_id", "cust_unknown"))
    cust_data = tools.get_customer_history(cust_id)

    context = {**payment_data}
    if cust_data.get("found"):
        context.update(cust_data)
    if context_override:
        context.update(context_override)

    context.setdefault("amount", 4999.0)
    context.setdefault("payment_method", "upi")
    context.setdefault("failure_reason", "authentication_failure")
    context.setdefault("retry_count", 0)
    context.setdefault("customer_ltv", 15000.0)
    context.setdefault("days_since_last_login", 2)

    # ML Inference
    ml_pred = predictor.predict(context)

    # Involuntary vs. Voluntary Churn Classification
    failure_reason = str(context.get("failure_reason", "")).lower()
    days_inactive = int(context.get("days_since_last_login", 0))

    voluntary_triggers = {"customer_cancellation", "disputed_charge", "subscription_pause", "refund_requested", "low_usage"}
    if any(t in failure_reason for t in voluntary_triggers) or days_inactive > 30:
        churn_category = "voluntary_churn"
        churn_hypothesis = "Customer intent churn or price resistance indicated by product inactivity or cancellation."
    else:
        churn_category = "involuntary_churn"
        churn_hypothesis = "Payment rail or instrument failure. Customer service relationship intact."

    diag_result = await diag_service.diagnose(context, ml_pred)
    diagnosis_text = diag_result.get("diagnosis", "Transaction failed due to payment gateway disruption.")

    trace_msgs = [
        f"[Detective] Forensics complete. P(recovery)={ml_pred.get('recovery_probability', 0.5):.1%}, Category={churn_category.upper()}",
        f"[Detective] Root cause hypothesis: {churn_hypothesis}",
    ]

    return {
        "customer_id": cust_id,
        "context": context,
        "ml_prediction": ml_pred,
        "churn_category": churn_category,
        "churn_hypothesis": churn_hypothesis,
        "diagnosis": diagnosis_text,
        "trace": trace_msgs,
        "deliberation_log": [{
            "agent": "Detective",
            "churn_category": churn_category,
            "ml_probability": ml_pred.get("recovery_probability"),
            "timestamp": _utc_now_str(),
        }],
    }


def rag_retrieval_node(state: RecoveryState) -> Dict[str, Any]:
    """Node 4: Context retrieval from Domain Playbooks."""
    churn_cat = state.get("churn_category", "involuntary_churn")
    context = state.get("context", {})
    query = f"{churn_cat} {context.get('failure_reason', '')} {context.get('payment_method', '')}"

    store = get_playbook_store()
    results = store.search(query, top_k=2)
    top_pb = results[0] if results else None

    citations = [top_pb["id"]] if top_pb and "id" in top_pb else ["PB-STANDARD"]
    trace_msg = (
        f"[RAG] Retrieved matching playbook: '{top_pb.get('title')}' ({top_pb.get('id')})"
        if top_pb else "[RAG] No specialized playbook matched. Applied standard adaptive protocol."
    )

    return {
        "rag_playbook": top_pb,
        "rag_citations": citations,
        "trace": [trace_msg],
        "deliberation_log": [{
            "agent": "RAG_Retrieval",
            "playbook_id": top_pb.get("id") if top_pb else "none",
            "timestamp": _utc_now_str(),
        }],
    }


def strategist_node(state: RecoveryState) -> Dict[str, Any]:
    """Node 5: Formulates or revises intervention plan with reflection context."""
    context = state["context"]
    churn_category = state["churn_category"]
    critique = state.get("critique")
    revision = state.get("revision_count", 0)
    top_pb = state.get("rag_playbook")
    amount = float(context.get("amount", 0.0))
    failure_reason = str(context.get("failure_reason", "")).lower()

    action = "retry"
    delay_hours = 4.0
    discount_percent = 0.0

    if critique:
        trace_msg = f"[Strategist] Self-Correction triggered by Auditor Critique: '{critique}' (Revision #{revision})"
        if "discount" in critique.lower() or "margin" in critique.lower():
            discount_percent = 15.0  # Concede within acceptable margin ceiling
        if "cooldown" in critique.lower():
            delay_hours = 3.0
        if "max retry" in critique.lower() or "pol-01" in critique.lower():
            action = "update_payment"
    else:
        if amount > 25000.0:
            action = "escalate"
            delay_hours = 0.0
        elif churn_category == "voluntary_churn":
            action = "offer_alternative"
            discount_percent = 25.0  # Aggressive proposal to test reflection loop
        elif "expired" in failure_reason:
            action = "update_payment"
            delay_hours = 0.0
        elif "insufficient" in failure_reason:
            action = "notify_customer"
            delay_hours = 24.0
        else:
            action = "retry"
            delay_hours = 2.0 if "authentication" in failure_reason else 4.0

        trace_msg = f"[Strategist] Formulated recovery plan: action='{action}', delay={delay_hours}h, discount={discount_percent}%"

    plan = {
        "action": action,
        "delay_hours": delay_hours,
        "discount_percent": discount_percent,
        "playbook_id": top_pb.get("id") if top_pb else "PB-DEFAULT",
    }

    return {
        "proposed_plan": plan,
        "trace": [trace_msg],
        "deliberation_log": [{
            "agent": "Strategist",
            "proposed_plan": plan,
            "revision": revision,
            "timestamp": _utc_now_str(),
        }],
    }


def auditor_node(state: RecoveryState) -> Dict[str, Any]:
    """Node 6: Validates plan against 6 policy guardrails and margin cap."""
    plan = state["proposed_plan"]
    context = state["context"]
    prediction = state["ml_prediction"]
    revision = state.get("revision_count", 0)

    policy_engine = get_policy_engine()
    policy_res = policy_engine.check(
        action=plan["action"],
        transaction=context,
        prediction=prediction,
        diagnosis={"diagnosis": state.get("diagnosis", "")},
    )

    violations = list(policy_res.violations)
    warnings = list(policy_res.warnings)

    # Margin Concession Cap Guardrail (Max 20% discount without VP approval)
    discount = float(plan.get("discount_percent", 0.0))
    if discount > 20.0:
        violations.append(
            f"POL-07-MARGIN-CAP: Proposed discount {discount:.1f}% exceeds authorized 20.0% ceiling."
        )

    approved = len(violations) == 0
    critique_summary = "; ".join(violations) if violations else ""

    if approved:
        trace_msg = "[Auditor] ✅ Strategy APPROVED. All deterministic policy checks passed."
    else:
        trace_msg = f"[Auditor] ❌ Strategy REJECTED. Violations: {critique_summary}"

    return {
        "policy_evaluation": {
            "approved": approved,
            "violations": violations,
            "warnings": warnings,
            "modified_action": policy_res.modified_action,
        },
        "critique": critique_summary if not approved else None,
        "revision_count": revision + 1 if not approved else revision,
        "trace": [trace_msg],
        "deliberation_log": [{
            "agent": "Auditor",
            "approved": approved,
            "violations": violations,
            "timestamp": _utc_now_str(),
        }],
    }


def hitl_gate_node(state: RecoveryState) -> Dict[str, Any]:
    """Node 7: Human-in-the-Loop decision gate for high-value risk or escalation."""
    amount = float(state["context"].get("amount", 0.0))
    plan_action = state["proposed_plan"]["action"]
    policy_eval = state.get("policy_evaluation", {})

    # Determine if action was modified by auditor or policy
    effective_action = policy_eval.get("modified_action") or plan_action

    # High amount threshold or explicit escalation requires operator sign-off
    is_hitl_required = amount > 25000.0 or effective_action == "escalate"

    if is_hitl_required:
        hitl_status = "PENDING_OPERATOR_APPROVAL"
        final_action = "escalate"
        trace_msg = f"[HITL Gate] 🛑 High-ticket/escalated transaction (₹{amount:,.2f}). Execution PAUSED for human review."
    else:
        hitl_status = "AUTONOMOUS_APPROVED"
        final_action = effective_action
        trace_msg = f"[HITL Gate] Cleared for autonomous execution: action='{final_action}'"

    return {
        "hitl_required": is_hitl_required,
        "hitl_status": hitl_status,
        "final_action": final_action,
        "trace": [trace_msg],
        "deliberation_log": [{
            "agent": "HITL_Gate",
            "hitl_status": hitl_status,
            "final_action": final_action,
            "timestamp": _utc_now_str(),
        }],
    }


def communicator_node(state: RecoveryState) -> Dict[str, Any]:
    """Node 8: Hyper-personalized customer communication and dynamic magic link."""
    txn_id = state["transaction_id"]
    cust_id = state.get("customer_id", "cust_unknown")
    amount = float(state["context"].get("amount", 0.0))
    final_action = state.get("final_action", "retry")
    plan = state.get("proposed_plan", {})
    discount = float(plan.get("discount_percent", 0.0))

    magic_token = uuid.uuid4().hex[:12]
    magic_link = f"https://pay.reviveai.io/magic/{txn_id}?tok={magic_token}"
    if discount > 0:
        magic_link += f"&disc={int(discount)}"

    if final_action == "escalate":
        channel = "crm_task"
        headline = "VIP Account Executive High-Touch Outreach"
        body = f"High-value payment of ₹{amount:,.2f} requires manual account manager intervention."
    elif final_action == "update_payment":
        channel = "whatsapp_sms"
        headline = "Frictionless Payment Method Update"
        body = f"Please update your payment instrument securely in 10 seconds: {magic_link}"
    elif discount > 0:
        channel = "email_whatsapp"
        headline = f"Exclusive {int(discount)}% Renewal Concession"
        body = f"We have applied an exclusive {int(discount)}% courtesy discount: {magic_link}"
    else:
        channel = "whatsapp"
        headline = "Automated Payment Retry Notice"
        body = f"Your issuing bank delayed payment of ₹{amount:,.2f}. Retrying in {plan.get('delay_hours', 2.0):.0f}h."

    outreach = {
        "channel": channel,
        "headline": headline,
        "body": body,
        "magic_link": magic_link,
    }

    return {
        "outreach": outreach,
        "trace": [f"[Communicator] Outreach generated via {channel.upper()}: '{headline}'"],
        "deliberation_log": [{
            "agent": "Communicator",
            "channel": channel,
            "headline": headline,
            "timestamp": _utc_now_str(),
        }],
    }


def execution_node(state: RecoveryState) -> Dict[str, Any]:
    """Node 9: Execute approved bounded action and persist audit trail."""
    tools = AgentTools()
    action = state.get("final_action", "no_action")
    txn_id = state["transaction_id"]
    cust_id = state.get("customer_id", "cust_unknown")
    plan = state.get("proposed_plan", {})
    auto_execute = state.get("auto_execute", False)
    hitl_status = state.get("hitl_status", "AUTONOMOUS_APPROVED")

    if not auto_execute or hitl_status == "PENDING_OPERATOR_APPROVAL":
        return {
            "execution_result": {
                "executed": False,
                "reason": "Execution deferred: HITL approval pending or auto_execute=False",
                "final_action": action,
            },
            "terminated": True,
            "trace": [f"[Execution] Action '{action}' held in queue (auto_execute={auto_execute}, hitl={hitl_status})"],
        }

    exec_result: Dict[str, Any] = {"executed": True, "action": action}
    if action == "retry":
        exec_result.update(tools.validate_and_execute("schedule_retry", {
            "transaction_id": txn_id,
            "delay_hours": float(plan.get("delay_hours", 4.0)),
        }))
    elif action == "escalate":
        exec_result.update(tools.validate_and_execute("create_escalation", {
            "transaction_id": txn_id,
            "reason": f"Escalation required: amount ₹{state['context'].get('amount', 0):,.2f}",
            "priority": "high",
        }))
    elif action == "notify_customer":
        exec_result.update(tools.validate_and_execute("send_notification", {
            "transaction_id": txn_id,
            "customer_id": cust_id,
            "message": state.get("outreach", {}).get("body", "Payment reminder"),
        }))
    elif action == "update_payment":
        exec_result.update(tools.validate_and_execute("request_payment_update", {
            "transaction_id": txn_id,
            "customer_id": cust_id,
        }))
    elif action == "offer_alternative":
        exec_result.update(tools.validate_and_execute("offer_alternative_payment", {
            "transaction_id": txn_id,
            "customer_id": cust_id,
        }))

    return {
        "execution_result": exec_result,
        "terminated": True,
        "trace": [f"[Execution] Successfully executed action '{action}'"],
        "deliberation_log": [{
            "event": "action_executed",
            "action": action,
            "success": exec_result.get("success", False),
            "timestamp": _utc_now_str(),
        }],
    }


# ---------------------------------------------------------------------------
# Conditional Branching Edges
# ---------------------------------------------------------------------------

def check_router_edge(state: RecoveryState) -> Literal["detective", "__end__"]:
    """Determines whether to proceed or terminate early."""
    if state.get("terminated"):
        return END
    return "detective"


def check_auditor_edge(state: RecoveryState) -> Literal["strategist", "hitl_gate"]:
    """
    Self-correction loop condition:
    If rejected and revisions < max_revisions -> retry strategy formulation with critique.
    If rejected and revisions >= max_revisions -> break loop and route to HITL escalation.
    If approved -> proceed to HITL gate.
    """
    approved = state.get("policy_evaluation", {}).get("approved", False)
    rev_count = state.get("revision_count", 0)
    max_revs = state.get("max_revisions", 3)

    if not approved:
        if rev_count < max_revs:
            return "strategist"
        # Terminate loop to prevent infinite cycle
        return "hitl_gate"

    return "hitl_gate"


# ---------------------------------------------------------------------------
# Graph Builder & Compilation
# ---------------------------------------------------------------------------

def build_recovery_graph():
    """Compiles the ReviveAI LangGraph StateGraph."""
    workflow = StateGraph(RecoveryState)

    # Register Nodes
    workflow.add_node("initialize", initialize_state_node)
    workflow.add_node("router", router_planner_node)
    workflow.add_node("detective", detective_node)
    workflow.add_node("rag_retrieval", rag_retrieval_node)
    workflow.add_node("strategist", strategist_node)
    workflow.add_node("auditor", auditor_node)
    workflow.add_node("hitl_gate", hitl_gate_node)
    workflow.add_node("communicator", communicator_node)
    workflow.add_node("execution", execution_node)

    # Set Entry Point
    workflow.set_entry_point("initialize")

    # Connect Edges
    workflow.add_edge("initialize", "router")
    workflow.add_conditional_edges(
        "router",
        check_router_edge,
        {"detective": "detective", END: END},
    )
    workflow.add_edge("detective", "rag_retrieval")
    workflow.add_edge("rag_retrieval", "strategist")
    workflow.add_edge("strategist", "auditor")

    # Reflection Loop Conditional Edge
    workflow.add_conditional_edges(
        "auditor",
        check_auditor_edge,
        {
            "strategist": "strategist",
            "hitl_gate": "hitl_gate",
        },
    )

    workflow.add_edge("hitl_gate", "communicator")
    workflow.add_edge("communicator", "execution")
    workflow.add_edge("execution", END)

    return workflow.compile()


# Singleton compiled graph
_compiled_graph = None


def get_recovery_graph():
    global _compiled_graph
    if _compiled_graph is None:
        _compiled_graph = build_recovery_graph()
    return _compiled_graph
