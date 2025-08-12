# Registration Service

The Registration Service handles all player and team registration workflows for the Gametriq League App.

## Features

- **Team and Individual Registration**: Support for both team-based and individual player registrations
- **Discount Code Management**: Apply and validate discount codes
- **Waiver Management**: Digital signature collection for liability, medical, photo release, and SafeSport waivers
- **COPPA Compliance**: Full compliance with COPPA regulations for players under 13
- **Audit Trail**: Complete audit logging of all registration actions
- **Multi-tenant Support**: Tenant isolation for all registration data

## API Endpoints

### Registration Orders
- `POST /api/v1/registration/orders` - Create new registration order
- `GET /api/v1/registration/orders/:orderId` - Get order details
- `PUT /api/v1/registration/orders/:orderId` - Update order
- `POST /api/v1/registration/orders/:orderId/cancel` - Cancel order

### Discounts
- `POST /api/v1/registration/orders/:orderId/discount` - Apply discount code

### Waivers
- `POST /api/v1/registration/orders/:orderId/waivers` - Sign waiver
- `GET /api/v1/registration/orders/:orderId/waivers` - Get order waivers

### Compliance
- `GET /api/v1/registration/orders/:orderId/coppa-compliance` - Check COPPA compliance

### Audit
- `GET /api/v1/registration/orders/:orderId/audit` - Get audit trail

### User History
- `GET /api/v1/registration/users/:userId/registrations` - Get user's registration history

## Installation

```bash
npm install
```

## Configuration

Create a `.env` file with the following variables:

```env
# Server
PORT=3004
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres

# Security
JWT_SECRET=your-jwt-secret
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001

# Logging
LOG_LEVEL=info
```

## Running the Service

### Development
```bash
npm run dev
```

### Production
```bash
npm run build
npm start
```

## Database Setup

Run the migration to create required tables:

```bash
npm run migrate
```

## Testing

Run unit tests with coverage:

```bash
npm test
```

Watch mode for development:

```bash
npm run test:watch
```

## COPPA Compliance

The service implements comprehensive COPPA compliance features:

- Age verification during registration
- Parental consent workflow for players under 13
- Multiple verification methods (email, digital signature, credit card, government ID, video call)
- Consent expiration and renewal tracking
- Data retention policies for minors

## Security Features

- JWT-based authentication
- Tenant isolation with Row Level Security (RLS)
- Rate limiting on all endpoints
- Input validation with Joi
- Audit logging for all actions
- IP address and user agent tracking

## Data Models

### Registration Order
- Supports both team and individual registrations
- Tracks primary contact and emergency contacts
- Medical information storage
- Payment method tracking
- Status workflow (DRAFT → PENDING_PAYMENT → PENDING_WAIVERS → COMPLETED)

### Waivers
- Multiple waiver types supported
- Digital signature capture
- Document versioning and hash verification
- Expiration tracking

### Audit Logs
- Complete action history
- User identification
- Timestamp tracking
- Detailed action metadata

## Error Handling

The service implements comprehensive error handling:
- Validation errors (400)
- Authentication errors (401)
- Authorization errors (403)
- Not found errors (404)
- Internal server errors (500)

All errors include descriptive messages and are logged for debugging.

## Monitoring

The service includes:
- Health check endpoint at `/health`
- Structured logging with Winston
- Request/response logging
- Error tracking

## Development Guidelines

1. All new features must include unit tests
2. Maintain test coverage above 85%
3. Follow TypeScript strict mode
4. Use proper error handling and logging
5. Document all API changes in OpenAPI spec
6. Ensure COPPA compliance for any child-related features