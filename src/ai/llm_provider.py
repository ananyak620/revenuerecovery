"""
ReviveAI — Model-Agnostic LLM Provider Layer

Supports seamless switching and cascading fallback across:
1. Google Gemini (cloud high-speed reasoning)
2. OpenAI-compatible / Local LLMs (Qwen 2.5, Gemma 2, Llama 3 via Ollama, vLLM, Groq, DeepSeek)
3. Heuristic Fallback Provider (deterministic rule-based offline diagnosis)
"""

import abc
import asyncio
import json
import time
import urllib.request
import urllib.error
from typing import Any, Dict, Optional, Tuple

from src.config import settings
from src.ai.prompts import SYSTEM_PROMPT, DIAGNOSIS_PROMPT


class BaseLLMProvider(abc.ABC):
    """Abstract base class for all LLM providers."""

    def __init__(self, provider_name: str, model_name: str):
        self.provider_name = provider_name
        self.model_name = model_name

    @abc.abstractmethod
    def is_available(self) -> bool:
        """Check if this provider has valid credentials/endpoints configured."""
        pass

    @abc.abstractmethod
    async def generate_diagnosis(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Generate structured diagnosis dictionary from transaction context."""
        pass


class GeminiProvider(BaseLLMProvider):
    """Google Gemini cloud LLM provider."""

    def __init__(self, model_name: str = "gemini-2.0-flash"):
        super().__init__("gemini", model_name)
        self.client = None
        self._init_client()

    def _init_client(self):
        if settings.has_gemini_key:
            try:
                import google.generativeai as genai  # type: ignore[reportMissingImports]

                genai.configure(api_key=settings.gemini_api_key)  # type: ignore[reportPrivateImportUsage]
                self.client = genai.GenerativeModel(  # type: ignore[reportPrivateImportUsage]
                    model_name=self.model_name,
                    system_instruction=SYSTEM_PROMPT,
                    generation_config={  # type: ignore[arg-type]
                        "temperature": 0.2,
                        "top_p": 0.8,
                        "response_mime_type": "application/json",
                    },
                )
            except Exception as e:
                self.client = None

    def is_available(self) -> bool:
        return self.client is not None

    async def generate_diagnosis(self, context: Dict[str, Any]) -> Dict[str, Any]:
        if not self.is_available():
            raise RuntimeError("Gemini provider is not initialized or missing API key.")

        prompt = DIAGNOSIS_PROMPT.format(**context)
        # Run synchronous SDK call in async thread pool if needed
        assert self.client is not None
        response = self.client.generate_content(prompt)
        text = response.text.strip()
        # Clean any markdown codeblock backticks if present
        if text.startswith("```json"):
            text = text[7:]
        if text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        result = json.loads(text.strip())
        result["provider"] = "gemini"
        result["model"] = self.model_name
        return result


class OpenAICompatibleProvider(BaseLLMProvider):
    """
    OpenAI-compatible REST provider.
    Works with:
    - Ollama (Qwen 2.5 / Gemma 2) at http://localhost:11434/v1
    - Groq, DeepSeek, Together, LocalAI, vLLM, OpenAI
    """

    def __init__(
        self,
        provider_name: str = "openai_compatible",
        model_name: str = "qwen2.5:7b",
        base_url: Optional[str] = None,
        api_key: Optional[str] = None,
    ):
        super().__init__(provider_name, model_name)
        self.base_url = (
            base_url
            or settings.llm_base_url
            or (settings.ollama_base_url + "/v1" if provider_name == "ollama" else "https://api.openai.com/v1")
        ).rstrip("/")
        self.api_key = api_key or settings.openai_api_key or "local"

    def is_available(self) -> bool:
        if self.provider_name == "ollama":
            return True
        return bool(self.api_key and self.api_key != "local") or bool(self.base_url)

    async def generate_diagnosis(self, context: Dict[str, Any]) -> Dict[str, Any]:
        prompt = DIAGNOSIS_PROMPT.format(**context)
        url = f"{self.base_url}/chat/completions"

        headers = {
            "Content-Type": "application/json",
        }
        if self.api_key and self.api_key != "local":
            headers["Authorization"] = f"Bearer {self.api_key}"

        payload = {
            "model": self.model_name,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT + "\nYou MUST respond strictly in valid JSON format."},
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.2,
            "response_format": {"type": "json_object"},
        }

        def _sync_request():
            req_data = json.dumps(payload).encode("utf-8")
            req = urllib.request.Request(url, data=req_data, headers=headers, method="POST")
            with urllib.request.urlopen(req, timeout=12.0) as response:
                return json.loads(response.read().decode("utf-8"))

        try:
            data = await asyncio.to_thread(_sync_request)
            content = data["choices"][0]["message"]["content"]
            result = json.loads(content)
            result["provider"] = self.provider_name
            result["model"] = self.model_name
            return result
        except Exception as e:
            raise RuntimeError(f"OpenAI/Ollama REST call failed: {e}") from e


class HeuristicFallbackProvider(BaseLLMProvider):
    """
    Deterministic rule-based diagnosis provider.
    Ensures 100% uptime with zero external dependencies when offline.
    """

    def __init__(self):
        super().__init__("heuristic_fallback", "rule_engine_v1")

    def is_available(self) -> bool:
        return True

    async def generate_diagnosis(self, context: Dict[str, Any]) -> Dict[str, Any]:
        failure_reason = context.get("failure_reason", "unknown")
        amount = context.get("amount", 0.0)
        prob = context.get("recovery_probability", 0.5)

        diagnoses_map = {
            "authentication_failure": {
                "diagnosis": "Payment failed due to 3D-Secure authentication timeout or temporary bank OTP verification issue.",
                "root_cause": "temporary_authentication",
                "is_temporary": True,
                "recovery_likelihood": "high",
                "recommended_action": "retry",
                "action_reasoning": "Auth failures are highly transient. Retrying within banking hours typically succeeds.",
                "optimal_retry_timing": "Retry after 2-4 hours",
                "risk_factors": ["Bank 3DS gateway timeout", "Customer dropped off OTP screen"],
            },
            "network_error": {
                "diagnosis": "Network connectivity timeout occurred between payment gateway switch and card network.",
                "root_cause": "network_infrastructure",
                "is_temporary": True,
                "recovery_likelihood": "high",
                "recommended_action": "retry",
                "action_reasoning": "Network transient errors have the highest recovery rate. Retrying quickly restores revenue.",
                "optimal_retry_timing": "Retry within 1-2 hours",
                "risk_factors": ["Gateway latency spike"],
            },
            "insufficient_funds": {
                "diagnosis": "Customer account balance was insufficient at the time of charge settlement.",
                "root_cause": "customer_funds",
                "is_temporary": True,
                "recovery_likelihood": "medium",
                "recommended_action": "notify_customer",
                "action_reasoning": "Silent retry will fail again. Notify customer via WhatsApp/Email to top up balance.",
                "optimal_retry_timing": "Retry after 24-48 hours",
                "risk_factors": ["Possible downgrade intent", "Liquidity timing"],
            },
            "card_expired": {
                "diagnosis": "The registered card has passed its expiry date.",
                "root_cause": "expired_instrument",
                "is_temporary": False,
                "recovery_likelihood": "medium",
                "recommended_action": "notify_customer",
                "action_reasoning": "Automated retries will strictly fail. Provide direct 1-click card update link.",
                "optimal_retry_timing": None,
                "risk_factors": ["Expired payment method"],
            },
            "bank_declined": {
                "diagnosis": "Issuing bank declined transaction due to daily limits or bank fraud policy.",
                "root_cause": "bank_risk_policy",
                "is_temporary": False,
                "recovery_likelihood": "low",
                "recommended_action": "escalate",
                "action_reasoning": "Requires customer to authorize recurring mandate or use UPI alternative.",
                "optimal_retry_timing": None,
                "risk_factors": ["Bank-side decline"],
            },
            "fraud_flag": {
                "diagnosis": "High risk anomaly flagged by gateway risk evaluation score.",
                "root_cause": "fraud_detection",
                "is_temporary": False,
                "recovery_likelihood": "very_low",
                "recommended_action": "escalate",
                "action_reasoning": "Strictly blocked by policy engine. Manual human review required.",
                "optimal_retry_timing": None,
                "risk_factors": ["High risk velocity", "Risk score exceed threshold"],
            },
        }

        template = diagnoses_map.get(
            failure_reason,
            {
                "diagnosis": f"Payment failure ({failure_reason}) diagnosed via heuristic engine.",
                "root_cause": "general_failure",
                "is_temporary": prob >= 0.5,
                "recovery_likelihood": "high" if prob >= 0.7 else ("medium" if prob >= 0.4 else "low"),
                "recommended_action": "retry" if prob >= 0.6 else "escalate",
                "action_reasoning": "Automated assessment based on ML probability threshold.",
                "optimal_retry_timing": "Retry after 6 hours" if prob >= 0.6 else None,
                "risk_factors": [f"Failure code: {failure_reason}"],
            },
        )

        return {
            **template,
            "provider": "heuristic_fallback",
            "model": "rule_engine_v1",
        }


class AgnosticLLMManager:
    """
    Orchestrates LLM providers with automatic fallback cascade:
    Configured Provider -> Gemini -> OpenAI/Ollama (Qwen/Gemma) -> Heuristic Fallback.
    """

    def __init__(self):
        self.providers: Dict[str, BaseLLMProvider] = {}
        self._init_providers()

    def _init_providers(self):
        # 1. Gemini
        self.providers["gemini"] = GeminiProvider(model_name=settings.llm_model if "gemini" in settings.llm_model else "gemini-2.0-flash")
        # 2. Ollama / Local (Qwen 2.5 / Gemma 2)
        self.providers["ollama"] = OpenAICompatibleProvider(
            provider_name="ollama",
            model_name="qwen2.5:7b",
            base_url=settings.ollama_base_url + "/v1",
        )
        # 3. OpenAI / Generic compatible
        self.providers["openai_compatible"] = OpenAICompatibleProvider(
            provider_name="openai_compatible",
            model_name="gpt-4o-mini",
            api_key=settings.openai_api_key,
        )
        # 4. Deterministic Heuristic
        self.providers["heuristic"] = HeuristicFallbackProvider()

    def set_preferred_provider(self, provider_name: str, model_name: Optional[str] = None):
        """Dynamically set the preferred LLM provider and optional model."""
        if provider_name.lower() in self.providers or provider_name.lower() == "auto":
            settings.llm_provider = provider_name.lower()
            if model_name:
                settings.llm_model = model_name
                if provider_name in self.providers:
                    self.providers[provider_name].model_name = model_name

    def get_active_provider_info(self) -> Dict[str, Any]:
        """Returns details about active and available providers."""
        available = [name for name, p in self.providers.items() if p.is_available()]
        preferred = settings.llm_provider.lower()
        if preferred == "auto":
            active = "gemini" if self.providers["gemini"].is_available() else "heuristic"
        elif preferred in self.providers and self.providers[preferred].is_available():
            active = preferred
        else:
            active = "heuristic"

        return {
            "active_provider": active,
            "configured_model": settings.llm_model,
            "available_providers": available,
            "fallback_ready": True,
        }

    async def diagnose(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute diagnosis with cascading fallback resilience.
        """
        start_time = time.time()
        preferred = settings.llm_provider.lower()

        # Build candidate fallback cascade list
        candidate_order = []
        if preferred in self.providers and preferred != "auto":
            candidate_order.append(preferred)
        
        if "gemini" not in candidate_order:
            candidate_order.append("gemini")
        if "ollama" not in candidate_order:
            candidate_order.append("ollama")
        if "openai_compatible" not in candidate_order:
            candidate_order.append("openai_compatible")
        candidate_order.append("heuristic")

        last_error = None
        for p_name in candidate_order:
            provider = self.providers.get(p_name)
            if not provider or not provider.is_available():
                continue

            try:
                result = await provider.generate_diagnosis(context)
                elapsed_ms = round((time.time() - start_time) * 1000, 2)
                result["latency_ms"] = elapsed_ms
                result["fallback_triggered"] = (p_name != candidate_order[0])
                return result
            except Exception as e:
                last_error = str(e)
                continue

        # Ultimate safety guarantee: Heuristic fallback
        fallback = await self.providers["heuristic"].generate_diagnosis(context)
        fallback["latency_ms"] = round((time.time() - start_time) * 1000, 2)
        fallback["fallback_triggered"] = True
        fallback["error_reason"] = last_error
        return fallback


_llm_manager: Optional[AgnosticLLMManager] = None


def get_llm_manager() -> AgnosticLLMManager:
    global _llm_manager
    if _llm_manager is None:
        _llm_manager = AgnosticLLMManager()
    return _llm_manager
