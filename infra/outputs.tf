output "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  value       = aws_ecs_cluster.main.name
}

output "ecs_task_definition_arn" {
  description = "ARN of the ReviveAI ECS task definition"
  value       = aws_ecs_task_definition.app.arn
}

output "artifacts_bucket_name" {
  description = "Name of the S3 artifacts bucket"
  value       = aws_s3_bucket.artifacts.bucket
}

output "cloudwatch_log_group" {
  description = "CloudWatch log group for container telemetry"
  value       = aws_cloudwatch_log_group.app_logs.name
}
