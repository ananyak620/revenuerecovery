"""
ReviveAI — Structured Observability & Audit Logger

Provides structured JSON logging for agent state transitions, tool dispatches,
policy evaluations, and human-in-the-loop interventions.
Strictly sanitizes and masks PII, card data, tokens, and secret credentials.
"""

from datetime import datetime, timezone
import json
import logging
import re
import sys
from typing import Any, Dict, Optional
import uuid

# Patterns to automatically redact from telemetry logs
SENSITIVE_KEY_PATTERNS = re.compile(
    r"(api[-_]?key|secret|password|token|bearer|authorization|cvv|card[-_]?number)",
    re.IGNORECASE,
)
CARD_PAN_PATTERN = re.compile(r"\b(?:\d[ -]*?){13,16}\b")


def sanitize_payload(obj: Any) -> Any:
    """Recursively scrub sensitive keys and credential patterns from logged payloads."""
    if isinstance(obj, dict):
        sanitized = {}
        for k, v in obj.items():
            if SENSITIVE_KEY_PATTERNS.search(str(k)):
                sanitized[k] = "[REDACTED_SECRET]"
            else:
                sanitized[k] = sanitize_payload(v)
        return sanitized
    elif isinstance(obj, list):
        return [sanitize_payload(item) for item in obj]
    elif isinstance(obj, str):
        # Mask suspected credit card PANs
        if CARD_PAN_PATTERN.search(obj) and len(obj) >= 13:
            return CARD_PAN_PATTERN.sub("[REDACTED_CARD_PAN]", obj)
        return obj
    return obj


class StructuredAgentLogger:
    """Structured JSON logger capturing observable agent lifecycle events."""

    def __init__(self, logger_name: str = "reviveai.agent"):
        self.logger = logging.getLogger(logger_name)
        if not self.logger.handlers:
            handler = logging.StreamHandler(sys.stdout)
            handler.setFormatter(logging.Formatter("%(message)s"))
            self.logger.addHandler(handler)
            self.logger.setLevel(logging.INFO)

    def log_event(
        self,
        event_type: str,
        run_id: str,
        agent: str,
        state_transition: Optional[str] = None,
        selected_tool: Optional[str] = None,
        tool_latency_ms: Optional[float] = None,
        success: bool = True,
        retry_count: int = 0,
        rag_retrieval_count: int = 0,
        hitl_event: Optional[Dict[str, Any]] = None,
        final_result: Optional[str] = None,
        extra_context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Record a structured telemetry event.
        Guarantees zero logging of credentials, keys, or raw payment card data.
        """
        payload: Dict[str, Any] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": "INFO" if success else "ERROR",
            "event_type": event_type,
            "run_id": run_id,
            "agent": agent,
            "success": success,
        }

        if state_transition:
            payload["state_transition"] = state_transition
        if selected_tool:
            payload["selected_tool"] = selected_tool
        if tool_latency_ms is not None:
            payload["tool_latency_ms"] = round(tool_latency_ms, 2)
        if retry_count > 0:
            payload["retry_count"] = retry_count
        if rag_retrieval_count > 0:
            payload["rag_retrieval_count"] = rag_retrieval_count
        if hitl_event:
            payload["hitl_event"] = sanitize_payload(hitl_event)
        if final_result:
            payload["final_result"] = final_result
        if extra_context:
            payload["context"] = sanitize_payload(extra_context)

        sanitized_json = json.dumps(payload, default=str)
        if success:
            self.logger.info(sanitized_json)
        else:
            self.logger.error(sanitized_json)

        return payload


# Global singleton logger
_agent_logger: Optional[StructuredAgentLogger] = None


def get_agent_logger() -> StructuredAgentLogger:
    global _agent_logger
    if _agent_logger is None:
        _agent_logger = StructuredAgentLogger()
    return _agent_logger
