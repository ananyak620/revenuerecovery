variable "aws_region" {
  description = "Target AWS region for ReviveAI deployment"
  type        = string
  default     = "ap-south-1" # Mumbai (aligned with Indian payment gateways)
}

variable "environment" {
  description = "Deployment environment (dev, staging, prod)"
  type        = string
  default     = "prod"
}

variable "app_name" {
  description = "Application identifier"
  type        = string
  default     = "reviveai"
}

variable "container_image" {
  description = "ECR Docker image URI for ReviveAI"
  type        = string
  default     = "123456789012.dkr.ecr.ap-south-1.amazonaws.com/reviveai:latest"
}

variable "task_cpu" {
  description = "CPU units allocated to ECS Fargate task (1024 = 1 vCPU)"
  type        = number
  default     = 1024
}

variable "task_memory" {
  description = "Memory allocated to ECS Fargate task in MB"
  type        = number
  default     = 2048
}
