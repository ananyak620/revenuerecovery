"""
ReviveAI — LLM Prompt Templates

Structured prompts for payment failure diagnosis
and recovery reasoning. Designed for JSON structured output.
"""


SYSTEM_PROMPT = """You are ReviveAI, an expert AI financial analyst specializing in payment failure diagnosis and revenue recovery.

Your role:
1. Analyze why a payment failed
2. Assess the likelihood of recovery
3. Recommend the best recovery action
4. Explain your reasoning clearly

Rules:
- Always respond in the exact JSON format requested
- Be specific about failure reasons, not vague
- Consider customer history when making recommendations
- Never recommend more than 5 retries for any payment
- Flag fraud-related failures for human review
- Factor in time since failure — act fast for fresh failures
"""


DIAGNOSIS_PROMPT = """Analyze this failed payment and provide a structured diagnosis.

## Transaction Details
- Transaction ID: {transaction_id}
- Amount: ₹{amount:,.2f}
- Payment Method: {payment_method}
- Failure Reason: {failure_reason}
- Retry Count: {retry_count}
- Time Since Failure: {time_since_failure_hours:.1f} hours

## Customer Profile
- Customer ID: {customer_id}
- Tenure: {customer_tenure_days} days
- Subscription: {subscription_type}
- Historical Success Rate: {previous_success_rate:.1%}
- Historical Recovery Rate: {historical_recovery_rate:.1%}
- NPS Score: {nps_score}/10
- Support Tickets (30d): {support_tickets_last_30d}
- Days Since Last Login: {days_since_last_login}

## ML Prediction
- Recovery Probability: {recovery_probability:.1%}
- Expected Recovery Value: ₹{expected_recovery_value:,.2f}
- Risk Level: {risk_level}

Respond in this exact JSON format:
{{
    "diagnosis": "Clear explanation of why this payment failed",
    "root_cause": "primary | secondary | tertiary cause category",
    "is_temporary": true/false,
    "recovery_likelihood": "high | medium | low | very_low",
    "recommended_action": "retry | notify_customer | escalate | update_payment | no_action",
    "action_reasoning": "Why this action is best for this specific case",
    "optimal_retry_timing": "Suggested timing if retry is recommended, else null",
    "customer_communication": "Suggested message to customer if notification needed, else null",
    "risk_factors": ["list", "of", "risk", "factors"],
    "confidence": 0.0-1.0
}}
"""


RECOVERY_STRATEGY_PROMPT = """Based on the diagnosis, create a detailed recovery strategy.

## Context
- Transaction: {transaction_id}
- Amount: ₹{amount:,.2f}
- Diagnosis: {diagnosis}
- ML Recovery Probability: {recovery_probability:.1%}
- Current Retry Count: {retry_count}/5

## Constraints
- Maximum 5 retry attempts total
- Must not retry fraud-flagged payments
- Customer must be notified after 2+ failures
- Escalation required if amount > ₹25,000 and probability < 30%

Create a step-by-step recovery plan in JSON:
{{
    "strategy_name": "Name of the recovery approach",
    "steps": [
        {{
            "step": 1,
            "action": "Action to take",
            "timing": "When to execute",
            "condition": "What must be true for this step"
        }}
    ],
    "estimated_recovery_probability": 0.0-1.0,
    "estimated_time_to_recovery": "e.g., 6-24 hours",
    "fallback_action": "What to do if all steps fail"
}}
"""
