# JWT Secret Rotation Runbook

## Overview
This runbook describes the process for rotating JWT secrets with zero downtime.

## Prerequisites
- Access to production environment variables
- Ability to deploy API services
- Access to monitoring dashboards
- Communication channels ready (Slack/Teams)

## Rotation Schedule
- **Regular Rotation**: Every 90 days
- **Emergency Rotation**: Immediately upon compromise
- **TTL**: JWT tokens expire after 24 hours

## Pre-Rotation Checklist
- [ ] Verify current JWT secret is working
- [ ] Check token expiration settings
- [ ] Ensure monitoring alerts are active
- [ ] Prepare rollback plan
- [ ] Schedule maintenance window (if needed)

## Zero-Downtime Rotation Procedure

### Phase 1: Dual Key Support (Day 1)
1. Generate new JWT secret:
   ```bash
   openssl rand -base64 64
   ```

2. Update environment configuration to support both keys:
   ```
   JWT_SECRET_CURRENT=<existing-secret>
   JWT_SECRET_NEW=<new-secret>
   JWT_SECRET_ROTATION_DATE=<ISO-8601-date>
   ```

3. Deploy API with dual-key validation:
   - API accepts tokens signed with either key
   - New tokens are signed with NEW key
   - Old tokens remain valid until expiration

4. Monitor authentication metrics:
   - Failed auth attempts
   - Token validation errors
   - Response times

### Phase 2: Monitor Transition (Days 2-3)
1. Track token usage metrics:
   ```sql
   SELECT 
     COUNT(*) as total,
     SUM(CASE WHEN key_version = 'new' THEN 1 ELSE 0 END) as new_key_usage,
     SUM(CASE WHEN key_version = 'old' THEN 1 ELSE 0 END) as old_key_usage
   FROM auth_logs
   WHERE timestamp > NOW() - INTERVAL '24 hours';
   ```

2. Verify new tokens are being issued correctly
3. Check for any authentication failures

### Phase 3: Complete Rotation (Day 4)
1. Once >95% tokens use new key, remove old key support:
   ```
   JWT_SECRET=<new-secret>
   # Remove JWT_SECRET_CURRENT and JWT_SECRET_NEW
   ```

2. Deploy updated configuration
3. Monitor for authentication issues

## Emergency Rotation Procedure
1. **IMMEDIATE**: Block compromised key at WAF level
2. Generate new secret immediately
3. Deploy with ONLY new secret (accept downtime)
4. Force all users to re-authenticate
5. Audit all recent token usage

## Rollback Plan
1. If issues detected during rotation:
   ```
   JWT_SECRET=<original-secret>
   ```
2. Redeploy immediately
3. Investigate root cause
4. Document incident

## Impact Assessment
- **User Impact**: Gradual migration, no forced logouts
- **Service Impact**: No downtime if procedure followed
- **Security Impact**: Reduced exposure window

## Post-Rotation Tasks
- [ ] Remove old secret from all systems
- [ ] Update secret in password manager
- [ ] Document rotation in change log
- [ ] Schedule next rotation
- [ ] Review rotation metrics

## Monitoring During Rotation
- Authentication success rate: >99.5%
- Token validation latency: <50ms p99
- Error rates: <0.1%
- Active sessions: No unexpected drops

## Communication Plan
1. **T-7 days**: Notify team of upcoming rotation
2. **T-1 day**: Final reminder
3. **T+0**: Begin rotation, update status channel
4. **T+3 days**: Rotation complete notification

## Required Environment Variables
- `JWT_SECRET`
- `JWT_SECRET_CURRENT` (during rotation)
- `JWT_SECRET_NEW` (during rotation)
- `JWT_SECRET_ROTATION_DATE` (during rotation)
- `JWT_EXPIRATION`
- `JWT_REFRESH_EXPIRATION`