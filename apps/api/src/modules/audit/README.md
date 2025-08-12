# Audit Logging and Rate Limiting

This module provides comprehensive audit logging and rate limiting functionality for the Gametriq League App API.

## Features

### Audit Logging
- Centralized audit logging for all critical events
- PII-safe logging (no credit card numbers, SSNs, etc.)
- Automatic 90-day retention with configurable archiving
- Performance optimized (<5ms overhead)
- Support for registration, payment, refund, user, and admin events

### Rate Limiting
- Sliding window rate limiting using Redis
- Per-tenant and per-IP limits
- Configurable limits for different endpoints
- Admin user bypass capability
- WAF integration for additional protection

## Usage

### Setting Up the Module

Add the AuditModule to your app module:

```typescript
import { AuditModule } from './modules/audit';

@Module({
  imports: [
    AuditModule,
    // ... other modules
  ],
})
export class AppModule {}
```

### Manual Audit Logging

Inject the AuditService and use it to log events:

```typescript
import { AuditService, AuditAction } from '../audit';

@Injectable()
export class PaymentService {
  constructor(private readonly auditService: AuditService) {}

  async processPayment(paymentData: any): Promise<Payment> {
    try {
      // Process payment
      const payment = await this.stripeService.charge(paymentData);
      
      // Log successful payment
      await this.auditService.logSuccess(
        AuditAction.PAYMENT_COMPLETED,
        {
          organizationId: payment.organizationId,
          userId: payment.userId,
          entityType: 'payment',
          entityId: payment.id,
        },
        {
          paymentAmount: payment.amount,
          paymentCurrency: payment.currency,
          paymentMethod: 'card',
          paymentLast4: payment.card.last4,
        }
      );
      
      return payment;
    } catch (error) {
      // Log failed payment
      await this.auditService.logFailure(
        AuditAction.PAYMENT_FAILED,
        {
          organizationId: paymentData.organizationId,
          userId: paymentData.userId,
        },
        error,
        {
          paymentAmount: paymentData.amount,
          paymentCurrency: paymentData.currency,
        }
      );
      
      throw error;
    }
  }
}
```

### Automatic Audit Logging with Decorators

Use the @Audit decorator on controller methods:

```typescript
import { Audit, AuditAction } from '../audit';

@Controller('api/payments')
export class PaymentController {
  @Post('process')
  @Audit({
    action: AuditAction.PAYMENT_INITIATED,
    entityType: 'payment',
    extractEntityId: (result) => result.id,
    includeRequestBody: true,
    sensitiveFields: ['cardNumber', 'cvv'],
  })
  async processPayment(@Body() paymentDto: PaymentDto) {
    return this.paymentService.process(paymentDto);
  }
}
```

### Rate Limiting Middleware

Apply rate limiting in your main application:

```typescript
import { RateLimitMiddleware } from './middleware/rate_limit';

export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RateLimitMiddleware)
      .forRoutes('*');
  }
}
```

### Custom Rate Limits

Create custom rate limits for specific routes:

```typescript
import { createRateLimitMiddleware } from './middleware/rate_limit';

consumer
  .apply(createRateLimitMiddleware({
    windowMs: 60000, // 1 minute
    max: 10, // 10 requests
    keyGenerator: (req) => req.ip,
  }))
  .forRoutes('api/sensitive-endpoint');
```

## Configuration

### Environment Variables

```env
# Audit Configuration
AUDIT_RETENTION_DAYS=90
AUDIT_ARCHIVE_ENABLED=true
AUDIT_ARCHIVE_STORAGE=s3

# Rate Limiting
REDIS_HOST=localhost
REDIS_PORT=6379
RATE_LIMIT_ENABLED=true
```

### Rate Limit Rules

Default rate limits:
- `/api/portal/*`: 100 requests/minute
- `/api/payments/*`: 20 requests/minute
- `/api/admin/*`: 200 requests/minute
- `/api/public/*`: 30 requests/minute per IP

Admin users bypass rate limits by default.

## Querying Audit Logs

### REST API Endpoints

```bash
# Get audit logs
GET /api/audit/logs?organizationId=xxx&action=payment.completed&limit=50

# Get entity history
GET /api/audit/logs/entity/payment/pay_123

# Get current user's activity
GET /api/audit/logs/my-activity
```

### Direct Service Usage

```typescript
const logs = await auditService.findLogs({
  organizationId: 'org-123',
  action: [AuditAction.PAYMENT_COMPLETED, AuditAction.PAYMENT_FAILED],
  startDate: new Date('2023-01-01'),
  endDate: new Date('2023-12-31'),
  limit: 100,
});
```

## Database Schema

The audit system uses two main tables:
- `audit_logs`: Active audit logs with automatic expiry
- `audit_log_archives`: References to archived audit data

Indexes are optimized for common query patterns:
- By organization and time
- By user and time
- By action and time
- By entity and time

## WAF Integration

The WAF configuration (`ops/waf/rate_limit_rules.json`) provides:
- AWS WAF rules for rate limiting
- Custom response messages
- CloudWatch metrics and alarms
- IP allow/block lists

Deploy WAF rules using AWS CloudFormation or Terraform.

## Performance Considerations

- Audit logging is asynchronous and non-blocking
- Rate limiting uses Redis for O(1) operations
- Database indexes optimized for common queries
- Automatic cleanup of expired logs
- Archiving for long-term storage

## Security

- No PII stored in audit logs
- Sensitive fields automatically redacted
- IP addresses and user agents captured for security analysis
- All logs encrypted at rest
- Access controlled by role-based permissions

## Monitoring

Monitor audit logging and rate limiting through:
- CloudWatch metrics (if using AWS WAF)
- Application logs
- Database query performance
- Redis memory usage
- Custom dashboards for audit activity