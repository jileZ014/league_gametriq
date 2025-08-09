# GameTriq Authentication Service

A comprehensive authentication service for the Basketball League Management Platform, featuring COPPA compliance, JWT-based authentication, and multi-tenant architecture.

## 🏀 Overview

This authentication service provides secure user management for basketball leagues with special considerations for youth participants. It includes full COPPA compliance for users under 13, multi-factor authentication, and robust security measures designed for sports organizations.

## 🔐 Key Features

### Core Authentication
- **JWT Authentication**: Short-lived access tokens (15 minutes) with long-lived refresh tokens (30 days)
- **Multi-Factor Authentication (MFA)**: TOTP-based MFA for eligible users (18+) with backup codes
- **Session Management**: Secure session tracking with device fingerprinting and automatic expiration
- **Password Security**: bcrypt hashing with configurable salt rounds and age-appropriate policies

### COPPA Compliance
- **Age Verification**: Automatic age calculation and COPPA determination
- **Parental Consent**: Multi-method consent verification (email, digital signature, credit card, ID verification)
- **Data Minimization**: Strict data collection limits for users under 13
- **Enhanced Privacy**: Field-level encryption for minor user data
- **Consent Management**: Granular permissions with automatic expiration handling

### Multi-Tenant Architecture
- **Schema-per-Tenant**: Complete data isolation between organizations
- **Tenant Management**: Dynamic tenant creation and configuration
- **Cross-Tenant Security**: Prevents data leakage between organizations

### Security & Performance
- **Rate Limiting**: Configurable limits for authentication, registration, and password reset attempts
- **Audit Logging**: Comprehensive logging of all authentication events
- **Performance Optimized**: Sub-50ms database queries, <10ms token validation
- **Production Ready**: Health checks, graceful shutdown, error handling

## 🏗️ Architecture

```
┌─────────────────────────────────────────────┐
│            API Gateway (Express)            │
├─────────────────────────────────────────────┤
│         Authentication Middleware           │
├──────────┬──────────┬──────────┬───────────┤
│   Auth   │   User   │   COPPA  │    JWT    │
│Controller│  Model   │ Service  │  Service  │
├──────────┴──────────┴──────────┴───────────┤
│         Multi-Tenant Database Layer        │
├─────────────────────────────────────────────┤
│   PostgreSQL   │    Redis     │   Audit   │
│   (Primary)    │  (Sessions)  │   Logs    │
└─────────────────────────────────────────────┘
```

## 📁 Project Structure

```
services/auth-service/
├── package.json                 # Node.js dependencies and scripts
├── openapi.yaml                 # OpenAPI 3.0 specification
├── README.md                    # This file
├── src/
│   ├── index.ts                 # Service entry point
│   ├── config/
│   │   └── database.ts          # Database configuration and utilities
│   ├── controllers/
│   │   └── auth.controller.ts   # Authentication endpoints
│   ├── middleware/
│   │   └── auth.middleware.ts   # Authentication middleware
│   ├── models/
│   │   └── user.model.ts        # User data model and operations
│   └── services/
│       ├── jwt.service.ts       # JWT token management
│       └── coppa.service.ts     # COPPA compliance service
├── tests/
│   └── auth.test.ts             # Comprehensive unit tests (>80% coverage)
└── migrations/                  # Database migration files (auto-generated)
```

## 🚀 Getting Started

### Prerequisites
- Node.js 20+ LTS
- PostgreSQL 15+
- Redis 7+
- Environment variables configured

### Installation

```bash
cd services/auth-service
npm install
```

### Environment Variables

Create a `.env` file with the following variables:

```env
# Server Configuration
NODE_ENV=development
PORT=3001
LOG_LEVEL=info

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=gametriq_auth
DB_POOL_MIN=2
DB_POOL_MAX=20
DB_STATEMENT_TIMEOUT=30000
DB_QUERY_TIMEOUT=30000

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# JWT Configuration
JWT_ACCESS_SECRET=your_super_secure_access_token_secret_here
JWT_REFRESH_SECRET=your_super_secure_refresh_token_secret_here

# COPPA Encryption
COPPA_ENCRYPTION_KEY=your_coppa_encryption_key_here

# Email Configuration (for parental consent)
SMTP_HOST=your_smtp_host
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_smtp_user
SMTP_PASSWORD=your_smtp_password
FROM_EMAIL=noreply@gametriq.com

# Application URLs
FRONTEND_URL=https://app.gametriq.com
ALLOWED_ORIGINS=https://app.gametriq.com,https://admin.gametriq.com
```

### Database Setup

```bash
# Run migrations
npm run migrate

# Seed initial data (optional)
npm run seed
```

### Development

```bash
# Start development server with hot reload
npm run dev

# Run tests
npm test

# Run tests with coverage
npm run test:ci

# Run linting
npm run lint

# Format code
npm run format
```

### Production

```bash
# Build the application
npm run build

# Start production server
npm start
```

## 📊 Performance Targets

