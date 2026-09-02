"""
ReviveAI — LLM Failure Diagnosis Service

Uses Model-Agnostic LLM Provider Layer (Gemini / Qwen / Gemma / Heuristic Fallback)
to diagnose payment failures and recommend optimal recovery actions with structured output.
"""

from typing import Any, Dict, Optional

from src.ai.llm_provider import get_llm_manager, AgnosticLLMManager


class DiagnosisService:
    """LLM-powered payment failure diagnosis with multi-model fallback."""

    def __init__(self):
        self.manager: AgnosticLLMManager = get_llm_manager()

    @property
    def is_available(self) -> bool:
        """True because heuristic fallback ensures 100% availability."""
        return True

    def get_provider_status(self) -> Dict[str, Any]:
        """Get diagnostic information regarding active LLM provider."""
        return self.manager.get_active_provider_info()

    async def diagnose(self, transaction_data: Dict[str, Any], prediction: Dict[str, Any]) -> Dict[str, Any]:
        """
        Diagnose a failed payment using the active LLM provider with automatic fallback.

        Args:
            transaction_data: Raw transaction features
            prediction: ML model prediction output

        Returns:
            Structured diagnosis dict
        """
        context = {**transaction_data, **prediction}
        result = await self.manager.diagnose(context)

        # Backwards compatibility key
        result["source"] = result.get("provider", "heuristic")
        if "confidence" not in result:
            prob = context.get("recovery_probability", 0.5)
            result["confidence"] = round(min(0.95, prob + 0.1), 2)

        return result


# Singleton
_service: Optional[DiagnosisService] = None


def get_diagnosis_service() -> DiagnosisService:
    global _service
    if _service is None:
        _service = DiagnosisService()
    return _service
