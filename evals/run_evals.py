"""
ReviveAI — Agent Evaluation Suite CLI Runner

Executes all 14 evaluation scenarios across the LangGraph StateGraph,
scores results on 9 dimensions, and generates both machine-readable JSON
and human-readable Markdown reports.

Usage:
    python evals/run_evals.py
"""

import asyncio
from dataclasses import asdict
import json
import os
from pathlib import Path
import sys
import time
from typing import Any, Dict, List

# Ensure project root is on sys.path
sys.path.insert(0, str(Path(__file__).parent.parent.resolve()))

from evals.datasets.scenarios import EVALUATION_SCENARIOS, Scenario
from evals.evaluators.scorers import evaluate_agent_execution, ScenarioEvaluationScore
from src.agent.graph import get_recovery_graph


async def run_scenario(scenario: Scenario, graph: Any) -> Dict[str, Any]:
    """Execute a single evaluation scenario through the compiled LangGraph StateGraph."""
    state_input = dict(scenario.initial_state)
    start_time = time.perf_counter()
    try:
        result = await graph.ainvoke(state_input)
    except Exception as exc:
        result = {
            "error": str(exc),
            "terminated": True,
            "final_action": "no_action",
            "trace": [f"[Eval Runner] Unhandled exception: {str(exc)}"],
        }
    elapsed_ms = (time.perf_counter() - start_time) * 1000
    result["_latency_ms"] = round(elapsed_ms, 2)
    return result


