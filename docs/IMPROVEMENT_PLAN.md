# ReviveAI — Comprehensive Engineering Improvement Plan

This improvement plan details the technical transformation of ReviveAI into a polished, interview-ready, production-grade agentic AI system demonstrating LangGraph, multi-agent systems, tool calling, MCP, RAG, embeddings, vector search, ML, structured outputs, human-in-the-loop, guardrails, testing, agent evaluation, cloud/AWS readiness, and observability.

---

## Priority Summary Matrix

| Level | Focus | Primary Deliverables | Estimated Impact |
| :--- | :--- | :--- | :--- |
| **P0: Critical** | Stability, Correctness, Bug Fixes & Tool Safety | Fix API route bugs, Pydantic tool validation, LangGraph runtime integration, secret isolation | Eliminates runtime exceptions and security risks |
| **P1: High Priority** | Core Agentic, RAG & Evaluation Capabilities | Dedicated `evals/` suite (14 scenarios), modular RAG with vector search, RAG eval metrics, test reorganization, adversarial safety suite, CI/CD | Establishes objective, reproducible benchmarks and robust testing |
| **P2: Useful** | Production Engineering & Cloud Readiness | AWS Architecture blueprint, Terraform `infra/`, structured JSON observability, hardened Dockerfile | Proves cloud readiness and enterprise deployment depth |
| **P3: Optional** | Presentation & Extended Adapters | Architecture diagrams, grounded README rewrite, final audit documentation | Communicates technical excellence without buzzword hype |

---

## P0 — Critical (Immediate Stability, Correctness & Tool Safety)

### P0-1: Eliminate Secret Exposure Risk & Docker Leakage
- **Action:** Add `.env` and `*.db` to `.dockerignore`.
- **Validation:** Verify `.env.example` contains zero secrets and documents actual configuration keys (`OPENAI_API_KEY`, `GEMINI_API_KEY`, `DATABASE_URL`).
- **Status:** **Completed**

### P0-2: Remove Test Timeouts via Offline Test Guard
- **Action:** Ensure LLM provider cascades cleanly to deterministic offline fallbacks during testing.
- **Validation:** Test suite runs in $<30$ seconds without hanging on external network calls.
- **Status:** **Completed**

### P0-3: Fix API Route Bugs & Method Mismatch
- **Action:**
  1. Fix `/api/recovery/churn-agent` calling non-existent `orchestrator.orchestrate()` by adding `orchestrate` alias and normalizing response keys.
  2. Wire `/api/recovery/graph-process` to invoke compiled LangGraph `StateGraph`.
- **Validation:** Test endpoints return 200 OK and valid structured payloads.
- **Status:** **Pending Execution**

### P0-4: Pydantic Tool Calling Validation & Safe Error Boundaries
- **Action:**
  1. Define strict Pydantic v2 schemas for all tool inputs (`CheckPaymentInput`, `CustomerHistoryInput`, `ScheduleRetryInput`, `SendNotificationInput`, `CreateEscalationInput`, `PaymentUpdateInput`, `AlternativePaymentInput`, `LogDecisionInput`).
  2. Implement timeout handling and error catching in `validate_and_execute()`.
  3. Ensure tools never raise unhandled exceptions into the agent loop.
- **Validation:** Unit tests for valid input, invalid types, missing fields, out-of-range values, and simulated failures.
- **Status:** **In Progress / Ready to Enhance**

### P0-5: Native LangGraph Execution & Verification
- **Action:**
  1. Verify and test the compiled `StateGraph` in `src/agent/graph.py`.
  2. Confirm state flow: State Init $\to$ Router $\to$ Detective $\to$ RAG Retrieval $\to$ Strategist $\rightleftharpoons$ Auditor (max 3 revisions) $\to$ HITL Gate $\to$ Communicator $\to$ Execution.
  3. Ensure explicit termination conditions and loop limits.
- **Validation:** Graph passes end-to-end integration tests without infinite loops.
- **Status:** **Pending Execution**

---

## P1 — High Priority (Agent Evaluation, RAG & Testing-First Engineering)

### P1-1: Dedicated Agent Evaluation Suite (`evals/`)
- **Action:** Create dedicated evaluation engine:
  - `evals/datasets/`: Benchmark dataset of 14 failure scenarios.
  - `evals/scenarios/`: Distinct test cases (successful recovery, non-recoverable, invalid transaction, fraud quarantine, high-value VIP, stale failure, tool failure, malformed arguments, irrelevant RAG, missing RAG, policy violation attempt, repeated retry, human approval requirement, hallucination-prone input).
  - `evals/evaluators/`: Quantitative scorers for Tool Selection Accuracy, Argument Correctness, Policy Compliance, Escalation Precision, Groundedness, and Safe Termination.
  - `evals/reports/`: Automated generation of machine-readable `latest.json` and human-readable `latest.md`.
  - `evals/run_evals.py`: CLI evaluation runner.
