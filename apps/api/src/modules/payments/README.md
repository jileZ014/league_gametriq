# Stripe Payment Integration

This module provides a complete Stripe payment integration for the Gametriq League App API.

## Features

- **Payment Intent Management**: Create, confirm, and track payment intents
- **Refund Processing**: Handle full and partial refunds with reason codes
- **Webhook Handling**: Process Stripe webhook events securely
- **Payment Methods**: Manage saved payment methods for users
- **Audit Trail**: Complete audit logging for all payment operations
- **Ledger System**: Track all financial transactions
- **PCI Compliance**: No sensitive card data is stored
- **Idempotent Operations**: Prevent duplicate charges
- **Test/Live Mode**: Switch between Stripe environments via feature flag

## Architecture

### Components

1. **PaymentsController**: REST API endpoints for payment operations
2. **PaymentsService**: Business logic for payment processing
3. **StripeService**: Wrapper around Stripe SDK
4. **StripeWebhookHandler**: Webhook event processing
5. **Database Entities**: TypeORM entities for payment data

### Database Schema

- `payments`: Core payment records
- `payment_ledger`: Financial transaction history
- `payment_audit`: Audit trail for all actions
- `stripe_customers`: User to Stripe customer mapping
- `webhook_events`: Webhook event tracking
- `refunds`: Refund records
- `disputes`: Payment dispute management
- `payment_methods`: Cached payment method info (PCI compliant)

## Configuration

### Environment Variables

```env
# Stripe API Keys
STRIPE_TEST_SECRET_KEY=sk_test_...
STRIPE_TEST_PUBLISHABLE_KEY=pk_test_...
STRIPE_LIVE_SECRET_KEY=sk_live_...
STRIPE_LIVE_PUBLISHABLE_KEY=pk_live_...

# Webhook Secrets
STRIPE_TEST_WEBHOOK_SECRET=whsec_test_...
STRIPE_LIVE_WEBHOOK_SECRET=whsec_live_...

# Feature Flags
STRIPE_TEST_MODE=true
```

### Webhook Configuration

Configure your Stripe webhook endpoint to: `https://api.yourdomain.com/payments/webhook/stripe`

Enable the following events:
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `payment_intent.canceled`
- `charge.refunded`
- `charge.dispute.created`
- `customer.created`
- `customer.updated`
- `checkout.session.completed`

## API Endpoints

### Create Payment Intent
```http
POST /payments/create-intent
Authorization: Bearer <token>
Content-Type: application/json

{
  "orderId": "order123",
  "amount": 99.99,
  "currency": "usd",
  "description": "League registration",
  "metadata": {
    "leagueId": "league123",
    "seasonId": "season123"
  }
}
```

### Confirm Payment
```http
POST /payments/confirm/:intentId
Authorization: Bearer <token>
Content-Type: application/json

{
  "paymentMethodId": "pm_1234567890"
}
```

### Process Refund
```http
POST /payments/refund
Authorization: Bearer <token>
Content-Type: application/json

{
  "paymentIntentId": "pi_1234567890",
  "amount": 50.00,
  "reason": "requested_by_customer",
  "description": "Partial refund for cancellation"
}
```

### Get Payment History
```http
GET /payments/history?limit=20&offset=0
Authorization: Bearer <token>
```

## Usage Examples

### Creating a Payment

```typescript
// In your order service
const paymentIntent = await this.paymentsService.createPaymentIntent({
  orderId: order.id,
  amount: order.total,
  currency: 'usd',
  userId: user.id,
  metadata: {
    leagueId: order.leagueId,
    seasonId: order.seasonId,
    items: order.items.map(i => i.id),
  },
  idempotencyKey: `order-${order.id}`,
});

// Return client secret to frontend
return {
  orderId: order.id,
  clientSecret: paymentIntent.clientSecret,
  amount: paymentIntent.amount,
};
```

### Frontend Integration

```javascript
// Using Stripe.js
const stripe = Stripe(publishableKey);

// Confirm payment with Stripe Elements
const result = await stripe.confirmCardPayment(clientSecret, {
  payment_method: {
    card: cardElement,
    billing_details: {
      name: customerName,
      email: customerEmail,
    },
  },
});

if (result.error) {
  // Handle error
} else {
  // Payment succeeded
}
```

## Testing

### Unit Tests
```bash
npm test apps/api/src/modules/payments/tests/payments.service.spec.ts
```

### Integration Testing
Use Stripe test cards:
- Success: 4242 4242 4242 4242
- Decline: 4000 0000 0000 0002
- 3D Secure: 4000 0000 0000 3220

### Webhook Testing
Use Stripe CLI for local webhook testing:
```bash
stripe listen --forward-to localhost:3000/payments/webhook/stripe
```

## Security Considerations

1. **PCI Compliance**: No card details are stored in the database
2. **Webhook Validation**: All webhooks are verified using Stripe signatures
3. **Idempotency**: All payment operations support idempotency keys
4. **Audit Logging**: All payment actions are logged with user context
5. **Access Control**: JWT authentication required for all endpoints
6. **Test Mode**: Separate keys for test/live environments

## Error Handling

The module handles various Stripe errors:
- Card errors (declined, insufficient funds)
- Rate limiting
- Invalid requests
- API errors
- Connection errors
- Authentication errors

All errors are logged and returned with appropriate HTTP status codes.

## Monitoring

Monitor the following metrics:
- Payment success rate
- Average payment processing time
- Webhook processing delays
- Refund volume
- Dispute rate
- Failed payment reasons

## Support

For issues or questions:
1. Check Stripe dashboard for payment details
2. Review payment audit logs
3. Check webhook event processing status
4. Contact technical support with payment ID