async def run_all_evaluations() -> Dict[str, Any]:
    """Execute all 14 evaluation scenarios and compile comprehensive reports."""
    graph = get_recovery_graph()
    reports_dir = Path(__file__).parent / "reports"
    reports_dir.mkdir(parents=True, exist_ok=True)

    suite_start = time.perf_counter()
    scenario_evaluations: List[ScenarioEvaluationScore] = []
    total_latencies: List[float] = []

    print("=" * 70)
    print("🚀 ReviveAI Autonomous Agent Evaluation Suite (14 Scenarios)")
    print("=" * 70)

    for idx, scenario in enumerate(EVALUATION_SCENARIOS, start=1):
        print(f"[{idx:02d}/14] Running {scenario.name} ({scenario.id})...", end=" ", flush=True)
        raw_result = await run_scenario(scenario, graph)
        eval_score = evaluate_agent_execution(scenario, raw_result)
        eval_score.details["latency_ms"] = raw_result.get("_latency_ms", 0.0)
        scenario_evaluations.append(eval_score)
        total_latencies.append(raw_result.get("_latency_ms", 0.0))
        status_sym = "✅" if eval_score.composite_score >= 0.85 else "⚠️"
        print(f"{status_sym} Composite: {eval_score.composite_score:.1%} ({raw_result.get('_latency_ms', 0):.0f}ms)")

    suite_duration_s = time.perf_counter() - suite_start
    total_scenarios = len(scenario_evaluations)

    # Compute aggregate metric means
    def avg_metric(attr: str) -> float:
        return sum(getattr(s, attr) for s in scenario_evaluations) / total_scenarios

    summary_metrics = {
        "tool_selection_accuracy": round(avg_metric("tool_selection_accuracy"), 4),
        "tool_argument_correctness": round(avg_metric("tool_argument_correctness"), 4),
        "policy_compliance": round(avg_metric("policy_compliance"), 4),
        "correct_escalation": round(avg_metric("correct_escalation"), 4),
        "final_action_correctness": round(avg_metric("final_action_correctness"), 4),
        "retrieval_quality": round(avg_metric("retrieval_quality"), 4),
        "groundedness": round(avg_metric("groundedness"), 4),
        "failure_recovery": round(avg_metric("failure_recovery"), 4),
        "agent_termination_behavior": round(avg_metric("agent_termination_behavior"), 4),
        "overall_composite_score": round(avg_metric("composite_score"), 4),
        "total_scenarios_evaluated": total_scenarios,
        "suite_duration_seconds": round(suite_duration_s, 2),
        "average_scenario_latency_ms": round(sum(total_latencies) / total_scenarios, 2),
    }

    report_payload = {
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "summary": summary_metrics,
        "scenarios": [asdict(s) for s in scenario_evaluations],
    }

    # Write machine-readable JSON
    json_path = reports_dir / "latest.json"
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(report_payload, f, indent=2)

    # Write human-readable Markdown
    md_path = reports_dir / "latest.md"
    with open(md_path, "w", encoding="utf-8") as f:
        f.write("# ReviveAI Agent Evaluation Report\n\n")
        f.write(f"**Execution Timestamp:** `{report_payload['timestamp']}`  \n")
        f.write(f"**Overall Composite Score:** `{summary_metrics['overall_composite_score']:.1%}`  \n")
        f.write(f"**Suite Duration:** `{summary_metrics['suite_duration_seconds']:.2f}s` (Avg `{summary_metrics['average_scenario_latency_ms']:.1f}ms`/scenario)  \n\n")

        f.write("## 1. Aggregate Performance Dimensions\n\n")
        f.write("| Evaluation Dimension | Target | Measured Score | Status |\n")
        f.write("| :--- | :---: | :---: | :---: |\n")
        f.write(f"| **Tool Selection Accuracy** | $\\ge 90\\%$ | **{summary_metrics['tool_selection_accuracy']:.1%}** | {'✅' if summary_metrics['tool_selection_accuracy'] >= 0.9 else '⚠️'} |\n")
        f.write(f"| **Tool Argument Correctness** | $\\ge 90\\%$ | **{summary_metrics['tool_argument_correctness']:.1%}** | {'✅' if summary_metrics['tool_argument_correctness'] >= 0.9 else '⚠️'} |\n")
        f.write(f"| **Policy Compliance** | $100\\%$ | **{summary_metrics['policy_compliance']:.1%}** | {'✅' if summary_metrics['policy_compliance'] >= 0.99 else '⚠️'} |\n")
        f.write(f"| **Correct Escalation** | $\\ge 90\\%$ | **{summary_metrics['correct_escalation']:.1%}** | {'✅' if summary_metrics['correct_escalation'] >= 0.9 else '⚠️'} |\n")
        f.write(f"| **Final Action Correctness** | $\\ge 85\\%$ | **{summary_metrics['final_action_correctness']:.1%}** | {'✅' if summary_metrics['final_action_correctness'] >= 0.85 else '⚠️'} |\n")
        f.write(f"| **Retrieval Quality** | $\\ge 85\\%$ | **{summary_metrics['retrieval_quality']:.1%}** | {'✅' if summary_metrics['retrieval_quality'] >= 0.85 else '⚠️'} |\n")
        f.write(f"| **Groundedness** | $\\ge 85\\%$ | **{summary_metrics['groundedness']:.1%}** | {'✅' if summary_metrics['groundedness'] >= 0.85 else '⚠️'} |\n")
        f.write(f"| **Failure Recovery** | $100\\%$ | **{summary_metrics['failure_recovery']:.1%}** | {'✅' if summary_metrics['failure_recovery'] >= 0.99 else '⚠️'} |\n")
        f.write(f"| **Agent Termination Behavior** | $100\\%$ | **{summary_metrics['agent_termination_behavior']:.1%}** | {'✅' if summary_metrics['agent_termination_behavior'] >= 0.99 else '⚠️'} |\n\n")

        f.write("## 2. Scenario-by-Scenario Evaluation Breakdown\n\n")
        f.write("| ID | Scenario | Expected Action | Actual Action | HITL Status | Policy Approved | Composite |\n")
        f.write("| :--- | :--- | :--- | :--- | :--- | :---: | :---: |\n")
        for s in scenario_evaluations:
            det = s.details
            f.write(f"| `{s.scenario_id}` | {s.scenario_name} | `{det['expected_action']}` | `{det['final_action']}` | `{det.get('hitl_status', 'N/A')}` | {'✅' if det['policy_approved'] else '❌'} | **{s.composite_score:.1%}** |\n")

    print("\n" + "=" * 70)
    print(f"📊 Overall Composite Score: {summary_metrics['overall_composite_score']:.1%}")
    print(f"📁 Reports written to: {json_path} and {md_path}")
    print("=" * 70)

    return report_payload


if __name__ == "__main__":
    asyncio.run(run_all_evaluations())