- **Validation:** Execute full evaluation run and generate verified real metrics.
- **Status:** **Pending Execution**

### P1-2: Modular RAG Architecture & Evaluation Pipeline
- **Action:** Build clean, modular RAG package in `src/ai/rag/`:
  - `ingestion.py`: Document ingestion for policy markdown and domain playbooks.
  - `chunking.py`: Configurable text normalization and chunking (`chunk_size=300`, `chunk_overlap=50`).
  - `embeddings.py`: Dense semantic vector representations with cosine similarity.
  - `vector_store.py`: In-memory vector store supporting metadata filtering and top-k retrieval.
  - `retrieval.py`: Context construction with citations and groundedness attribution.
  - `evaluate.py`: Quantitative RAG evaluation measuring Precision@k, Recall@k, and MRR.
- **Documentation:** Create `docs/RAG_ARCHITECTURE.md`.
- **Status:** **Pending Execution**

### P1-3: Adversarial & Safety Test Suite
- **Action:** Create `tests/safety/test_adversarial.py` testing:
  - Prompt injection attacks attempting to alter system instructions.
  - Policy bypass attempts (requesting $>5$ retries or discounts $>20\%$).
  - Malicious transaction inputs (negative amounts, SQL injection strings).
  - Malformed tool outputs and simulated gateway timeouts.
- **Validation:** Agent rejects attacks and fails safely.
- **Status:** **Pending Execution**

### P1-4: Restructured Testing Architecture
- **Action:** Organize existing and new tests into structured enterprise hierarchy:
  - `tests/unit/`: Model, feature engineering, and schema tests.
  - `tests/integration/`: End-to-end database, webhook, and MCP server tests.
  - `tests/agent/`: LangGraph state machine, node transitions, and reflection loop tests.
  - `tests/rag/`: Chunking, vector search, and retrieval tests.
  - `tests/tools/`: Tool validation, boundary tests, and failure handling.
  - `tests/api/`: FastAPI route integration tests.
  - `tests/safety/`: Adversarial and policy violation tests.
- **Validation:** All tests pass with zero regressions.
- **Status:** **Pending Execution**

### P1-5: CI/CD Pipeline
- **Action:** Create `.github/workflows/tests.yml`:
  - Dependency installation.
  - Ruff linting.
  - Pyright type checking.
  - Fast pytest suite (unit, integration, agent, tools, safety).
  - Fast RAG and agent evaluation validation.
- **Status:** **Pending Execution**

---

## P2 — Useful (Production Engineering, Observability & Cloud Readiness)

### P2-1: Structured Observability
- **Action:**
  - Implement JSON structured logger in `src/utils/logger.py` capturing `run_id`, agent step, tool name, latency, policy violations, and sanitized payloads (no API keys, PII, or secrets).
  - Document logging schema and auditability in `docs/OBSERVABILITY.md`.
- **Status:** **Pending Execution**

### P2-2: AWS Architecture Blueprint & Terraform (`infra/`)
- **Action:**
  - Create `docs/AWS_ARCHITECTURE.md` specifying ECS Fargate, ALB, Aurora PostgreSQL, S3, Secrets Manager, and CloudWatch.
  - Provide minimal, clean, valid Terraform configuration in `infra/` (`main.tf`, `variables.tf`, `outputs.tf`).
- **Status:** **Pending Execution**

### P2-3: Docker Hardening
- **Action:**
  - Update `Dockerfile` to use multi-stage build, non-root user (`appuser`), and container health check.
  - Verify build instructions in `README.md`.
- **Status:** **Pending Execution**

---

## P3 — Optional (Architecture Diagrams, Grounded README & Documentation)

### P3-1: System Architecture Diagrams
- **Action:** Create clean Mermaid diagrams in `docs/architecture/`:
  - `system_architecture.md`: End-to-end system flow.
  - `langgraph_flow.md`: Agent state machine and reflection loop.
  - `rag_pipeline.md`: Modular RAG ingestion, embedding, and retrieval.
  - `hitl_escalation.md`: Human-in-the-loop gate and override flow.
  - `aws_deployment.md`: Cloud infrastructure architecture.
- **Status:** **Pending Execution**

### P3-2: Grounded README Rewrite
- **Action:** Rewrite `README.md` to communicate engineering depth, replace buzzword hype with measured facts, and provide clear reproduction commands.
- **Status:** **Pending Execution**

### P3-3: Final Audit Report
- **Action:** Create `docs/FINAL_AUDIT.md` summarizing all changes, test results, evaluation benchmarks, and job requirement mapping.
- **Status:** **Pending Execution**
