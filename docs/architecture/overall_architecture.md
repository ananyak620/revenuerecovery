# ReviveAI — Overall System Architecture

This document illustrates the end-to-end architecture of ReviveAI, spanning client interfaces, the FastAPI gateway, the LangGraph multi-agent core, the ML inference engine, tool calling, and persistence layers.

```mermaid
graph TB
    subgraph Client ["Client & Ingestion Layer"]
        UI["Galaxy Web UI (Vanilla JS/CSS)"]
        Webhook["Stripe / Payment Gateway Webhook"]
        Admin["Ops & Risk Admin Console"]
    end

    subgraph Gateway ["API Gateway (FastAPI)"]
        Router["FastAPI Application (src/api/main.py)"]
        AuthMiddleware["Security & Auth / Webhook Secret"]
        RateLimiter["Rate Limiting & CORS"]
    end

    subgraph AgentCore ["Agentic AI Core (LangGraph)"]
        State["State Graph (RecoveryAgentState)"]
        Planner["Planner / Diagnostic Agent"]
        ToolExecutor["Validated Tool Execution Node"]
        PolicyNode["Safety & Policy Guardrail Node"]
        ReflectionNode["Reflection & Self-Verification"]
        HITLNode["Human-in-the-Loop Node (Breakpoint)"]
    end

    subgraph Inference ["ML & RAG Subsystems"]
        XGBoost["XGBoost ML Classifier (Prob of Recovery)"]
        FeatureEngine["Feature Engineering Pipeline (src/ml/)"]
        RAGStore["In-Memory Vector Store (L2 Cosine Search)"]
        Embedder["Subword Tri-gram TF-IDF Vectorizer"]
    end

    subgraph Tools ["Bounded Execution Tools"]
        T1["check_payment_status"]
        T2["get_customer_payment_history"]
        T3["schedule_payment_retry"]
        T4["send_customer_notification"]
        T5["create_manual_review_ticket"]
        MCP["Model Context Protocol (MCP) Server"]
    end

    subgraph Persistence ["Storage & Observability"]
        SQL["SQLAlchemy ORM (SQLite / PostgreSQL)"]
        Logger["Structured JSON Telemetry & Sanitizer"]
        Telemetry["Audit Trail & State Logs"]
    end

    UI --> Router
    Webhook --> AuthMiddleware --> Router
    Admin --> Router

    Router --> State
    State --> Planner
    Planner --> Inference
    Planner --> ToolExecutor
    ToolExecutor --> Tools
    Tools --> SQL
    Tools --> MCP
    
    ToolExecutor --> PolicyNode
    PolicyNode --> ReflectionNode
    ReflectionNode --> HITLNode
    HITLNode --> Router
    
    Inference --> XGBoost
    Inference --> RAGStore
    RAGStore --> Embedder

    State --> Logger --> Telemetry
    Router --> SQL
```
