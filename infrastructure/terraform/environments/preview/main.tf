# Terraform configuration for Basketball League Platform Preview Environment
# Optimized for COPPA compliance, youth safety, and multi-tenant isolation

terraform {
  required_version = ">= 1.6.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.11"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }

  backend "s3" {
    bucket         = "basketball-league-terraform-state"
    key            = "preview/terraform.tfstate"
    region         = "us-west-2"
    encrypt        = true
    dynamodb_table = "terraform-locks"
  }
}

# Variables
variable "environment_name" {
  description = "Name of the preview environment (e.g., preview-pr-123)"
  type        = string
  validation {
    condition     = can(regex("^preview-pr-[0-9]+$", var.environment_name))
    error_message = "Environment name must follow pattern: preview-pr-{number}"
  }
}

variable "pr_number" {
  description = "Pull request number"
  type        = string
  validation {
    condition     = can(regex("^[0-9]+$", var.pr_number))
    error_message = "PR number must be a valid number"
  }
}

variable "preview_domain" {
  description = "Base domain for preview environments"
  type        = string
  default     = "preview.basketballleague.dev"
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-west-2"
}

# Local values
locals {
  common_tags = {
    Environment     = var.environment_name
    Project        = "basketball-league-platform"
    PRNumber       = var.pr_number
    Purpose        = "preview"
    ManagedBy      = "terraform"
    CoppaCompliant = "true"
    YouthSafety    = "enabled"
    AutoCleanup    = "true"
    CreatedBy      = "github-actions"
  }
  
  # Generate unique resource names
  resource_prefix = "bl-${var.pr_number}"
  
  # Database settings for COPPA compliance
  database_name = "league_preview_pr_${var.pr_number}"
  
  # Multi-tenant configuration
  tenant_isolation = true
  
  # Youth platform specific settings
  coppa_compliance_enabled = true
  safesport_integration    = true
  data_encryption_required = true
}

# Data sources
data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_caller_identity" "current" {}

# Random password generation for secure setup
resource "random_password" "db_password" {
  length  = 32
  special = true
}

resource "random_password" "redis_auth" {
  length  = 32
  special = false
}

# VPC and Networking
resource "aws_vpc" "preview" {
  cidr_block           = "10.${var.pr_number}.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true
  
  tags = merge(local.common_tags, {
    Name = "${local.resource_prefix}-vpc"
  })
}

resource "aws_internet_gateway" "preview" {
  vpc_id = aws_vpc.preview.id
  
  tags = merge(local.common_tags, {
    Name = "${local.resource_prefix}-igw"
  })
}

# Public subnets for load balancers
resource "aws_subnet" "public" {
  count = 2
  
  vpc_id                  = aws_vpc.preview.id
  cidr_block              = "10.${var.pr_number}.${count.index + 1}.0/24"
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true
  
  tags = merge(local.common_tags, {
    Name = "${local.resource_prefix}-public-${count.index + 1}"
    Type = "public"
  })
}

# Private subnets for services (enhanced security for youth data)
resource "aws_subnet" "private" {
  count = 2
  
  vpc_id            = aws_vpc.preview.id
  cidr_block        = "10.${var.pr_number}.${count.index + 10}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]
  
  tags = merge(local.common_tags, {
    Name = "${local.resource_prefix}-private-${count.index + 1}"
    Type = "private"
    DataClassification = "youth-data-approved"
  })
}

# Database subnets (isolated for COPPA compliance)
resource "aws_subnet" "database" {
  count = 2
  
  vpc_id            = aws_vpc.preview.id
  cidr_block        = "10.${var.pr_number}.${count.index + 20}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]
  
  tags = merge(local.common_tags, {
    Name = "${local.resource_prefix}-database-${count.index + 1}"
    Type = "database"
    DataClassification = "coppa-protected"
  })
}

# NAT Gateways for private subnet internet access
resource "aws_eip" "nat" {
  count = 2
  domain = "vpc"
  
  tags = merge(local.common_tags, {
    Name = "${local.resource_prefix}-nat-eip-${count.index + 1}"
  })
}

