# ReviveAI — AWS Cloud Production Architecture

## 1. Architectural Philosophy & Service Selection

ReviveAI's production deployment on AWS is designed around the **AWS Well-Architected Framework** (Operational Excellence, Security, Reliability, Performance Efficiency, and Cost Optimization).

The application remains **100% runnable locally** using SQLite and Docker, while providing an enterprise AWS target architecture.

```mermaid
graph TD
    subgraph Client["External Clients & Webhooks"]
        WH[Razorpay / Stripe Webhooks]
        DASH[Merchant Web Dashboard]
    end

    subgraph Edge["Perimeter & Traffic Routing"]
        CF[Amazon CloudFront CDN]
        WAF[AWS WAF - Rate Limiting & OWASP]
        ALB[Application Load Balancer]
    end

    subgraph Compute["Container Execution Layer"]
        ECS[Amazon ECS Cluster]
        FARGATE[AWS Fargate Serverless Tasks<br/>ReviveAI Container: Python 3.12 + FastAPI + LangGraph]
    end

    subgraph Data["Persistence & Storage Layer"]
        AURORA[(Amazon Aurora Serverless v2<br/>PostgreSQL 16)]
        S3[(Amazon S3 Bucket<br/>ML Models & Eval Reports)]
    end

    subgraph Governance["Security & Monitoring"]
        SM[AWS Secrets Manager<br/>API Keys & DB Credentials]
        CW[Amazon CloudWatch<br/>Structured JSON Logs & Alarms]
        IAM[IAM Task Roles<br/>Least Privilege Access]
    end

    WH --> WAF
    DASH --> CF
    CF --> ALB
    WAF --> ALB
    ALB --> FARGATE
    FARGATE --> AURORA
    FARGATE --> S3
    FARGATE --> SM
    FARGATE --> CW
```

---

## 2. Service-by-Service Rationale

### A. Compute: AWS ECS on AWS Fargate (Serverless Containers)
- **Why ECS Fargate over AWS Lambda?**
  1. **Memory & Cold Starts:** ReviveAI loads trained XGBoost classifiers and sentence embeddings into RAM. Lambda cold starts would introduce 2–5 second delays on critical payment webhooks.
  2. **Long-Running Reflection Loops:** Multi-agent LangGraph deliberation with reflection loops and self-correction cycles executes continuously within container memory, avoiding Lambda 15-minute execution limits and API Gateway 29-second timeouts.
  3. **Operational Simplicity:** Zero EC2 cluster provisioning or patching; tasks scale automatically based on incoming request velocity.

### B. Ingress: Application Load Balancer (ALB) + AWS WAF
- Terminates TLS/SSL certificates managed via AWS Certificate Manager (ACM).
- Health check endpoints (`/health` or `/metrics`) ensure continuous task availability and zero-downtime rolling deployments.
- AWS WAF filters bad bots, IP rate-limiting, and malicious payloads before reaching the application.

### C. Database: Amazon Aurora Serverless v2 (PostgreSQL)
- Provides multi-AZ high availability and automated replication.
- Scales compute seamlessly from 0.5 to 16 ACUs based on payment webhook volume spikes (e.g. month-end salary billing bursts).
- Replaces local SQLite development database via SQLAlchemy URL: `DATABASE_URL=postgresql://user:pass@aurora-endpoint:5432/reviveai`.

### D. Model & Artifact Storage: Amazon S3
- Stores calibrated ML model checkpoints (`xgboost_calibrated.joblib`), evaluation reports (`evals/reports/latest.json`), and daily audit snapshots.
- S3 Bucket configured with Server-Side Encryption (SSE-S3 or KMS) and Versioning.

### E. Secrets Management: AWS Secrets Manager
- Secures `OPENAI_API_KEY`, `GEMINI_API_KEY`, and Aurora master credentials.
- Container tasks pull secrets dynamically at startup via IAM task role execution environment variables.

### F. Observability: Amazon CloudWatch
- Ingests structured JSON telemetry events emitted by `src/utils/logger.py`.
- CloudWatch Metric Filters parse `tool_latency_ms`, `policy_compliance`, and `hitl_event` to trigger SNS alerts if failure recovery anomalies emerge.

---

## 3. Terraform Infrastructure-as-Code (`infra/`)

The infrastructure is codified in modular Terraform files under `infra/`:
- `infra/main.tf`: Provisions VPC, ECS Fargate cluster, task definition, ALB, Aurora PostgreSQL, S3, and CloudWatch log groups.
- `infra/variables.tf`: Configurable parameters (region, environment, task sizing).
- `infra/outputs.tf`: Outputs (ALB DNS name, Aurora endpoint, S3 bucket ARN).
