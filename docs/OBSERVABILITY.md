# ReviveAI — Observability & Telemetry Architecture

## 1. Overview & Objectives

In autonomous financial agent systems, observability is essential for auditability, regulatory compliance (PCI-DSS, RBI guidelines), debugging, and latency profiling.

ReviveAI implements structured JSON logging (`src/utils/logger.py`) designed to be ingested by modern observability stacks (AWS CloudWatch, Datadog, Grafana Loki, or ELK).

---

## 2. Telemetry Event Schema

Every agent mission and node transition emits structured JSON events with standardized telemetry fields:

```json
{
  "timestamp": "2026-09-26T19:40:00.123456Z",
  "level": "INFO",
  "event_type": "tool_execution",
  "run_id": "AGY-000000-8f92ab",
  "agent": "Strategist",
  "state_transition": "auditor -> hitl_gate",
  "selected_tool": "schedule_retry",
  "tool_latency_ms": 42.15,
  "success": true,
  "retry_count": 0,
  "rag_retrieval_count": 2,
  "hitl_event": {
    "status": "AUTONOMOUS_APPROVED",
    "threshold_checked": 25000.0
  },
  "final_result": "retry"
}
```

### Standard Logged Dimensions

| Field | Type | Description & Purpose |
| :--- | :--- | :--- |
| `run_id` | `str` | Unique mission trace identifier correlating all steps across agents. |
| `agent` | `str` | Name of active agent node (`Detective`, `Strategist`, `Auditor`, `Communicator`). |
| `state_transition` | `str` | Directional state movement (e.g. `strategist -> auditor`). |
| `selected_tool` | `str` | Dispatched tool name (`check_payment`, `schedule_retry`, etc.). |
| `tool_latency_ms` | `float` | Duration of tool execution in milliseconds for latency profiling. |
| `success` | `bool` | Execution outcome status. |
| `retry_count` | `int` | Current retry cycle number for anti-fatigue monitoring. |
| `rag_retrieval_count`| `int` | Number of context chunks retrieved for grounding. |
| `hitl_event` | `dict` | Escalation status, reason, and approval trigger. |
| `final_result` | `str` | Approved bounded recovery action. |

---

## 3. Strict Credential & PII Sanitization Guarantee

Financial systems must never log sensitive credentials or cardholder data. ReviveAI enforces an automated pre-serialization sanitization pipeline (`sanitize_payload` in `src/utils/logger.py`):

1. **Automatic Credential Redaction:**
   Any key matching `api_key`, `secret`, `password`, `token`, `bearer`, `authorization`, or `cvv` is automatically scrubbed and replaced with `[REDACTED_SECRET]`.
2. **Card PAN Masking:**
   Regex pattern matching filters credit/debit card numbers (13–16 digits) to `[REDACTED_CARD_PAN]`.
3. **No Database Password Leakage:**
   Connection strings and database credentials are excluded from trace logs.
