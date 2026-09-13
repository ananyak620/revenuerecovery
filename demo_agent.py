"""
ReviveAI — Interactive Multi-Agent Verification Script

Run this script directly to test and verify how your 4 collaborating agents work:
    .\\venv\\Scripts\\python.exe demo_agent.py
"""

import asyncio
import sys
from datetime import datetime

from src.agent.multi_agent_system import get_multi_agent_orchestrator


async def test_case(title: str, transaction_id: str, context: dict):
    print("\n" + "═" * 70)
    print(f"  🧪 SCENARIO: {title.upper()}")
    print("═" * 70)

    orchestrator = get_multi_agent_orchestrator()
    mission = await orchestrator.execute_recovery_mission(
        transaction_id=transaction_id,
        auto_execute=True,
        context_override=context,
    )

    print("\n📋 MISSION SUMMARY (SHORT & SIMPLE):")
    print(f"  • Transaction:      {mission['transaction_id']} (₹{mission['amount']:,.2f})")
    print(f"  • Churn Category:   {mission['investigation']['churn_category'].upper()}")
    print(f"  • P(Recovery):      {mission['investigation']['recovery_probability']:.1%} (ERV: ₹{mission['investigation']['expected_recovery_value']:,.2f})")
    print(f"  • Final Decision:   {mission['final_action'].upper()} ({'Autonomous Approved' if mission['hitl_status'] == 'AUTONOMOUS_APPROVED' else 'Pending Operator'})")

    print("\n💬 AGENT DELIBERATION (4-AGENT CONCISE VIEW):")
    print(f"  🕵️  Detective:    Classified {mission['investigation']['churn_category'].upper()} — {mission['investigation']['churn_hypothesis'][:75]}...")
    print(f"  🧠  Strategist:   Formulated {mission['final_action'].upper()} (RAG Playbook applied)")
    if mission['revision_count'] > 0:
        print(f"  ⚖️  Auditor:      Self-Correction Loop: Intercepted violation ➔ Strategist revised ➔ Approved ({mission['revision_count']} revision)")
    else:
        print(f"  ⚖️  Auditor:      Verified 6 Guardrails & Margin Cap ➔ Approved (0 violations)")
    print(f"  ✍️  Communicator: Dispatched via {mission['outreach']['channel'].upper()} with Magic Link: {mission['outreach']['magic_link']}")

    print("\n" + "─" * 70)


async def main():
    print("""
    ╔════════════════════════════════════════════════════════════════════╗
    ║     ⚡ REVIVEAI — MULTI-AGENT RECOVERY VERIFICATION SUITE         ║
    ║        Detective ➔ Strategist ➔ Auditor ➔ Communicator            ║
    ╚════════════════════════════════════════════════════════════════════╝
    """)

    # Scenario 1: Involuntary Churn (Transient UPI Authentication Timeout)
    await test_case(
        title="Involuntary Churn: UPI Timeout during peak hours",
        transaction_id="txn_upi_401",
        context={
            "amount": 4999.0,
            "payment_method": "upi",
            "failure_reason": "authentication_failure",
            "customer_id": "cust_retail_12",
            "customer_ltv": 18000.0,
            "days_since_last_login": 1,
            "retry_count": 0,
        },
    )

    # Scenario 2: High-Value Enterprise Invoice (Triggers HITL Gate!)
    await test_case(
        title="High-Ticket VIP Invoice (Triggers Human-in-the-Loop Gate)",
        transaction_id="txn_enterprise_vip_99",
        context={
            "amount": 45000.0,
            "payment_method": "netbanking",
            "failure_reason": "corporate_card_limit_exceeded",
            "customer_id": "cust_enterprise_04",
            "customer_ltv": 150000.0,
            "days_since_last_login": 0,
            "retry_count": 1,
        },
    )

    # Scenario 3: Expired Card (Instrument Failure)
    await test_case(
        title="Involuntary Churn: Expired Card (1-Click Portal Update)",
        transaction_id="txn_expired_card_77",
        context={
            "amount": 12499.0,
            "payment_method": "card",
            "failure_reason": "card_expired",
            "customer_id": "cust_b2b_55",
            "customer_ltv": 45000.0,
            "days_since_last_login": 3,
            "retry_count": 0,
        },
    )

    # Scenario 4: Insufficient Funds (Salary Cycle Alignment)
    await test_case(
        title="Involuntary Churn: Insufficient Funds (Soft Notice & 24h Delay)",
        transaction_id="txn_low_balance_33",
        context={
            "amount": 3200.0,
            "payment_method": "card",
            "failure_reason": "insufficient_funds",
            "customer_id": "cust_retail_89",
            "customer_ltv": 8000.0,
            "days_since_last_login": 2,
            "retry_count": 1,
        },
    )

    # Scenario 5: Voluntary Churn (Customer cancelled -> Proposes discount & verifies margin cap)
    await test_case(
        title="Voluntary Churn: Price Resistance (Strategist + Critic Revision Loop)",
        transaction_id="txn_voluntary_churn_12",
        context={
            "amount": 8500.0,
            "payment_method": "subscription",
            "failure_reason": "customer_cancellation",
            "customer_id": "cust_saas_77",
            "customer_ltv": 24000.0,
            "days_since_last_login": 40,
            "retry_count": 0,
        },
    )

    print("\n✅ All 5 Diverse Multi-Agent Scenarios executed successfully!")


if __name__ == "__main__":
    asyncio.run(main())
