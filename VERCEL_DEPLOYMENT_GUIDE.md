# Vercel Deployment Guide - Basketball League App

## Overview

This guide covers deploying the Basketball League Management Platform to Vercel, including both the Next.js web application and NestJS API.

## Quick Start

### 1. Pre-deployment Check
```bash
./pre-deploy-check.sh
```

### 2. Full Deployment
```bash
./deploy-vercel.sh
```

### 3. Emergency Deployment (Web only)
```bash
./quick-deploy.sh
```

## Project Structure

```
gametriq-league-app/
├── vercel.json                 # Root monorepo configuration
├── .vercelignore              # Global ignore rules
├── apps/
│   ├── web/
│   │   ├── vercel.json        # Web app configuration
│   │   └── .vercelignore      # Web-specific ignores
│   └── api/
│       ├── vercel.json        # API configuration
│       └── .vercelignore      # API-specific ignores
└── deployment scripts...
```

## Configuration Files

### Root `vercel.json`
- Configures monorepo deployment
- Routes API requests to serverless functions
- Sets up environment variables for both apps

### Web App `vercel.json`
- Next.js framework configuration
- Security headers
- API proxy settings
- Build optimization settings

### API `vercel.json`
- NestJS serverless configuration
- Function timeout and memory settings
- CORS headers
- Route handling

## Environment Variables

### Required for Web App
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_WS_URL`
- `NEXT_PUBLIC_ENV`

### Required for API
- `NODE_ENV`
- `DATABASE_URL`
- `JWT_SECRET`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `REDIS_URL`
- Email configuration variables

See `vercel-env-setup.md` for detailed setup instructions.

## Deployment Methods

### Method 1: Vercel CLI (Recommended)

1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Login to Vercel:
   ```bash
   vercel login
   ```

3. Deploy web app:
   ```bash
   cd apps/web
   vercel --prod
   ```

4. Deploy API:
   ```bash
   cd apps/api
   vercel --prod
   ```

### Method 2: Git Integration

1. Connect repository to Vercel dashboard
2. Set up environment variables
3. Configure build settings for each app
4. Enable automatic deployments

### Method 3: GitHub Actions (Future)

Automated deployment pipeline using GitHub Actions workflow.

## Build Configuration

### Web App Build
- Framework: Next.js
- Build Command: `npm run build`
- Output Directory: `.next`
- Node Version: 18.x

### API Build
- Runtime: Node.js 18.x
- Build Command: `nest build`
- Output Directory: `dist`
- Serverless Function: `dist/main.js`

## Common Issues & Solutions

### Build Failures

1. **TypeScript Errors**
   - Set `CI=false` in build environment
   - Use `SKIP_ENV_VALIDATION=1`

2. **Missing Dependencies**
   - Ensure all packages are in `dependencies`, not `devDependencies`
   - Run `npm install` before deployment

3. **Duplicate Routes**
   - Remove either `pages/` or `app/` directory
   - Use only one Next.js routing method

### Runtime Issues

1. **Environment Variables Not Set**
   - Check Vercel dashboard settings
   - Ensure variables match exactly

2. **CORS Errors**
   - Check API headers configuration
   - Verify domain whitelist

3. **Database Connection**
   - Ensure DATABASE_URL is correct
   - Check network access permissions

## Monitoring & Debugging

### Vercel Dashboard
- Function logs
- Build logs
- Performance metrics
- Error tracking

### Local Testing
```bash
# Test web app locally
cd apps/web
npm run dev

# Test API locally
cd apps/api
npm run start:dev
```

### Production Testing
- Test all API endpoints
- Verify authentication flow
- Check real-time features
- Test payment integration

## Security Considerations

1. **Environment Variables**
   - Use Vercel Secrets for sensitive data
   - Rotate keys regularly
   - Never commit secrets to Git

2. **Headers**
   - Security headers configured
   - CORS properly set
   - XSS protection enabled

3. **Functions**
   - Timeout limits set
   - Memory limits configured
   - Error handling implemented

## Performance Optimization

### Web App
- Static generation where possible
- Image optimization enabled
- Code splitting configured
- CDN delivery

### API
- Serverless function optimization
- Database connection pooling
- Caching strategies
- Rate limiting

## Rollback Procedures

1. **Immediate Rollback**
   ```bash
   vercel rollback [deployment-url]
   ```

2. **Redeploy Previous Version**
   ```bash
   git revert [commit-hash]
   git push
   ```

3. **Emergency Static Site**
   - Deploy static HTML files
   - Use backup hosting service
   - Redirect traffic temporarily

## Cost Optimization

### Vercel Pro Features
- Better performance
- More build minutes
- Advanced analytics
- Team collaboration

### Function Optimization
- Minimize cold starts
- Optimize bundle size
- Use appropriate memory settings
- Monitor execution time

## Support & Troubleshooting

### Logs
```bash
vercel logs [deployment-url]
```

### Debug Mode
```bash
vercel dev --debug
```

### Community Resources
- Vercel Documentation
- Next.js Community
- NestJS Discord
- Stack Overflow

## Next Steps After Deployment

1. **Domain Setup**
   - Configure custom domain
   - Set up SSL certificates
   - Update DNS records

2. **Monitoring**
   - Set up error tracking
   - Configure performance monitoring
   - Set up uptime monitoring

3. **CI/CD**
   - Implement automated testing
   - Set up staging environment
   - Configure deployment hooks

4. **Scaling**
   - Monitor usage patterns
   - Optimize performance bottlenecks
   - Plan for traffic growth

## Emergency Contacts

- Vercel Support: https://vercel.com/support
- Technical Lead: [Your contact]
- Project Manager: [Your contact]

---

**Remember**: Always test deployments in preview mode before promoting to production!