"""
ReviveAI — Multi-Agent Autonomous Recovery System

Coordinates 4 specialized agents:
1. Detective Agent (Forensics & Involuntary/Voluntary Churn Classifier)
2. Strategist Agent (Recovery Intervention Planner with RAG Playbooks)
3. Auditor Agent (The Critic: Guardrails, Margin Caps & Self-Correction Loop)
4. Communicator Agent (Hyper-Personalized Contextual Outreach & Magic Links)

Includes:
- Autonomous Task Decomposition
- Self-Correction & Reflection Loop (Auditor ⇋ Strategist)
- Dynamic Tool Calling
- Long-term Memory (RAG Playbooks)
- Human-in-the-Loop (HITL) Gate
"""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import uuid

from src.agent.tools import AgentTools
from src.agent.policy_engine import get_policy_engine, PolicyEngine
from src.ml.predict import get_predictor, RecoveryPredictor
from src.ai.diagnosis import get_diagnosis_service, DiagnosisService
from src.ai.rag_playbooks import get_playbook_store, PlaybookStore
from src.ai.llm_provider import GeminiProvider
from src.ai.prompts import (
    DETECTIVE_AGENT_PROMPT,
    STRATEGIST_AGENT_PROMPT,
    AUDITOR_AGENT_PROMPT,
    COMMUNICATOR_AGENT_PROMPT,
)


def _utc_now_str() -> str:
    return datetime.now(timezone.utc).isoformat()


