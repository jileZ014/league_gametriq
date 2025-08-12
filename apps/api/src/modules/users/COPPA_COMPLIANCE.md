# COPPA Compliance Implementation

This module implements Children's Online Privacy Protection Act (COPPA) compliance for user registration and payment processing.

## Overview

The implementation ensures that:
- Personal information collection from children under 13 is minimized
- Parental consent is obtained before processing payments for minors
- Only birth year (not full date of birth) is stored for children under 13
- IP addresses are hashed using salted hashing for privacy protection
- Parental consent can be tracked, expires after 1 year, and can be revoked

## Key Components

### 1. User Entity (`user.entity.ts`)
- Stores `birthYear` only for minors (no month/day)
- Tracks `isMinor` status
- Requires `parentEmail` for minors
- Stores hashed IP addresses only

### 2. Parental Consent Entity (`parental-consent.entity.ts`)
- Tracks consent status (pending, approved, denied, expired, revoked)
- Stores consent details including payment processing permission
- Expires after 1 year from approval
- Can be revoked at any time

### 3. Registration Service (`registration.service.ts`)
Key methods:
- `register()`: Handles COPPA-compliant registration
- `processParentalConsent()`: Processes parent consent requests
- `hasValidPaymentConsent()`: Validates consent before payments
- `revokeParentalConsent()`: Allows parents to revoke consent
- `updateMinorDobToYearOnly()`: Migrates existing data

### 4. Payment Service Integration
- Checks for valid parental consent before creating payment intents
- Returns 403 Forbidden if minor lacks payment consent
- Logs all payment attempts with hashed IP addresses

## API Endpoints

### Registration
- `POST /registration` - Register new user with COPPA compliance
- `POST /registration/consent/:token` - Process parental consent
- `POST /registration/consent/:consentId/revoke` - Revoke consent
- `POST /registration/migrate-minor-dob` - Migrate existing DOB data

## Database Schema

### Users Table Additions
```sql
birth_year INTEGER -- Stores only year for minors
is_minor BOOLEAN DEFAULT FALSE
parent_email VARCHAR(255)
registration_ip_hash VARCHAR(64)
```

### Parental Consents Table
```sql
CREATE TABLE parental_consents (
    id UUID PRIMARY KEY,
    child_user_id UUID REFERENCES users(id),
    parent_email VARCHAR(255),
    status VARCHAR(20),
    consent_token VARCHAR(255) UNIQUE,
    consent_details JSONB,
    expires_at TIMESTAMP,
    -- ... other fields
);
```

## Security Considerations

1. **IP Address Hashing**: All IP addresses are hashed using SHA-256 with a configurable pepper (salt)
2. **Consent Tokens**: Secure random tokens for consent verification
3. **Data Minimization**: Only essential data is collected for minors
4. **Audit Trail**: All consent actions are logged in the audit system

## Testing

Run the COPPA compliance tests:
```bash
npm test tests/api/security/coppa.spec.ts
```

## Migration

To apply the COPPA compliance database migration:
```bash
psql -U your_user -d your_database -f db/migrations/006_coppa_dob_year_only.sql
```

## Configuration

Set the following environment variables:
- `IP_HASH_PEPPER`: Salt for IP address hashing (default: 'gametriq-ip-pepper-default-2024')

## Compliance Checklist

- [x] Store only birth year for users under 13
- [x] Require parental email for minor registration
- [x] Implement parental consent workflow
- [x] Validate consent before payment processing
- [x] Hash IP addresses for privacy
- [x] Allow consent revocation
- [x] Set 1-year consent expiration
- [x] Audit all consent-related actions
- [x] Provide data migration for existing records