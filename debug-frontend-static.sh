#!/bin/bash

# Debug script for frontend static files issue
echo "🔍 Debugging frontend static files issue..."

echo "📋 Current issues:"
echo "- 404 errors for /_next/static/ files"
echo "- Website stuck on 'Đang tải...'"
echo "- API endpoints work but frontend doesn't load"

echo ""
echo "🔧 Checking current configuration..."

echo ""
echo "1. Nginx configuration:"
head -20 nginx.conf

echo ""
echo "2. Next.js configuration:"
head -15 frontend/next.config.js

echo ""
echo "3. Environment variables (production):"
grep -E "(NEXT_PUBLIC|API_URL|DOMAIN)" .env.production || echo "No .env.production found"

echo ""
echo "🚀 Proposed fixes:"
echo "1. Update nginx.conf with proper static file handling"
echo "2. Fix domain mismatch in environment variables"
echo "3. Ensure Next.js standalone build serves static files correctly"

echo ""
echo "📝 Next steps:"
echo "1. Apply nginx.conf fixes"
echo "2. Update environment variables"
echo "3. Rebuild and test"