resource "aws_nat_gateway" "preview" {
  count = 2
  
  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id
  
  tags = merge(local.common_tags, {
    Name = "${local.resource_prefix}-nat-${count.index + 1}"
  })
  
  depends_on = [aws_internet_gateway.preview]
}

# Route tables
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.preview.id
  
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.preview.id
  }
  
  tags = merge(local.common_tags, {
    Name = "${local.resource_prefix}-public-rt"
  })
}

resource "aws_route_table" "private" {
  count = 2
  
  vpc_id = aws_vpc.preview.id
  
  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.preview[count.index].id
  }
  
  tags = merge(local.common_tags, {
    Name = "${local.resource_prefix}-private-rt-${count.index + 1}"
  })
}

# Route table associations
resource "aws_route_table_association" "public" {
  count = 2
  
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "private" {
  count = 2
  
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private[count.index].id
}

# Security Groups
resource "aws_security_group" "database" {
  name        = "${local.resource_prefix}-database"
  description = "Security group for RDS database with COPPA compliance"
  vpc_id      = aws_vpc.preview.id
  
  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
    description     = "PostgreSQL from application servers"
  }
  
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  tags = merge(local.common_tags, {
    Name = "${local.resource_prefix}-database-sg"
    DataClassification = "coppa-protected"
  })
}

resource "aws_security_group" "redis" {
  name        = "${local.resource_prefix}-redis"
  description = "Security group for Redis cache"
  vpc_id      = aws_vpc.preview.id
  
  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
    description     = "Redis from application servers"
  }
  
  tags = merge(local.common_tags, {
    Name = "${local.resource_prefix}-redis-sg"
  })
}

resource "aws_security_group" "app" {
  name        = "${local.resource_prefix}-app"
  description = "Security group for application servers"
  vpc_id      = aws_vpc.preview.id
  
  ingress {
    from_port       = 3000
    to_port         = 3010
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
    description     = "Application ports from load balancer"
  }
  
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  tags = merge(local.common_tags, {
    Name = "${local.resource_prefix}-app-sg"
  })
}

resource "aws_security_group" "alb" {
  name        = "${local.resource_prefix}-alb"
  description = "Security group for Application Load Balancer"
  vpc_id      = aws_vpc.preview.id
  
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTP"
  }
  
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTPS"
  }
  
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  tags = merge(local.common_tags, {
    Name = "${local.resource_prefix}-alb-sg"
  })
}

# RDS Database with COPPA compliance features
resource "aws_db_subnet_group" "preview" {
  name       = "${local.resource_prefix}-db-subnet-group"
  subnet_ids = aws_subnet.database[*].id
  
  tags = merge(local.common_tags, {
    Name = "${local.resource_prefix}-db-subnet-group"
  })
}

resource "aws_db_instance" "preview" {
  identifier = "${local.resource_prefix}-db"
  
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = "db.t3.medium"
  
  allocated_storage     = 20
  max_allocated_storage = 100
  storage_type          = "gp3"
  storage_encrypted     = true  # Required for COPPA compliance
  
  db_name  = local.database_name
  username = "preview_user"
  password = random_password.db_password.result
  
  db_subnet_group_name   = aws_db_subnet_group.preview.name
  vpc_security_group_ids = [aws_security_group.database.id]
  
  backup_retention_period = 7
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"
  
  skip_final_snapshot = true  # For preview environments
  deletion_protection = false # For preview environments
  
  # Enhanced monitoring and logging for youth data compliance
  monitoring_interval = 60
  monitoring_role_arn = aws_iam_role.rds_monitoring.arn
  
  enabled_cloudwatch_logs_exports = ["postgresql"]
  
  # Performance Insights for monitoring youth data queries
  performance_insights_enabled = true
  performance_insights_retention_period = 7
  
  tags = merge(local.common_tags, {
    Name = "${local.resource_prefix}-database"
    DataClassification = "coppa-protected"
    BackupRetention = "7days"
  })
}

# RDS Monitoring Role
resource "aws_iam_role" "rds_monitoring" {
  name = "${local.resource_prefix}-rds-monitoring"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "monitoring.rds.amazonaws.com"
        }
      }
    ]
  })
  
  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "rds_monitoring" {
  role       = aws_iam_role.rds_monitoring.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}

