# PII Logging Policy

## Overview
This policy defines standards for handling Personally Identifiable Information (PII) in application logs, monitoring systems, and debugging tools.

## Scope
This policy applies to:
- Application logs (all levels)
- Error tracking systems
- Performance monitoring
- Debug outputs
- Audit logs
- WAF logs

## PII Classification

### High Sensitivity PII (NEVER LOG)
- Social Security Numbers
- Credit card numbers
- Bank account numbers
- Passwords and authentication tokens
- Private API keys
- Medical records
- Government ID numbers

### Medium Sensitivity PII (LOG WITH MASKING)
- Email addresses: `user@example.com` → `u***@example.com`
- Phone numbers: `+1-555-123-4567` → `+1-555-***-**67`
- IP addresses: `192.168.1.100` → `192.168.1.xxx`
- Names: `John Doe` → `J*** D**`
- Addresses: Log only city/state/country

### Low Sensitivity PII (LOG WITH CARE)
- User IDs (use UUIDs, not sequential IDs)
- Timestamps
- Browser user agents
- Country/Region information

## Logging Standards

### 1. Sanitization Functions
```javascript
// Email sanitization
function sanitizeEmail(email) {
  const [local, domain] = email.split('@');
  return `${local[0]}***@${domain}`;
}

// Phone sanitization
function sanitizePhone(phone) {
  return phone.replace(/(\d{3})\d{3}(\d{2})\d{2}/, '$1***$2**');
}

// IP sanitization
function sanitizeIP(ip) {
  const parts = ip.split('.');
  return `${parts[0]}.${parts[1]}.${parts[2]}.xxx`;
}

// Credit card sanitization
function sanitizeCreditCard(cc) {
  return `****-****-****-${cc.slice(-4)}`;
}
```

### 2. Structured Logging Format
```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "level": "INFO",
  "service": "api",
  "userId": "uuid-here",
  "action": "user.login",
  "metadata": {
    "ip": "192.168.1.xxx",
    "userAgent": "Mozilla/5.0...",
    "country": "US"
  },
  "message": "User authentication successful"
}
```

### 3. Error Logging
```javascript
// BAD - Logs sensitive data
logger.error('Payment failed', { 
  creditCard: user.creditCard,
  error: err 
});

// GOOD - Sanitized logging
logger.error('Payment failed', {
  userId: user.id,
  last4: user.creditCard.slice(-4),
  errorCode: err.code,
  errorType: err.type
});
```

## WAF Rules Configuration

### 1. Request Logging Rules
```yaml
waf_rules:
  request_logging:
    mask_headers:
      - Authorization
      - Cookie
      - X-API-Key
    mask_body_fields:
      - password
      - creditCard
      - ssn
      - apiKey
    mask_query_params:
      - token
      - key
      - secret
```

### 2. Response Logging Rules
```yaml
waf_rules:
  response_logging:
    strip_headers:
      - Set-Cookie
    mask_body_fields:
      - email
      - phone
      - address
    max_body_size: 1024  # bytes
```

## Implementation Guidelines

### 1. Application Level
- Use structured logging libraries
- Implement sanitization middleware
- Configure log levels appropriately
- Use correlation IDs instead of PII

### 2. Infrastructure Level
- Enable log encryption at rest
- Set appropriate retention periods
- Implement access controls
- Use log aggregation with PII filtering

### 3. Development Practices
```javascript
// Use debug namespaces
const debug = require('debug')('app:auth');

// Safe logging wrapper
class SafeLogger {
  log(level, message, data = {}) {
    const sanitized = this.sanitize(data);
    this.logger[level](message, sanitized);
  }
  
  sanitize(data) {
    const sanitized = { ...data };
    
    // Remove sensitive fields
    delete sanitized.password;
    delete sanitized.creditCard;
    delete sanitized.ssn;
    
    // Mask semi-sensitive fields
    if (sanitized.email) {
      sanitized.email = sanitizeEmail(sanitized.email);
    }
    
    return sanitized;
  }
}
```

## Compliance Requirements

### GDPR Compliance
- Right to erasure: Logs must be deletable
- Data minimization: Log only necessary data
- Purpose limitation: Define why each field is logged

### PCI DSS Compliance
- No credit card data in logs
- Mask PAN if absolutely necessary
- Secure log storage and transmission

### HIPAA Compliance
- No PHI in application logs
- Audit logs must be separate
- Encryption requirements

## Monitoring and Alerting

### 1. PII Detection Alerts
```yaml
alerts:
  - name: pii_in_logs
    condition: |
      log_message REGEXP '\\b\\d{3}-\\d{2}-\\d{4}\\b' OR  # SSN
      log_message REGEXP '\\b\\d{16}\\b' OR              # Credit Card
      log_message REGEXP '\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b'  # Email
    action: alert_security_team
```

### 2. Regular Audits
- Weekly automated scans for PII patterns
- Monthly manual log reviews
- Quarterly compliance assessments

## Exception Process
1. Document business need for logging PII
2. Implement additional safeguards
3. Get security team approval
4. Set shorter retention period
5. Add to exception registry

## Incident Response
If PII is accidentally logged:
1. Immediate log purge
2. Assess exposure scope
3. Notify security team
4. Document incident
5. Implement preventive measures

## Training Requirements
- All developers must complete PII handling training
- Annual refresher training
- Code review checklist includes PII checks

## Tools and Libraries

### Recommended Libraries
- `winston` with custom sanitizers
- `pino` with redaction options
- `morgan` with custom tokens
- `cls-hooked` for context propagation

### Scanning Tools
- `trufflehog` for secret scanning
- Custom regex patterns for PII
- Pre-commit hooks for validation