#!/bin/bash

# Pre-deployment validation script
# Checks for common issues before deploying to Vercel

echo "🔍 Pre-deployment Validation Checklist"
echo "======================================"

ERRORS=0
WARNINGS=0

# Function to log errors
log_error() {
    echo "❌ ERROR: $1"
    ((ERRORS++))
}

# Function to log warnings
log_warning() {
    echo "⚠️  WARNING: $1"
    ((WARNINGS++))
}

# Function to log success
log_success() {
    echo "✅ $1"
}

echo "🏀 Checking Basketball League App for deployment readiness..."

# Check if this is the correct directory
if [ ! -f "package.json" ] || [ ! -d "apps" ]; then
    log_error "Not in correct project directory. Please run from project root."
    exit 1
fi

# Check project structure
echo ""
echo "📁 Checking project structure..."
if [ -d "apps/web" ]; then
    log_success "Web app directory found"
else
    log_error "Web app directory missing"
fi

if [ -d "apps/api" ]; then
    log_success "API directory found"
else
    log_error "API directory missing"
fi

# Check configuration files
echo ""
echo "⚙️  Checking configuration files..."
if [ -f "vercel.json" ]; then
    log_success "Root vercel.json found"
else
    log_error "Root vercel.json missing"
fi

if [ -f "apps/web/vercel.json" ]; then
    log_success "Web vercel.json found"
else
    log_error "Web vercel.json missing"
fi

if [ -f "apps/api/vercel.json" ]; then
    log_success "API vercel.json found"
else
    log_error "API vercel.json missing"
fi

# Check for environment files
echo ""
echo "🔐 Checking environment configuration..."
if [ -f ".env.local" ] || [ -f "apps/web/.env.local" ]; then
    log_success "Environment files found"
    log_warning "Remember to set these variables in Vercel dashboard"
else
    log_warning "No local environment files found"
fi

# Check for common file conflicts
echo ""
echo "🔍 Checking for potential conflicts..."

# Check for duplicate pages
if [ -d "apps/web/pages" ] && [ -d "apps/web/app" ]; then
    log_warning "Both pages/ and app/ directories found. This may cause routing conflicts."
fi

# Check for TypeScript files
if [ -f "apps/web/tsconfig.json" ]; then
    log_success "Web TypeScript configuration found"
else
    log_warning "Web TypeScript configuration missing"
fi

if [ -f "apps/api/tsconfig.json" ]; then
    log_success "API TypeScript configuration found"
else
    log_warning "API TypeScript configuration missing"
fi

# Check package.json files
echo ""
echo "📦 Checking package configurations..."
if [ -f "apps/web/package.json" ]; then
    log_success "Web package.json found"
    
    # Check for Next.js
    if grep -q "next" "apps/web/package.json"; then
        log_success "Next.js dependency found"
    else
        log_error "Next.js dependency missing in web package.json"
    fi
else
    log_error "Web package.json missing"
fi

if [ -f "apps/api/package.json" ]; then
    log_success "API package.json found"
    
    # Check for NestJS
    if grep -q "@nestjs/core" "apps/api/package.json"; then
        log_success "NestJS dependency found"
    else
        log_error "NestJS dependency missing in API package.json"
    fi
else
    log_error "API package.json missing"
fi

# Check for .vercelignore files
echo ""
echo "🚫 Checking .vercelignore files..."
if [ -f ".vercelignore" ]; then
    log_success "Root .vercelignore found"
else
    log_warning "Root .vercelignore missing (recommended)"
fi

# Check for sensitive files that shouldn't be deployed
echo ""
echo "🔒 Checking for sensitive files..."
if [ -f ".env" ] || [ -f "apps/web/.env" ] || [ -f "apps/api/.env" ]; then
    log_error "Found .env files that should not be committed. Use .env.local instead."
fi

# Summary
echo ""
echo "📊 Validation Summary"
echo "===================="
if [ $ERRORS -eq 0 ]; then
    log_success "No errors found! Ready for deployment."
    echo ""
    echo "🚀 You can now run:"
    echo "   ./deploy-vercel.sh     (full deployment)"
    echo "   ./quick-deploy.sh      (emergency deployment)"
    echo ""
    echo "📋 Don't forget to:"
    echo "   1. Set environment variables in Vercel"
    echo "   2. Test the deployment"
    echo "   3. Monitor for errors"
else
    echo "❌ Found $ERRORS error(s) that must be fixed before deployment"
    echo "⚠️  Found $WARNINGS warning(s) that should be addressed"
    echo ""
    echo "🔧 Please fix the errors above before deploying"
    exit 1
fi

if [ $WARNINGS -gt 0 ]; then
    echo "⚠️  Found $WARNINGS warning(s) - deployment possible but issues should be addressed"
fi

echo ""
echo "📖 For more information, see:"
echo "   - vercel-env-setup.md"
echo "   - DEPLOYMENT_CHECKLIST.md"