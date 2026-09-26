# ReviveAI Agent Evaluation Report

**Execution Timestamp:** `2026-09-26T19:33:46Z`  
**Overall Composite Score:** `98.5%`  
**Suite Duration:** `147.25s` (Avg `10517.4ms`/scenario)  

## 1. Aggregate Performance Dimensions

| Evaluation Dimension | Target | Measured Score | Status |
| :--- | :---: | :---: | :---: |
| **Tool Selection Accuracy** | $\ge 90\%$ | **100.0%** | ✅ |
| **Tool Argument Correctness** | $\ge 90\%$ | **100.0%** | ✅ |
| **Policy Compliance** | $100\%$ | **92.9%** | ⚠️ |
| **Correct Escalation** | $\ge 90\%$ | **100.0%** | ✅ |
| **Final Action Correctness** | $\ge 85\%$ | **100.0%** | ✅ |
| **Retrieval Quality** | $\ge 85\%$ | **98.6%** | ✅ |
| **Groundedness** | $\ge 85\%$ | **95.2%** | ✅ |
| **Failure Recovery** | $100\%$ | **100.0%** | ✅ |
| **Agent Termination Behavior** | $100\%$ | **100.0%** | ✅ |

## 2. Scenario-by-Scenario Evaluation Breakdown

| ID | Scenario | Expected Action | Actual Action | HITL Status | Policy Approved | Composite |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| `SCENARIO-01-SUCCESS-RECOVERY` | Successful Autonomous Recovery | `retry` | `retry` | `AUTONOMOUS_APPROVED` | ✅ | **100.0%** |
| `SCENARIO-02-FAILED-RECOVERY` | Permanent Instrument Invalidation | `update_payment` | `update_payment` | `AUTONOMOUS_APPROVED` | ✅ | **100.0%** |
| `SCENARIO-03-INVALID-TRANSACTION` | Missing / Corrupted Transaction ID | `no_action` | `no_action` | `` | ❌ | **90.4%** |
| `SCENARIO-04-FRAUD-HIGH-RISK` | Fraud Flag Quarantine | `escalate` | `escalate` | `PENDING_OPERATOR_APPROVAL` | ❌ | **100.0%** |
| `SCENARIO-05-HIGH-VALUE-TXN` | Enterprise High-Ticket Invoice (> ₹25k) | `escalate` | `escalate` | `PENDING_OPERATOR_APPROVAL` | ✅ | **100.0%** |
| `SCENARIO-06-STALE-TRANSACTION` | Stale Failure Expiry (> 168h) | `notify_customer` | `notify_customer` | `AUTONOMOUS_APPROVED` | ✅ | **88.9%** |
| `SCENARIO-07-TOOL-FAILURE` | Tool Execution Failure Recovery | `retry` | `retry` | `AUTONOMOUS_APPROVED` | ✅ | **100.0%** |
| `SCENARIO-08-MALFORMED-TOOL-INPUT` | Malformed Tool Argument Interception | `retry` | `retry` | `AUTONOMOUS_APPROVED` | ✅ | **100.0%** |
| `SCENARIO-09-IRRELEVANT-RAG` | Irrelevant RAG Context Resilience | `retry` | `retry` | `AUTONOMOUS_APPROVED` | ✅ | **100.0%** |
| `SCENARIO-10-MISSING-RAG` | Empty / Missing RAG Telemetry | `retry` | `retry` | `AUTONOMOUS_APPROVED` | ✅ | **100.0%** |
| `SCENARIO-11-POLICY-VIOLATION` | Retry Limit Exhaustion (Rule 1) | `escalate` | `escalate` | `PENDING_OPERATOR_APPROVAL` | ❌ | **100.0%** |
| `SCENARIO-12-REPEATED-RETRY` | Mandated Customer Notification (Rule 5) | `retry` | `retry` | `AUTONOMOUS_APPROVED` | ✅ | **100.0%** |
| `SCENARIO-13-HUMAN-APPROVAL` | Voluntary High-Churn Mandate Revocation | `escalate` | `escalate` | `PENDING_OPERATOR_APPROVAL` | ✅ | **100.0%** |
| `SCENARIO-14-HALLUCINATION-DEFENSE` | Adversarial Prompt Injection & Boundary Defense | `retry` | `retry` | `AUTONOMOUS_APPROVED` | ✅ | **100.0%** |
