# Production Deployment Guide

## Overview
This guide provides step-by-step instructions for deploying the Legacy Youth Sports platform to production on AWS.

---

## Prerequisites

### Required Tools
- AWS CLI v2.13+ configured
- Docker 24.0+
- Node.js 18 LTS
- Terraform 1.5+
- kubectl 1.28+
- Helm 3.12+

### AWS Resources Required
- EKS Cluster (Kubernetes 1.28)
- RDS Aurora PostgreSQL 15
- ElastiCache Redis 7.0
- S3 Buckets (assets, backups)
- CloudFront Distribution
- Route53 Hosted Zone
- ACM SSL Certificates

### Access Requirements
- AWS Account with appropriate IAM permissions
- GitHub repository access
- Stripe API keys
- SendGrid API keys
- Monitoring service credentials

---

## Pre-Deployment Checklist

- [ ] All tests passing (95% coverage)
- [ ] Security scan completed
- [ ] Performance benchmarks met
- [ ] Database migrations tested
- [ ] Backup procedures verified
- [ ] Rollback plan documented
- [ ] Monitoring alerts configured
- [ ] Team notified of deployment window

---

## Deployment Steps

### Step 1: Environment Preparation

#### 1.1 Clone Repository
```bash
git clone https://github.com/legacyyouthsports/platform.git
cd platform
git checkout main
git pull origin main
```

#### 1.2 Verify Environment Variables
```bash
# Production environment file
cp .env.production.example .env.production

# Edit with production values
nano .env.production
```

Required environment variables:
```env
# Database
DATABASE_URL=postgresql://user:password@aurora-cluster.region.rds.amazonaws.com:5432/production
DATABASE_POOL_SIZE=20

# Redis
REDIS_URL=redis://elasticache-cluster.region.cache.amazonaws.com:6379
REDIS_PASSWORD=your-redis-password

# AWS
AWS_REGION=us-west-2
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
S3_BUCKET_ASSETS=legacyyouthsports-assets
S3_BUCKET_BACKUPS=legacyyouthsports-backups

# Authentication
JWT_SECRET=your-256-bit-secret
JWT_EXPIRY=7d
REFRESH_TOKEN_SECRET=your-refresh-secret

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLISHABLE_KEY=pk_live_...

# Email
SENDGRID_API_KEY=SG...
FROM_EMAIL=noreply@legacyyouthsports.com

# Monitoring
DATADOG_API_KEY=...
SENTRY_DSN=https://...@sentry.io/...

# Feature Flags
ENABLE_TOURNAMENT_FEATURE=true
ENABLE_REPORTS_FEATURE=true
ENABLE_WEBSOCKET_FEATURE=true
```

### Step 2: Build and Push Docker Images

#### 2.1 Build Images
```bash
# API Service
docker build -t legacyyouthsports/api:v2.0.0 -f apps/api/Dockerfile .
docker build -t legacyyouthsports/api:latest -f apps/api/Dockerfile .

# Web Application
docker build -t legacyyouthsports/web:v2.0.0 -f apps/web/Dockerfile .
docker build -t legacyyouthsports/web:latest -f apps/web/Dockerfile .

# Mobile API
docker build -t legacyyouthsports/mobile-api:v2.0.0 -f apps/mobile/Dockerfile .
```

#### 2.2 Push to ECR
```bash
# Login to ECR
aws ecr get-login-password --region us-west-2 | docker login --username AWS --password-stdin 123456789.dkr.ecr.us-west-2.amazonaws.com

# Tag and push
docker tag legacyyouthsports/api:v2.0.0 123456789.dkr.ecr.us-west-2.amazonaws.com/legacyyouthsports/api:v2.0.0
docker push 123456789.dkr.ecr.us-west-2.amazonaws.com/legacyyouthsports/api:v2.0.0

docker tag legacyyouthsports/web:v2.0.0 123456789.dkr.ecr.us-west-2.amazonaws.com/legacyyouthsports/web:v2.0.0
docker push 123456789.dkr.ecr.us-west-2.amazonaws.com/legacyyouthsports/web:v2.0.0
```

### Step 3: Database Migration

