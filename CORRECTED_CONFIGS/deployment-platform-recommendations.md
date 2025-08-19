# DEPLOYMENT PLATFORM RECOMMENDATIONS

## CRITICAL ISSUES CAUSING 13+ MINUTE HANGS AND 404 ERRORS

### ROOT CAUSES IDENTIFIED:

1. **Monorepo Structure Confusion**: Multiple competing configuration files
2. **Build Command Conflicts**: Different commands for same targets
3. **Output Directory Mismatches**: Conflicting output specifications
4. **Environment Variable Chaos**: Inconsistent URLs and hardcoded secrets
5. **Framework Detection Failures**: Incorrect or missing framework specifications

## IMMEDIATE ACTIONS REQUIRED

### 1. CLEAN UP CONFLICTING CONFIGURATIONS

**Remove or rename these files:**
- `/vercel.json` (root) - Conflicts with apps/web/vercel.json
- `/basketball-mvp/` entire directory - Separate outdated app
- `/apps/web/.env.local` - Contains hardcoded production secrets

**Use only these configurations:**
- `/apps/web/vercel.json` (corrected version provided)
- `/apps/api/vercel.json` (corrected version provided)  
- `/netlify.toml` (corrected version provided)

### 2. PLATFORM-SPECIFIC RECOMMENDATIONS

## FOR VERCEL DEPLOYMENT (RECOMMENDED)

### Why Vercel is Better for This Project:
- ✅ Native Next.js support and optimization
- ✅ Better API routes handling with serverless functions
- ✅ Automatic framework detection
- ✅ Built-in environment variable management
- ✅ Better monorepo support

### Vercel Deployment Steps:
1. Delete root `/vercel.json`
2. Use corrected `/apps/web/vercel.json`
3. Set environment variables via Vercel dashboard (NEVER hardcode)
4. Deploy web and API as separate projects:
   - Web: `gametriq-web.vercel.app`  
   - API: `gametriq-api.vercel.app`

### Vercel Build Commands:
```bash
# Web App
cd apps/web && npm ci --legacy-peer-deps && npm run build

# API
cd apps/api && npm ci --legacy-peer-deps && npm run build:clean
```

## FOR NETLIFY DEPLOYMENT (ALTERNATIVE)

### Netlify Challenges for This Project:
- ⚠️ Next.js support requires additional plugin configuration
- ⚠️ API routes need separate function deployment
- ⚠️ More complex monorepo handling
- ⚠️ Environment variable management more manual

### Netlify Deployment Steps:
1. Use corrected `/netlify.toml`
2. Set base directory to `apps/web`
3. Install `@netlify/plugin-nextjs` plugin
4. Deploy API separately as Netlify Functions

## WHY DEPLOYMENTS ARE FAILING

### Vercel Issues:
1. **13+ Minute Hangs**: Root vercel.json build command `echo 'Build complete'` does nothing
2. **404 Errors**: Framework detection fails due to conflicting configurations
3. **Build Failures**: TypeScript errors ignored in production but still fail build
4. **API Route Issues**: `output: 'standalone'` conflicts with static file routing

### Netlify Issues:
1. **Build Errors**: Overly complex build command chains failing
2. **Plugin Conflicts**: Missing or misconfigured Next.js plugin
3. **Environment Variables**: Hardcoded values in configs instead of Netlify env vars
4. **API Routing**: Incorrect API proxy configuration

## RECOMMENDED DEPLOYMENT STRATEGY

### OPTION 1: Vercel (Recommended)
```bash
# Clean deployment
1. Remove root vercel.json
2. Deploy apps/web to gametriq-web.vercel.app
3. Deploy apps/api to gametriq-api.vercel.app  
4. Set all environment variables via Vercel dashboard
5. Use corrected configurations provided
```

### OPTION 2: Netlify (If Vercel not preferred)
```bash
# Clean deployment  
1. Use corrected netlify.toml
2. Set base directory to apps/web
3. Configure environment variables in Netlify dashboard
4. Deploy API separately as Netlify Functions
```

### OPTION 3: Hybrid (Best Performance)
```bash
# Frontend: Netlify for CDN optimization
# API: Vercel for better Node.js/NestJS support
```

## CONFIGURATION FILE PRIORITY

**Use ONLY these corrected files:**
1. `/CORRECTED_CONFIGS/apps-web-vercel.json` → `/apps/web/vercel.json`
2. `/CORRECTED_CONFIGS/apps-web-next.config.js` → `/apps/web/next.config.js`
3. `/CORRECTED_CONFIGS/apps-api-vercel.json` → `/apps/api/vercel.json`
4. `/CORRECTED_CONFIGS/netlify.toml` → `/netlify.toml` (if using Netlify)

## SECURITY FIXES REQUIRED

1. **Remove hardcoded API keys** from all config files
2. **Use platform environment variables** instead
3. **Rotate Supabase keys** (compromised by being in configs)
4. **Use different keys per environment**

## BUILD OPTIMIZATION

### Next.js Configuration:
- ✅ `output: 'standalone'` for Vercel
- ❌ Remove `ignoreBuildErrors: true` 
- ✅ Enable TypeScript checking
- ✅ Optimize images and static assets

### API Configuration:
- ✅ Use `dist/main.js` not `dist/main.emergency.js`
- ✅ Proper NestJS build with all features
- ✅ Environment validation enabled
- ✅ Proper error handling and logging

## TESTING DEPLOYMENT

### Pre-deployment Checklist:
```bash
# Test builds locally
cd apps/web && npm run build
cd apps/api && npm run build

# Check for TypeScript errors
npm run typecheck

# Test production build
npm run start:prod
```

### Post-deployment Verification:
1. Check all routes respond correctly
2. Verify API endpoints work
3. Test environment variable loading
4. Check static asset loading
5. Verify WebSocket connections

## IMMEDIATE NEXT STEPS

1. **STOP current deployments** (they will continue to fail)
2. **Clean up conflicting configurations**  
3. **Set environment variables properly**
4. **Use corrected configuration files**
5. **Deploy to single platform first** (recommend Vercel)
6. **Test thoroughly before going to production**