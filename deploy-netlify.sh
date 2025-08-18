#!/bin/bash

# Netlify Deployment Script for Gametriq League App
# This script prepares and deploys the web app to Netlify

echo "🚀 Starting Netlify deployment process..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Netlify CLI is installed
if ! command -v netlify &> /dev/null; then
    echo -e "${RED}❌ Netlify CLI is not installed${NC}"
    echo "Installing Netlify CLI globally..."
    npm install -g netlify-cli
fi

# Navigate to project root
cd "$(dirname "$0")"

echo -e "${YELLOW}📦 Installing dependencies...${NC}"
# Install root dependencies
npm install --legacy-peer-deps

# Navigate to web app
cd apps/web

# Install web app dependencies
npm install --legacy-peer-deps

echo -e "${YELLOW}🔨 Building the application...${NC}"
# Build the Next.js app
npm run build

# Check if build was successful
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Build successful!${NC}"
else
    echo -e "${RED}❌ Build failed. Please check the errors above.${NC}"
    exit 1
fi

echo -e "${YELLOW}🌐 Deploying to Netlify...${NC}"

# Deploy to Netlify
cd ../..  # Back to root
netlify deploy --prod --dir=apps/web/.next --site=$NETLIFY_SITE_ID

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Deployment successful!${NC}"
    echo -e "${GREEN}Your site is now live on Netlify!${NC}"
else
    echo -e "${RED}❌ Deployment failed. Please check your Netlify configuration.${NC}"
    exit 1
fi