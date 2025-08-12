# ADR-001: Payment Processing Architecture

**Status:** Accepted  
**Date:** August 8, 2025  
**Decision Makers:** Michael Torres (Tech Lead), Jessica Williams (Product Owner)  

## Context

GameTriq requires a payment processing system to handle league registration fees, team fees, and other transactions. The system must be PCI-compliant, support refunds, handle high transaction volumes during registration periods, and provide a seamless user experience.

### Requirements
- PCI DSS compliance without handling card data directly
- Support for one-time payments and future recurring payments
- Full and partial refund capabilities
- Webhook integration for payment events
- Multi-currency support (future requirement)
- Mobile-optimized payment flow
- Detailed transaction reporting and reconciliation

### Constraints
- Must integrate with existing Next.js/TypeScript stack
- Cannot store credit card information
- Must support test mode for development/staging
- Need to minimize transaction fees
- Must provide instant payment confirmation

## Decision

We will use **Stripe** as our payment processor with the following architecture:

### Payment Flow Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Browser   │────▶│  Next.js API │────▶│   Stripe    │
│             │◀────│              │◀────│             │
└─────────────┘     └──────────────┘     └─────────────┘
                            │                     │
                            ▼                     ▼
                    ┌──────────────┐     ┌─────────────┐
                    │  PostgreSQL  │     │  Webhooks   │
                    │              │◀────│             │
                    └──────────────┘     └─────────────┘
```

### Implementation Details

1. **Frontend Integration**
   - Use Stripe Elements for PCI-compliant card collection
   - Client-side payment intent creation
   - Real-time validation and error handling
   - Support for Apple Pay and Google Pay

2. **Backend Architecture**
   - Payment intent creation API (`/api/payments/create-intent`)
   - Webhook handlers for payment events
   - Idempotency keys for duplicate prevention
   - Payment status tracking in PostgreSQL

3. **Data Model**
   ```typescript
   interface Payment {
     id: string;
     userId: string;
     stripePaymentIntentId: string;
     amount: number;
     currency: string;
     status: 'pending' | 'succeeded' | 'failed' | 'refunded';
     metadata: Record<string, any>;
     createdAt: Date;
     updatedAt: Date;
   }

   interface PaymentLedger {
     id: string;
     paymentId: string;
     type: 'charge' | 'refund';
     amount: number;
     balance: number;
     stripeEventId: string;
     createdAt: Date;
   }
   ```

4. **Security Measures**
   - Webhook signature verification
   - HTTPS-only endpoints
   - Rate limiting on payment APIs
   - Audit logging for all transactions
   - Environment-based API keys

5. **Refund Architecture**
   - Admin-initiated refunds through dashboard
   - Automatic ledger updates
   - Email notifications on refund
   - Refund reason tracking

## Consequences

### Positive
- **PCI Compliance**: Stripe handles all card data, reducing our PCI scope to SAQ-A
- **Developer Experience**: Well-documented APIs and SDKs
- **Reliability**: 99.99% uptime SLA from Stripe
- **Global Support**: Built-in support for 135+ currencies
- **Fraud Protection**: Stripe Radar included for fraud detection
- **Mobile Ready**: Stripe Elements work seamlessly on mobile
- **Future Features**: Easy to add subscriptions, invoicing, etc.

### Negative
- **Transaction Fees**: 2.9% + $0.30 per transaction
- **Vendor Lock-in**: Migration to another processor would require significant effort
- **International Complexity**: Additional fees for international cards
- **Customization Limits**: UI customization limited to Stripe Elements options

### Neutral
- **Learning Curve**: Team needs to learn Stripe APIs and best practices
- **Testing Complexity**: Need to handle test mode vs. live mode
- **Webhook Reliability**: Must implement retry logic for failed webhooks

## Alternatives Considered

### 1. PayPal/Braintree
- **Pros**: Wide user adoption, PayPal wallet integration
- **Cons**: Higher fees, more complex integration, less developer-friendly
- **Rejected because**: Poor developer experience and higher transaction costs

### 2. Square
- **Pros**: Good for in-person payments, competitive fees
- **Cons**: Less robust online payment features, limited international support
- **Rejected because**: Focused on in-person payments, less suitable for online-only

### 3. Authorize.net
- **Pros**: Bank-friendly, established processor
- **Cons**: Outdated APIs, poor developer experience, higher fees
- **Rejected because**: Legacy technology stack and poor documentation

### 4. Custom Payment Gateway
- **Pros**: Full control, no transaction fees
- **Cons**: Massive PCI compliance burden, high development cost
- **Rejected because**: Prohibitive compliance requirements and security risks

## Implementation Plan

### Phase 1: Basic Integration (Sprint 5) ✅
- Stripe account setup
- Payment intent creation
- Basic webhook handling
- Test mode implementation

### Phase 2: Full Features (Sprint 5) ✅
- Refund processing
- Payment reporting
- Receipt generation
- Discount codes

### Phase 3: Advanced Features (Sprint 6)
- Subscription support
- Payment plans
- Advanced fraud rules
- International payments

### Phase 4: Optimization (Post-MVP)
- Payment method saving
- Express checkout
- Cryptocurrency support
- ACH payments

## Monitoring and Success Metrics

### Technical Metrics
- Payment success rate > 95%
- Payment processing time < 3 seconds
- Webhook processing success > 99.9%
- Zero payment data breaches

### Business Metrics
- Transaction approval rate
- Cart abandonment rate
- Average transaction value
- Refund rate < 5%

### Monitoring Tools
- Stripe Dashboard for transaction monitoring
- Custom analytics for payment funnel
- CloudWatch alerts for webhook failures
- PagerDuty for payment system incidents

## Security Considerations

1. **API Key Management**
   - Separate keys for test/live environments
   - Keys stored in environment variables
   - Regular key rotation schedule

2. **Webhook Security**
   - Signature verification on all webhooks
   - IP allowlisting for Stripe servers
   - Replay attack prevention

3. **Data Protection**
   - No card data stored in our database
   - Payment metadata encrypted at rest
   - PII handling compliance

4. **Audit Trail**
   - All payment events logged
   - Immutable audit records
   - 7-year retention policy

## References

- [Stripe Documentation](https://stripe.com/docs)
- [PCI DSS Requirements](https://www.pcisecuritystandards.org/)
- [Stripe Security Guide](https://stripe.com/docs/security/stripe)
- [Payment Card Industry Compliance](https://stripe.com/guides/pci-compliance)

---

**Approval Signatures:**

Michael Torres, Tech Lead - August 8, 2025  
Jessica Williams, Product Owner - August 8, 2025  
David Kim, Security Lead - August 8, 2025