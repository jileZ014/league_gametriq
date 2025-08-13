#!/bin/bash

# Production Deployment Script for Basketball League Platform
# Legacy Youth Sports - Phoenix Market
# Supports 80+ leagues, 3,500+ teams, 1000+ concurrent users

set -e  # Exit on any error
set -u  # Exit on undefined variable

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT="production"
AWS_REGION="${AWS_REGION:-us-west-2}"
STACK_PREFIX="basketball-platform"

# Required parameters
MASTER_DB_PASSWORD=""
EC2_KEY_NAME=""
SLACK_WEBHOOK_URL=""
ALERTING_EMAIL=""

# Function definitions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] SUCCESS:${NC} $1"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

# Usage function
usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Deploy Basketball League Platform to Production

Required Options:
    --db-password PASSWORD     Master database password (min 12 characters)
    --key-name KEY_NAME       EC2 Key Pair name for SSH access
    --slack-webhook URL       Slack webhook URL for notifications
    --alert-email EMAIL       Email address for critical alerts

Optional Options:
    --region REGION           AWS region (default: us-west-2)
    --dry-run                 Show what would be deployed without deploying
    --skip-build              Skip Docker build and push
    --rollback                Rollback to previous version
    --help                    Show this help message

Examples:
    $0 --db-password "SecurePassword123!" --key-name "production-key" --slack-webhook "https://hooks.slack.com/..." --alert-email "ops@legacyyouthsports.com"
    $0 --dry-run --db-password "test" --key-name "test" --slack-webhook "test" --alert-email "test@example.com"

