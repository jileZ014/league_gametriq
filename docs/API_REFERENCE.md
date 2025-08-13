# Legacy Youth Sports API Reference

## Base URL
```
Production: https://api.legacyyouthsports.com/v1
Staging: https://api-staging.legacyyouthsports.com/v1
```

## Authentication
All API requests require authentication using JWT tokens.

```http
Authorization: Bearer <token>
```

## Rate Limiting
- **Anonymous**: 100 requests per minute
- **Authenticated**: 1000 requests per minute
- **Premium**: 5000 requests per minute

---

## Tournaments API

### Create Tournament
```http
POST /tournaments
```

**Request Body:**
```json
{
  "name": "Holiday Classic 2024",
  "format": "SINGLE_ELIMINATION",
  "minTeams": 8,
  "maxTeams": 16,
  "entryFee": 250,
  "startDate": "2024-12-20",
  "endDate": "2024-12-22",
  "registrationDeadline": "2024-12-15",
  "venues": ["court-1", "court-2"],
  "settings": {
    "seedingMethod": "ranking",
    "consolationBracket": true,
    "thirdPlaceGame": true
  }
}
```

**Response:** `201 Created`
```json
{
  "id": "tournament-123",
  "name": "Holiday Classic 2024",
  "status": "DRAFT",
  "currentTeamCount": 0,
  "bracketUrl": null,
  "createdAt": "2024-11-01T10:00:00Z"
}
```

### Generate Bracket
```http
POST /tournaments/{tournamentId}/bracket/generate
```

**Response:** `200 OK`
```json
{
  "bracketId": "bracket-456",
  "format": "SINGLE_ELIMINATION",
  "totalRounds": 4,
  "matches": [
    {
      "id": "match-1",
      "round": 1,
      "homeTeam": "team-1",
      "awayTeam": "team-16",
      "scheduledTime": "2024-12-20T09:00:00Z",
      "court": "court-1"
    }
  ]
}
```

### Update Match Result
```http
PUT /tournaments/{tournamentId}/matches/{matchId}/result
```

**Request Body:**
```json
{
  "homeScore": 75,
  "awayScore": 68,
  "status": "COMPLETED",
  "statistics": {
    "gameTime": "02:05:30",
    "attendance": 250
  }
}
```

### Register Team
```http
POST /tournaments/{tournamentId}/register
```

**Request Body:**
```json
{
  "teamId": "team-789",
  "teamName": "Phoenix Warriors",
  "divisionId": "division-1",
  "roster": [
    {
      "playerId": "player-1",
      "playerName": "John Smith",
      "jerseyNumber": 23,
      "position": "Guard"
    }
  ],
  "coaches": [
    {
      "coachId": "coach-1",
      "name": "Mike Johnson",
      "role": "HEAD_COACH"
    }
  ]
}
```

---

## Reports API

### Create Scheduled Report
```http
POST /reports/scheduled
```

**Request Body:**
```json
{
  "templateId": "template-league-summary",
  "name": "Weekly League Report",
  "schedule": "0 9 * * MON",
  "recipients": [
    "admin@legacyyouthsports.com",
    "league-director@example.com"
  ],
  "format": "PDF",
  "settings": {
    "includeCharts": true,
    "dateRange": "LAST_WEEK"
  }
}
```

### Generate Report
```http
POST /reports/generate
```

**Request Body:**
```json
{
  "templateId": "template-financial",
  "format": "EXCEL",
  "dateRange": {
    "start": "2024-01-01",
    "end": "2024-12-31"
  },
  "filters": {
    "leagueId": "league-1",
    "includeRefunds": true
  }
}
```

**Response:** `202 Accepted`
```json
{
  "reportId": "report-123",
  "status": "PROCESSING",
  "estimatedCompletion": "2024-11-01T10:05:00Z",
  "downloadUrl": null
}
```

### Get Report Status
```http
GET /reports/{reportId}/status
```

**Response:** `200 OK`
```json
{
  "reportId": "report-123",
  "status": "COMPLETED",
  "completedAt": "2024-11-01T10:03:45Z",
  "downloadUrl": "https://reports.legacyyouthsports.com/download/report-123.pdf",
  "expiresAt": "2024-11-08T10:03:45Z"
}
```

---

## Payments API

### Create Payment Intent
```http
POST /payments/create-intent
```

**Request Body:**
```json
{
  "amount": 250,
  "currency": "usd",
  "description": "Tournament Registration - Holiday Classic 2024",
  "metadata": {
    "tournamentId": "tournament-123",
    "registrationId": "reg-456",
    "teamId": "team-789"
  }
}
```

**Response:** `200 OK`
```json
{
  "paymentIntentId": "pi_1234567890",
  "clientSecret": "pi_1234567890_secret_abcdef",
  "amount": 250,
  "currency": "usd",
  "status": "requires_payment_method"
}
```

### Process Refund
```http
POST /payments/refund
```

