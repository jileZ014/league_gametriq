#!/bin/bash

# Launch Modern Portal with Legacy Youth Sports Branding
# Sprint 6 - Phoenix Youth Basketball League

echo "🏀 Legacy Youth Sports - Basketball League Portal"
echo "================================================"
echo "🎨 Modern UI: Enabled"
echo "🏆 Feature: PUBLIC_PORTAL_MODERN=1"
echo "📍 Market: Phoenix, Arizona"
echo "👥 Scale: 80+ leagues, 3,500+ teams"
echo ""
echo "Starting development server..."
echo ""

# Set environment variables
export NEXT_PUBLIC_UI_MODERN_V1=1
export NEXT_PUBLIC_PUBLIC_PORTAL_MODERN=1
export NEXT_PUBLIC_ORGANIZATION_NAME="Legacy Youth Sports"
export NEXT_PUBLIC_PRIMARY_COLOR="#fbbf24"
export NEXT_PUBLIC_SECONDARY_COLOR="#000000"

# Check if dev server is running
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
    echo "✅ Dev server already running on port 3000"
else
    echo "🚀 Starting Next.js dev server..."
    npm run dev &
    DEV_PID=$!
    echo "Waiting for server to start..."
    sleep 5
fi

echo ""
echo "🌐 Launching browser with Modern UI..."
echo "================================================"

# Launch headed browser review
node tools/runHeadedReview.js &

echo ""
echo "📊 Dashboard URLs:"
echo "  - Public Portal: http://localhost:3000/portal?PUBLIC_PORTAL_MODERN=1"
echo "  - Teams: http://localhost:3000/portal/teams?PUBLIC_PORTAL_MODERN=1"
echo "  - Schedule: http://localhost:3000/portal/schedule?PUBLIC_PORTAL_MODERN=1"
echo "  - Standings: http://localhost:3000/portal/standings?PUBLIC_PORTAL_MODERN=1"
echo ""
echo "🧪 Test Commands:"
echo "  - npm run test:public           # Run portal tests"
echo "  - npm run test:public:headed    # Run with browser"
echo "  - npm run test:public:perf      # Performance tests"
echo "  - npm run test:public:a11y      # Accessibility tests"
echo ""
echo "✨ Legacy Youth Sports Portal Ready!"
echo "================================================"
echo ""
echo "Press Ctrl+C to stop all processes"

# Wait for user interrupt
wait