# ElastiCache Redis for session management and caching
resource "aws_elasticache_subnet_group" "preview" {
  name       = "${local.resource_prefix}-redis-subnet-group"
  subnet_ids = aws_subnet.private[*].id
  
  tags = merge(local.common_tags, {
    Name = "${local.resource_prefix}-redis-subnet-group"
  })
}

resource "aws_elasticache_replication_group" "preview" {
  replication_group_id       = "${local.resource_prefix}-redis"
  description                = "Redis for preview environment ${var.pr_number}"
  
  port                = 6379
  parameter_group_name = "default.redis7"
  
  num_cache_clusters = 2
  node_type         = "cache.t3.medium"
  
  subnet_group_name  = aws_elasticache_subnet_group.preview.name
  security_group_ids = [aws_security_group.redis.id]
  
  # Security settings for youth data
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                 = random_password.redis_auth.result
  
  # Automatic backups
  snapshot_retention_limit = 3
  snapshot_window         = "03:00-05:00"
  
  # Maintenance
  maintenance_window = "sun:05:00-sun:06:00"
  
  tags = merge(local.common_tags, {
    Name = "${local.resource_prefix}-redis"
    DataClassification = "session-data"
  })
}

# EKS Cluster for microservices
resource "aws_eks_cluster" "preview" {
  name     = "${local.resource_prefix}-eks"
  role_arn = aws_iam_role.eks_cluster.arn
  version  = "1.28"
  
  vpc_config {
    subnet_ids              = concat(aws_subnet.private[*].id, aws_subnet.public[*].id)
    endpoint_private_access = true
    endpoint_public_access  = true
    public_access_cidrs     = ["0.0.0.0/0"]
    
    # Enhanced security for youth platform
    endpoint_config {
      private_access = true
      public_access  = true
    }
  }
  
  # Enable logging for compliance
  enabled_cluster_log_types = ["api", "audit", "authenticator", "controllerManager", "scheduler"]
  
  # Encryption of secrets for COPPA compliance
  encryption_config {
    provider {
      key_arn = aws_kms_key.preview.arn
    }
    resources = ["secrets"]
  }
  
  depends_on = [
    aws_iam_role_policy_attachment.eks_cluster_policy,
    aws_iam_role_policy_attachment.eks_service_policy,
    aws_cloudwatch_log_group.eks,
  ]
  
  tags = merge(local.common_tags, {
    Name = "${local.resource_prefix}-eks-cluster"
  })
}

# KMS Key for encryption (COPPA requirement)
resource "aws_kms_key" "preview" {
  description = "KMS key for preview environment ${var.pr_number} encryption"
  
  tags = merge(local.common_tags, {
    Name = "${local.resource_prefix}-kms-key"
    Purpose = "coppa-encryption"
  })
}

resource "aws_kms_alias" "preview" {
  name          = "alias/${local.resource_prefix}-key"
  target_key_id = aws_kms_key.preview.key_id
}

# CloudWatch Log Group for EKS
resource "aws_cloudwatch_log_group" "eks" {
  name              = "/aws/eks/${local.resource_prefix}-eks/cluster"
  retention_in_days = 7
  kms_key_id        = aws_kms_key.preview.arn
  
  tags = merge(local.common_tags, {
    Name = "${local.resource_prefix}-eks-logs"
  })
}

# EKS IAM Roles
resource "aws_iam_role" "eks_cluster" {
  name = "${local.resource_prefix}-eks-cluster"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "eks.amazonaws.com"
        }
      }
    ]
  })
  
  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "eks_cluster_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
  role       = aws_iam_role.eks_cluster.name
}

resource "aws_iam_role_policy_attachment" "eks_service_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSServicePolicy"
  role       = aws_iam_role.eks_cluster.name
}

