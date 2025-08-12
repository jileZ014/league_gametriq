# API Security Implementation

## Overview

This document describes the security measures implemented in the API, particularly focusing on secret management and webhook verification.

## Secret Management

### Configuration

All secrets are managed through environment variables and accessed via the centralized `config/secrets.ts` module. This ensures:

1. **No hardcoded secrets** in the codebase
2. **Validation** of secret format and presence
3. **Fail-fast** behavior when secrets are missing
4. **Secure access** patterns

### Required Environment Variables

```bash
# JWT Authentication
JWT_SECRET=<minimum 32 character secret>

# Stripe Configuration
STRIPE_TEST_MODE=true|false
STRIPE_TEST_SECRET_KEY=sk_test_...
STRIPE_LIVE_SECRET_KEY=sk_live_...
STRIPE_TEST_WEBHOOK_SECRET=whsec_test_...
STRIPE_LIVE_WEBHOOK_SECRET=whsec_live_...
STRIPE_TEST_PUBLISHABLE_KEY=pk_test_...
STRIPE_LIVE_PUBLISHABLE_KEY=pk_live_...

# Database
DATABASE_PASSWORD=<secure password>

# Redis (optional)
REDIS_PASSWORD=<redis password>
```

### Usage

```typescript
import { getJwtSecret, getStripeSecret, validateSecrets } from './config/secrets';

// Get secrets (throws if not configured)
const jwtSecret = getJwtSecret();
const stripeKey = getStripeSecret(isTestMode);

// Validate all secrets on startup
validateSecrets();
```

## Webhook Security

### Stripe Webhook Verification

All Stripe webhooks are verified using signature validation:

1. **Signature Verification**: Every webhook request must include a valid `stripe-signature` header
2. **Raw Body Parsing**: Webhook endpoints receive raw request bodies for signature verification
3. **Fail Closed**: Any signature verification failure results in request rejection
4. **Idempotency**: Duplicate events are detected and handled appropriately

### Implementation

```typescript
// Webhook endpoint configuration
@Post('webhook/stripe')
async handleStripeWebhook(
  @Headers('stripe-signature') signature: string,
  @Body() rawBody: Buffer,
) {
  // Signature is verified in the service layer
  return this.paymentsService.handleWebhook(signature, rawBody);
}
```

### Main Application Configuration

The webhook endpoint requires special configuration to receive raw bodies:

```typescript
// main.ts
app.use(
  '/payments/webhook/stripe',
  express.raw({ 
    type: 'application/json',
    limit: '10mb'
  })
);
```

## Security Best Practices

### 1. Environment Variable Security
- Never commit `.env` files
- Use secret management services in production (AWS Secrets Manager, Vault, etc.)
- Rotate secrets regularly
- Use different secrets for each environment

### 2. Webhook Security
- Always verify signatures
- Use HTTPS endpoints only
- Implement request timeouts
- Log all webhook events
- Monitor webhook failures

### 3. Error Handling
- Never expose sensitive information in error messages
- Log security events for monitoring
- Implement rate limiting
- Use proper HTTP status codes

### 4. Testing
- Test with invalid signatures
- Test with missing secrets
- Test with malformed requests
- Verify fail-closed behavior

## Testing

Run security tests:

```bash
# Test secret management
npm test tests/api/security/secrets.spec.ts

# Test webhook verification
npm test tests/api/security/webhook.spec.ts
```

## Monitoring

Monitor these security events:
- Failed webhook signature verifications
- Missing environment variables
- Invalid secret formats
- Repeated failed authentication attempts

## Incident Response

If a secret is compromised:
1. Rotate the affected secret immediately
2. Update all services using the secret
3. Review logs for unauthorized access
4. Notify security team
5. Document the incident

## Compliance

This implementation helps meet security requirements for:
- PCI DSS (Payment Card Industry)
- SOC 2
- GDPR (data protection)
- Industry best practices