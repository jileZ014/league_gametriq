# REQUIRED ENVIRONMENT VARIABLES

## Critical Issues Found
1. **Inconsistent Supabase URLs** across different configs
2. **Hardcoded API keys** in configuration files (SECURITY RISK)
3. **Missing environment variables** for production deployment

## VERCEL ENVIRONMENT VARIABLES NEEDED

### Web App (apps/web)
```
NEXT_PUBLIC_SUPABASE_URL=https://mgfpbqvkhqjlvgeqaclj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1nZnBicXZraHFqbHZnZXFhY2xqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQzMDIzNDUsImV4cCI6MjA0OTg3ODM0NX0.G2v1cYDdpgXCJ9cJ_rtHJJfbKLEr0z6FCd3gRCqzSrc
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_STRIPE_KEY
NEXT_PUBLIC_API_URL=https://gametriq-api.vercel.app
NEXT_PUBLIC_WS_URL=wss://gametriq-api.vercel.app
NEXT_PUBLIC_APP_URL=https://gametriq-web.vercel.app
NEXT_PUBLIC_ENV=production
```

### API Server (apps/api)
```
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://user:pass@host:port/dbname
JWT_SECRET=your-super-secure-jwt-secret-here
JWT_EXPIRES_IN=7d
SUPABASE_URL=https://mgfpbqvkhqjlvgeqaclj.supabase.co
SUPABASE_SERVICE_KEY=your-service-key-here
STRIPE_SECRET_KEY=sk_live_YOUR_STRIPE_SECRET
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET
REDIS_URL=redis://user:pass@host:port
EMAIL_FROM=noreply@gametriq.com
EMAIL_SMTP_HOST=smtp.postmark.com
EMAIL_SMTP_PORT=587
EMAIL_SMTP_USER=your-smtp-user
EMAIL_SMTP_PASS=your-smtp-password
```

## NETLIFY ENVIRONMENT VARIABLES NEEDED

Same as Vercel but with Netlify-specific URLs:
```
NEXT_PUBLIC_API_URL=https://gametriq-api.netlify.app
NEXT_PUBLIC_WS_URL=wss://gametriq-api.netlify.app
NEXT_PUBLIC_APP_URL=https://gametriq-web.netlify.app
```

## SECURITY RECOMMENDATIONS

1. **REMOVE hardcoded keys** from all configuration files
2. **Use platform-specific environment variable management**
3. **Rotate the Supabase anonymous key** (it's exposed in multiple files)
4. **Use different keys for different environments** (staging vs production)

## ENVIRONMENT SETUP COMMANDS

### Vercel
```bash
# Web app
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add NEXT_PUBLIC_API_URL

# API
vercel env add DATABASE_URL
vercel env add JWT_SECRET
vercel env add STRIPE_SECRET_KEY
```

### Netlify
```bash
netlify env:set NEXT_PUBLIC_SUPABASE_URL "https://mgfpbqvkhqjlvgeqaclj.supabase.co"
netlify env:set NEXT_PUBLIC_API_URL "https://gametriq-api.netlify.app"
```