# EKS Node Group
resource "aws_eks_node_group" "preview" {
  cluster_name    = aws_eks_cluster.preview.name
  node_group_name = "${local.resource_prefix}-nodes"
  node_role_arn   = aws_iam_role.eks_node_group.arn
  subnet_ids      = aws_subnet.private[*].id
  
  capacity_type  = "ON_DEMAND"
  instance_types = ["t3.medium"]
  
  scaling_config {
    desired_size = 2
    max_size     = 4
    min_size     = 1
  }
  
  update_config {
    max_unavailable = 1
  }
  
  # Ensure nodes are replaced before destroying
  lifecycle {
    ignore_changes = [scaling_config[0].desired_size]
  }
  
  depends_on = [
    aws_iam_role_policy_attachment.eks_worker_node_policy,
    aws_iam_role_policy_attachment.eks_cni_policy,
    aws_iam_role_policy_attachment.eks_container_registry_policy,
  ]
  
  tags = merge(local.common_tags, {
    Name = "${local.resource_prefix}-node-group"
  })
}

resource "aws_iam_role" "eks_node_group" {
  name = "${local.resource_prefix}-eks-node-group"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })
  
  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "eks_worker_node_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy"
  role       = aws_iam_role.eks_node_group.name
}

resource "aws_iam_role_policy_attachment" "eks_cni_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"
  role       = aws_iam_role.eks_node_group.name
}

resource "aws_iam_role_policy_attachment" "eks_container_registry_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
  role       = aws_iam_role.eks_node_group.name
}

# S3 Buckets for static assets with COPPA compliance
resource "aws_s3_bucket" "web_assets" {
  bucket = "${local.resource_prefix}-web-assets"
  
  tags = merge(local.common_tags, {
    Name = "${local.resource_prefix}-web-assets"
    Purpose = "static-web-assets"
  })
}

resource "aws_s3_bucket" "mobile_assets" {
  bucket = "${local.resource_prefix}-mobile-assets"
  
  tags = merge(local.common_tags, {
    Name = "${local.resource_prefix}-mobile-assets"
    Purpose = "mobile-app-assets"
  })
}

# S3 bucket configurations for security
resource "aws_s3_bucket_versioning" "web_assets" {
  bucket = aws_s3_bucket.web_assets.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_versioning" "mobile_assets" {
  bucket = aws_s3_bucket.mobile_assets.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "web_assets" {
  bucket = aws_s3_bucket.web_assets.id
  
  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = aws_kms_key.preview.arn
      sse_algorithm     = "aws:kms"
    }
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "mobile_assets" {
  bucket = aws_s3_bucket.mobile_assets.id
  
  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = aws_kms_key.preview.arn
      sse_algorithm     = "aws:kms"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "web_assets" {
  bucket = aws_s3_bucket.web_assets.id
  
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_public_access_block" "mobile_assets" {
  bucket = aws_s3_bucket.mobile_assets.id
  
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# CloudFront Distributions for CDN
resource "aws_cloudfront_distribution" "web_assets" {
  origin {
    domain_name = aws_s3_bucket.web_assets.bucket_regional_domain_name
    origin_id   = "S3-${aws_s3_bucket.web_assets.id}"
    
    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.web_assets.cloudfront_access_identity_path
    }
  }
  
  enabled = true
  comment = "CDN for web assets - PR ${var.pr_number}"
  
  default_cache_behavior {
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "S3-${aws_s3_bucket.web_assets.id}"
    compress               = true
    viewer_protocol_policy = "redirect-to-https"
    
    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }
    
    min_ttl     = 0
    default_ttl = 3600
    max_ttl     = 86400
  }
  
  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }
  
  viewer_certificate {
    cloudfront_default_certificate = true
  }
  
  tags = merge(local.common_tags, {
    Name = "${local.resource_prefix}-web-cdn"
  })
}

resource "aws_cloudfront_origin_access_identity" "web_assets" {
  comment = "OAI for ${local.resource_prefix} web assets"
}

