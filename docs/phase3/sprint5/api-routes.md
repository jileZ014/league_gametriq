# Sprint 5 API Routes

## Registration APIs

### Create Registration Order
```
POST /api/registrations/orders
Content-Type: application/json

{
  "seasonId": "uuid",
  "divisionId": "uuid",
  "teamId": "uuid", // optional
  "playerFirst": "string",
  "playerLast": "string",
  "dobYear": 2015,
  "guardianEmail": "email@example.com",
  "jerseySize": "YM",
  "discountCode": "EARLYBIRD10" // optional
}

Response: 201 Created
{
  "orderId": "uuid",
  "amountCents": 15000,
  "discountApplied": 1500,
  "totalCents": 13500,
  "status": "pending"
}
```

### Sign Waiver
```
POST /api/registrations/orders/{orderId}/waiver
Content-Type: application/json

{
  "guardianSignature": "John Doe",
  "consentDate": "2024-01-15T10:00:00Z",
  "ipAddress": "192.168.1.1"
}

Response: 200 OK
{
  "waiverSignedAt": "2024-01-15T10:00:00Z",
  "ipHash": "hashed_ip"
}
```

### Get Registration Status
```
GET /api/registrations/orders/{orderId}

Response: 200 OK
{
  "orderId": "uuid",
  "status": "pending",
  "player": {
    "firstName": "string",
    "lastName": "string",
    "dobYear": 2015
  },
  "amountCents": 15000,
  "paymentStatus": null
}
```

## Payment APIs

### Create Payment Intent
```
POST /api/payments/create-intent
Content-Type: application/json

{
  "orderId": "uuid",
  "amountCents": 13500,
  "currency": "USD"
}

Response: 200 OK
{
  "clientSecret": "pi_xxx_secret_xxx",
  "paymentIntentId": "pi_xxx",
  "publishableKey": "pk_live_xxx"
}
```

### Webhook Handler
```
POST /api/payments/webhook
Stripe-Signature: t=xxx,v1=xxx

// Stripe webhook payload

Response: 200 OK
```

### Create Refund
```
POST /api/payments/refund
Content-Type: application/json

{
  "paymentIntentId": "pi_xxx",
  "amountCents": 5000, // optional, full refund if not specified
  "reason": "requested_by_customer"
}

Response: 200 OK
{
  "refundId": "re_xxx",
  "status": "succeeded",
  "amountCents": 5000
}
```

## Branding APIs

### Get Tenant Branding
```
GET /api/branding/tenant/{tenantId}

Response: 200 OK
{
  "tenantId": "uuid",
  "logoUrl": "https://cdn.example.com/logo.png",
  "primaryHex": "#1976d2",
  "secondaryHex": "#dc004e",
  "accentHex": "#ffc107",
  "faviconUrl": "https://cdn.example.com/favicon.ico",
  "socialImageUrl": "https://cdn.example.com/social.png"
}
```

### Update Tenant Branding
```
PUT /api/branding/tenant/{tenantId}
Content-Type: application/json

{
  "logoUrl": "https://cdn.example.com/new-logo.png",
  "primaryHex": "#2196f3",
  "secondaryHex": "#f50057",
  "accentHex": "#ff9800"
}

Response: 200 OK
```

## Portal Enhancement APIs

### Search with Filters
```
GET /api/portal/search?q=tournament&type=game&division=U12&date=2024-01-20

Response: 200 OK
{
  "results": [
    {
      "type": "game",
      "id": "uuid",
      "title": "Championship Tournament - U12",
      "date": "2024-01-20T14:00:00Z",
      "url": "/games/uuid"
    }
  ],
  "total": 15,
  "page": 1,
  "pageSize": 20
}
```

### Generate Deep Link
```
POST /api/portal/deeplink
Content-Type: application/json

{
  "type": "schedule",
  "filters": {
    "division": "U12",
    "team": "uuid",
    "dateRange": "next7days"
  }
}

Response: 200 OK
{
  "shortUrl": "https://gtq.link/abc123",
  "fullUrl": "https://app.gametriq.com/portal/schedule?division=U12&team=uuid&range=next7days"
}
```

## Audit APIs

### Create Audit Log
```
POST /api/audit/log
Content-Type: application/json

{
  "actorType": "guardian",
  "actorId": "uuid",
  "action": "registration.created",
  "entityType": "registration_order",
  "entityId": "uuid",
  "meta": {
    "playerName": "[REDACTED]",
    "amount": 13500,
    "paymentMethod": "card"
  }
}

Response: 201 Created
{
  "id": "uuid",
  "createdAt": "2024-01-15T10:00:00Z"
}
```

### Query Audit Logs
```
GET /api/audit/logs?actorType=guardian&action=payment.completed&startDate=2024-01-01

Response: 200 OK
{
  "logs": [
    {
      "id": "uuid",
      "actorType": "guardian",
      "action": "payment.completed",
      "entityType": "payment",
      "entityId": "uuid",
      "meta": {
        "amount": 13500,
        "last4": "4242"
      },
      "createdAt": "2024-01-15T10:00:00Z"
    }
  ],
  "total": 50,
  "page": 1
}
```

## Rate Limiting Headers

All APIs will include rate limiting headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642291200
```

## Error Responses

Standard error format:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input provided",
    "details": {
      "field": "playerFirst",
      "issue": "Required field missing"
    }
  }
}
```

Common error codes:
- `VALIDATION_ERROR` - Invalid input
- `PAYMENT_FAILED` - Payment processing error
- `RATE_LIMITED` - Too many requests
- `UNAUTHORIZED` - Invalid authentication
- `FORBIDDEN` - Insufficient permissions
- `NOT_FOUND` - Resource not found