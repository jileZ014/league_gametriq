# Production Deployment Guide
# Basketball League Platform - Legacy Youth Sports

## Overview
This guide provides step-by-step instructions for deploying the basketball league platform to production with all scalability and security enhancements.

## Prerequisites

### AWS Account Setup
1. AWS CLI v2 configured with appropriate permissions
2. Terraform >= 1.0 or CloudFormation CLI
3. Docker installed and configured
4. kubectl configured for EKS (if using Kubernetes)

### Required AWS Permissions
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ec2:*",
        "autoscaling:*",
        "elasticloadbalancing:*",
        "rds:*",
        "wafv2:*",
        "cloudwatch:*",
        "logs:*",
        "sns:*",
        "lambda:*",
        "iam:*",
        "secretsmanager:*",
        "ssm:*"
      ],
      "Resource": "*"
    }
  ]
}
```

## Deployment Order

### Phase 1: Infrastructure Foundation
Deploy in this exact order to ensure proper dependencies:

#### 1.1 Network Infrastructure (if not existing)
```bash
# Deploy VPC, subnets, security groups
aws cloudformation create-stack \
  --stack-name basketball-platform-network \
  --template-body file://ops/aws/network-config.yml \
  --parameters ParameterKey=Environment,ParameterValue=production
```

#### 1.2 Security Configuration
```bash
# Deploy WAF and security rules
aws cloudformation create-stack \
  --stack-name basketball-platform-security \
  --template-body file://ops/aws/security-config.yml \
  --parameters \
    ParameterKey=Environment,ParameterValue=production \
    ParameterKey=CloudFrontDistributionId,ParameterValue=YOUR_CLOUDFRONT_ID \
  --capabilities CAPABILITY_IAM
```

#### 1.3 Database Deployment
```bash
# Deploy Aurora PostgreSQL cluster with read replicas
aws cloudformation create-stack \
  --stack-name basketball-platform-database \
  --template-body file://ops/aws/rds-config.yml \
  --parameters \
    ParameterKey=Environment,ParameterValue=production \
    ParameterKey=MasterPassword,ParameterValue=SECURE_PASSWORD_HERE \
  --capabilities CAPABILITY_IAM

# Wait for database to be available
aws cloudformation wait stack-create-complete \
  --stack-name basketball-platform-database
```

### Phase 2: Application Infrastructure

#### 2.1 Auto-Scaling Groups
```bash
# Deploy auto-scaling configuration
aws cloudformation create-stack \
  --stack-name basketball-platform-compute \
  --template-body file://ops/aws/auto-scaling.yml \
  --parameters \
    ParameterKey=Environment,ParameterValue=production \
    ParameterKey=KeyName,ParameterValue=YOUR_EC2_KEY_PAIR \
  --capabilities CAPABILITY_IAM
```

#### 2.2 Monitoring and Alerting
```bash
# Deploy comprehensive monitoring
aws cloudformation create-stack \
  --stack-name basketball-platform-monitoring \
  --template-body file://ops/monitoring/cloudwatch-config.yml \
  --parameters \
    ParameterKey=Environment,ParameterValue=production \
    ParameterKey=AlertingEmail,ParameterValue=ops@legacyyouthsports.com \
    ParameterKey=SlackWebhookUrl,ParameterValue=YOUR_SLACK_WEBHOOK \
  --capabilities CAPABILITY_IAM
```

### Phase 3: Application Deployment

#### 3.1 Build and Push Docker Images
```bash
# API Service
cd apps/api
docker build -t basketball-api:latest .
docker tag basketball-api:latest $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/basketball-api:latest
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/basketball-api:latest

# Web Application
cd ../web
docker build -t basketball-web:latest .
docker tag basketball-web:latest $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/basketball-web:latest
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/basketball-web:latest
```

#### 3.2 Database Migrations
```bash
# Run database migrations
export DATABASE_URL="postgresql://username:password@aurora-cluster-endpoint:5432/basketball_league"
cd apps/api
npm run migration:run
```

#### 3.3 Environment Configuration
Create production environment files:

**apps/api/.env.production**
```bash
NODE_ENV=production
DATABASE_URL=postgresql://username:password@aurora-cluster-endpoint:5432/basketball_league
DATABASE_REPLICA_URL=postgresql://username:password@aurora-reader-endpoint:5432/basketball_league
REDIS_URL=redis://elasticache-cluster-endpoint:6379
JWT_SECRET=your-secure-jwt-secret
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
AWS_REGION=us-west-2
COPPA_COMPLIANCE_MODE=strict
SECURITY_ENABLE_CSP=true
SECURITY_ENABLE_AUDIT_LOGGING=true
```

**apps/web/.env.production**
```bash
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://api.legacyyouthsports.com
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
NEXT_PUBLIC_ENVIRONMENT=production
```

## Configuration Validation

### Pre-Deployment Checklist

#### Security Checklist
- [ ] WAF rules configured and tested
- [ ] SSL certificates installed and configured
- [ ] Security headers enabled
- [ ] COPPA compliance features activated
- [ ] Rate limiting configured
- [ ] IP reputation checking enabled

#### Performance Checklist
- [ ] Auto-scaling groups configured
- [ ] Database read replicas deployed
- [ ] Connection pooling configured
- [ ] CDN configured for static assets
- [ ] Circuit breakers implemented

#### Monitoring Checklist
- [ ] CloudWatch alarms configured
- [ ] SNS notifications set up
- [ ] Dashboards created
- [ ] Log aggregation configured
- [ ] Business metrics tracking enabled

### Deployment Validation Scripts

#### Health Check Script
```bash
#!/bin/bash
# health-check.sh

echo "Running production health checks..."

# Check API health
API_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" https://api.legacyyouthsports.com/health)
if [ $API_HEALTH -eq 200 ]; then
    echo "✅ API health check passed"
