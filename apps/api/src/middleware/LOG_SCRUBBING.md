# PII Log Scrubbing Middleware

## Overview

The PII Log Scrubbing Middleware automatically redacts sensitive personal information from all logs, ensuring compliance with privacy regulations and protecting user data.

## Features

- **Automatic PII Detection**: Identifies and redacts sensitive fields based on field names
- **Deep Object Traversal**: Handles nested objects and arrays
- **IP Address Hashing**: Preserves IP addresses for debugging while maintaining privacy
- **Performance Optimized**: Less than 5ms overhead per request
- **Configurable**: Environment-based configuration for different environments

## Redacted Fields

The middleware automatically redacts the following types of data:

### Personal Information
- `email`, `guardian_email`
- `phone`
- `dob`, `dateOfBirth`
- `ssn`, `socialSecurityNumber`

### Authentication & Security
- `token`, `auth`, `authorization`
- `access_token`, `refresh_token`
- `api_key`, `password`

### Payment Information
- All fields starting with `payment_`
- All fields starting with `card_`
- `stripe_token`, `stripe_customer`
- `account_number`, `routing_number`

### Network Information
- `ip`, `ipAddress`, `ip_address` (hashed, not redacted)

## Usage

### 1. Apply Middleware Globally

```typescript
// app.module.ts
import { LogScrubberMiddleware } from './middleware/log_scrubber';

export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LogScrubberMiddleware)
      .forRoutes('*');
  }
}
```

### 2. Configure Environment Variables

```env
# Enable/disable PII scrubbing
ENABLE_PII_SCRUBBING=true

# Secret pepper for IP hashing (keep this secure!)
IP_HASH_PEPPER=your-secret-pepper-here

# Logging levels
LOG_LEVEL=log
ENABLE_REQUEST_LOGGING=true
ENABLE_RESPONSE_LOGGING=false
ENABLE_ERROR_LOGGING=true
```

### 3. Use the Scrubbed Logger

```typescript
import { ScrubbedLogger } from './config/logging';

@Injectable()
export class UserService {
  constructor(private readonly logger: ScrubbedLogger) {}

  async createUser(userData: any) {
    // Email will be automatically redacted in logs
    this.logger.log({
      action: 'create_user',
      email: userData.email,  // Will appear as [REDACTED]
      name: userData.name,    // Not redacted
    });
  }
}
```

## How It Works

1. **Request Phase**: Scrubs request body, query parameters, and headers
2. **Processing Phase**: Intercepts console.log, console.error, etc. to scrub output
3. **Response Phase**: Scrubs response data before logging
4. **Error Handling**: Ensures error messages and stack traces are scrubbed

## IP Address Handling

IP addresses are hashed rather than completely redacted to maintain their usefulness for:
- Rate limiting
- Security monitoring
- Debugging connection issues

The hashing uses a salted SHA-256 algorithm with a configurable pepper.

## Performance Considerations

- **Caching**: Field name checks are cached to improve performance
- **Depth Limiting**: Prevents infinite recursion with a maximum depth of 10
- **Lazy Evaluation**: Only processes data that will actually be logged

## Testing

Run the test suite:

```bash
npm test -- tests/api/security/logs.spec.ts
```

## Monitoring

Monitor the performance impact:

```typescript
// Logs warnings if processing takes > 5ms
if (duration > 5) {
  console.warn(`Log scrubber middleware took ${duration.toFixed(2)}ms`);
}
```

## Security Best Practices

1. **Never log passwords**: Even with scrubbing, avoid logging password fields
2. **Rotate IP pepper**: Change the `IP_HASH_PEPPER` periodically
3. **Review logs regularly**: Ensure no PII is leaking through
4. **Test thoroughly**: Add new sensitive fields to the test suite

## Extending the Scrubber

To add new fields to scrub:

1. Add to `PII_FIELDS` set in `log_scrubber.ts`
2. Or add prefix to `PII_PREFIXES` array
3. Add test case in `logs.spec.ts`

Example:
```typescript
// Add new field
PII_FIELDS.add('nationalId');

// Add new prefix
PII_PREFIXES.push('sensitive_');
```

## Troubleshooting

### PII Still Appearing in Logs

1. Check if middleware is applied globally
2. Verify `ENABLE_PII_SCRUBBING=true`
3. Check if field name matches scrubbing rules
4. Look for custom console.log overrides

### Performance Issues

1. Check cache size with `getIpHashCacheSize()`
2. Review depth of objects being logged
3. Consider reducing logged data size
4. Enable performance monitoring

### IP Hashes Changing

1. Ensure `IP_HASH_PEPPER` is consistent
2. Check environment variable loading
3. Verify cache is not being cleared unexpectedly