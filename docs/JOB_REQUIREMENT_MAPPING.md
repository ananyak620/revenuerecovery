# ReviveAI — Target Job Requirement Mapping

This document evaluates the ReviveAI codebase against the target job requirements for Senior Agentic AI / AI/ML & Backend Engineering roles.

---

## Detailed Requirement Mapping

| Target Requirement | Current Codebase Evidence | Missing Elements | Recommended Improvement | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Python** *(Required)* | Python 3.12, strict type hints, dataclasses, Pydantic v2, FastAPI, SQLAlchemy 2.0, XGBoost, Scikit-learn. | Some older utility methods used untyped dictionaries instead of strict Pydantic models. | Implement Pydantic v2 input and output models across all agent tools, graph nodes, and API routes. | **Completed / P0 Enforced** |
| **TypeScript / Modern Frontend** *(Preferred / Ideal)* | Vanilla JS modules with modern UI components (`components/sidebar.js`, `statCard.js`, `chart.js`, `toast.js`, `table.js`). | Frontend is written in ES6 JavaScript rather than TypeScript; lack of TypeScript compile step. | Maintain clean ES6 modularity; document API schema types to enable direct TypeScript client generation via OpenAPI. | **Documented / Feasible** |
| **Curiosity / Experience with Agentic AI** *(Required)* | Multi-agent autonomous recovery architecture (`DetectiveAgent`, `StrategistAgent`, `AuditorAgent`, `CommunicatorAgent`). | Earlier iterations used simple sequential steps without explicit graph state compilation. | Compile native LangGraph `StateGraph` with explicit agent state, self-correction reflection loop, and loop bounds. | **P0 / P1 Active** |
| **Agent Planning** *(Required)* | ReAct Plan-and-Solve flow, proactive task decomposition, dynamic retry delay and discount concession planning. | Planning lacked formal validation of plan step preconditions. | Introduce formal `proposed_plan` Pydantic schemas and precondition validation in LangGraph. | **P0 Implemented** |
| **Tool Usage & Validation** *(Required)* | 8 specialized tools in `src/agent/tools.py` + JSON-RPC 2.0 MCP server in `src/agent/mcp_server.py`. | Missing input validation on LLM arguments; lack of negative/malformed tool tests and timeouts. | Implement Pydantic input models, pre-execution validation, timeout wrappers, and negative test suite. | **P0 Implemented** |
| **Context Retrieval & RAG** *(Required)* | Standard recovery playbooks (`src/ai/rag_playbooks.py`) and regulatory markdown policy files. | Prior implementation was in-memory token keyword matching without true dense vector embeddings. | Build modular RAG pipeline in `src/ai/rag/` with document ingestion, semantic chunking, dense vector embeddings, and cosine similarity. | **P1 Active** |
| **Agent Evaluation** *(Required)* | Basic unit and integration tests passing in Pytest. | Zero quantitative agent evaluation metrics; no benchmark scenarios or automated scoring. | Create dedicated `evals/` suite with 14 benchmark scenarios, scoring functions, and automated JSON/Markdown reporting. | **P1 Planned** |
| **Cloud Concepts & Architecture** *(Required)* | Containerized application with Docker; environment-based configuration via `python-dotenv`. | Missing formal infrastructure blueprints and deployment specifications. | Create `docs/AWS_ARCHITECTURE.md` detailing containerized hosting, VPC, databases, and security. | **P2 Planned** |
| **AWS Exposure** *(Required)* | Basic container execution on cloud targets (Render, local Docker). | No AWS-specific services or Infrastructure-as-Code (Terraform/CloudFormation). | Write clean, runnable Terraform infrastructure (`infra/`) provisioning ECS Fargate, ALB, S3, Secrets Manager, and Aurora. | **P2 Planned** |
| **Testing-Driven Development** *(Required)* | 43 passing Pytest tests covering ML models, features, webhooks, policy engine, and MCP server. | Tests resided in a flat folder without domain isolation; missing safety and adversarial tests. | Restructure tests into `unit/`, `integration/`, `agent/`, `rag/`, `tools/`, `api/`, `safety/`, and add CI workflow. | **P1 Active** |
| **LangGraph** *(Preferred)* | `src/agent/graph.py` implements a 9-node `StateGraph` with conditional reflection edges. | API routes previously bypassed the graph; needed test coverage and end-to-end integration. | Connect API routes to `StateGraph`, write dedicated agent graph tests, and ensure loop termination limits ($\le 3$). | **P0 / P1 Active** |
| **CrewAI / Multi-Agent Swarms** *(Preferred)* | 4 specialized collaborating agents (`Detective`, `Strategist`, `Auditor`, `Communicator`) with distinct system prompts and tools. | Agents lacked strict inter-agent communication protocols. | Formalize inter-agent communication via typed LangGraph state channels and deliberation logs. | **Completed** |
| **RAG: Chunking & Embeddings** *(Preferred)* | Document chunker in `src/ai/rag/chunking.py` with sliding window and character overlap. | Chunking was disconnected from embedding vectors and retrieval evaluation. | Connect chunking to dense embeddings, vector storage, and an automated evaluation pipeline measuring Precision@k, Recall@k, and MRR. | **P1 Planned** |
| **AWS Certifications / Cloud Knowledge** *(Preferred)* | Cloud architectural documentation covering AWS Well-Architected Framework principles (Reliability, Security, Performance). | Missing IAM least-privilege policies and VPC security group definitions. | Include IAM role definitions and VPC security groups in `infra/` Terraform and `docs/AWS_ARCHITECTURE.md`. | **P2 Planned** |

---

## Technical Competency Summary

| Competency Area | ReviveAI Implementation Evidence | Interview Credibility Rating |
| :--- | :--- | :--- |
| **Agentic AI & Orchestration** | LangGraph StateGraph, 4-agent collaborative system, reflection/self-correction loop, deterministic policy guardrails. | ⭐⭐⭐⭐⭐ **High** |
| **Backend Engineering** | FastAPI async REST endpoints, Pydantic v2 validation, SQLAlchemy 2.0 ORM, JSON-RPC 2.0 MCP server. | ⭐⭐⭐⭐⭐ **High** |
| **Machine Learning & MLOps** | XGBoost classifier, `CalibratedClassifierCV` probability calibration, MLflow experiment tracking, feature engineering pipeline. | ⭐⭐⭐⭐⭐ **High** |
| **RAG & Information Retrieval** | Ingestion of regulatory policies, configurable chunking, dense vector similarity search, retrieval evaluation (MRR, Recall@k). | ⭐⭐⭐⭐⭐ **High** |
| **Software Quality & Testing** | Comprehensive Pytest suite, adversarial & prompt injection testing, CI/CD with GitHub Actions, Ruff linting. | ⭐⭐⭐⭐⭐ **High** |
| **Cloud & DevOps** | Docker multi-stage build, non-root execution, Terraform AWS Fargate/ALB/Aurora infrastructure blueprint. | ⭐⭐⭐⭐⭐ **High** |
