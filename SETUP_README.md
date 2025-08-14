# GameTriq Basketball League Management Platform - Setup Guide

![Version](https://img.shields.io/badge/version-2.0.0-blue)
![Status](https://img.shields.io/badge/status-Production%20Ready-success)
![License](https://img.shields.io/badge/license-Proprietary-red)

## 🏀 Quick Start Guide

This guide helps you set up the GameTriq Basketball League Management Platform for development and production deployment.

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js 18 LTS or higher** ([Download](https://nodejs.org/))
- **npm 8.0.0 or higher** (comes with Node.js)
- **Git** ([Download](https://git-scm.com/))
- **PostgreSQL 15** (for production, optional for development)
- **Redis 7.0** (for production, optional for development)

## 🚀 Installation Steps

### 1. Clone the Repository

```bash
git clone <repository-url>
cd "Gametriq League App"
```

### 2. Install Dependencies

```bash
# Install all dependencies for the workspace
npm install

# Install dependencies for specific apps
cd apps/web && npm install && cd ../..
cd apps/api && npm install && cd ../..
cd apps/mobile && npm install && cd ../..
```

### 3. Environment Configuration

Create environment files for each application:

#### Web Application (.env.local)
```bash
# Copy the example environment file
cp apps/web/.env.example apps/web/.env.local
```

Edit `apps/web/.env.local` with your configuration:
```env
# Application URL
NEXT_PUBLIC_APP_URL=http://localhost:4000

# Database
DATABASE_URL=postgresql://username:password@localhost:5432/gametriq_web
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# Authentication
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=http://localhost:4000

# Payment Processing (Stripe)
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# Feature Flags
NEXT_PUBLIC_UI_MODERN_V1=1
NEXT_PUBLIC_HEAT_MONITORING=1

# Analytics (Optional)
NEXT_PUBLIC_GA_ID=your_google_analytics_id

# Phoenix Heat Safety API (Optional)
HEAT_SAFETY_API_KEY=your_weather_api_key
```

#### API Application (.env)
```bash
# Copy the example environment file
cp apps/api/.env.example apps/api/.env
```

Edit `apps/api/.env`:
```env
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/gametriq_api
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-jwt-secret-key
JWT_EXPIRATION=24h

# Stripe
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# Email (Optional)
SMTP_HOST=your_smtp_host
SMTP_PORT=587
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password

# AWS (for file uploads)
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-west-2
AWS_S3_BUCKET=your_s3_bucket_name
```

### 4. Database Setup

#### Option A: Using Supabase (Recommended for Development)
1. Create a new project at [supabase.com](https://supabase.com)
2. Copy the URL and anon key to your `.env.local` file
3. Run the database migrations:

```bash
cd apps/web
npm run db:migrate
npm run db:seed
```

#### Option B: Local PostgreSQL
1. Install PostgreSQL 15 locally
2. Create databases:

```sql
CREATE DATABASE gametriq_web;
CREATE DATABASE gametriq_api;
```

3. Run migrations:

```bash
# Web app migrations
cd apps/web
npm run db:migrate
npm run db:seed

# API migrations
cd ../api
npm run migration:run
npm run seed:run
```

### 5. Start Development Servers

#### Start All Services
```bash
# From the root directory
npm run dev
```

This will start:
- Web application on `http://localhost:4000`
- API server on `http://localhost:3001`
- Mobile development server (if configured)

#### Start Individual Services
```bash
# Web application only (port 4000)
cd apps/web
npm run dev

# API server only (port 3001)
cd apps/api
npm run start:dev

# Mobile app only
cd apps/mobile
npm start
```

## 🎯 Application Structure

```
/
├── app/                    # Root-level Next.js app (simplified setup)
│   ├── globals.css        # Global styles with basketball theme
│   ├── layout.tsx         # Root layout with metadata
│   └── page.tsx           # Public homepage
├── apps/
│   ├── web/               # Main Next.js web application
│   ├── api/               # NestJS backend API
│   └── mobile/            # React Native mobile app
├── docs/                  # Documentation
├── ops/                   # DevOps and deployment configs
└── README.md             # Main project documentation
```

## 🔧 Development Commands

### Web Application (Port 4000)
```bash
cd apps/web

# Development
npm run dev              # Start dev server on port 4000
npm run build           # Build for production
npm run start           # Start production server on port 4000
npm run lint            # Run ESLint
npm run type-check      # TypeScript type checking

# Testing
npm run test            # Run unit tests
npm run test:e2e        # Run end-to-end tests
npm run test:e2e:headed # Run E2E tests with browser
```

### API Server
```bash
cd apps/api

# Development
npm run start:dev       # Start dev server with hot reload
npm run build          # Build for production
npm run start:prod     # Start production server

# Database
npm run migration:run   # Run database migrations
npm run migration:revert # Revert last migration
npm run seed:run       # Run database seeds

# Testing
npm run test           # Run unit tests
npm run test:e2e       # Run integration tests
```

### Mobile Application
```bash
cd apps/mobile

# Development
npm start              # Start Expo development server
npm run ios            # Run on iOS simulator
npm run android        # Run on Android emulator
npm run web            # Run in web browser

# Build
npm run build          # Build for production
```

## 🌐 Accessing the Application

Once everything is running:

- **Web Application**: http://localhost:4000
- **API Documentation**: http://localhost:3001/docs
- **Mobile App**: Use Expo Go app to scan QR code

### Test Accounts

Default test accounts are created during seeding:

```
Administrator:
  Email: admin@gametriq.com
  Password: Admin123!

Coach:
  Email: coach@gametriq.com
  Password: Coach123!

Parent:
  Email: parent@gametriq.com
  Password: Parent123!
```

## 🔥 Phoenix-Specific Features

The application includes special features for Phoenix area operations:

### Heat Safety Monitoring
- Automatic heat index monitoring
- Game postponement alerts when temperature exceeds 105°F
- OSHA-compliant hydration break reminders
- Integration with National Weather Service alerts

### Location Services
- Automatic Phoenix area detection
- Indoor venue prioritization during summer months
- Heat advisory integration with game scheduling

## 🚀 Production Deployment

### Vercel (Recommended for Web App)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy web application
cd apps/web
vercel --prod
```

### Docker Deployment
```bash
# Build and run with Docker Compose
docker-compose up -d --build

# Or build individual services
docker build -t gametriq-web apps/web
docker build -t gametriq-api apps/api
```

### Environment Variables for Production

Ensure you set production environment variables:

```env
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.com
DATABASE_URL=your_production_database_url
REDIS_URL=your_production_redis_url
STRIPE_SECRET_KEY=your_production_stripe_key
```

## 🧪 Testing

### Running Tests
```bash
# Unit tests
npm run test

# Integration tests
npm run test:integration

# End-to-end tests
npm run test:e2e

# Coverage report
npm run test:coverage
```

### Test Data
The application includes comprehensive test data for Phoenix area leagues:
- 5 sample leagues with different age divisions
- 50+ teams with realistic rosters
- Tournament brackets and game schedules
- Sample payment and registration data

## 📊 Monitoring and Analytics

### Development Monitoring
- Console logging for all major events
- Error tracking with stack traces
- Performance monitoring via Web Vitals
- Real-time WebSocket connection status

### Production Monitoring
- Integrated error tracking (Sentry ready)
- Performance monitoring (DataDog ready)
- Heat safety alert system
- Uptime monitoring endpoints

## 🔒 Security Features

- **COPPA Compliance**: Youth data protection
- **PCI DSS Ready**: Secure payment processing
- **OWASP Security**: Following security best practices
- **Rate Limiting**: API protection against abuse
- **Input Validation**: Comprehensive data validation
- **Authentication**: JWT-based secure authentication

## 🆘 Troubleshooting

### Common Issues

#### Port 4000 Already in Use
```bash
# Find process using port 4000
lsof -i :4000

# Kill the process
kill -9 <PID>

# Or use a different port
npm run dev -- -p 4001
```

#### Database Connection Issues
1. Verify PostgreSQL is running
2. Check database credentials in `.env.local`
3. Ensure database exists and migrations are run
4. Check firewall settings

#### Stripe Webhook Issues
1. Use Stripe CLI for local testing:
```bash
stripe listen --forward-to localhost:4000/api/webhooks/stripe
```
2. Copy webhook secret to `.env.local`

#### Heat Safety API Issues
1. Verify weather API key in environment variables
2. Check network connectivity
3. Review API rate limits

### Getting Help

- **Documentation**: Check the `/docs` folder for detailed guides
- **API Reference**: Visit http://localhost:3001/docs when API is running
- **Error Logs**: Check browser console and server logs
- **Test Environment**: Use test accounts to verify functionality

## 📝 License

This project is proprietary software. All rights reserved.

## 🤝 Contributing

This is a private repository. For contribution guidelines, please contact the development team.

---

**Ready to play ball?** 🏀

Start with `npm run dev` and visit http://localhost:4000 to see your basketball league management platform in action!