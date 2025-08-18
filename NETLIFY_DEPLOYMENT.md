# Netlify Deployment Guide for Gametriq League App

## 🚀 Quick Start

### Prerequisites
1. Netlify account (free at netlify.com)
2. Node.js 18+ installed
3. Git repository connected to GitHub

### Option 1: Deploy via Netlify UI (Recommended)

1. **Connect Repository**
   - Go to [Netlify Dashboard](https://app.netlify.com)
   - Click "Add new site" → "Import an existing project"
   - Choose GitHub and select `league_gametriq` repository

2. **Configure Build Settings**
   - Base directory: `apps/web`
   - Build command: `npm install --legacy-peer-deps && npm run build`
   - Publish directory: `apps/web/.next`
   - Click "Deploy site"

3. **Environment Variables** (Add in Site Settings → Environment Variables)
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   NEXT_PUBLIC_API_URL=your_api_url
   PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
   HUSKY=0
   ```

### Option 2: Deploy via CLI

1. **Install Netlify CLI**
   ```bash
   npm install -g netlify-cli
   ```

2. **Login to Netlify**
   ```bash
   netlify login
   ```

3. **Initialize Site**
   ```bash
   netlify init
   ```
   - Choose "Create & configure a new site"
   - Select your team
   - Choose a site name (or leave blank for random)

4. **Deploy**
   ```bash
   # Manual deploy
   netlify deploy --prod

   # Or use our script
   chmod +x deploy-netlify.sh
   ./deploy-netlify.sh
   ```

### Option 3: Continuous Deployment

Once connected via Option 1, every push to `main` branch will trigger automatic deployment.

## 📁 Project Configuration

### netlify.toml Configuration
The `netlify.toml` file in the root contains:
- Build settings optimized for Next.js monorepo
- Environment variables to prevent hanging (puppeteer, husky)
- Caching headers for performance
- API proxy configuration
- Security headers

### Key Features Configured:
✅ **Monorepo Support** - Builds from `apps/web` directory
✅ **Cross-platform Commands** - Works on Linux (Netlify's environment)
✅ **Dependency Optimization** - Uses `--legacy-peer-deps` to avoid conflicts
✅ **No Hanging** - Skips puppeteer chromium download and husky install
✅ **Next.js Plugin** - Automatic optimization for Next.js apps
✅ **API Proxy** - Routes `/api/*` to your backend

## 🔧 Local Testing

Test the production build locally:
```bash
cd apps/web
npm run build
npm run start
```

Test with Netlify Dev:
```bash
netlify dev
```

## 🌐 API Deployment Options

Since Netlify is primarily for static/JAMstack sites, deploy your API separately:

### Recommended API Hosting:
1. **Railway** (Easy & Fast)
   ```bash
   cd apps/api
   railway login
   railway init
   railway up
   ```

2. **Render** (Free tier available)
   - Create new Web Service at render.com
   - Connect GitHub repo
   - Set root directory to `apps/api`
   - Build: `npm install && npm run build`
   - Start: `npm run start:prod`

3. **Heroku** (Paid only now)
   ```bash
   cd apps/api
   heroku create gametriq-api
   git push heroku main
   ```

4. **Netlify Functions** (Serverless)
   - Create functions in `netlify/functions/`
   - Limited to 10 second execution time

## 📝 Environment Variables

### Required for Web App:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# API Backend
NEXT_PUBLIC_API_URL=https://your-api.herokuapp.com

# Optional
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
NEXT_PUBLIC_WS_URL=wss://your-api.herokuapp.com
```

### Build Environment (Already in netlify.toml):
```env
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
HUSKY=0
NODE_ENV=production
NPM_FLAGS=--legacy-peer-deps
```

## 🐛 Troubleshooting

### Build Fails
1. **Check Node version**: Netlify uses Node 18 by default
2. **Clear cache**: In Netlify UI → Deploys → Trigger deploy → Clear cache and deploy
3. **Check logs**: Look for specific error messages in deploy logs

### 404 Errors
- Ensure `_redirects` file is in `apps/web/public/`
- Check that Next.js routing is configured properly
- Verify the publish directory is `.next`

### API Connection Issues
1. Update API URL in environment variables
2. Check CORS configuration on your API
3. Ensure API is deployed and accessible

### Slow Builds
- Use `--legacy-peer-deps` (already configured)
- Exclude unnecessary files with `.netlifyignore`
- Enable build caching in Netlify settings

## ✅ Why Netlify Over Vercel

### Advantages:
1. **No Hanging Issues** - Netlify handles monorepos better
2. **Better Static Site Support** - Optimized for JAMstack
3. **Free Tier** - 100GB bandwidth, 300 build minutes
4. **Simple Configuration** - One `netlify.toml` file
5. **Instant Rollbacks** - Easy to revert deployments
6. **Built-in Forms** - Free form handling
7. **Edge Functions** - Run code at edge locations

### What Was Fixed:
- ✅ Removed complex Vercel configuration
- ✅ Added puppeteer skip to prevent hangs
- ✅ Configured for Next.js with proper plugin
- ✅ Set up proper build commands for monorepo
- ✅ Added comprehensive error handling

## 📊 Monitoring

1. **Deploy Status**: Check at app.netlify.com
2. **Analytics**: Enable in Site Settings → Analytics
3. **Functions Logs**: View in Functions tab
4. **Build Logs**: Available for each deploy

## 🚢 Deploy Commands Summary

```bash
# First time setup
npm install -g netlify-cli
netlify login
netlify init

# Deploy
netlify deploy --prod        # Production deploy
netlify deploy              # Draft deploy
netlify open               # Open site in browser
netlify status            # Check status

# Development
netlify dev              # Local development with Netlify features
netlify env:list        # List environment variables
```

## 📞 Support

- [Netlify Docs](https://docs.netlify.com)
- [Netlify Community](https://community.netlify.com)
- [Next.js on Netlify](https://docs.netlify.com/frameworks/next-js/)

---

Your app should now deploy successfully on Netlify without the Vercel hanging issues! 🎉