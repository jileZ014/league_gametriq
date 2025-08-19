# IMMEDIATE RECOVERY PLAN - GAMETRIQ LEAGUE APP

## PHASE 1: BACKUP CURRENT STATE (5 minutes)
```bash
# Create backup branch
git checkout -b backup-broken-state
git add -A
git commit -m "Backup: Current broken state before recovery"
git checkout main
```

## PHASE 2: CREATE MINIMAL WORKING APP (30 minutes)

### Step 1: Create Fresh Next.js App
```bash
cd /mnt/c/Users/jange/Projects
npx create-next-app@latest gametriq-mvp --typescript --tailwind --app --src-dir
cd gametriq-mvp
```

### Step 2: Install Minimal Dependencies
```bash
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs
npm install lucide-react date-fns
```

### Step 3: Copy Core Business Logic
```bash
# Copy Supabase setup
cp "../Gametriq League App/apps/web/src/lib/supabase.ts" src/lib/
cp "../Gametriq League App/apps/web/src/lib/supabase-server.ts" src/lib/

# Copy database types
mkdir -p src/types
cp "../Gametriq League App/apps/web/src/types/database.types.ts" src/types/

# Copy essential components (manually review and simplify)
mkdir -p src/components
# Only copy what compiles cleanly
```

### Step 4: Create Basic Pages
```typescript
// src/app/page.tsx
export default function Home() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold">Gametriq League</h1>
      <p>Basketball League Management Platform</p>
    </div>
  )
}
```

### Step 5: Environment Variables
```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=your_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key_here
```

## PHASE 3: DEPLOY TO VERCEL (15 minutes)

### Step 1: Initialize Git
```bash
git init
git add -A
git commit -m "Initial MVP setup"
```

### Step 2: Deploy
```bash
vercel --prod
```

### Step 3: Verify Deployment
- Visit deployed URL
- Confirm basic page loads
- Check console for errors

## PHASE 4: INCREMENTAL FEATURE ADDITION (2-4 hours)

### Priority 1: Authentication (30 mins)
```bash
# Copy auth components
cp -r "../Gametriq League App/apps/web/src/app/auth" src/app/
# Simplify and test
```

### Priority 2: League Listing (30 mins)
```bash
# Copy league components
# Test deployment after adding
```

### Priority 3: Team Management (30 mins)
```bash
# Copy team components
# Test deployment after adding
```

### Priority 4: Game Scheduling (30 mins)
```bash
# Copy scheduling components
# Test deployment after adding
```

## PHASE 5: MIGRATE API (Optional - Later)

### Option A: Vercel Functions
```bash
# Create API routes in src/app/api/
```

### Option B: Separate API Deployment
```bash
# Deploy NestJS API separately
cd "../Gametriq League App/apps/api"
# Use emergency config for initial deploy
vercel --prod
```

## SUCCESS CRITERIA CHECKLIST

- [ ] Fresh Next.js app created
- [ ] Basic page displays "Gametriq League"
- [ ] Successfully deployed to Vercel
- [ ] URL is accessible and returns 200
- [ ] No console errors
- [ ] Authentication working
- [ ] Can create/view leagues
- [ ] Can manage teams
- [ ] Can schedule games

## FALLBACK PLAN

If Clean Slate fails:
1. Use create-react-app instead of Next.js
2. Deploy to Netlify with static export
3. Use Firebase instead of Supabase
4. Consider no-code platforms temporarily

## RECOVERY TIMELINE

- **Hour 1**: Backup and fresh setup
- **Hour 2**: Core features migration
- **Hour 3**: Deployment and testing
- **Hour 4**: Additional features

## POST-DEPLOYMENT

Once deployed:
1. Set up monitoring (Vercel Analytics)
2. Configure error tracking (Sentry)
3. Plan feature roadmap
4. Consider hiring DevOps help for complex features

## LESSONS LEARNED

1. **Start simple, iterate fast**
2. **Deploy early, deploy often**
3. **Avoid dependency bloat**
4. **Monorepos need proper tooling**
5. **Memory limits are real constraints**
6. **Emergency configs indicate deeper issues**
7. **Fresh starts are sometimes faster**

---

**Remember**: A working simple app is infinitely better than a complex broken one.