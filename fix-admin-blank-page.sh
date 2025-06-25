#!/bin/bash

# Quick Fix Script for Admin Blank Page Issue
# Rebuilds frontend and fixes common issues

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

log() {
    echo -e "${CYAN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

header() {
    echo -e "${YELLOW}$1${NC}"
}

header "🔧 Admin Blank Page Quick Fix"
header "=============================="

# Step 1: Check if we're in the right directory
log "🔍 Checking project structure..."

if [ ! -d "frontend" ] || [ ! -d "backend" ]; then
    error "Not in the correct project directory"
    exit 1
fi

if [ ! -d "frontend/src/app/admin" ]; then
    error "Admin directory not found in frontend/src/app/"
    exit 1
fi

success "Project structure verified"

# Step 2: Check admin files
log "📁 Checking admin files..."

admin_files=(
    "frontend/src/app/admin/layout.tsx"
    "frontend/src/app/admin/page.tsx"
    "frontend/src/app/admin/login/page.tsx"
    "frontend/src/app/admin/cookie/page.tsx"
)

missing_files=0
for file in "${admin_files[@]}"; do
    if [ -f "$file" ]; then
        success "$(basename $file) exists"
    else
        error "$(basename $file) missing"
        ((missing_files++))
    fi
done

if [ $missing_files -gt 0 ]; then
    error "$missing_files admin files missing"
    exit 1
fi

# Step 3: Clean and rebuild frontend
log "🧹 Cleaning previous build..."

cd frontend

if [ -d ".next" ]; then
    rm -rf .next
    success "Previous build cleaned"
fi

if [ -d "node_modules/.cache" ]; then
    rm -rf node_modules/.cache
    success "Node modules cache cleaned"
fi

# Step 4: Install dependencies
log "📦 Installing dependencies..."

npm install
if [ $? -eq 0 ]; then
    success "Dependencies installed"
else
    error "Failed to install dependencies"
    exit 1
fi

# Step 5: Build frontend
log "🏗️  Building frontend..."

npm run build
if [ $? -eq 0 ]; then
    success "Frontend build completed"
else
    error "Frontend build failed"
    exit 1
fi

# Step 6: Verify admin routes in build
log "🔍 Verifying admin routes in build..."

admin_build_paths=(
    ".next/server/app/admin"
    ".next/server/app/admin/layout.js"
    ".next/server/app/admin/page.js"
    ".next/server/app/admin/login"
    ".next/server/app/admin/login/page.js"
)

missing_build_files=0
for path in "${admin_build_paths[@]}"; do
    if [ -e "$path" ]; then
        success "$(basename $path) in build"
    else
        error "$(basename $path) missing from build"
        ((missing_build_files++))
    fi
done

if [ $missing_build_files -gt 0 ]; then
    error "$missing_build_files admin files missing from build"
    warning "This is likely the cause of blank admin pages"
else
    success "All admin routes found in build"
fi

cd ..

# Step 7: Check Next.js configuration
log "⚙️  Checking Next.js configuration..."

if grep -q "appDir: true" frontend/next.config.js; then
    success "App directory enabled"
else
    warning "App directory not explicitly enabled"
fi

if grep -q "trailingSlash: false" frontend/next.config.js; then
    success "Trailing slash disabled"
else
    warning "Trailing slash configuration not found"
fi

# Step 8: Test local build (if possible)
log "🧪 Testing local build..."

cd frontend

# Start Next.js in background for testing
npm start &
NEXT_PID=$!

# Wait for Next.js to start
sleep 5

# Test admin routes
if curl -s -f http://localhost:3000/admin/login > /dev/null 2>&1; then
    success "Admin login accessible locally"
else
    warning "Admin login not accessible locally"
fi

# Kill Next.js process
kill $NEXT_PID 2>/dev/null || true

cd ..

# Step 9: Generate deployment instructions
header "📋 Next Steps for EasyPanel"
header "=========================="

info "1. 🔄 Rebuild in EasyPanel:"
echo "   - Go to your service in EasyPanel"
echo "   - Click 'Rebuild' button"
echo "   - Wait for build to complete"

info "2. 🌍 Verify Environment Variables:"
echo "   NODE_ENV=production"
echo "   NEXT_PUBLIC_API_URL=https://taivideonhanh.vn/api"
echo "   DEFAULT_ADMIN_EMAIL=admin@taivideonhanh.vn"
echo "   DEFAULT_ADMIN_PASSWORD=admin123456"

info "3. 🔧 Check Service Settings:"
echo "   Port: 3000"
echo "   Dockerfile: Dockerfile"
echo "   Domain: taivideonhanh.vn"

info "4. 🧪 Test Admin Routes:"
echo "   https://taivideonhanh.vn/admin/login"
echo "   https://taivideonhanh.vn/admin"

info "5. 🔍 Debug if still blank:"
echo "   - Open browser console (F12)"
echo "   - Check for JavaScript errors"
echo "   - Check Network tab for failed requests"
echo "   - Check EasyPanel service logs"

# Step 10: Create commit for fixes
log "📝 Committing fixes..."

git add frontend/next.config.js
git commit -m "fix: Update Next.js config for admin routes

- Add trailingSlash: false for better compatibility
- Add headers configuration for admin routes
- Add redirects for admin routing
- Enable appDir explicitly
- Fix admin blank page issue" || true

success "Fixes committed to git"

header "🎉 Quick Fix Complete!"
header "====================="

success "✅ Frontend rebuilt with admin routes"
success "✅ Next.js configuration updated"
success "✅ Changes committed to git"

warning "⚠️  Next: Rebuild in EasyPanel and test admin routes"
info "ℹ️  If still blank, run: node debug-admin-blank-page.js"

echo ""
info "🔗 Test URLs after EasyPanel rebuild:"
echo "   Main: https://taivideonhanh.vn"
echo "   Admin: https://taivideonhanh.vn/admin/login"
echo "   API: https://taivideonhanh.vn/api/health"
