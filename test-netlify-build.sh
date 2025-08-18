#!/bin/bash

# Test Netlify Build Locally
# This script simulates the Netlify build environment

echo "🧪 Testing Netlify build locally..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Set environment variables like Netlify does
export NODE_ENV=production
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
export HUSKY=0
export CI=true
export SKIP_ENV_VALIDATION=true
export NPM_FLAGS="--legacy-peer-deps"

echo -e "${YELLOW}📦 Installing dependencies...${NC}"

# Clean install
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps

# Navigate to web app
cd apps/web

# Clean and install web dependencies
rm -rf node_modules package-lock.json .next
npm install --legacy-peer-deps

echo -e "${YELLOW}🔨 Building Next.js app...${NC}"

# Build
npm run build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Build successful!${NC}"
    echo -e "${GREEN}The build would succeed on Netlify!${NC}"
    
    # Show build output size
    echo -e "${YELLOW}📊 Build Statistics:${NC}"
    du -sh .next
    
    echo -e "${YELLOW}💡 Next steps:${NC}"
    echo "1. Run 'netlify init' to connect to Netlify"
    echo "2. Run 'netlify deploy --prod' to deploy"
    echo "3. Or push to GitHub for automatic deployment"
else
    echo -e "${RED}❌ Build failed!${NC}"
    echo -e "${RED}Please fix the errors before deploying to Netlify.${NC}"
    exit 1
fi