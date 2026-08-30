"""
ReviveAI — LLM Failure Diagnosis Service

Uses Google Gemini (or mock) to diagnose payment failures
and recommend recovery actions with structured output.
"""

import json
from typing import Optional

from src.config import settings
from src.ai.prompts import SYSTEM_PROMPT, DIAGNOSIS_PROMPT


class DiagnosisService:
    """LLM-powered payment failure diagnosis."""

    def __init__(self):
        self.client = None
        self.model_name = "gemini-2.0-flash"
        self._init_client()

    def _init_client(self):
        """Initialize Gemini client if API key is available."""
        if settings.has_gemini_key:
            try:
                import google.generativeai as genai  # type: ignore[reportMissingImports]
                genai.configure(api_key=settings.gemini_api_key)  # type: ignore[reportPrivateImportUsage]
                self.client = genai.GenerativeModel(  # type: ignore[reportPrivateImportUsage]
                    model_name=self.model_name,
                    system_instruction=SYSTEM_PROMPT,
                    generation_config={  # type: ignore[arg-type]
                        "temperature": 0.3,
                        "top_p": 0.8,
                        "response_mime_type": "application/json",
                    },
                )
                print(f"  ✓ Gemini LLM initialized ({self.model_name})")
            except Exception as e:
                print(f"  ⚠ Gemini initialization failed: {e}")
                self.client = None
        else:
            print("  ℹ No Gemini API key — using mock diagnosis")

    @property
    def is_available(self) -> bool:
        return self.client is not None

    async def diagnose(self, transaction_data: dict, prediction: dict) -> dict:
        """
        Diagnose a failed payment using LLM.

        Args:
            transaction_data: Raw transaction features
            prediction: ML model prediction output

        Returns:
            Structured diagnosis dict
        """
        # Merge data for prompt
        context = {**transaction_data, **prediction}

        if self.client:
            return await self._llm_diagnose(context)
        else:
            return self._mock_diagnose(context)

    async def _llm_diagnose(self, context: dict) -> dict:
        """Call Gemini for real diagnosis."""
        try:
            assert self.client is not None
            prompt = DIAGNOSIS_PROMPT.format(**context)
            response = self.client.generate_content(prompt)
            result = json.loads(response.text)
            result["source"] = "gemini"
            return result
        except Exception as e:
            print(f"  ⚠ LLM diagnosis failed: {e}")
            return self._mock_diagnose(context)

    def _mock_diagnose(self, context: dict) -> dict:
        """
        Mock diagnosis — produces realistic structured output
        without calling an LLM. Uses rule-based logic.
        """
        failure_reason = context.get("failure_reason", "unknown")
        retry_count = context.get("retry_count", 0)
        prob = context.get("recovery_probability", 0.5)
        amount = context.get("amount", 0)

        # Rule-based diagnosis
        diagnoses = {
            "authentication_failure": {
                "diagnosis": "Payment failed due to an authentication error during the transaction process. This is typically a temporary issue caused by bank-side verification timeouts or 3D-Secure session expiry.",
                "root_cause": "temporary_authentication",
                "is_temporary": True,
                "recovery_likelihood": "high",
                "recommended_action": "retry",
                "action_reasoning": "Authentication failures are highly recoverable. The customer's bank likely had a temporary verification issue. A retry after a short interval typically succeeds.",
                "optimal_retry_timing": "Retry after 2-6 hours, preferably during banking hours (9 AM - 6 PM IST)",
                "risk_factors": ["Bank verification timeout", "3DS session expiry"],
            },
            "insufficient_funds": {
                "diagnosis": "Payment failed because the customer's account had insufficient funds at the time of transaction. This may resolve after salary credits or fund transfers.",
                "root_cause": "customer_funds",
                "is_temporary": True,
                "recovery_likelihood": "medium",
                "recommended_action": "notify_customer",
                "action_reasoning": "The customer needs to add funds before retry. Sending a friendly notification with payment update link is more effective than silent retry.",
                "optimal_retry_timing": "Retry after 24-48 hours, or after month-start (salary credit period)",
                "risk_factors": ["Possible financial stress", "May indicate downgrade intent"],
            },
            "card_expired": {
                "diagnosis": "Payment failed because the card on file has expired. This requires the customer to update their payment method.",
                "root_cause": "expired_payment_instrument",
                "is_temporary": False,
                "recovery_likelihood": "medium",
                "recommended_action": "notify_customer",
                "action_reasoning": "No amount of retrying will fix an expired card. The customer must update their payment information. A clear, helpful email with a direct link to update is the best approach.",
                "optimal_retry_timing": None,
                "risk_factors": ["Requires customer action", "May churn if not engaged"],
            },
            "network_error": {
                "diagnosis": "Payment failed due to a network connectivity issue between the payment gateway and the bank. This is a transient infrastructure issue.",
                "root_cause": "network_infrastructure",
                "is_temporary": True,
                "recovery_likelihood": "high",
                "recommended_action": "retry",
                "action_reasoning": "Network errors are the most recoverable failure type. The customer's payment method is valid — only the connection failed. An immediate or short-delay retry has high success probability.",
                "optimal_retry_timing": "Retry within 1-4 hours",
                "risk_factors": ["Gateway reliability", "Bank connectivity"],
            },
            "bank_declined": {
                "diagnosis": "The customer's bank explicitly declined the transaction. This could be due to internal bank risk policies, spending limits, or account restrictions.",
                "root_cause": "bank_risk_policy",
                "is_temporary": False,
                "recovery_likelihood": "low",
                "recommended_action": "escalate",
                "action_reasoning": "Bank declines are difficult to recover through simple retries. The customer needs to contact their bank or use an alternative payment method. Escalation to customer success is recommended.",
                "optimal_retry_timing": None,
                "risk_factors": ["Bank-side restriction", "Potential account issue", "May require alternative payment method"],
            },
            "fraud_flag": {
                "diagnosis": "Payment was flagged by the fraud detection system. This could be a false positive or a genuine fraud attempt. Manual review is required.",
                "root_cause": "fraud_detection",
                "is_temporary": False,
                "recovery_likelihood": "very_low",
                "recommended_action": "escalate",
                "action_reasoning": "NEVER automatically retry fraud-flagged payments. This requires human review by the risk team. If it's a false positive, the customer should be contacted to verify identity.",
                "optimal_retry_timing": None,
                "risk_factors": ["Potential fraud", "Regulatory compliance", "Must not auto-retry"],
            },
            "technical_error": {
                "diagnosis": "Payment failed due to a technical error in the payment processing pipeline. This is likely a temporary system issue.",
                "root_cause": "system_technical",
                "is_temporary": True,
                "recovery_likelihood": "high",
                "recommended_action": "retry",
                "action_reasoning": "Technical errors are typically transient. The payment system was temporarily unable to process the request. A retry after a short wait should succeed.",
                "optimal_retry_timing": "Retry after 1-2 hours",
                "risk_factors": ["System instability", "May recur if systemic"],
            },
            "limit_exceeded": {
                "diagnosis": "Payment exceeded the customer's transaction or daily spending limit set by their bank or payment provider.",
                "root_cause": "spending_limit",
                "is_temporary": True,
                "recovery_likelihood": "medium",
                "recommended_action": "notify_customer",
                "action_reasoning": "The customer needs to either increase their limit or wait until the next billing cycle. Notification with clear options is the best approach.",
                "optimal_retry_timing": "Retry after 24 hours or suggest alternative payment method",
                "risk_factors": ["Bank limit", "May need split payment"],
            },
        }

        base = diagnoses.get(failure_reason, diagnoses["technical_error"])

        # Adjust based on retry count
        if retry_count >= 4:
            base["recommended_action"] = "escalate"
            base["action_reasoning"] = f"Already attempted {retry_count} retries. Further automated retries are unlikely to succeed. Escalating to customer success team."
            base["recovery_likelihood"] = "low"

        # Add confidence
        base["confidence"] = round(min(0.9, prob + 0.1), 2)
        base["customer_communication"] = None
        if base["recommended_action"] in ("notify_customer", "escalate"):
            base["customer_communication"] = (
                f"Hi, we noticed your payment of ₹{amount:,.0f} didn't go through. "
                f"{'Please update your payment method' if failure_reason == 'card_expired' else 'We will retry shortly'}. "
                f"Need help? Reply to this message."
            )

        base["source"] = "mock"
        return base


# Singleton
_service: Optional[DiagnosisService] = None


def get_diagnosis_service() -> DiagnosisService:
    global _service
    if _service is None:
        _service = DiagnosisService()
    return _service