| Metric | Target | Implementation |
|--------|---------|---------------|
| Login P95 | < 250ms | JWT generation, database optimization |
| Token Validation | < 10ms | Redis caching, JWT verification |
| Database Queries | < 50ms | Indexed queries, connection pooling |
| Registration | < 500ms | Optimized user creation, async operations |

## 🔒 Security Features

### Authentication Security
- **Secure Password Storage**: bcrypt with 12 salt rounds
- **JWT Best Practices**: Short-lived access tokens, secure refresh mechanism
- **Session Security**: Device fingerprinting, IP tracking, automatic expiration
- **Rate Limiting**: Protection against brute force attacks

### COPPA Compliance
- **Age Verification**: Automatic determination of COPPA requirements
- **Parental Consent**: Multiple verification methods with audit trails
- **Data Encryption**: Field-level encryption for sensitive minor data
- **Access Controls**: Restricted data access for users under 13
- **Audit Logging**: Complete trail of all COPPA-related activities

### Multi-Tenant Security
- **Data Isolation**: Complete separation between tenants
- **Access Controls**: Tenant-aware authentication and authorization
- **Schema Security**: Tenant-specific database schemas

## 🧪 Testing

The service includes comprehensive unit tests with >80% coverage:

```bash
# Run all tests
npm test

# Run tests with coverage report
npm run test:ci

# Run tests in watch mode
npm run test:watch
```

### Test Coverage Areas
- User registration (adult and minor flows)
- Authentication and login
- JWT token management
- MFA setup and verification
- COPPA compliance workflows
- Password management
- Session management
- Rate limiting
- Error handling
- Health checks

## 📖 API Documentation

The service provides a complete OpenAPI 3.0 specification in `openapi.yaml`. Key endpoints include:

### Authentication Endpoints
- `POST /api/v1/register` - User registration
- `POST /api/v1/login` - User login
- `POST /api/v1/refresh-token` - Refresh access token
- `POST /api/v1/auth/logout` - User logout

### User Management
- `GET /api/v1/auth/profile` - Get user profile
- `PUT /api/v1/auth/profile` - Update user profile
- `POST /api/v1/auth/change-password` - Change password

### Multi-Factor Authentication
- `POST /api/v1/auth/mfa/enable` - Enable MFA
- `POST /api/v1/auth/mfa/verify` - Verify MFA token

### COPPA Compliance
- `POST /api/v1/parental-consent` - Request parental consent
- `POST /api/v1/parental-consent/{id}/verify` - Verify parental consent

### Health & Monitoring
- `GET /health` - Service health check
- `GET /ping` - Simple ping endpoint

## 🚦 Health Monitoring

The service provides comprehensive health monitoring:

```bash
# Check service health
curl http://localhost:3001/health

# Simple ping
curl http://localhost:3001/ping
```

Health check includes:
- Database connectivity
- Redis connectivity  
- Service-specific health metrics

## 🔧 Configuration

### Database Configuration
- Multi-tenant schema-per-tenant architecture
- Connection pooling with configurable limits
- Automatic migration support
- Performance monitoring

### Redis Configuration
- Session storage and management
- Token blacklisting
- Rate limiting counters
- Caching layer

### Security Configuration
- JWT token expiration settings
- Password complexity requirements
- Rate limiting thresholds
- MFA settings

## 📝 Logging

The service uses structured logging with Winston:

```typescript
// Example log entries
{
  "level": "info",
  "message": "User authenticated: 123e4567-e89b-12d3-a456-426614174000 (user@example.com)",
  "timestamp": "2023-12-07T10:30:00.000Z",
  "service": "auth-service"
}

{
  "level": "warn",
  "message": "COPPA-protected user access: 123e4567-e89b-12d3-a456-426614174001 - POST /api/v1/auth/profile",
  "timestamp": "2023-12-07T10:30:00.000Z",
  "service": "auth-service"
}
```

## 🔄 Development Workflow

### Code Quality
- TypeScript for type safety
- ESLint for code linting
- Prettier for code formatting
- Jest for testing
- Husky for pre-commit hooks (if configured)

### Deployment
1. Build: `npm run build`
2. Test: `npm run test:ci`
3. Deploy: `npm start`

### Monitoring
- Health endpoint monitoring
- Error rate tracking
- Performance metrics
- Audit log analysis

## 🤝 Contributing

1. Follow TypeScript coding standards
2. Write comprehensive tests
3. Update documentation
4. Follow git commit conventions
5. Ensure COPPA compliance for any youth-related features

## 📞 Support

For technical support or questions about the authentication service:
- Review the OpenAPI specification
- Check health endpoints
- Examine application logs
- Consult the test suite for usage examples

## 🏆 Compliance & Standards

- **COPPA Compliant**: Full compliance with Children's Online Privacy Protection Act
- **Security Standards**: Follows OWASP guidelines for authentication
- **Performance Standards**: Meets P95 latency requirements
- **Testing Standards**: >80% code coverage with comprehensive test suite