else
    echo "❌ API health check failed (HTTP $API_HEALTH)"
    exit 1
fi

# Check database connectivity
DB_CHECK=$(curl -s -o /dev/null -w "%{http_code}" https://api.legacyyouthsports.com/health/database)
if [ $DB_CHECK -eq 200 ]; then
    echo "✅ Database connectivity check passed"
else
    echo "❌ Database connectivity check failed"
    exit 1
fi

# Check security headers
SECURITY_HEADERS=$(curl -s -I https://legacyyouthsports.com | grep -c "X-Content-Type-Options\|X-Frame-Options\|Strict-Transport-Security")
if [ $SECURITY_HEADERS -ge 3 ]; then
    echo "✅ Security headers check passed"
else
    echo "❌ Security headers check failed"
    exit 1
fi

echo "All health checks passed!"
```

#### Load Test Script
```bash
#!/bin/bash
# load-test.sh

echo "Running production load test..."

# Install dependencies
pip install locust

# Run load test
locust -f tests/load/tournament-day-load.py \
  --host=https://legacyyouthsports.com \
  --users=1000 \
  --spawn-rate=50 \
  --run-time=300s \
  --headless
```

## Post-Deployment Tasks

### 1. Monitoring Setup
```bash
# Verify all alarms are active
aws cloudwatch describe-alarms --state-value INSUFFICIENT_DATA
aws cloudwatch describe-alarms --state-value OK

# Test alert notifications
aws sns publish \
  --topic-arn arn:aws:sns:region:account:basketball-platform-critical-alerts \
  --message "Test deployment alert"
```

### 2. Performance Baseline
```bash
# Establish performance baselines
curl -w "@curl-format.txt" -s -o /dev/null https://api.legacyyouthsports.com/api/tournaments
curl -w "@curl-format.txt" -s -o /dev/null https://legacyyouthsports.com/portal
```

### 3. Security Validation
```bash
# Run security scans
nmap -sS -A api.legacyyouthsports.com
nikto -h https://legacyyouthsports.com

# Check SSL configuration
sslyze --regular api.legacyyouthsports.com
```

## Rollback Procedures

### Emergency Rollback
If critical issues are detected:

```bash
# Rollback to previous version
aws autoscaling update-auto-scaling-group \
  --auto-scaling-group-name production-api-tier-asg \
  --launch-template LaunchTemplateName=production-api-tier-template,Version=PREVIOUS

# Scale down if necessary
aws autoscaling set-desired-capacity \
  --auto-scaling-group-name production-api-tier-asg \
  --desired-capacity 3 \
  --honor-cooldown
```

### Database Rollback
```bash
# Point-in-time recovery if needed
aws rds restore-db-cluster-to-point-in-time \
  --db-cluster-identifier basketball-cluster-restored \
  --source-db-cluster-identifier production-basketball-aurora-cluster \
  --restore-to-time "2024-01-15T10:00:00.000Z"
```

## Maintenance Windows

### Scheduled Maintenance
Recommended maintenance windows:
- **Weekly**: Sunday 2:00 AM - 4:00 AM MST (low usage)
- **Monthly**: First Sunday of month 1:00 AM - 5:00 AM MST
- **Emergency**: Any time with 15-minute notification

### Maintenance Tasks
1. Security patches
2. Database optimization
3. Log rotation
4. Certificate renewal
5. Performance tuning

## Production Operations

### Daily Operations
- Monitor CloudWatch dashboards
- Review security logs
- Check error rates
- Validate backup completion

### Weekly Operations  
- Review performance trends
- Analyze cost reports
- Update security rules
- Test disaster recovery

### Monthly Operations
- Security audit
- Performance optimization
- Capacity planning review
- Update documentation

## Contact Information

### Emergency Contacts
- **Primary On-Call**: ops@legacyyouthsports.com
- **Secondary**: tech@legacyyouthsports.com
- **Escalation**: management@legacyyouthsports.com

### Service Level Objectives (SLOs)
- **Availability**: 99.9% uptime
- **Response Time**: < 2 seconds for 95th percentile
- **Error Rate**: < 0.1% for all requests
- **Recovery Time**: < 30 minutes for critical issues

## Success Criteria

The deployment is considered successful when:

- [ ] All health checks pass
- [ ] Auto-scaling is functioning
- [ ] Database read replicas are operational
- [ ] WAF is blocking malicious requests (>99% effectiveness)
- [ ] Security headers pass OWASP checks
- [ ] COPPA compliance audit ready
- [ ] Monitoring covers all critical metrics
- [ ] Circuit breakers prevent cascade failures
- [ ] Load testing shows platform can handle 1000+ concurrent users
- [ ] Tournament day scaling works (Saturday 6 AM surge)

## Troubleshooting

### Common Issues

#### High Database Connections
```bash
# Check connection pool status
SELECT count(*) as total_connections, state FROM pg_stat_activity GROUP BY state;

# Restart connection pooler if needed
aws lambda invoke --function-name production-db-connection-pool response.json
```

#### Auto-Scaling Not Triggering
```bash
# Check CloudWatch metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/EC2 \
  --metric-name CPUUtilization \
  --start-time 2024-01-15T00:00:00Z \
  --end-time 2024-01-15T01:00:00Z \
  --period 300 \
  --statistics Average
```

#### WAF Blocking Legitimate Traffic
```bash
# Review WAF logs
aws logs filter-log-events \
  --log-group-name /aws/wafv2/production-basketball-waf \
  --start-time 1640995200000 \
  --filter-pattern "BLOCK"
```

This completes the production deployment guide. The platform is now ready to handle the Phoenix basketball market scale with proper security, monitoring, and resilience mechanisms in place.