class DetectiveAgent:
    """
    🕵️ The Detective: Root-Cause Forensics & Churn Classifier.
    Inspects transaction telemetry, customer history, and ML recovery probability.
    Classifies failure as Involuntary vs. Voluntary churn using Google Gemini 3.6 Flash.
    """

    def __init__(self, tools: AgentTools, predictor: RecoveryPredictor, diagnosis_service: DiagnosisService):
        self.tools = tools
        self.predictor = predictor
        self.diagnosis_service = diagnosis_service
        self.gemini = GeminiProvider()

    async def investigate(self, transaction_id: str, context_override: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        trace: List[str] = []
        trace.append(f"[Detective] Fetching payment telemetry for {transaction_id}...")

        # 1. Tool Call: check_payment
        payment_data = self.tools.check_payment(transaction_id)
        if not payment_data.get("found") and context_override:
            payment_data = {
                "found": True,
                "transaction_id": transaction_id,
                **context_override,
            }

        customer_id = payment_data.get("customer_id", "cust_unknown")
        trace.append(f"[Detective] Querying CRM customer profile for {customer_id}...")

        # 2. Tool Call: get_customer_history
        customer_data = self.tools.get_customer_history(customer_id)

        # Merge context
        context = {**payment_data}
        if customer_data.get("found"):
            context.update(customer_data)
        if context_override:
            context.update(context_override)

        # Ensure baseline features
        context.setdefault("amount", 4999.0)
        context.setdefault("payment_method", "upi")
        context.setdefault("failure_reason", "authentication_failure")
        context.setdefault("retry_count", 0)
        context.setdefault("customer_ltv", 15000.0)
        context.setdefault("days_since_last_login", 2)

        # 3. ML Inference & RAG-Grounded Contextual Bandit
        query = f"{context.get('failure_reason', '')} {context.get('payment_method', '')}"
        matching_pbs = get_playbook_store().search(query, top_k=1)
        rag_pb = matching_pbs[0] if matching_pbs else None
        rag_benchmark_prob = rag_pb.get("historical_benchmark_prob", 0.50) if rag_pb else 0.50

        if self.predictor.is_loaded:
            trace.append("[Detective] Running calibrated XGBoost recovery probability model...")
            ml_pred = self.predictor.predict(context)
        else:
            trace.append(f"[Detective] Consulting RAG Historical Benchmarks: '{rag_pb.get('id', 'PB-EMPIRICAL')}' ({rag_pb.get('title', 'Empirical Prior')})...")
            # Contextual Multi-Armed Bandit adjustments
            prob = rag_benchmark_prob
            ltv = float(context.get("customer_ltv", 5000.0))
            if ltv > 20000:
                prob += 0.03
            elif ltv < 3000:
                prob -= 0.05

            retries = int(context.get("retry_count", 0))
            prob -= (retries * 0.08)

            days_inactive = int(context.get("days_since_last_login", 0))
            if days_inactive > 30:
                prob -= 0.12

            prob = max(0.02, min(0.96, round(prob, 3)))
            amt = float(context.get("amount", 0.0))
            ml_pred = {
                "recovery_probability": prob,
                "expected_recovery_value": round(amt * prob, 2),
                "risk_level": "low" if prob >= 0.7 else "medium" if prob >= 0.4 else "high",
                "recommended_action": rag_pb.get("recommended_action", "retry") if rag_pb else "retry",
                "confidence": 0.88,
                "model_used": f"RAG Historical Benchmark ({rag_pb.get('id', 'PB-DEFAULT')})",
            }

        rec_prob = ml_pred.get("recovery_probability", 0.5)
        erv = ml_pred.get("expected_recovery_value", 0.0)
        trace.append(f"[Detective] Grounded P(recovery)={rec_prob:.1%} (ERV: ₹{erv:,.2f}) based on past analysis.")

        # 4. Classify Involuntary vs Voluntary Churn
        failure_reason = str(context.get("failure_reason", "")).lower()
        days_inactive = int(context.get("days_since_last_login", 0))

        involuntary_triggers = {
            "insufficient_funds", "authentication_failure", "card_expired",
            "bank_down", "psp_timeout", "network_error", "mandate_failed"
        }
        voluntary_triggers = {
            "customer_cancellation", "disputed_charge", "subscription_pause",
            "refund_requested", "low_usage"
        }

        if any(trig in failure_reason for trig in voluntary_triggers) or days_inactive > 30:
            churn_category = "voluntary_churn"
            churn_hypothesis = "Customer intent churn or price resistance indicated by product inactivity or explicit mandate revocation."
        else:
            churn_category = "involuntary_churn"
            churn_hypothesis = "Payment rail or instrument failure. Customer relationship and service intent intact."

        # Real LLM Forensic Intelligence with Gemini 3.6 Flash
        if self.gemini.is_available():
            try:
                trace.append("[Detective] 🧠 Calling Google Gemini 3.6 Flash for forensic root-cause analysis...")
                prompt = DETECTIVE_AGENT_PROMPT.format(
                    transaction_id=transaction_id,
                    amount=float(context.get("amount", 0.0)),
                    payment_method=str(context.get("payment_method", "card")),
                    failure_reason=failure_reason,
                    retry_count=int(context.get("retry_count", 0)),
                    customer_id=customer_id,
                    customer_tenure_days=int(context.get("tenure_days", 30)),
                    subscription_type=str(context.get("subscription_type", "starter")),
                    customer_ltv=float(context.get("customer_ltv", 5000.0)),
                    days_since_last_login=days_inactive,
                    nps_score=float(context.get("nps_score", 7.0)),
                    support_tickets_last_30d=int(context.get("support_tickets_last_30d", 0)),
                    recovery_probability=rec_prob,
                )
                llm_det = await self.gemini.generate_json(prompt, system_instruction="You are ReviveAI Lead Detective Agent.")
                cat_resp = str(llm_det.get("churn_category", "")).lower()
                if "voluntary" in cat_resp:
                    churn_category = "voluntary_churn" if "involuntary" not in cat_resp else "involuntary_churn"
                churn_hypothesis = llm_det.get("root_cause_analysis", churn_hypothesis)
                context["customer_intent_score"] = float(llm_det.get("customer_intent_score", 0.8))
                if llm_det.get("deliberation_note"):
                    trace.append(f"[Detective] 💡 Forensic Intelligence: {llm_det.get('deliberation_note')}")
            except Exception as e:
                trace.append(f"[Detective] (Gemini forensics fallback: {e})")

        trace.append(f"[Detective] Classification: {churn_category.upper()} — {churn_hypothesis}")

        # 5. LLM Failure Diagnosis
        diag_output = await self.diagnosis_service.diagnose(context, ml_pred)
        diagnosis_text = diag_output.get("diagnosis", "Transaction failed due to payment rail interruption.")

        return {
            "transaction_id": transaction_id,
            "customer_id": customer_id,
            "context": context,
            "ml_prediction": ml_pred,
            "churn_category": churn_category,
            "churn_hypothesis": churn_hypothesis,
            "diagnosis_text": diagnosis_text,
            "trace": trace,
        }


class StrategistAgent:
    """
    🧠 The Strategist: Recovery Intervention Planner.
    Consults long-term memory (RAG playbooks), assesses customer LTV,
    and formulates an optimal intervention plan using Gemini 3.6 Flash.
    """

    def __init__(self, playbook_store: PlaybookStore):
        self.playbooks = playbook_store
        self.gemini = GeminiProvider()

    def plan(
        self,
        investigation: Dict[str, Any],
        critique: Optional[str] = None,
        revision_count: int = 0,
    ) -> Dict[str, Any]:
        trace: List[str] = []
        context = investigation["context"]
        churn_category = investigation["churn_category"]
        amount = float(context.get("amount", 0.0))
        ltv = float(context.get("customer_ltv", 5000.0))
        failure_reason = context.get("failure_reason", "")
        retry_count = int(context.get("retry_count", 0))

        # Long-Term Memory (RAG) Query
        query = f"{churn_category} {failure_reason} {context.get('payment_method', '')}"
        matching_playbooks = self.playbooks.search(query, top_k=2)
        top_pb = matching_playbooks[0] if matching_playbooks else None

        trace.append(
            f"[Strategist] RAG Playbook matched: '{top_pb.get('title', 'Standard Recovery')}'"
            if top_pb else "[Strategist] Using standard adaptive recovery protocol."
        )

        # Base Plan Formulation
        action = "retry"
        delay_hours = 4.0
        discount_percent = 0.0
        alternative_rails: List[str] = []
        rationale = "Adaptive baseline recovery protocol."

        if critique:
            trace.append(f"[Strategist] Self-Correction triggered by Auditor Critique: '{critique}' (Revision #{revision_count})")
            # Self-Correction: Adapt plan to fix critique
            if "discount" in critique.lower() or "margin" in critique.lower():
                discount_percent = 15.0  # Concede to acceptable margin
                trace.append(f"[Strategist] Adjusted discount down to compliant ceiling: {discount_percent}%")
            if "cooldown" in critique.lower() or "bank" in critique.lower():
                delay_hours = max(delay_hours, 3.0)
                trace.append(f"[Strategist] Adjusted retry delay to comply with bank cooldown: {delay_hours}h")
            if "max retry" in critique.lower() or "pol-01" in critique.lower():
                action = "update_payment"
                trace.append("[Strategist] Max retry exceeded. Switched strategy from silent retry to self-service payment update.")
        else:
            if amount > 25000.0:
                action = "escalate"
                delay_hours = 0.0
                trace.append(f"[Strategist] High-ticket transaction (₹{amount:,.2f} > ₹25,000). Proposing VIP Account Executive escalation.")
            elif churn_category == "voluntary_churn":
                action = "offer_alternative"
                # Initial aggressive proposal that exceeds margin cap (tests auditor reflection loop)
                discount_percent = 25.0 if ltv > 10000 else 22.0
                alternative_rails = ["upi_autopay", "netbanking"]
                trace.append(f"[Strategist] Voluntary churn risk. Proposing aggressive {discount_percent}% retention discount with alternative rail switch.")
            elif "expired" in failure_reason:
                action = "update_payment"
                delay_hours = 0.0
                trace.append("[Strategist] Card expired. Proposing encrypted self-service portal link.")
            elif "insufficient" in failure_reason:
                action = "notify_customer"
                delay_hours = 24.0
                trace.append("[Strategist] Insufficient funds. Proposing soft notification + 24h delay aligned with salary balance.")
            else:
                action = "retry"
                delay_hours = 2.0 if "authentication" in failure_reason else 4.0
                trace.append(f"[Strategist] Transient network/auth decline. Proposing off-peak retry in {delay_hours}h.")

        # Real LLM Strategy Synthesis via Gemini
        if self.gemini.is_available():
            try:
                trace.append("[Strategist] 🧠 Consulting Gemini 3.6 Flash for RAG-grounded strategy synthesis...")
                rag_summary = f"Playbook ID: {top_pb.get('id', 'PB-STD')}\nTitle: {top_pb.get('title', '')}\nRecommended Action: {top_pb.get('recommended_action', '')}\nHistorical Benchmark: {top_pb.get('historical_benchmark_prob', 0.5):.1%}" if top_pb else "Standard Recovery"
                strat_prompt = STRATEGIST_AGENT_PROMPT.format(
                    churn_category=churn_category.upper(),
                    root_cause_analysis=investigation.get("churn_hypothesis", "Payment decline"),
                    amount=amount,
                    customer_ltv=ltv,
                    customer_intent_score=context.get("customer_intent_score", 0.8),
                    rag_playbook_context=rag_summary,
                    revision_critique=critique or "None (Initial Formulation)",
                )
                llm_strat = self.gemini.generate_json_sync(strat_prompt, system_instruction="You are ReviveAI Strategy Planner Agent.")
                if llm_strat.get("strategic_rationale"):
                    rationale = llm_strat.get("strategic_rationale")
                    trace.append(f"[Strategist] 🎯 Gemini Strategy Rationale: {rationale}")
                if critique and ("margin" in critique.lower() or "discount" in critique.lower()):
                    llm_disc = float(llm_strat.get("proposed_discount_pct", discount_percent))
                    discount_percent = min(llm_disc, 15.0)
            except Exception as e:
                trace.append(f"[Strategist] (Gemini strategic synthesis fallback: {e})")

        return {
            "action": action,
            "delay_hours": delay_hours,
            "discount_percent": discount_percent,
            "alternative_rails": alternative_rails,
            "matched_playbook": top_pb.get("id") if top_pb else None,
            "strategic_rationale": rationale,
            "revision_count": revision_count,
            "trace": trace,
        }


class AuditorAgent:
    """
    ⚖️ The Auditor (The Critic): Financial & Regulatory Guardrail Enforcer.
    Evaluates proposed recovery interventions against corporate policies and NPCI rules
    with real Gemini 3.6 Flash critique.
    
    If non-compliant, REJECTS with specific actionable critique.
    """

    def __init__(self, policy_engine: PolicyEngine):
        self.policy_engine = policy_engine
        self.max_authorized_discount = 20.0
        self.gemini = GeminiProvider()

    def audit(
        self,
        plan: Dict[str, Any],
        investigation: Dict[str, Any],
    ) -> Dict[str, Any]:
        trace: List[str] = []
        violations: List[str] = []
        critiques: List[str] = []

        context = investigation["context"]
        action = plan["action"]
        discount = float(plan.get("discount_percent", 0.0))
        delay_hours = float(plan.get("delay_hours", 0.0))

        trace.append(f"[Auditor] Auditing plan: action='{action}', discount={discount}%, delay={delay_hours}h...")

        # Rule 1: Corporate Margin Discount Ceiling
        if discount > self.max_authorized_discount:
            violations.append("POL-07-MARGIN-CAP")
            critiques.append(
                f"Proposed discount of {discount}% exceeds authorized corporate margin ceiling of {self.max_authorized_discount}%."
            )

        # Rule 2: Deterministic 6 Policy Engine Guardrails
        engine_result = self.policy_engine.check(
            action=action,
            transaction=context,
            prediction=investigation["ml_prediction"],
            diagnosis={"diagnosis": investigation["diagnosis_text"]},
        )

        if not engine_result.approved:
            for v in engine_result.violations:
                violations.append(v)
                critiques.append(f"Policy Engine violation: {v}")

        # Rule 3: Bank Cooldown Guardrail
        if action == "retry" and delay_hours < 2.0 and context.get("retry_count", 0) > 0:
            violations.append("POL-06-BANK-COOLDOWN")
            critiques.append("Retry scheduled under 2.0h during bank cooldown window.")

        # Real LLM Financial & Risk Audit via Gemini
        if self.gemini.is_available():
            try:
                trace.append("[Auditor] ⚖️ Consulting Gemini 3.6 Flash for financial compliance & fatigue audit...")
                aud_prompt = AUDITOR_AGENT_PROMPT.format(
                    amount=float(context.get("amount", 0.0)),
                    action=action,
                    proposed_discount_pct=discount,
                    retry_delay_hours=delay_hours,
                    strategic_rationale=plan.get("strategic_rationale", "Standard adaptive strategy"),
                )
                llm_aud = self.gemini.generate_json_sync(aud_prompt, system_instruction="You are ReviveAI Senior Financial Risk Auditor.")
                if llm_aud.get("critique"):
                    trace.append(f"[Auditor] 📝 Gemini Audit Critique: {llm_aud.get('critique')}")
                if not llm_aud.get("approved", True) and llm_aud.get("policy_violations"):
                    for v in llm_aud.get("policy_violations", []):
                        if v not in violations:
                            violations.append(v)
                            critiques.append(f"Gemini Audit Flag: {llm_aud.get('critique', v)}")
            except Exception as e:
                trace.append(f"[Auditor] (Gemini compliance check fallback: {e})")

        approved = len(violations) == 0
        if approved:
            trace.append("[Auditor] ✅ All guardrails, dunning policies, and margin rules passed.")
        else:
            trace.append(f"[Auditor] ❌ Plan REJECTED. Violations: {', '.join(violations)}")

        return {
            "approved": approved,
            "violations": violations,
            "critiques": critiques,
            "critique_summary": "; ".join(critiques) if critiques else "Approved without objection.",
            "trace": trace,
        }


class CommunicatorAgent:
    """
    ✍️ The Communicator: Hyper-Personalized Contextual Outreach.
    Drafts tailored customer messaging with secure 1-click magic links
    powered by Gemini 3.6 Flash.
    """

    def __init__(self, tools: AgentTools):
        self.tools = tools
        self.gemini = GeminiProvider()

    def craft_and_dispatch(
        self,
        investigation: Dict[str, Any],
        approved_plan: Dict[str, Any],
    ) -> Dict[str, Any]:
        trace: List[str] = []
        context = investigation["context"]
        customer_id = investigation["customer_id"]
        transaction_id = investigation["transaction_id"]
        amount = float(context.get("amount", 0.0))
        discount = float(approved_plan.get("discount_percent", 0.0))
        action = approved_plan["action"]

        # Generate Secure Dynamic Magic Link
        magic_token = uuid.uuid4().hex[:12]
        magic_link = f"https://pay.reviveai.io/magic/{transaction_id}?tok={magic_token}"

        if discount > 0:
            magic_link += f"&disc={int(discount)}"

        # Context-aware messaging
        if action == "escalate":
            channel = "crm_task"
            headline = "VIP Account Executive High-Touch Outreach"
            body = (
                f"High-value invoice of ₹{amount:,.2f} for customer {customer_id} requires manual account manager check-in. "
                "Do not send robotic dunning. Escalation ticket auto-created."
            )
        elif action == "update_payment":
            channel = "whatsapp_sms"
            headline = "Frictionless Payment Method Update"
            body = (
                f"Hi from ReviveAI: Your subscription payment of ₹{amount:,.2f} couldn't be completed with your current card. "
                f"Update your payment method in 10 seconds securely here: {magic_link}"
            )
        elif discount > 0:
            channel = "email_whatsapp"
            headline = f"Exclusive {int(discount)}% Renewal Concession"
            body = (
                f"We noticed an interruption in your subscription. Because we value your partnership, "
                f"we have applied an exclusive {int(discount)}% courtesy credit. Complete your renewal here: {magic_link}"
            )
        else:
            channel = "whatsapp"
            headline = "Friendly Payment Update"
            body = (
                f"Notice: Payment of ₹{amount:,.2f} was delayed by your issuing bank. "
                f"We will automatically retry in {approved_plan.get('delay_hours', 2.0):.0f}h. "
                f"Or complete immediately via UPI: {magic_link}"
            )

        # Real LLM Outreach Generation with Gemini
        if self.gemini.is_available() and action != "escalate":
            try:
                trace.append("[Communicator] ✍️ Consulting Gemini 3.6 Flash for empathetic customer messaging...")
                comm_prompt = COMMUNICATOR_AGENT_PROMPT.format(
                    customer_id=customer_id,
                    amount=amount,
                    churn_category=investigation.get("churn_category", "involuntary").upper(),
                    action=action,
                    discount_pct=int(discount),
                    magic_link=magic_link,
                    outreach_channel=channel.upper(),
                )
                llm_comm = self.gemini.generate_json_sync(comm_prompt, system_instruction="You are ReviveAI Contextual Communicator Agent.")
                if llm_comm.get("subject"):
                    headline = llm_comm.get("subject")
                if llm_comm.get("message"):
                    body = llm_comm.get("message")
                trace.append(f"[Communicator] 💌 Gemini Personalized Subject: '{headline}'")
            except Exception as e:
                trace.append(f"[Communicator] (Gemini copy formulation fallback: {e})")

        trace.append(f"[Communicator] Crafted communication via {channel.upper()}: '{headline}'")
        trace.append(f"[Communicator] Embedded Magic Link: {magic_link}")

        return {
            "channel": channel,
            "headline": headline,
            "message_body": body,
            "magic_link": magic_link,
            "trace": trace,
        }


class MultiAgentOrchestrator:
    """
    🎯 Master Orchestrator: Autonomous Planning, Reflection Loop & HITL Governance.
    Coordinates the 4 agents through a ReAct Plan-and-Solve lifecycle.
    """

    def __init__(self):
        self.tools = AgentTools()
        self.predictor = get_predictor()
        self.diagnosis_service = get_diagnosis_service()
        self.policy_engine = get_policy_engine()
        self.playbooks = get_playbook_store()

        self.detective = DetectiveAgent(self.tools, self.predictor, self.diagnosis_service)
        self.strategist = StrategistAgent(self.playbooks)
        self.auditor = AuditorAgent(self.policy_engine)
        self.communicator = CommunicatorAgent(self.tools)

    async def execute_recovery_mission(
        self,
        transaction_id: str,
        auto_execute: bool = False,
        context_override: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        mission_id = f"AGY-{transaction_id[-6:]}-{_utc_now_str().split('T')[1][:8].replace(':', '')}"
        all_traces: List[str] = []
        deliberation_log: List[Dict[str, Any]] = []

        all_traces.append(f"══════════════════════════════════════════════════════════")
        all_traces.append(f"🚀 MULTI-AGENT RECOVERY MISSION INITIATED: {mission_id}")
        all_traces.append(f"══════════════════════════════════════════════════════════")

        # ─── PHASE 1: Detective Investigation ────────────────────
        all_traces.append("\n[PHASE 1] DETECTIVE FORENSICS & CHURN CLASSIFICATION")
        investigation = await self.detective.investigate(transaction_id, context_override)
        all_traces.extend(investigation["trace"])
        deliberation_log.append({
            "agent": "Detective",
            "status": "completed",
            "findings": {
                "churn_category": investigation["churn_category"],
                "churn_hypothesis": investigation["churn_hypothesis"],
                "recovery_probability": investigation["ml_prediction"]["recovery_probability"],
                "diagnosis": investigation["diagnosis_text"],
            }
        })

        # ─── PHASE 2 & 3: Strategist & Auditor Reflection Loop ───
        all_traces.append("\n[PHASE 2 & 3] STRATEGY PLANNING & AUDITOR CRITIQUE LOOP")
        max_revisions = 3
        current_revision = 0
        critique: Optional[str] = None
        plan: Dict[str, Any] = {}
        audit_result: Dict[str, Any] = {}

        while current_revision <= max_revisions:
            plan = self.strategist.plan(
                investigation=investigation,
                critique=critique,
                revision_count=current_revision,
            )
            all_traces.extend(plan["trace"])

            audit_result = self.auditor.audit(plan=plan, investigation=investigation)
            all_traces.extend(audit_result["trace"])

            deliberation_log.append({
                "agent": "Strategist",
                "revision": current_revision,
                "proposed_action": plan["action"],
                "discount_percent": plan["discount_percent"],
                "delay_hours": plan["delay_hours"],
            })
            deliberation_log.append({
                "agent": "Auditor",
                "approved": audit_result["approved"],
                "violations": audit_result["violations"],
                "critique": audit_result["critique_summary"],
            })

            if audit_result["approved"]:
                all_traces.append("[Loop] ✅ Strategy approved by Auditor. Proceeding to execution phase.")
                break

            current_revision += 1
            critique = audit_result["critique_summary"]
            all_traces.append(f"[Loop] 🔁 Self-Correction iteration #{current_revision}: Feeding critique back to Strategist...")

        # Fallback if max revisions exceeded
        if not audit_result["approved"]:
            all_traces.append("[Loop] ⚠️ Max revisions exceeded. Overriding to safe escalation fallback.")
            plan["action"] = "escalate"
            audit_result["approved"] = True

        # ─── PHASE 4: Human-in-the-Loop (HITL) Gate ───────────────
        all_traces.append("\n[PHASE 4] HUMAN-IN-THE-LOOP (HITL) GATE EVALUATION")
        amount = float(investigation["context"].get("amount", 0.0))
        is_hitl_required = amount > 25000.0 or plan["action"] == "escalate"

        if is_hitl_required:
            hitl_status = "PENDING_OPERATOR_APPROVAL"
            all_traces.append(f"[HITL Gate] 🛑 High-value / enterprise risk detected (₹{amount:,.2f}). Autonomous execution PAUSED.")
            all_traces.append("[HITL Gate] Routed to VIP Operator Review Queue (/api/recovery/escalations).")
        else:
            hitl_status = "AUTONOMOUS_APPROVED"
            all_traces.append(f"[HITL Gate] Standard transaction (₹{amount:,.2f} <= ₹25,000). Cleared for autonomous execution.")

        deliberation_log.append({
            "agent": "HITL_Gate",
            "hitl_required": is_hitl_required,
            "status": hitl_status,
        })

        # ─── PHASE 5: Contextual Outreach Generation ─────────────
        all_traces.append("\n[PHASE 5] CONTEXTUAL OUTREACH GENERATION")
        outreach = self.communicator.craft_and_dispatch(investigation, plan)
        all_traces.extend(outreach["trace"])
        deliberation_log.append({
            "agent": "Communicator",
            "channel": outreach["channel"],
            "headline": outreach["headline"],
            "magic_link": outreach["magic_link"],
        })

        # ─── PHASE 6: Execution & Tool Dispatch ──────────────────
        execution_result = None
        if auto_execute and not is_hitl_required and audit_result["approved"]:
            all_traces.append(f"\n[PHASE 6] DISPATCHING TOOL ACTION: {plan['action'].upper()}")
            if plan["action"] == "retry":
                execution_result = self.tools.schedule_retry(transaction_id, plan["delay_hours"])
            elif plan["action"] == "notify_customer":
                execution_result = self.tools.send_notification(transaction_id, investigation["customer_id"], outreach["message_body"])
            elif plan["action"] == "update_payment":
                execution_result = self.tools.request_payment_update(transaction_id, investigation["customer_id"])
            elif plan["action"] == "offer_alternative":
                execution_result = self.tools.offer_alternative_payment(transaction_id, investigation["customer_id"], plan.get("alternative_rails"))
            elif plan["action"] == "escalate":
                execution_result = self.tools.create_escalation(transaction_id, investigation["diagnosis_text"])
            all_traces.append(f"[Execution] Result: {execution_result}")
        else:
            all_traces.append(f"\n[PHASE 6] Action ready: {plan['action']} (Auto-execute={auto_execute}, HITL={is_hitl_required})")

        all_traces.append("\n══════════════════════════════════════════════════════════")
        all_traces.append(f"🏁 MISSION COMPLETE: Final Action = {plan['action'].upper()} | HITL = {hitl_status}")
        all_traces.append("══════════════════════════════════════════════════════════")

        return {
            "mission_id": mission_id,
            "transaction_id": transaction_id,
            "customer_id": investigation["customer_id"],
            "amount": amount,
            "timestamp": _utc_now_str(),
            "status": "completed",
            "hitl_status": hitl_status,
            "final_action": plan["action"],
            "discount_percent": plan["discount_percent"],
            "delay_hours": plan["delay_hours"],
            "revision_count": current_revision,
            "investigation": {
                "churn_category": investigation["churn_category"],
                "churn_hypothesis": investigation["churn_hypothesis"],
                "recovery_probability": investigation["ml_prediction"]["recovery_probability"],
                "expected_recovery_value": investigation["ml_prediction"]["expected_recovery_value"],
                "diagnosis": investigation["diagnosis_text"],
            },
            "outreach": outreach,
            "deliberation_log": deliberation_log,
            "agent_trace": all_traces,
            "execution_result": execution_result,
        }


# Global singleton
_orchestrator: Optional[MultiAgentOrchestrator] = None


def get_multi_agent_orchestrator() -> MultiAgentOrchestrator:
    global _orchestrator
    if _orchestrator is None:
        _orchestrator = MultiAgentOrchestrator()
    return _orchestrator
