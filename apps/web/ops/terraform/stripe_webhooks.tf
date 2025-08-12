# Stripe Webhook Configuration for Gametriq
# This configuration manages Stripe webhook endpoints for different environments

terraform {
  required_providers {
    stripe = {
      source  = "lukasaron/stripe"
      version = "~> 1.0"
    }
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Variables
variable "stripe_api_key" {
  description = "Stripe API key for managing webhooks"
  type        = string
  sensitive   = true
}

variable "environment" {
  description = "Environment name (staging/production)"
  type        = string
  validation {
    condition     = contains(["staging", "production"], var.environment)
    error_message = "Environment must be either 'staging' or 'production'."
  }
}

variable "domain" {
  description = "Domain for webhook endpoints"
  type        = string
}

# Stripe Provider Configuration
provider "stripe" {
  api_key = var.stripe_api_key
}

# Local variables for webhook events
locals {
  webhook_events = [
    # Payment events
    "payment_intent.succeeded",
    "payment_intent.payment_failed",
    "payment_intent.canceled",
    "payment_intent.processing",
    "payment_intent.requires_action",
    
    # Charge events
    "charge.succeeded",
    "charge.failed",
    "charge.captured",
    "charge.refunded",
    "charge.dispute.created",
    "charge.dispute.updated",
    "charge.dispute.closed",
    
    # Customer events
    "customer.created",
    "customer.updated",
    "customer.deleted",
    "customer.subscription.created",
    "customer.subscription.updated",
    "customer.subscription.deleted",
    
    # Checkout events
    "checkout.session.completed",
    "checkout.session.expired",
    
    # Invoice events
    "invoice.paid",
    "invoice.payment_failed",
    "invoice.upcoming",
    
    # Payout events
    "payout.created",
    "payout.failed",
    "payout.paid",
    
    # Radar events
    "radar.early_fraud_warning.created"
  ]
  
  webhook_url = "https://${var.domain}/api/webhooks/stripe"
  
  common_tags = {
    Environment = var.environment
    Service     = "payments"
    ManagedBy   = "terraform"
    Team        = "devops"
  }
}

# Stripe Webhook Endpoint
resource "stripe_webhook_endpoint" "gametriq" {
  url            = local.webhook_url
  enabled_events = local.webhook_events
  
  description = "Gametriq ${var.environment} webhook endpoint"
  
  metadata = {
    environment = var.environment
    created_by  = "terraform"
    version     = "1.0.0"
  }
}

# Store webhook secret in AWS Secrets Manager
resource "aws_secretsmanager_secret" "stripe_webhook_secret" {
  name = "gametriq-${var.environment}-stripe-webhook-secret"
  
  description = "Stripe webhook endpoint secret for ${var.environment}"
  
  tags = merge(local.common_tags, {
    Type = "webhook-secret"
  })
}

resource "aws_secretsmanager_secret_version" "stripe_webhook_secret" {
  secret_id     = aws_secretsmanager_secret.stripe_webhook_secret.id
  secret_string = stripe_webhook_endpoint.gametriq.secret
}

# IAM policy for accessing the webhook secret
resource "aws_iam_policy" "stripe_webhook_secret_access" {
  name        = "gametriq-${var.environment}-stripe-webhook-secret-access"
  description = "Allow access to Stripe webhook secret"
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = aws_secretsmanager_secret.stripe_webhook_secret.arn
      }
    ]
  })
  
  tags = local.common_tags
}

# CloudWatch Log Group for webhook logs
resource "aws_cloudwatch_log_group" "stripe_webhooks" {
  name              = "/aws/lambda/gametriq-${var.environment}-stripe-webhooks"
  retention_in_days = var.environment == "production" ? 90 : 30
  
  tags = local.common_tags
}

