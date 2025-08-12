# Stripe API Key Rotation Runbook

## Overview
This runbook describes the process for rotating Stripe API keys (both publishable and secret keys) with zero downtime.

## Prerequisites
- Access to Stripe Dashboard (Admin role)
- Access to production environment variables
- Ability to deploy API and frontend services
- Test Stripe account for validation

## Rotation Schedule
- **Regular Rotation**: Every 180 days
- **Emergency Rotation**: Immediately upon compromise
- **TTL**: Keys do not expire but should be rotated regularly

## Pre-Rotation Checklist
- [ ] Verify current Stripe integration is working
- [ ] Check webhook endpoint signatures
- [ ] Ensure payment processing is stable
- [ ] Review recent transaction logs
- [ ] Coordinate with Finance team

## Zero-Downtime Rotation Procedure

### Phase 1: Create New Keys (Day 1)
1. Log into Stripe Dashboard
2. Navigate to Developers > API Keys
3. Generate new secret key:
   - Click "Create secret key"
   - Name it with rotation date: `prod-api-2024-01-15`
   - Set appropriate permissions

4. Create restricted keys if needed:
   - Limit scope to required resources
   - Document permission sets

5. Update webhook signing secret:
   - Navigate to Webhooks
   - Create new endpoint or update existing
   - Note new signing secret

### Phase 2: Dual Key Deployment
1. Update environment configuration:
   ```
   STRIPE_SECRET_KEY_CURRENT=sk_live_current...
   STRIPE_SECRET_KEY_NEW=sk_live_new...
   STRIPE_PUBLISHABLE_KEY=pk_live_...
   STRIPE_WEBHOOK_SECRET_CURRENT=whsec_current...
   STRIPE_WEBHOOK_SECRET_NEW=whsec_new...
   STRIPE_KEY_ROTATION_START=<ISO-8601-date>
   ```

2. Deploy API with dual-key support:
   ```javascript
   // Stripe client initialization
   const stripe = initStripeWithFallback({
     primary: process.env.STRIPE_SECRET_KEY_NEW,
     fallback: process.env.STRIPE_SECRET_KEY_CURRENT
   });
   ```

3. Update webhook validation to accept both signatures

### Phase 3: Test New Keys
1. Run test transactions in production:
   ```bash
   # Create test charge
   curl https://api.stripe.com/v1/charges \
     -u sk_live_new...: \
     -d amount=100 \
     -d currency=usd \
     -d source=tok_visa \
     -d description="Rotation test"
   ```

2. Verify webhook processing with new signature
3. Test refunds and subscriptions
4. Monitor error rates

### Phase 4: Complete Migration (Day 2-3)
1. Monitor Stripe Dashboard for API key usage
2. Once confident, remove old key support:
   ```
   STRIPE_SECRET_KEY=sk_live_new...
   STRIPE_WEBHOOK_SECRET=whsec_new...
   ```

3. Deploy final configuration
4. Revoke old keys in Stripe Dashboard

## Emergency Rotation Procedure
1. **IMMEDIATE**: Revoke compromised key in Stripe Dashboard
2. Generate new keys immediately
3. Deploy emergency update (accept brief downtime)
4. Audit all recent API calls:
   ```bash
   # Review Stripe logs
   stripe logs tail --live
   ```
5. Check for unauthorized charges/refunds
6. Notify Stripe support of compromise

## Rollback Plan
1. If payment failures detected:
   - Revert to old keys immediately
   - Check Stripe API status
   - Verify network connectivity

2. Re-enable old keys in Stripe Dashboard
3. Investigate root cause
4. Document incident

## Impact Assessment
- **Payment Processing**: No impact with dual-key approach
- **Webhook Processing**: May have duplicate events during transition
- **Subscription Billing**: No impact
- **Customer Experience**: Transparent rotation

## Testing Procedures
1. Test payment flow:
   - Create payment intent
   - Process payment
   - Handle 3D Secure
   - Process refund

2. Test webhook handling:
   - Trigger test events
   - Verify signature validation
   - Check idempotency

3. Test subscription operations:
   - Create subscription
   - Update payment method
   - Cancel subscription

## Post-Rotation Tasks
- [ ] Remove old keys from codebase
- [ ] Update keys in password manager
- [ ] Delete old keys from Stripe Dashboard
- [ ] Update documentation
- [ ] Schedule next rotation
- [ ] Review Stripe API logs

## Monitoring During Rotation
- Payment success rate: >98%
- Webhook delivery rate: 100%
- API error rate: <0.5%
- Response times: <500ms p95

## Communication Plan
1. **T-14 days**: Notify Finance and Support teams
2. **T-7 days**: Technical team preparation
3. **T-1 day**: Final checks, freeze non-critical changes
4. **T+0**: Begin rotation
5. **T+3 days**: Rotation complete, resume normal operations

## Required Environment Variables
- `STRIPE_SECRET_KEY`
- `STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_SECRET_KEY_CURRENT` (during rotation)
- `STRIPE_SECRET_KEY_NEW` (during rotation)
- `STRIPE_WEBHOOK_SECRET_CURRENT` (during rotation)
- `STRIPE_WEBHOOK_SECRET_NEW` (during rotation)
- `STRIPE_KEY_ROTATION_START` (during rotation)

## Stripe-Specific Considerations
- API version compatibility
- Webhook API version pinning
- Test mode vs Live mode keys
- Restricted key permissions
- Connected account implications