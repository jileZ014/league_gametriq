# Vercel Environment Variables Setup

## Required Environment Variables

### For Web Application (@gametriq-web)

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Stripe Configuration
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_key

# API Configuration
NEXT_PUBLIC_API_URL=https://gametriq-api.vercel.app
NEXT_PUBLIC_WS_URL=wss://gametriq-api.vercel.app

# Environment
NEXT_PUBLIC_ENV=production
```

### For API Application (@gametriq-api)

```bash
# Node Environment
NODE_ENV=production
PORT=3000

# Database
DATABASE_URL=postgresql://user:password@host:port/database

# JWT
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRES_IN=7d

# Supabase
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_KEY=your_supabase_service_role_key

# Stripe
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Redis
REDIS_URL=redis://user:password@host:port

# Email
EMAIL_FROM=noreply@gametriq.com
EMAIL_SMTP_HOST=smtp.your_provider.com
EMAIL_SMTP_PORT=587
EMAIL_SMTP_USER=your_smtp_user
EMAIL_SMTP_PASS=your_smtp_password
```

## Vercel CLI Commands

### Set Environment Variables

```bash
# For Web App
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY production
vercel env add NEXT_PUBLIC_API_URL production
vercel env add NEXT_PUBLIC_WS_URL production
vercel env add NEXT_PUBLIC_ENV production

# For API
vercel env add NODE_ENV production
vercel env add DATABASE_URL production
vercel env add JWT_SECRET production
vercel env add SUPABASE_URL production
vercel env add SUPABASE_SERVICE_KEY production
vercel env add STRIPE_SECRET_KEY production
vercel env add STRIPE_WEBHOOK_SECRET production
vercel env add REDIS_URL production
vercel env add EMAIL_FROM production
vercel env add EMAIL_SMTP_HOST production
vercel env add EMAIL_SMTP_PORT production
vercel env add EMAIL_SMTP_USER production
vercel env add EMAIL_SMTP_PASS production
```

### Environment Variable Priorities

1. Production variables for production deployments
2. Preview variables for preview deployments
3. Development variables for development

## Security Notes

- Never commit actual environment values to Git
- Use Vercel Secrets for sensitive data: `vercel secrets add secret-name value`
- Reference secrets in vercel.json with `@secret-name`
- Rotate secrets regularly
- Use different keys for development, staging, and production

## Deployment Flow

1. Set all required environment variables in Vercel dashboard or CLI
2. Test with preview deployment first
3. Deploy to production once verified
4. Monitor logs for any missing environment variables