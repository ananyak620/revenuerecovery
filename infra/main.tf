terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
  default_tags {
    tags = {
      Application = var.app_name
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# ---------------------------------------------------------------------------
# S3 Bucket — ML Artifacts & Evaluation Reports
# ---------------------------------------------------------------------------
resource "aws_s3_bucket" "artifacts" {
  bucket = "${var.app_name}-${var.environment}-artifacts-${var.aws_region}"
}

resource "aws_s3_bucket_versioning" "artifacts_versioning" {
  bucket = aws_s3_bucket.artifacts.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "artifacts_crypto" {
  bucket = aws_s3_bucket.artifacts.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# ---------------------------------------------------------------------------
# CloudWatch Log Group
# ---------------------------------------------------------------------------
resource "aws_cloudwatch_log_group" "app_logs" {
  name              = "/ecs/${var.app_name}-${var.environment}"
  retention_in_days = 30
}

# ---------------------------------------------------------------------------
# ECS Fargate Cluster
# ---------------------------------------------------------------------------
resource "aws_ecs_cluster" "main" {
  name = "${var.app_name}-${var.environment}-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

# ---------------------------------------------------------------------------
# IAM Roles & Policies (Least-Privilege)
# ---------------------------------------------------------------------------
resource "aws_iam_role" "ecs_execution_role" {
  name = "${var.app_name}-${var.environment}-ecs-exec-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_execution_policy" {
  role       = aws_iam_role.ecs_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role" "ecs_task_role" {
  name = "${var.app_name}-${var.environment}-ecs-task-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
    }]
  })
}

# Task Role policy to access S3 artifacts
resource "aws_iam_policy" "s3_access" {
  name = "${var.app_name}-${var.environment}-s3-access"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "s3:GetObject",
        "s3:PutObject",
        "s3:ListBucket"
      ]
      Resource = [
        aws_s3_bucket.artifacts.arn,
        "${aws_s3_bucket.artifacts.arn}/*"
      ]
    }]
  })
}

resource "aws_iam_role_policy_attachment" "task_s3_attach" {
  role       = aws_iam_role.ecs_task_role.name
  policy_arn = aws_iam_policy.s3_access.arn
}

# ---------------------------------------------------------------------------
# ECS Fargate Task Definition
# ---------------------------------------------------------------------------
resource "aws_ecs_task_definition" "app" {
  family                   = "${var.app_name}-${var.environment}"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.task_cpu
  memory                   = var.task_memory
  execution_role_arn       = aws_iam_role.ecs_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_role.arn

  container_definitions = jsonencode([{
    name      = var.app_name
    image     = var.container_image
    essential = true

    portMappings = [{
      containerPort = 8000
      hostPort      = 8000
      protocol      = "tcp"
    }]

    environment = [
      { name = "APP_ENV", value = var.environment },
      { name = "LOG_LEVEL", value = "INFO" },
      { name = "S3_ARTIFACTS_BUCKET", value = aws_s3_bucket.artifacts.bucket }
    ]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.app_logs.name
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "reviveai"
      }
    }
  }])
}