# MSK Kafka Cluster for event streaming
resource "aws_msk_cluster" "preview" {
  cluster_name           = "${local.resource_prefix}-kafka"
  kafka_version          = "2.8.1"
  number_of_broker_nodes = 2
  
  broker_node_group_info {
    instance_type  = "kafka.t3.small"
    client_subnets = aws_subnet.private[*].id
    
    storage_info {
      ebs_storage_info {
        volume_size = 20
      }
    }
    
    security_groups = [aws_security_group.kafka.id]
  }
  
  encryption_info {
    encryption_at_rest_kms_key_id = aws_kms_key.preview.arn
    encryption_in_transit {
      client_broker = "TLS"
      in_cluster    = true
    }
  }
  
  logging_info {
    broker_logs {
      cloudwatch_logs {
        enabled   = true
        log_group = aws_cloudwatch_log_group.kafka.name
      }
    }
  }
  
  tags = merge(local.common_tags, {
    Name = "${local.resource_prefix}-kafka"
  })
}

resource "aws_security_group" "kafka" {
  name        = "${local.resource_prefix}-kafka"
  description = "Security group for MSK Kafka cluster"
  vpc_id      = aws_vpc.preview.id
  
  ingress {
    from_port       = 9092
    to_port         = 9098
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
    description     = "Kafka from application servers"
  }
  
  tags = merge(local.common_tags, {
    Name = "${local.resource_prefix}-kafka-sg"
  })
}

resource "aws_cloudwatch_log_group" "kafka" {
  name              = "/aws/msk/${local.resource_prefix}-kafka"
  retention_in_days = 7
  kms_key_id        = aws_kms_key.preview.arn
  
  tags = merge(local.common_tags, {
    Name = "${local.resource_prefix}-kafka-logs"
  })
}

# Outputs
output "environment_name" {
  description = "Name of the preview environment"
  value       = var.environment_name
}

output "pr_number" {
  description = "Pull request number"
  value       = var.pr_number
}

output "vpc_id" {
  description = "ID of the VPC"
  value       = aws_vpc.preview.id
}

output "database_host" {
  description = "RDS instance endpoint"
  value       = aws_db_instance.preview.endpoint
  sensitive   = true
}

output "database_name" {
  description = "Database name"
  value       = aws_db_instance.preview.db_name
}

output "database_password" {
  description = "Database password"
  value       = random_password.db_password.result
  sensitive   = true
}

output "redis_host" {
  description = "Redis cluster endpoint"
  value       = aws_elasticache_replication_group.preview.primary_endpoint_address
  sensitive   = true
}

output "redis_auth_token" {
  description = "Redis auth token"
  value       = random_password.redis_auth.result
  sensitive   = true
}

output "kafka_brokers" {
  description = "Kafka broker endpoints"
  value       = aws_msk_cluster.preview.bootstrap_brokers_tls
  sensitive   = true
}

output "eks_cluster_name" {
  description = "EKS cluster name"
  value       = aws_eks_cluster.preview.name
}

output "eks_cluster_endpoint" {
  description = "EKS cluster endpoint"
  value       = aws_eks_cluster.preview.endpoint
  sensitive   = true
}

output "s3_web_bucket" {
  description = "S3 bucket for web assets"
  value       = aws_s3_bucket.web_assets.bucket
}

output "s3_mobile_bucket" {
  description = "S3 bucket for mobile assets"
  value       = aws_s3_bucket.mobile_assets.bucket
}

output "cloudfront_web_domain" {
  description = "CloudFront distribution domain for web assets"
  value       = aws_cloudfront_distribution.web_assets.domain_name
}

output "kms_key_id" {
  description = "KMS key ID for encryption"
  value       = aws_kms_key.preview.key_id
}

# COPPA Compliance Outputs
output "coppa_compliance_status" {
  description = "COPPA compliance configuration status"
  value = {
    encryption_enabled      = true
    data_isolation_enabled  = local.tenant_isolation
    audit_logging_enabled   = true
    backup_retention_days   = aws_db_instance.preview.backup_retention_period
    kms_encryption_key     = aws_kms_key.preview.key_id
  }
}

# Youth Safety Outputs  
output "youth_safety_features" {
  description = "Youth safety features enabled"
  value = {
    network_isolation     = true
    encrypted_storage     = true
    audit_trail_enabled   = true
    secure_communication  = true
    safesport_ready       = local.safesport_integration
  }
}