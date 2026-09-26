"""
ReviveAI — Agent Evaluators & Scoring Functions

Computes 9 standard evaluation dimensions for agentic decision intelligence:
1. tool_selection_accuracy
2. tool_argument_correctness
3. policy_compliance
4. correct_escalation
5. final_action_correctness
6. retrieval_quality
7. groundedness
8. failure_recovery
9. agent_termination_behavior
"""

from dataclasses import dataclass, asdict
from typing import Any, Dict, List

from evals.datasets.scenarios import Scenario


@dataclass
class ScenarioEvaluationScore:
    scenario_id: str
    scenario_name: str
    tool_selection_accuracy: float
    tool_argument_correctness: float
    policy_compliance: float
    correct_escalation: float
    final_action_correctness: float
    retrieval_quality: float
    groundedness: float
    failure_recovery: float
    agent_termination_behavior: float
    composite_score: float
    details: Dict[str, Any]


def evaluate_agent_execution(scenario: Scenario, result: Dict[str, Any]) -> ScenarioEvaluationScore:
    """Evaluate an executed scenario result against expected behavior."""
    final_action = result.get("final_action", "")
    policy_eval = result.get("policy_evaluation", {})
    is_approved = policy_eval.get("approved", False)
    hitl_required = result.get("hitl_required", False)
    hitl_status = result.get("hitl_status", "")
    terminated = result.get("terminated", False)
    citations = result.get("rag_citations", [])
    proposed_plan = result.get("proposed_plan", {})
    exec_result = result.get("execution_result", {})

    # 1. Final Action Correctness
    final_action_score = 1.0 if final_action == scenario.expected_final_action else 0.0

    # 2. Tool Selection Accuracy
    # Did the agent pick a logical tool matching the intended action?
    tool_selection_score = 1.0 if final_action in ["retry", "notify_customer", "update_payment", "offer_alternative", "escalate", "no_action"] else 0.0
    if final_action == scenario.expected_final_action:
        tool_selection_score = 1.0

    # 3. Tool Argument Correctness
    # Ensure delay_hours and discount_percent abide by limits
    arg_correct = True
    if proposed_plan:
        delay = proposed_plan.get("delay_hours", 0)
        discount = proposed_plan.get("discount_percent", 0)
        if delay < 0 or delay > 168:
            arg_correct = False
        if discount < 0 or discount > 20:  # Margin cap
            arg_correct = False
    tool_arg_score = 1.0 if arg_correct else 0.0

    # 4. Policy Compliance
    # If scenario expected policy violation/rejection, did the auditor identify it?
    if scenario.expect_policy_approved:
        policy_score = 1.0 if is_approved else 0.0
    else:
        # Expected a block or override
        policy_score = 1.0 if (not is_approved or policy_eval.get("modified_action") is not None) else 0.0

    # 5. Correct Escalation
    if scenario.expect_escalation or scenario.expect_hitl:
        escalation_score = 1.0 if (hitl_required or final_action == "escalate" or "PENDING" in hitl_status) else 0.0
    else:
        escalation_score = 1.0 if (not hitl_required and final_action != "escalate") else 0.0

    # 6. Retrieval Quality
    if scenario.expected_citations:
        has_citation = any(exp in c for exp in scenario.expected_citations for c in citations)
        retrieval_score = 1.0 if has_citation else 0.5
    else:
        retrieval_score = 1.0 if citations else 0.8

    # 7. Groundedness
    # Did the agent ground its deliberation log in features and rules?
    delib_log = result.get("deliberation_log", [])
    groundedness_score = 1.0 if len(delib_log) >= 3 else (len(delib_log) / 3.0)

    # 8. Failure Recovery
    # If error occurred, did it trap cleanly?
    failure_recovery_score = 1.0
    if result.get("error") and not terminated:
        failure_recovery_score = 0.0

    # 9. Agent Termination Behavior
    # Must terminate without infinite loops, revision count <= max_revisions
    rev_count = result.get("revision_count", 0)
    max_revs = result.get("max_revisions", 3)
    termination_score = 1.0 if (terminated and rev_count <= max_revs) else 0.0

    scores = [
        tool_selection_score,
        tool_arg_score,
        policy_score,
        escalation_score,
        final_action_score,
        retrieval_score,
        groundedness_score,
        failure_recovery_score,
        termination_score,
    ]
    composite = sum(scores) / len(scores)

    return ScenarioEvaluationScore(
        scenario_id=scenario.id,
        scenario_name=scenario.name,
        tool_selection_accuracy=round(tool_selection_score, 4),
        tool_argument_correctness=round(tool_arg_score, 4),
        policy_compliance=round(policy_score, 4),
        correct_escalation=round(escalation_score, 4),
        final_action_correctness=round(final_action_score, 4),
        retrieval_quality=round(retrieval_score, 4),
        groundedness=round(groundedness_score, 4),
        failure_recovery=round(failure_recovery_score, 4),
        agent_termination_behavior=round(termination_score, 4),
        composite_score=round(composite, 4),
        details={
            "final_action": final_action,
            "expected_action": scenario.expected_final_action,
            "hitl_status": hitl_status,
            "policy_approved": is_approved,
            "revision_count": rev_count,
            "citations": citations,
        },
    )
