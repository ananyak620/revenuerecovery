# ⚡ ReviveAI — AI Revenue Recovery Agent

> An AI/ML-powered system that identifies at-risk revenue, predicts recovery probability, diagnoses payment failures, selects the best recovery action, executes bounded workflows, and learns from outcomes.

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![XGBoost](https://img.shields.io/badge/XGBoost-ML-FF6600)](https://xgboost.readthedocs.io)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 🎯 What This Does

```
₹4,999 payment FAILED
        ↓
ML Model → Recovery probability = 87%
        ↓
AI Agent → "Temporary auth failure — retry after 6h"
        ↓
Policy Engine → ✓ Retry permitted
        ↓
Payment API → SUCCESS → ₹4,999 recovered
```

ReviveAI doesn't just predict if a payment will fail — it predicts **whether a failed payment can be recovered**, then takes intelligent action.

## 🏗️ Architecture

```
Frontend (Next.js) → FastAPI → Recovery Agent
                                    │
                              ┌─────┴─────┐
                              ↓           ↓
                        ML Prediction  LLM Diagnosis
                              │           │
                              └─────┬─────┘
                                    ↓
                             Decision Agent
                                    ↓
                             Policy Engine
                                    ↓
                          ┌────┬────┬────┐
                          ↓    ↓    ↓    ↓
                        Retry Notify Escalate Log
```

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| ML | scikit-learn, XGBoost, pandas, numpy |
| API | FastAPI, Pydantic v2 |
| Database | SQLite (dev) / PostgreSQL (prod) |
| AI | Google Gemini, ChromaDB (RAG) |
| MLOps | MLflow |
| Frontend | Next.js (Phase 8) |

## 🚀 Quick Start

```bash
# 1. Install dependencies
uv venv && uv pip install -e ".[dev]"

# 2. Generate synthetic dataset
python data/synthetic/generate_dataset.py

# 3. Seed the database
python -m src.db.seed

# 4. Start the API
uvicorn src.api.main:app --reload

# 5. Open API docs
# → http://localhost:8000/docs
```

## 📊 ML Pipeline

- **Problem**: Given a failed payment, predict `P(recovery | action)`
- **Features**: 20+ engineered features (retry count, failure reason, customer tenure, etc.)
- **Model**: XGBoost classifier with calibrated probabilities
- **Business metric**: Expected Recovery Value = `Amount × P(recovery)`

## 📁 Project Structure

```
src/
├── config.py          # Settings management
├── db/                # SQLAlchemy models + session
├── ml/                # Feature engineering, training, inference
├── ai/                # LLM diagnosis, prompts, RAG
├── agent/             # Recovery agent, tools, policy engine
└── api/               # FastAPI routes + schemas
```

## 🔒 Safety & Guardrails

Every AI decision passes through a Policy Engine before execution:
- Max retry limits enforced
- Amount thresholds checked
- All decisions logged to audit trail
- Human-in-the-loop escalation for high-risk actions

---

*Built for learning, built for impact.*
