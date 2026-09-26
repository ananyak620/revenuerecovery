# ReviveAI — AWS Cloud Deployment Architecture

This document illustrates the target production deployment on Amazon Web Services (AWS) using serverless container management, managed PostgreSQL, and automated secret injection.

```mermaid
graph TB
    Internet((Public Internet))

    subgraph AWS ["Amazon Web Services (us-east-1)"]
        R53["Route 53 DNS<br/>api.reviveai.io"]
        ACM["AWS Certificate Manager<br/>SSL / TLS Termination"]
        
        subgraph VPC ["Custom VPC (10.0.0.0/16)"]
            subgraph PublicSubnets ["Public Subnets (Multi-AZ)"]
                ALB["Application Load Balancer (ALB)<br/>Path-based Routing (/health, /api/*)"]
                NAT["NAT Gateways"]
            end

            subgraph PrivateAppSubnets ["Private App Subnets"]
                ECS["Amazon ECS Cluster<br/>AWS Fargate (Serverless Linux Containers)"]
                Task1["ReviveAI Task 1<br/>(FastAPI + LangGraph)"]
                Task2["ReviveAI Task 2<br/>(Auto-scaled Task)"]
                ECS --- Task1
                ECS --- Task2
            end

            subgraph PrivateDataSubnets ["Private Isolated Data Subnets"]
                RDS[("Amazon Aurora Serverless v2<br/>PostgreSQL 16 Multi-AZ")]
            end
        end

        subgraph Management ["AWS Platform Services"]
            S3[("Amazon S3<br/>Evaluation Reports & ML Artifacts")]
            SM["AWS Secrets Manager<br/>(API Keys, DB Credentials)"]
            CW["Amazon CloudWatch<br/>(Logs, Container Insights, Alarms)"]
            ECR["Amazon Elastic Container Registry (ECR)<br/>Hardened Multi-Stage Docker Images"]
            IAM["IAM Roles & Policies<br/>(Least-Privilege Task Roles)"]
        end
    end

    Internet --> R53 --> ACM --> ALB
    ALB --> Task1
    ALB --> Task2
    Task1 --> RDS
    Task2 --> RDS

    Task1 -. Read Secrets .-> SM
    Task2 -. Push Logs .-> CW
    Task1 -. S3 Backup .-> S3
    ECR -. Deploy Image .-> ECS
    IAM -. Grant Permissions .-> ECS
    NAT -. Egress to External APIs (Stripe, OpenAI) .-> Internet
```