#### 3.1 Backup Existing Database
```bash
# Create backup
aws rds create-db-snapshot \
  --db-instance-identifier legacyyouthsports-prod \
  --db-snapshot-identifier backup-before-v2-deployment-$(date +%Y%m%d%H%M%S)

# Wait for completion
aws rds wait db-snapshot-completed \
  --db-snapshot-identifier backup-before-v2-deployment-...
```

#### 3.2 Run Migrations
```bash
# Connect to production database
export DATABASE_URL=postgresql://...

# Run migrations
npm run migrate:production

# Verify migrations
npm run migrate:status
```

Migration files to run:
- `007_create_tournament_tables.sql`
- `008_create_report_tables.sql`
- `009_performance_indexes.sql`

### Step 4: Deploy Infrastructure

#### 4.1 Update Terraform
```bash
cd infrastructure/terraform/production

# Plan changes
terraform plan -out=tfplan

# Review plan carefully
terraform show tfplan

# Apply changes
terraform apply tfplan
```

#### 4.2 Update Kubernetes Resources
```bash
# Update config
kubectl config use-context eks-legacyyouthsports-prod

# Apply configurations
kubectl apply -f k8s/production/namespace.yaml
kubectl apply -f k8s/production/configmap.yaml
kubectl apply -f k8s/production/secrets.yaml

# Deploy services
kubectl apply -f k8s/production/api-deployment.yaml
kubectl apply -f k8s/production/web-deployment.yaml
kubectl apply -f k8s/production/worker-deployment.yaml

# Update services
kubectl apply -f k8s/production/services/
```

### Step 5: Deploy Application

#### 5.1 Rolling Deployment
```bash
# API Service
kubectl set image deployment/api-deployment \
  api=123456789.dkr.ecr.us-west-2.amazonaws.com/legacyyouthsports/api:v2.0.0 \
  -n production

# Web Application
kubectl set image deployment/web-deployment \
  web=123456789.dkr.ecr.us-west-2.amazonaws.com/legacyyouthsports/web:v2.0.0 \
  -n production

# Monitor rollout
kubectl rollout status deployment/api-deployment -n production
kubectl rollout status deployment/web-deployment -n production
```

#### 5.2 Verify Deployment
```bash
# Check pod status
kubectl get pods -n production

# Check logs
kubectl logs -f deployment/api-deployment -n production

# Run health checks
curl https://api.legacyyouthsports.com/health
curl https://app.legacyyouthsports.com/health
```

### Step 6: Update CDN and DNS

#### 6.1 CloudFront Cache Invalidation
```bash
aws cloudfront create-invalidation \
  --distribution-id E1234567890ABC \
  --paths "/*"
```

#### 6.2 Update Route53 if needed
```bash
# Only if changing load balancer
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890ABC \
  --change-batch file://dns-updates.json
```

### Step 7: Post-Deployment Verification

#### 7.1 Smoke Tests
```bash
# Run production smoke tests
npm run test:production:smoke

# Test critical paths
npm run test:production:critical
```

#### 7.2 Performance Verification
```bash
# Load test with expected traffic
npm run test:load:production

# Verify response times
npm run test:performance:production
```

#### 7.3 Monitoring Checks
- [ ] DataDog dashboards showing metrics
- [ ] CloudWatch alarms active
- [ ] Sentry receiving events
- [ ] Log aggregation working

---

## Rollback Procedures

### Automatic Rollback Triggers
- Health check failures (3 consecutive)
- Error rate > 5%
- Response time > 2 seconds (p95)
- Memory usage > 90%

### Manual Rollback Steps

#### Option 1: Kubernetes Rollback
```bash
# Rollback to previous version
kubectl rollout undo deployment/api-deployment -n production
kubectl rollout undo deployment/web-deployment -n production

# Verify rollback
kubectl rollout status deployment/api-deployment -n production
```

#### Option 2: Blue-Green Switch
```bash
# Switch traffic back to blue environment
kubectl patch service api-service -n production \
  -p '{"spec":{"selector":{"version":"blue"}}}'
```

#### Database Rollback
```bash
# Restore from snapshot
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier legacyyouthsports-prod-restored \
  --db-snapshot-identifier backup-before-v2-deployment

# Switch application to restored database
kubectl set env deployment/api-deployment \
  DATABASE_URL=postgresql://...restored... -n production
```

---

## Monitoring and Alerts

