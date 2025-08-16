#!/bin/bash

# Basketball League App - Vercel Deployment Script
# This script deploys both web and API applications to Vercel

set -e  # Exit on any error

echo "🏀 Basketball League App - Vercel Deployment"
echo "============================================="

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Function to deploy web app
deploy_web() {
    echo "🌐 Deploying Web Application..."
    cd apps/web
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        echo "📦 Installing web dependencies..."
        npm install
    fi
    
    # Deploy to Vercel
    echo "🚀 Deploying to Vercel..."
    vercel --prod --confirm
    
    cd ../..
    echo "✅ Web app deployed successfully!"
}

# Function to deploy API
deploy_api() {
    echo "🔧 Deploying API Application..."
    cd apps/api
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        echo "📦 Installing API dependencies..."
        npm install
    fi
    
    # Install missing dependencies
    if [ ! -f "node_modules/@nestjs/cli/package.json" ]; then
        echo "🔧 Installing NestJS CLI..."
        npm install @nestjs/cli --save-dev
    fi
    
    if [ ! -f "node_modules/typescript/package.json" ]; then
        echo "🔧 Installing TypeScript..."
        npm install typescript --save-dev
    fi
    
    # Build the application
    echo "🔨 Building API..."
    npx nest build || npm run build:clean
    
    # Deploy to Vercel
    echo "🚀 Deploying to Vercel..."
    vercel --prod --confirm
    
    cd ../..
    echo "✅ API deployed successfully!"
}

# Function to set environment variables
setup_env_vars() {
    echo "🔐 Setting up environment variables..."
    
    # Check if .env.local exists
    if [ -f ".env.local" ]; then
        echo "📝 Found .env.local file. Please set these variables in Vercel:"
        echo "   1. Go to Vercel Dashboard > Project Settings > Environment Variables"
        echo "   2. Add the following variables from your .env.local:"
        echo ""
        grep -E "^[A-Z_]+" .env.local | sed 's/=.*//' | sort | uniq
        echo ""
        read -p "Press Enter when environment variables are set up..."
    else
        echo "⚠️  No .env.local found. Using environment setup guide..."
        echo "📖 Please refer to vercel-env-setup.md for environment variable setup"
    fi
}

# Function to run health checks
health_check() {
    echo "🏥 Running deployment health checks..."
    
    # Check for common issues
    echo "🔍 Checking for duplicate pages..."
    find apps/web -name "*.tsx" -path "*/pages/*" | sort > /tmp/pages.txt
    find apps/web -name "*.tsx" -path "*/app/*" | sort > /tmp/app_routes.txt
    
    if [ -s /tmp/pages.txt ] && [ -s /tmp/app_routes.txt ]; then
        echo "⚠️  Warning: Found both pages/ and app/ directories. This may cause conflicts."
        echo "   Consider using only one routing method."
    fi
    
    # Check for TypeScript errors
    echo "🔍 Checking TypeScript configuration..."
    if [ -f "apps/web/tsconfig.json" ]; then
        echo "✅ Web TypeScript config found"
    fi
    
    if [ -f "apps/api/tsconfig.json" ]; then
        echo "✅ API TypeScript config found"
    fi
    
    rm -f /tmp/pages.txt /tmp/app_routes.txt
}

# Main deployment function
main() {
    echo "🎯 Starting deployment process..."
    
    # Run health checks first
    health_check
    
    # Setup environment variables
    setup_env_vars
    
    # Ask user what to deploy
    echo "What would you like to deploy?"
    echo "1) Web app only"
    echo "2) API only"
    echo "3) Both (recommended)"
    echo "4) Exit"
    
    read -p "Enter your choice (1-4): " choice
    
    case $choice in
        1)
            deploy_web
            ;;
        2)
            deploy_api
            ;;
        3)
            deploy_web
            deploy_api
            ;;
        4)
            echo "👋 Deployment cancelled"
            exit 0
            ;;
        *)
            echo "❌ Invalid choice. Please run the script again."
            exit 1
            ;;
    esac
    
    echo ""
    echo "🎉 Deployment completed successfully!"
    echo "📖 Next steps:"
    echo "   1. Test your deployed applications"
    echo "   2. Set up custom domains (optional)"
    echo "   3. Configure monitoring and alerts"
    echo "   4. Update DNS records if needed"
    echo ""
    echo "🔗 Useful links:"
    echo "   - Vercel Dashboard: https://vercel.com/dashboard"
    echo "   - Environment Setup: ./vercel-env-setup.md"
    echo "   - Deployment Guide: ./DEPLOYMENT_CHECKLIST.md"
}

# Run main function
main "$@"