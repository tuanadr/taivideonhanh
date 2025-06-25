#!/bin/bash

# Deploy Admin Routes Script
# Rebuilds frontend with admin routes and deploys to production

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

log "🚀 Starting Admin Routes Deployment"
echo "=================================================="

# Step 1: Clean previous build
log "🧹 Cleaning previous build..."
cd frontend
if [ -d ".next" ]; then
    rm -rf .next
    success "Previous build cleaned"
else
    info "No previous build found"
fi

# Step 2: Install dependencies (if needed)
log "📦 Checking dependencies..."
if [ ! -d "node_modules" ]; then
    warning "Node modules not found, installing..."
    npm install
    success "Dependencies installed"
else
    info "Dependencies already installed"
fi

# Step 3: Build frontend with admin routes
log "🏗️  Building frontend with admin routes..."
npm run build

if [ $? -eq 0 ]; then
    success "Frontend build completed successfully"
else
    error "Frontend build failed"
    exit 1
fi

# Step 4: Verify admin routes in build
log "🔍 Verifying admin routes in build..."
if [ -d ".next/server/app/admin" ]; then
    success "Admin routes found in build"
    info "Admin routes: $(ls .next/server/app/admin/)"
else
    error "Admin routes not found in build"
    exit 1
fi

# Step 5: Check if we're in a Docker environment
cd ..
if [ -f "docker-compose.yml" ]; then
    log "🐳 Docker environment detected"
    
    # Rebuild frontend container
    log "🔄 Rebuilding frontend container..."
    docker-compose build frontend
    
    if [ $? -eq 0 ]; then
        success "Frontend container rebuilt"
    else
        error "Frontend container build failed"
        exit 1
    fi
    
    # Restart services
    log "🔄 Restarting services..."
    docker-compose up -d
    
    if [ $? -eq 0 ]; then
        success "Services restarted"
    else
        error "Service restart failed"
        exit 1
    fi
    
else
    warning "Docker environment not detected"
    info "Manual deployment may be required"
fi

# Step 6: Test admin routes
log "🧪 Testing admin routes..."
sleep 5  # Wait for services to start

# Test local first (if available)
if curl -s -f http://localhost:3000/admin/login > /dev/null 2>&1; then
    success "Admin routes working on localhost"
else
    warning "Admin routes not accessible on localhost"
    info "This might be normal if not running locally"
fi

# Test production
log "🌐 Testing production admin routes..."
if curl -s -f https://taivideonhanh.vn/admin/login > /dev/null 2>&1; then
    success "Admin routes working on production! 🎉"
    info "You can now access: https://taivideonhanh.vn/admin/login"
else
    warning "Admin routes still not accessible on production"
    info "This might take a few minutes to propagate"
fi

# Step 7: Create admin user if needed
log "👤 Checking admin user..."
if [ -f "create-admin-user.js" ]; then
    info "Admin user creation script available"
    info "Run 'node create-admin-user.js' to create admin user"
else
    warning "Admin user creation script not found"
fi

# Step 8: Summary
log "📋 Deployment Summary"
echo "=================================================="
success "Frontend rebuilt with admin routes"
success "Docker containers updated (if applicable)"
info "Admin Login: https://taivideonhanh.vn/admin/login"
info "Default Email: admin@taivideonhanh.vn"
info "Default Password: admin123456 (change after first login)"

echo ""
log "🔧 Next Steps:"
echo "1. Wait 2-3 minutes for deployment to propagate"
echo "2. Test admin login: https://taivideonhanh.vn/admin/login"
echo "3. Create admin user: node create-admin-user.js"
echo "4. Upload cookie file via admin panel"

echo ""
log "🎉 Admin Routes Deployment Complete!"
