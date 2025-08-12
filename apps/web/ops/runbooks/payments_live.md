# Live Payments Runbook

## Overview
This runbook covers the deployment, monitoring, and incident response procedures for the live payments system using Stripe.

## Table of Contents
1. [Pre-deployment Checklist](#pre-deployment-checklist)
2. [Deployment Procedure](#deployment-procedure)
3. [Health Checks](#health-checks)
4. [Monitoring & Alerts](#monitoring--alerts)
5. [Rollback Procedures](#rollback-procedures)
6. [Incident Response](#incident-response)
7. [Common Issues](#common-issues)
8. [Contact Information](#contact-information)

## Pre-deployment Checklist

### Business Requirements
- [ ] Legal approval for payment processing in target regions
- [ ] PCI compliance attestation completed
- [ ] Terms of Service updated with payment terms
- [ ] Privacy Policy updated with payment data handling

### Technical Requirements
- [ ] Stripe account verified and activated
- [ ] Bank account connected and verified
- [ ] Webhook endpoints configured and tested
- [ ] SSL certificates valid (minimum 90 days)
- [ ] Rate limiting configured (100 req/min per user)
- [ ] Database backups tested and verified

### Security Requirements
- [ ] API keys rotated within last 30 days
- [ ] Webhook signatures validated
- [ ] HTTPS enforced on all payment endpoints
- [ ] PCI DSS compliance scan passed
- [ ] Security headers configured (HSTS, CSP, etc.)

## Deployment Procedure

### Step 1: Enable Feature Flag (Staging)
```bash
# Update feature flag to 10% rollout
curl -X PATCH https://api.gametriq.com/v1/flags/payments_live_v1 \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"environments":{"staging":{"rollout":{"value":10}}}}'
```

### Step 2: Verify Webhook Configuration
```bash
# Test webhook endpoint
stripe listen --forward-to https://staging.gametriq.com/api/webhooks/stripe

# Trigger test events
stripe trigger payment_intent.succeeded
stripe trigger payment_intent.payment_failed
stripe trigger charge.dispute.created
```

### Step 3: Database Migration
```sql
-- Verify payment tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'payment%';

-- Check for pending migrations
SELECT * FROM schema_migrations 
WHERE version > (SELECT MAX(version) FROM schema_migrations WHERE applied = true);
```

### Step 4: Deploy to Production
```bash
# Tag release
git tag -a v1.5.0-payments -m "Enable live payments"
git push origin v1.5.0-payments

# Deploy using CI/CD
./deploy.sh production v1.5.0-payments

# Verify deployment
curl https://api.gametriq.com/health/payments
```

### Step 5: Progressive Rollout
```bash
# Monitor for 1 hour at 1%
./scripts/monitor-payments.sh --duration 1h --threshold 1

# Increase to 10%
curl -X PATCH https://api.gametriq.com/v1/flags/payments_live_v1 \
  -d '{"environments":{"production":{"rollout":{"value":10}}}}'

# Monitor for 24 hours
./scripts/monitor-payments.sh --duration 24h --threshold 10

# Full rollout
curl -X PATCH https://api.gametriq.com/v1/flags/payments_live_v1 \
  -d '{"environments":{"production":{"rollout":{"value":100}}}}'
```

## Health Checks

### Primary Health Endpoint
```bash
GET https://api.gametriq.com/health/payments
```

Expected Response:
```json
{
  "status": "healthy",
  "timestamp": "2025-08-10T12:00:00Z",
  "checks": {
    "stripe_api": "connected",
    "webhook_endpoint": "verified",
    "database": "connected",
    "redis": "connected",
    "feature_flag": "enabled"
  },
  "metrics": {
    "response_time_ms": 45,
    "transactions_per_minute": 125,
    "success_rate": 0.998
  }
}
```

### Stripe Connection Test
```bash
# Test Stripe API connectivity
curl -X POST https://api.gametriq.com/api/payments/test \
  -H "Authorization: Bearer $SERVICE_TOKEN" \
  -d '{"amount":100,"currency":"usd"}'
```

### Database Health
```sql
-- Check payment processing lag
SELECT 
  MAX(created_at) as last_payment,
  EXTRACT(EPOCH FROM (NOW() - MAX(created_at))) as seconds_since_last
FROM payments
WHERE status = 'completed';

-- Alert if > 300 seconds
```

## Monitoring & Alerts

### Key Metrics

| Metric | Threshold | Alert Level | Response Time |
|--------|-----------|-------------|---------------|
| Payment Success Rate | < 95% | Critical | Immediate |
| API Response Time | > 500ms | Warning | 15 minutes |
| Webhook Processing Time | > 3s | Warning | 15 minutes |
| Failed Payments/Hour | > 50 | Critical | Immediate |
| Dispute Rate | > 1% | Warning | 1 hour |
| Refund Rate | > 5% | Warning | 1 hour |

### Alert Configuration
```yaml
# prometheus-rules.yml
groups:
  - name: payments
    rules:
      - alert: PaymentSuccessRateLow
        expr: rate(payment_success_total[5m]) / rate(payment_attempts_total[5m]) < 0.95
        for: 5m
        labels:
          severity: critical
          team: payments
        annotations:
          summary: "Payment success rate below 95%"
          
      - alert: StripeWebhookDelay
        expr: histogram_quantile(0.99, stripe_webhook_duration_seconds) > 3
        for: 10m
        labels:
          severity: warning
```

### Dashboard Links
- [Payment Metrics Dashboard](https://monitoring.gametriq.com/dashboards/payments)
- [Stripe Dashboard](https://dashboard.stripe.com)
- [Error Tracking](https://sentry.gametriq.com/projects/payments)

## Rollback Procedures

### Immediate Rollback (Kill Switch)
```bash
# Disable payments feature flag immediately
curl -X POST https://api.gametriq.com/api/flags/payments_live_v1/kill \
  -H "Authorization: Bearer $EMERGENCY_TOKEN"

# Verify disabled
curl https://api.gametriq.com/api/flags/payments_live_v1/status
```

### Gradual Rollback
```bash
# Reduce to 50%
./scripts/rollback-payments.sh --percentage 50

# Monitor for 30 minutes
sleep 1800

# Reduce to 10%
./scripts/rollback-payments.sh --percentage 10

# Full rollback
./scripts/rollback-payments.sh --percentage 0
```

### Database Rollback
```sql
-- Mark recent payments for review
UPDATE payments 
SET status = 'pending_review', 
    updated_at = NOW(),
    review_reason = 'system_rollback'
WHERE created_at > NOW() - INTERVAL '1 hour'
AND status = 'completed';

-- Notify finance team
INSERT INTO audit_log (event_type, details, created_at)
VALUES ('payment_rollback', 
  jsonb_build_object('affected_count', count(*), 'reason', 'emergency_rollback'),
  NOW());
```

## Incident Response

### Severity Levels

| Level | Description | Response Time | Escalation |
|-------|-------------|---------------|------------|
| P1 | Complete payment failure | < 5 minutes | CTO, VP Engineering |
| P2 | Degraded performance (>10% failures) | < 15 minutes | Payment Team Lead |
| P3 | Minor issues (<5% impact) | < 1 hour | On-call Engineer |
| P4 | Non-critical issues | < 4 hours | Ticket System |

### Response Procedures

#### P1 - Complete Payment Failure
1. **Immediate Actions** (0-5 minutes)
   ```bash
   # Activate kill switch
   ./scripts/payments-kill-switch.sh
   
   # Page on-call team
   ./scripts/page-oncall.sh --severity P1 --service payments
   
   # Create incident channel
   ./scripts/create-incident.sh --title "Payment System Failure" --severity P1
   ```

2. **Assessment** (5-15 minutes)
   - Check Stripe status page
   - Review error logs
   - Verify database connectivity
   - Check recent deployments

3. **Mitigation** (15-30 minutes)
   - Rollback if deployment-related
   - Switch to backup payment processor (if available)
   - Enable maintenance mode with user notification

4. **Communication**
   - Update status page
   - Send customer notifications
   - Internal stakeholder updates every 30 minutes

#### P2 - Degraded Performance
1. **Triage** (0-15 minutes)
   ```bash
   # Check error rates
   ./scripts/check-payment-errors.sh --window 15m
   
   # Identify affected users
   SELECT COUNT(DISTINCT user_id) 
   FROM payment_attempts 
   WHERE status = 'failed' 
   AND created_at > NOW() - INTERVAL '15 minutes';
   ```

2. **Mitigation**
   - Reduce traffic to affected region
   - Increase retry intervals
   - Enable circuit breaker if needed

## Common Issues

### Issue: Webhook Signature Validation Failures
**Symptoms:**
- Webhook events not processing
- `invalid_signature` errors in logs

**Resolution:**
```bash
# Verify webhook secret
echo $STRIPE_WEBHOOK_SECRET | base64 -d

# Update webhook secret
kubectl set secret stripe-webhook --from-literal=secret=$NEW_SECRET

# Restart webhook processor
kubectl rollout restart deployment/webhook-processor
```

### Issue: Payment Timeouts
**Symptoms:**
- Payments taking >30 seconds
- Customer complaints about hanging payments

**Resolution:**
1. Check Stripe API status
2. Verify network connectivity
3. Scale payment workers:
   ```bash
   kubectl scale deployment/payment-worker --replicas=10
   ```
4. Implement request coalescing

### Issue: Duplicate Charges
**Symptoms:**
- Multiple charges for single purchase
- Customer complaints

**Resolution:**
1. Implement idempotency keys:
   ```javascript
   const payment = await stripe.paymentIntents.create({
     amount: 1000,
     currency: 'usd',
     idempotency_key: `${userId}-${orderId}-${timestamp}`
   });
   ```
2. Add database constraints
3. Issue refunds for duplicates

## Contact Information

### Escalation Chain
1. **On-Call Engineer**: Via PagerDuty
2. **Payment Team Lead**: payments-lead@gametriq.com
3. **VP Engineering**: vp-eng@gametriq.com
4. **CTO**: cto@gametriq.com

### External Contacts
- **Stripe Support**: +1-888-926-2289
- **Stripe Technical Account Manager**: tam@stripe.com
- **Bank Technical Support**: bank-tech@partner.com

### Internal Resources
- Slack: #payments-oncall
- Wiki: https://wiki.gametriq.com/payments
- Runbook Updates: https://github.com/gametriq/runbooks

---

**Last Updated**: 2025-08-10
**Version**: 1.0.0
**Owner**: DevOps Team
**Review Schedule**: Monthly