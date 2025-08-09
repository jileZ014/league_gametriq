# MVP Access Pack - Deployment Instructions

## Prerequisites

- Node.js 20+ and npm 9+
- AWS CLI configured
- Kubernetes CLI (kubectl)
- PostgreSQL client
- Redis client
- Playwright installed for screenshots

## Step 1: Environment Setup

```bash
# Clone repository
git clone https://github.com/gametriq/league-platform.git
cd league-platform

# Install dependencies
npm install
npm run bootstrap

# Set environment variables
cp .env.example .env.staging
# Edit .env.staging with staging values from deployment/staging.config.ts
```

## Step 2: Database Setup

```bash
# Connect to staging database
psql -h rds-staging.amazonaws.com -U gametriq -d gametriq

# Run migrations
npm run migrate:staging

# Load Phoenix Flight demo data
psql -h rds-staging.amazonaws.com -U gametriq -d gametriq < database/seeds/phoenix-flight-demo.sql

# Verify data
psql -h rds-staging.amazonaws.com -U gametriq -d gametriq -c "SELECT COUNT(*) FROM organizations WHERE id = 'org-phoenix-flight';"
# Should return 1
```

## Step 3: Deploy Services

```bash
# Build all services
npm run build:all

# Deploy to staging
npm run deploy:staging

# This will:
# 1. Build Docker images
# 2. Push to ECR
# 3. Deploy to EKS cluster
# 4. Update ingress rules
# 5. Configure CDN
```

## Step 4: Verify Deployment

```bash
# Check pod status
kubectl get pods -n gametriq-staging

# All pods should be Running
# Expected output:
# auth-service-xxx         2/2     Running
# user-service-xxx         2/2     Running
# team-service-xxx         2/2     Running
# schedule-service-xxx     2/2     Running
# game-service-xxx         2/2     Running
# payment-service-xxx      2/2     Running
# notification-service-xxx 2/2     Running
# reporting-service-xxx    2/2     Running

# Check service health
curl https://staging.gametriq.app/health
# Should return: {"status":"healthy","services":8}
```

## Step 5: Configure Feature Flags

```bash
# Enable all Sprint 4 features
curl -X POST https://staging.gametriq.app/api/v1/admin/features \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "public_portal_v1": { "enabled": true, "rollout": 100 },
    "playoffs_v1": { "enabled": true, "rollout": 100 },
    "ref_assign_v1": { "enabled": true, "rollout": 100 },
    "reports_v1": { "enabled": true, "rollout": 100 },
    "ops_hardening_v1": { "enabled": true }
  }'
```

## Step 6: Validate ICS Export

```bash
# Test ICS generation
curl https://staging.gametriq.app/api/v1/public/teams/suns/schedule.ics \
  -o phoenix-suns-schedule.ics

# Validate ICS file
npm run validate:ics phoenix-suns-schedule.ics

# Should output:
# ✓ Valid ICS file
# ✓ 10 events found
# ✓ Phoenix timezone configured
# ✓ All required fields present
```

## Step 7: Generate Screenshots

```bash
# Install Playwright browsers
npx playwright install

# Run screenshot automation
npm run screenshots:generate

# This will:
# 1. Navigate through all demo scenarios
# 2. Capture 30 screenshots
# 3. Save to docs/phase3/demos/screenshots/
# 4. Generate index.md

# Verify screenshots
ls -la docs/phase3/demos/screenshots/*.png | wc -l
# Should output: 30
```

## Step 8: Generate PDF Storyboard

```bash
# Install PDF dependencies
npm install pdfkit

# Generate storyboard
node docs/phase3/demos/screenshot-storyboard-generator.js

# Output: docs/phase3/demos/MVP-Storyboard.pdf
# File size should be ~5-10MB
```

## Step 9: Performance Testing

```bash
# Run load test
npm run test:load:staging

# Expected results:
# - Public portal: <120ms P95
# - API endpoints: <100ms P95
# - WebSocket: <50ms P95
# - Concurrent users: 500+
# - Error rate: <0.1%
```

## Step 10: Security Validation

```bash
# Run security scan
npm run security:scan:staging

# Check for PII in logs
npm run pii:scan:staging

# Should output:
# ✓ No PII found in logs
# ✓ All sensitive data encrypted
# ✓ COPPA compliance verified
```

## Step 11: Backup Test

```bash
# Trigger manual backup
npm run backup:staging:manual

# Verify backup
aws s3 ls s3://gametriq-staging-backups/
# Should show recent backup file

# Test restore (to separate DB)
npm run restore:staging:test
# Verify data integrity
```

## Step 12: Final Validation

```bash
# Run full E2E test suite
npm run test:e2e:staging

# All tests should pass:
# ✓ Public portal access
# ✓ Tournament bracket generation
# ✓ Officials assignment
# ✓ Report generation
# ✓ ICS export
# ✓ Mobile responsiveness
```

## Monitoring URLs

- **Application**: https://staging.gametriq.app/phoenix-flight
- **Grafana**: https://monitoring.gametriq.app/staging
- **CloudWatch**: https://console.aws.amazon.com/cloudwatch
- **Sentry**: https://sentry.io/organizations/gametriq

## Troubleshooting

### Database Connection Issues
```bash
# Check RDS status
aws rds describe-db-instances --db-instance-identifier gametriq-staging

# Test connection
psql -h rds-staging.amazonaws.com -U gametriq -d gametriq -c "SELECT 1;"
```

### Pod Crashes
```bash
# Check pod logs
kubectl logs -n gametriq-staging [pod-name] --tail=100

# Describe pod
kubectl describe pod -n gametriq-staging [pod-name]
```

### CDN Issues
```bash
# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id E1234567890ABC \
  --paths "/*"
```

### Feature Flag Issues
```bash
# Check current flags
curl https://staging.gametriq.app/api/v1/features

# Reset flags
npm run features:reset:staging
```

## Rollback Procedure

If issues occur:

```bash
# Rollback to previous version
npm run rollback:staging

# This will:
# 1. Revert Kubernetes deployments
# 2. Restore previous DB backup
# 3. Clear CDN cache
# 4. Notify team

# Verify rollback
curl https://staging.gametriq.app/version
```

## Success Criteria

✅ All services healthy
✅ Demo data loaded
✅ Public portal accessible
✅ Bracket generation working
✅ Officials assignment functional
✅ ICS export validated
✅ Screenshots generated
✅ PDF storyboard created
✅ Performance targets met
✅ Security scans passed
✅ Backup/restore tested

## Support

- **Technical Issues**: tech@gametriq.app
- **Deployment Support**: devops@gametriq.app
- **Slack Channel**: #deployment-support
- **On-Call**: +1-602-555-0911

---

**Last Updated**: March 2024
**Version**: 4.2.0
**Sprint**: 4 Complete