**Request Body:**
```json
{
  "paymentIntentId": "pi_1234567890",
  "amount": 250,
  "reason": "TOURNAMENT_CANCELLED",
  "notes": "Tournament cancelled due to weather"
}
```

---

## WebSocket Events

### Connection
```javascript
const socket = io('wss://api.legacyyouthsports.com', {
  auth: {
    token: 'jwt-token'
  }
});
```

### Tournament Events

#### Subscribe to Tournament
```javascript
socket.emit('tournament:subscribe', { tournamentId: 'tournament-123' });
```

#### Match Update Event
```javascript
socket.on('match:updated', (data) => {
  console.log('Match updated:', data);
  // {
  //   matchId: 'match-1',
  //   homeScore: 45,
  //   awayScore: 42,
  //   status: 'IN_PROGRESS',
  //   quarter: 3,
  //   timeRemaining: '5:23'
  // }
});
```

#### Bracket Update Event
```javascript
socket.on('bracket:updated', (data) => {
  console.log('Bracket updated:', data);
  // {
  //   tournamentId: 'tournament-123',
  //   matchId: 'match-1',
  //   winner: 'team-1',
  //   nextMatch: 'match-5'
  // }
});
```

---

## Error Responses

### 400 Bad Request
```json
{
  "error": "BAD_REQUEST",
  "message": "Invalid tournament format",
  "details": {
    "field": "format",
    "value": "INVALID_FORMAT",
    "allowed": ["SINGLE_ELIMINATION", "DOUBLE_ELIMINATION", "ROUND_ROBIN", "POOL_PLAY"]
  }
}
```

### 401 Unauthorized
```json
{
  "error": "UNAUTHORIZED",
  "message": "Invalid or expired token"
}
```

### 403 Forbidden
```json
{
  "error": "FORBIDDEN",
  "message": "Insufficient permissions to perform this action"
}
```

### 404 Not Found
```json
{
  "error": "NOT_FOUND",
  "message": "Tournament not found",
  "details": {
    "tournamentId": "tournament-999"
  }
}
```

### 429 Too Many Requests
```json
{
  "error": "RATE_LIMITED",
  "message": "Too many requests",
  "retryAfter": 60
}
```

### 500 Internal Server Error
```json
{
  "error": "INTERNAL_ERROR",
  "message": "An unexpected error occurred",
  "requestId": "req-abc123"
}
```

---

## Pagination

All list endpoints support pagination:

```http
GET /tournaments?page=1&limit=20&sort=createdAt:desc
```

**Response Headers:**
```
X-Total-Count: 156
X-Page-Count: 8
X-Current-Page: 1
X-Per-Page: 20
```

---

## Filtering

Most endpoints support filtering:

```http
GET /tournaments?status=ACTIVE&format=SINGLE_ELIMINATION&minTeams=8
```

---

## Webhooks

### Configure Webhook
```http
POST /webhooks
```

**Request Body:**
```json
{
  "url": "https://yourapp.com/webhooks/legacyyouthsports",
  "events": [
    "tournament.created",
    "tournament.started",
    "tournament.completed",
    "payment.succeeded",
    "payment.failed"
  ],
  "secret": "webhook-secret-key"
}
```

### Webhook Payload
```json
{
  "id": "webhook-event-123",
  "type": "tournament.completed",
  "timestamp": "2024-11-01T15:30:00Z",
  "data": {
    "tournamentId": "tournament-123",
    "winner": "team-1",
    "finalScore": "85-78"
  },
  "signature": "sha256=abcdef1234567890"
}
```

---

## SDK Examples

### JavaScript/TypeScript
```typescript
import { LegacyYouthSportsAPI } from '@legacyyouthsports/sdk';

const api = new LegacyYouthSportsAPI({
  apiKey: 'your-api-key',
  environment: 'production'
});

// Create tournament
const tournament = await api.tournaments.create({
  name: 'Spring League 2024',
  format: 'ROUND_ROBIN',
  maxTeams: 12
});

// Generate bracket
const bracket = await api.tournaments.generateBracket(tournament.id);

// Subscribe to real-time updates
api.realtime.subscribe('tournament', tournament.id, (event) => {
  console.log('Tournament event:', event);
});
```

### Python
```python
from legacyyouthsports import LegacyYouthSportsAPI

api = LegacyYouthSportsAPI(
    api_key='your-api-key',
    environment='production'
)

# Create tournament
tournament = api.tournaments.create(
    name='Spring League 2024',
    format='ROUND_ROBIN',
    max_teams=12
)

# Generate report
report = api.reports.generate(
    template_id='league-summary',
    format='PDF',
    date_range={'start': '2024-01-01', 'end': '2024-12-31'}
)
```

---

## API Versioning

The API uses URL versioning. The current version is `v1`.

### Deprecation Policy
- New versions are released with 6 months notice
- Deprecated versions are supported for 12 months
- Breaking changes are only introduced in new major versions

---

## Support

For API support, contact:
- Email: api-support@legacyyouthsports.com
- Developer Portal: https://developers.legacyyouthsports.com
- Status Page: https://status.legacyyouthsports.com