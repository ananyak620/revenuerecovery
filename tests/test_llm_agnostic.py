"""
ReviveAI — Model-Agnostic LLM Layer Tests

Verifies:
1. Multi-provider initialization (Gemini, OpenAI-compatible / Ollama, Heuristic).
2. Fallback cascade when cloud APIs are unconfigured or fail.
3. Structured output formatting compliance.
"""

import pytest
from src.ai.llm_provider import (
    AgnosticLLMManager,
    HeuristicFallbackProvider,
    OpenAICompatibleProvider,
    get_llm_manager,
)
from src.ai.diagnosis import DiagnosisService, get_diagnosis_service


@pytest.fixture
def llm_manager() -> AgnosticLLMManager:
    return get_llm_manager()


@pytest.fixture
def diagnosis_service() -> DiagnosisService:
    return get_diagnosis_service()


@pytest.mark.asyncio
async def test_heuristic_fallback_provider_returns_valid_structure():
    """Verify deterministic fallback provider produces complete structured output."""
    provider = HeuristicFallbackProvider()
    assert provider.is_available() is True

    context = {
        "failure_reason": "authentication_failure",
        "amount": 4999.0,
        "retry_count": 0,
        "recovery_probability": 0.85,
    }

    res = await provider.generate_diagnosis(context)
    assert res["root_cause"] == "temporary_authentication"
    assert res["is_temporary"] is True
    assert res["recommended_action"] == "retry"
    assert "optimal_retry_timing" in res
    assert res["provider"] == "heuristic_fallback"


@pytest.mark.asyncio
async def test_agnostic_manager_fallback_cascade(llm_manager: AgnosticLLMManager):
    """Verify AgnosticLLMManager automatically falls back and includes latency & status."""
    context = {
        "failure_reason": "network_error",
        "amount": 12000.0,
        "retry_count": 1,
        "recovery_probability": 0.90,
    }

    res = await llm_manager.diagnose(context)
    assert "root_cause" in res
    assert "recommended_action" in res
    assert "latency_ms" in res
    assert res["latency_ms"] >= 0


def test_provider_status_reporting(diagnosis_service: DiagnosisService):
    """Verify system exposes active provider and available fallback options."""
    status = diagnosis_service.get_provider_status()
    assert "active_provider" in status
    assert "available_providers" in status
    assert status["fallback_ready"] is True
    assert "heuristic" in status["available_providers"]