# CloudWatch Metric Alarms
resource "aws_cloudwatch_metric_alarm" "webhook_errors" {
  alarm_name          = "gametriq-${var.environment}-stripe-webhook-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "WebhookErrors"
  namespace           = "Gametriq/Payments"
  period              = "300"
  statistic           = "Sum"
  threshold           = "10"
  alarm_description   = "This metric monitors stripe webhook errors"
  treat_missing_data  = "notBreaching"
  
  dimensions = {
    Environment = var.environment
    Service     = "stripe-webhooks"
  }
  
  alarm_actions = [aws_sns_topic.webhook_alerts.arn]
  
  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "webhook_latency" {
  alarm_name          = "gametriq-${var.environment}-stripe-webhook-latency"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "3"
  metric_name         = "WebhookProcessingTime"
  namespace           = "Gametriq/Payments"
  period              = "60"
  statistic           = "Average"
  threshold           = "3000"  # 3 seconds
  alarm_description   = "This metric monitors stripe webhook processing latency"
  treat_missing_data  = "notBreaching"
  
  dimensions = {
    Environment = var.environment
    Service     = "stripe-webhooks"
  }
  
  alarm_actions = [aws_sns_topic.webhook_alerts.arn]
  
  tags = local.common_tags
}

# SNS Topic for alerts
resource "aws_sns_topic" "webhook_alerts" {
  name = "gametriq-${var.environment}-stripe-webhook-alerts"
  
  tags = merge(local.common_tags, {
    Type = "alerts"
  })
}

# SNS Topic Subscription (email)
resource "aws_sns_topic_subscription" "webhook_alerts_email" {
  topic_arn = aws_sns_topic.webhook_alerts.arn
  protocol  = "email"
  endpoint  = var.environment == "production" ? "payments-oncall@gametriq.com" : "devops@gametriq.com"
}

# DynamoDB table for idempotency
resource "aws_dynamodb_table" "webhook_idempotency" {
  name           = "gametriq-${var.environment}-stripe-webhook-idempotency"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "event_id"
  
  attribute {
    name = "event_id"
    type = "S"
  }
  
  ttl {
    attribute_name = "expire_at"
    enabled        = true
  }
  
  point_in_time_recovery {
    enabled = var.environment == "production"
  }
  
  tags = merge(local.common_tags, {
    Type = "idempotency-store"
  })
}

# API Gateway for webhook endpoint
resource "aws_api_gateway_rest_api" "stripe_webhooks" {
  name        = "gametriq-${var.environment}-stripe-webhooks"
  description = "API Gateway for Stripe webhooks"
  
  endpoint_configuration {
    types = ["REGIONAL"]
  }
  
  tags = local.common_tags
}

resource "aws_api_gateway_resource" "stripe_webhook" {
  rest_api_id = aws_api_gateway_rest_api.stripe_webhooks.id
  parent_id   = aws_api_gateway_rest_api.stripe_webhooks.root_resource_id
  path_part   = "stripe"
}

resource "aws_api_gateway_method" "stripe_webhook_post" {
  rest_api_id   = aws_api_gateway_rest_api.stripe_webhooks.id
  resource_id   = aws_api_gateway_resource.stripe_webhook.id
  http_method   = "POST"
  authorization = "NONE"
}

# WAF for webhook protection
resource "aws_wafv2_web_acl" "stripe_webhooks" {
  name  = "gametriq-${var.environment}-stripe-webhooks"
  scope = "REGIONAL"
  
  default_action {
    allow {}
  }
  
  # Rate limiting rule
  rule {
    name     = "RateLimitRule"
    priority = 1
    
    action {
      block {}
    }
    
    statement {
      rate_based_statement {
        limit              = 2000
        aggregate_key_type = "IP"
      }
    }
    
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "RateLimitRule"
      sampled_requests_enabled   = true
    }
  }
  
  # IP allowlist for Stripe
  rule {
    name     = "StripeIPAllowlist"
    priority = 0
    
    action {
      allow {}
    }
    
    statement {
      ip_set_reference_statement {
        arn = aws_wafv2_ip_set.stripe_ips.arn
      }
    }
    
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "StripeIPAllowlist"
      sampled_requests_enabled   = true
    }
  }
  
  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "gametriq-${var.environment}-stripe-webhooks"
    sampled_requests_enabled   = true
  }
  
  tags = local.common_tags
}

# Stripe IP allowlist
resource "aws_wafv2_ip_set" "stripe_ips" {
  name               = "gametriq-${var.environment}-stripe-ips"
  scope              = "REGIONAL"
  ip_address_version = "IPV4"
  
  # Stripe's webhook IP addresses (as of 2025)
  # These should be updated regularly from Stripe's documentation
  addresses = [
    "3.18.12.63/32",
    "3.130.192.231/32",
    "13.235.14.237/32",
    "13.235.122.149/32",
    "18.211.135.69/32",
    "35.154.171.200/32",
    "52.15.183.38/32",
    "54.88.130.119/32",
    "54.88.130.237/32",
    "54.187.174.169/32",
    "54.187.205.235/32",
    "54.187.216.72/32"
  ]
  
  tags = local.common_tags
}

# Outputs
output "webhook_endpoint_url" {
  description = "The URL of the Stripe webhook endpoint"
  value       = stripe_webhook_endpoint.gametriq.url
}

output "webhook_endpoint_id" {
  description = "The ID of the Stripe webhook endpoint"
  value       = stripe_webhook_endpoint.gametriq.id
}

output "webhook_secret_arn" {
  description = "ARN of the webhook secret in Secrets Manager"
  value       = aws_secretsmanager_secret.stripe_webhook_secret.arn
}

output "api_gateway_url" {
  description = "API Gateway URL for webhooks"
  value       = aws_api_gateway_rest_api.stripe_webhooks.execution_arn
}

output "monitoring_dashboard_url" {
  description = "CloudWatch dashboard for monitoring"
  value       = "https://console.aws.amazon.com/cloudwatch/home?region=${data.aws_region.current.name}#dashboards:name=gametriq-${var.environment}-stripe-webhooks"
}

# Data source for current region
data "aws_region" "current" {}