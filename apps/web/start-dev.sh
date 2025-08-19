#!/bin/bash

echo "Starting development server..."
echo "================================"

# Set environment variables
export NODE_ENV=development
export PORT=3000

# Clear any existing Next.js cache
rm -rf .next

echo "Building application..."
npx next build --debug 2>&1 | tail -20

echo ""
echo "Starting server on port 3000..."
npx next start -p 3000