EOF
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --db-password)
                MASTER_DB_PASSWORD="$2"
                shift 2
                ;;
            --key-name)
                EC2_KEY_NAME="$2"
                shift 2
                ;;
            --slack-webhook)
                SLACK_WEBHOOK_URL="$2"
                shift 2
                ;;
            --alert-email)
                ALERTING_EMAIL="$2"
                shift 2
                ;;
            --region)
                AWS_REGION="$2"
                shift 2
                ;;
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            --skip-build)
                SKIP_BUILD=true
                shift
                ;;
            --rollback)
                ROLLBACK=true
                shift
                ;;
            --help)
                usage
                exit 0
                ;;
            *)
                error "Unknown option: $1"
                usage
                exit 1
                ;;
        esac
    done

    # Validate required parameters
    if [[ -z "$MASTER_DB_PASSWORD" || -z "$EC2_KEY_NAME" || -z "$SLACK_WEBHOOK_URL" || -z "$ALERTING_EMAIL" ]]; then
        error "Missing required parameters"
        usage
        exit 1
    fi

    # Validate password strength
    if [[ ${#MASTER_DB_PASSWORD} -lt 12 ]]; then
        error "Database password must be at least 12 characters long"
        exit 1
    fi
}

# Pre-flight checks
preflight_checks() {
    log "Running pre-flight checks..."

    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        error "AWS CLI is not installed"
        exit 1
    fi

    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        error "AWS credentials not configured or invalid"
        exit 1
    fi

    # Check Docker
    if ! command -v docker &> /dev/null && [[ "${SKIP_BUILD:-}" != "true" ]]; then
        error "Docker is not installed"
        exit 1
    fi

    # Check required files
    local required_files=(
        "ops/aws/security-config.yml"
        "ops/aws/rds-config.yml"
        "ops/aws/auto-scaling.yml"
        "ops/monitoring/cloudwatch-config.yml"
    )

    for file in "${required_files[@]}"; do
        if [[ ! -f "$file" ]]; then
            error "Required file not found: $file"
            exit 1
        fi
    done

    # Check AWS permissions
    log "Validating AWS permissions..."
    if ! aws cloudformation describe-stacks --region "$AWS_REGION" &> /dev/null; then
        warning "CloudFormation permissions may be insufficient"
    fi

    success "Pre-flight checks completed"
}

# Get CloudFront Distribution ID (if exists)
get_cloudfront_id() {
    local cf_id
    cf_id=$(aws cloudfront list-distributions --query "DistributionList.Items[?Comment=='Basketball Platform CDN'].Id" --output text 2>/dev/null || echo "")
    
    if [[ -z "$cf_id" ]]; then
        warning "No CloudFront distribution found. WAF will be configured for ALB only."
        echo "PLACEHOLDER_DISTRIBUTION_ID"
    else
        echo "$cf_id"
    fi
}

# Deploy infrastructure stack
deploy_stack() {
    local stack_name="$1"
    local template_file="$2"
    local parameters="$3"
    local capabilities="${4:-}"

    if [[ "${DRY_RUN:-}" == "true" ]]; then
        log "DRY RUN: Would deploy stack $stack_name with template $template_file"
        return 0
    fi

    log "Deploying stack: $stack_name"
    
    local cmd="aws cloudformation deploy \
        --template-file $template_file \
        --stack-name $stack_name \
        --parameter-overrides $parameters \
        --region $AWS_REGION"

    if [[ -n "$capabilities" ]]; then
        cmd="$cmd --capabilities $capabilities"
    fi

    if eval "$cmd"; then
        success "Stack $stack_name deployed successfully"
    else
        error "Failed to deploy stack $stack_name"
        return 1
    fi
}

# Build and push Docker images
build_and_push_images() {
    if [[ "${SKIP_BUILD:-}" == "true" ]]; then
        log "Skipping Docker build and push"
        return 0
    fi

    if [[ "${DRY_RUN:-}" == "true" ]]; then
        log "DRY RUN: Would build and push Docker images"
        return 0
    fi

    log "Building and pushing Docker images..."

    # Get AWS account ID
    local aws_account_id
    aws_account_id=$(aws sts get-caller-identity --query Account --output text)
    
    # ECR login
    aws ecr get-login-password --region "$AWS_REGION" | docker login --username AWS --password-stdin "$aws_account_id.dkr.ecr.$AWS_REGION.amazonaws.com"

    # Create ECR repositories if they don't exist
    aws ecr create-repository --repository-name basketball-api --region "$AWS_REGION" 2>/dev/null || true
    aws ecr create-repository --repository-name basketball-web --region "$AWS_REGION" 2>/dev/null || true

    # Build and push API
    log "Building API image..."
    cd apps/api
    docker build -t basketball-api:latest .
    docker tag basketball-api:latest "$aws_account_id.dkr.ecr.$AWS_REGION.amazonaws.com/basketball-api:latest"
    docker push "$aws_account_id.dkr.ecr.$AWS_REGION.amazonaws.com/basketball-api:latest"
    cd ../..

    # Build and push Web
    log "Building Web image..."
    cd apps/web
    docker build -t basketball-web:latest .
    docker tag basketball-web:latest "$aws_account_id.dkr.ecr.$AWS_REGION.amazonaws.com/basketball-web:latest"
    docker push "$aws_account_id.dkr.ecr.$AWS_REGION.amazonaws.com/basketball-web:latest"
    cd ../..

    success "Docker images built and pushed successfully"
}

# Run database migrations
run_migrations() {
    if [[ "${DRY_RUN:-}" == "true" ]]; then
        log "DRY RUN: Would run database migrations"
        return 0
    fi

    log "Running database migrations..."

    # Get database endpoint from CloudFormation output
    local db_endpoint
    db_endpoint=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_PREFIX-database" \
        --query "Stacks[0].Outputs[?OutputKey=='ClusterEndpoint'].OutputValue" \
        --output text \
        --region "$AWS_REGION" 2>/dev/null || echo "")

    if [[ -z "$db_endpoint" ]]; then
        warning "Database endpoint not found. Skipping migrations."
        return 0
    fi

    # Export database URL for migrations
    export DATABASE_URL="postgresql://postgres:$MASTER_DB_PASSWORD@$db_endpoint:5432/basketball_league"

    cd apps/api
    if npm run migration:run; then
        success "Database migrations completed"
    else
        error "Database migrations failed"
        return 1
    fi
    cd ../..
}

# Validate deployment
validate_deployment() {
    if [[ "${DRY_RUN:-}" == "true" ]]; then
        log "DRY RUN: Would validate deployment"
        return 0
    fi

    log "Validating deployment..."

    # Check stack status
    local stacks=("$STACK_PREFIX-security" "$STACK_PREFIX-database" "$STACK_PREFIX-compute" "$STACK_PREFIX-monitoring")
    
    for stack in "${stacks[@]}"; do
        local status
        status=$(aws cloudformation describe-stacks \
            --stack-name "$stack" \
            --query "Stacks[0].StackStatus" \
            --output text \
            --region "$AWS_REGION" 2>/dev/null || echo "NOT_FOUND")

        if [[ "$status" == "CREATE_COMPLETE" || "$status" == "UPDATE_COMPLETE" ]]; then
            success "Stack $stack is healthy"
        else
            error "Stack $stack status: $status"
            return 1
        fi
    done

    # Run health checks if possible
    local api_endpoint
    api_endpoint=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_PREFIX-compute" \
        --query "Stacks[0].Outputs[?OutputKey=='APIEndpoint'].OutputValue" \
        --output text \
        --region "$AWS_REGION" 2>/dev/null || echo "")

    if [[ -n "$api_endpoint" ]]; then
        log "Running health check on API endpoint..."
        if curl -sf "$api_endpoint/health" > /dev/null; then
            success "API health check passed"
        else
            warning "API health check failed - this may be expected during initial deployment"
        fi
    fi

    success "Deployment validation completed"
}

# Rollback function
rollback_deployment() {
    if [[ "${DRY_RUN:-}" == "true" ]]; then
        log "DRY RUN: Would rollback deployment"
        return 0
    fi

    log "Rolling back deployment..."

    # Rollback stacks in reverse order
    local stacks=("$STACK_PREFIX-monitoring" "$STACK_PREFIX-compute" "$STACK_PREFIX-database" "$STACK_PREFIX-security")
    
    for stack in "${stacks[@]}"; do
        log "Rolling back stack: $stack"
        aws cloudformation cancel-update-stack --stack-name "$stack" --region "$AWS_REGION" 2>/dev/null || true
        
        # Wait a moment for cancellation to process
        sleep 10
        
        # Check if we can rollback
        local status
        status=$(aws cloudformation describe-stacks \
            --stack-name "$stack" \
            --query "Stacks[0].StackStatus" \
            --output text \
            --region "$AWS_REGION" 2>/dev/null || echo "NOT_FOUND")

        if [[ "$status" == "UPDATE_ROLLBACK_COMPLETE" || "$status" == "CREATE_COMPLETE" ]]; then
            success "Stack $stack rollback completed"
        elif [[ "$status" == "UPDATE_IN_PROGRESS" ]]; then
            log "Waiting for stack $stack to finish updating before rollback..."
            aws cloudformation wait stack-update-complete --stack-name "$stack" --region "$AWS_REGION"
        fi
    done

    success "Rollback completed"
}

# Main deployment function
main() {
    log "Starting Basketball League Platform Production Deployment"
    log "Environment: $ENVIRONMENT"
    log "Region: $AWS_REGION"
    log "Stack Prefix: $STACK_PREFIX"

    if [[ "${ROLLBACK:-}" == "true" ]]; then
        rollback_deployment
        exit 0
    fi

    # Run pre-flight checks
    preflight_checks

    # Get CloudFront distribution ID
    local cloudfront_id
    cloudfront_id=$(get_cloudfront_id)

    # Phase 1: Security Infrastructure
    log "=== Phase 1: Security Infrastructure ==="
    deploy_stack \
        "$STACK_PREFIX-security" \
        "ops/aws/security-config.yml" \
        "Environment=$ENVIRONMENT CloudFrontDistributionId=$cloudfront_id" \
        "CAPABILITY_IAM"

    # Phase 2: Database Infrastructure
    log "=== Phase 2: Database Infrastructure ==="
    deploy_stack \
        "$STACK_PREFIX-database" \
        "ops/aws/rds-config.yml" \
        "Environment=$ENVIRONMENT MasterPassword=$MASTER_DB_PASSWORD" \
        "CAPABILITY_IAM"

    # Wait for database to be available
    if [[ "${DRY_RUN:-}" != "true" ]]; then
        log "Waiting for database to be available..."
        aws cloudformation wait stack-create-complete \
            --stack-name "$STACK_PREFIX-database" \
            --region "$AWS_REGION"
    fi

    # Phase 3: Compute Infrastructure  
    log "=== Phase 3: Compute Infrastructure ==="
    deploy_stack \
        "$STACK_PREFIX-compute" \
        "ops/aws/auto-scaling.yml" \
        "Environment=$ENVIRONMENT KeyName=$EC2_KEY_NAME" \
        "CAPABILITY_IAM"

    # Phase 4: Monitoring Infrastructure
    log "=== Phase 4: Monitoring Infrastructure ==="
    deploy_stack \
        "$STACK_PREFIX-monitoring" \
        "ops/monitoring/cloudwatch-config.yml" \
        "Environment=$ENVIRONMENT AlertingEmail=$ALERTING_EMAIL SlackWebhookUrl=$SLACK_WEBHOOK_URL" \
        "CAPABILITY_IAM"

    # Phase 5: Application Deployment
    log "=== Phase 5: Application Deployment ==="
    build_and_push_images
    run_migrations

    # Phase 6: Validation
    log "=== Phase 6: Deployment Validation ==="
    validate_deployment

    success "Basketball League Platform deployment completed successfully!"
    
    # Output important information
    echo ""
    log "=== Deployment Information ==="
    
    if [[ "${DRY_RUN:-}" != "true" ]]; then
        echo "CloudWatch Dashboard: https://console.aws.amazon.com/cloudwatch/home?region=$AWS_REGION#dashboards:name=$ENVIRONMENT-basketball-platform-overview"
        echo "Tournament Dashboard: https://console.aws.amazon.com/cloudwatch/home?region=$AWS_REGION#dashboards:name=$ENVIRONMENT-tournament-day-monitoring"
        
        # Get endpoints if available
        local api_endpoint
        api_endpoint=$(aws cloudformation describe-stacks \
            --stack-name "$STACK_PREFIX-compute" \
            --query "Stacks[0].Outputs[?OutputKey=='APIEndpoint'].OutputValue" \
            --output text \
            --region "$AWS_REGION" 2>/dev/null || echo "Not available yet")
        echo "API Endpoint: $api_endpoint"
    fi
    
    echo ""
    log "=== Next Steps ==="
    echo "1. Configure DNS records to point to the load balancer"
    echo "2. Set up SSL certificates for custom domains"
    echo "3. Configure application-specific settings"
    echo "4. Run load tests to validate performance"
    echo "5. Set up monitoring dashboards and alerts"
    echo ""
    
    warning "Remember to:"
    echo "- Update DNS records"
    echo "- Configure SSL certificates"
    echo "- Test all functionality"
    echo "- Review security settings"
    echo "- Set up backup procedures"
}

# Parse arguments and run main function
parse_args "$@"
main