### Key Metrics to Monitor
- **Application Metrics**
  - Request rate
  - Error rate
  - Response time (p50, p95, p99)
  - Active users
  
- **Infrastructure Metrics**
  - CPU utilization
  - Memory usage
  - Disk I/O
  - Network throughput
  
- **Business Metrics**
  - Registration rate
  - Payment success rate
  - Report generation time
  - WebSocket connections

### Alert Thresholds
```yaml
alerts:
  - name: high_error_rate
    condition: error_rate > 1%
    duration: 5m
    severity: warning
    
  - name: critical_error_rate
    condition: error_rate > 5%
    duration: 2m
    severity: critical
    
  - name: slow_response
    condition: p95_latency > 2s
    duration: 5m
    severity: warning
    
  - name: database_connection_pool
    condition: available_connections < 5
    duration: 2m
    severity: critical
```

---

## Scaling Configuration

### Horizontal Pod Autoscaling
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-deployment
  minReplicas: 3
  maxReplicas: 50
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

### Database Connection Scaling
```javascript
// Production pool configuration
const poolConfig = {
  min: 10,
  max: 50,
  acquireTimeoutMillis: 30000,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 5000,
  statementTimeout: 30000,
};
```

---

## Security Considerations

### Pre-deployment Security Checklist
- [ ] SSL certificates valid for 30+ days
- [ ] Secrets rotated within last 90 days
- [ ] Security groups reviewed
- [ ] WAF rules updated
- [ ] DDoS protection enabled
- [ ] Backup encryption verified

### Post-deployment Security Verification
```bash
# Run security scan
npm run security:scan:production

# Check SSL configuration
nmap --script ssl-cert,ssl-enum-ciphers -p 443 api.legacyyouthsports.com

# Verify headers
curl -I https://app.legacyyouthsports.com
```

---

## Troubleshooting

### Common Issues and Solutions

#### Issue: Pods not starting
```bash
# Check events
kubectl describe pod <pod-name> -n production

# Common causes:
# - Image pull errors: Verify ECR permissions
# - Resource limits: Check node capacity
# - Config issues: Verify ConfigMaps/Secrets
```

#### Issue: Database connection errors
```bash
# Test connection
psql $DATABASE_URL -c "SELECT 1"

# Check security group
aws ec2 describe-security-groups --group-ids sg-xxx

# Verify connection pool
kubectl logs deployment/api-deployment -n production | grep "pool"
```

#### Issue: High memory usage
```bash
# Check memory usage
kubectl top pods -n production

# Increase limits if needed
kubectl set resources deployment/api-deployment \
  --limits=memory=2Gi -n production

# Check for memory leaks
kubectl exec -it <pod-name> -n production -- node --inspect
```

---

## Maintenance Windows

### Scheduled Maintenance
- **Weekly**: Tuesday 2-4 AM MST (low traffic)
- **Monthly**: First Sunday 12-6 AM MST (patches)
- **Quarterly**: Announced 2 weeks in advance

### Emergency Maintenance
1. Assess severity and impact
2. Notify stakeholders if > 5 minutes
3. Implement fix
4. Document in incident report
5. Schedule post-mortem

---

## Documentation

### Deployment Log Template
```markdown
## Deployment Log - [Date]

**Version**: v2.0.0
**Deployer**: [Name]
**Start Time**: [Time]
**End Time**: [Time]
**Status**: Success/Failed/Partial

### Changes
- Feature: Tournament management system
- Feature: Automated reporting
- Fix: Performance optimizations
- Update: Security patches

### Issues Encountered
- None / List issues

### Rollback Required
- No / Yes (reason)

### Verification
- [ ] Smoke tests passed
- [ ] Performance metrics normal
- [ ] No critical alerts

### Notes
[Any additional information]
```

---

## Support Contacts

### Escalation Path
1. **On-call Engineer**: Via PagerDuty
2. **Team Lead**: [Phone/Slack]
3. **Platform Architect**: [Phone/Slack]
4. **VP Engineering**: [Phone]

### External Support
- **AWS Support**: Premium support tier
- **Stripe Support**: Priority support
- **SendGrid Support**: Pro support plan

---

**Last Updated**: December 2024
**Version**: 2.0
**Next Review**: March 2025