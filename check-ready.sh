#!/bin/bash

echo "🔍 Checking if installation is ready..."
echo "================================================"

# Check if node_modules exists
if [ -d "apps/web/node_modules" ]; then
    echo "✅ node_modules folder exists"
    
    # Check if Firebase is installed
    if [ -d "apps/web/node_modules/firebase" ]; then
        echo "✅ Firebase is installed"
    else
        echo "⏳ Firebase not yet installed"
        exit 1
    fi
    
    # Check if react-firebase-hooks is installed
    if [ -d "apps/web/node_modules/react-firebase-hooks" ]; then
        echo "✅ react-firebase-hooks is installed"
    else
        echo "⏳ react-firebase-hooks not yet installed"
        exit 1
    fi
    
    # Check if we can run the dev server
    echo ""
    echo "🎉 Installation complete! Testing dev server..."
    echo "================================================"
    cd apps/web
    timeout 10s npm run dev
    
    if [ $? -eq 124 ]; then
        echo ""
        echo "✅ ✅ ✅ READY FOR DEMO! ✅ ✅ ✅"
        echo "================================================"
        echo "To start the application, run:"
        echo "  cd apps/web"
        echo "  npm run dev"
        echo ""
        echo "Then open: http://localhost:4000"
        echo ""
        echo "Demo accounts available (no login required):"
        echo "  - Demo Coach"
        echo "  - Demo Parent"
        echo "  - Demo Referee"
        echo "  - Demo Scorer"
        echo "  - Demo Admin"
    else
        echo "❌ Dev server failed to start"
        exit 1
    fi
else
    echo "⏳ Installation still in progress..."
    echo "   node_modules folder not yet created"
    echo ""
    echo "Run this command again in a minute:"
    echo "  bash check-ready.sh"
    exit 1
fi