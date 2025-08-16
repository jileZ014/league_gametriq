#!/bin/bash

# Quick Emergency Deployment Script
# For when you need to deploy fast without full checks

set -e

echo "🚨 EMERGENCY DEPLOYMENT - Basketball League App"
echo "==============================================="

# Install Vercel CLI if needed
if ! command -v vercel &> /dev/null; then
    echo "📦 Installing Vercel CLI..."
    npm install -g vercel
fi

# Deploy web app with minimal setup
echo "🌐 Quick deploying web app..."
cd apps/web

# Set required environment variables for build
export CI=false
export SKIP_ENV_VALIDATION=1

# Deploy directly
vercel --prod --confirm --force

cd ../..

echo "✅ Emergency deployment completed!"
echo "🔗 Check your Vercel dashboard for deployment status"

# Display important post-deployment steps
echo ""
echo "⚠️  IMPORTANT POST-DEPLOYMENT STEPS:"
echo "1. Set environment variables in Vercel dashboard"
echo "2. Test all critical features"
echo "3. Check for any runtime errors"
echo "4. Set up proper monitoring"
echo ""
echo "📋 Environment variables needed:"
echo "- NEXT_PUBLIC_SUPABASE_URL"
echo "- NEXT_PUBLIC_SUPABASE_ANON_KEY"
echo "- NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"
echo "- NEXT_PUBLIC_API_URL"
echo ""
echo "📖 See vercel-env-setup.md for complete setup guide"