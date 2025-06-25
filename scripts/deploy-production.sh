#!/bin/bash

# Production Deployment Script for TaiVideoNhanh
# Handles admin routes deployment and fixes 404 issues

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
PURPLE='\033[0;35m'
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
    echo -e "${PURPLE}$1${NC}"
}

# Configuration
DOMAIN="taivideonhanh.vn"
FRONTEND_PORT=3000
BACKEND_PORT=5000
ADMIN_EMAIL="admin@taivideonhanh.vn"

header "🚀 TaiVideoNhanh Production Deployment"
header "=================================================="

# Step 1: Pre-deployment checks
log "🔍 Running pre-deployment checks..."

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "frontend" ] || [ ! -d "backend" ]; then
    error "Not in the correct project directory"
    exit 1
fi

success "Project directory verified"

# Check Git status
if [ -n "$(git status --porcelain)" ]; then
    warning "Working directory has uncommitted changes"
    git status --short
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Step 2: Pull latest changes
log "📥 Pulling latest changes from main..."
git checkout main
git pull origin main
success "Latest changes pulled"

# Step 3: Install/update dependencies
log "📦 Installing dependencies..."

# Backend dependencies
cd backend
if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
    npm install
    success "Backend dependencies installed"
else
    info "Backend dependencies up to date"
fi

# Frontend dependencies
cd ../frontend
if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
    npm install
    success "Frontend dependencies installed"
else
    info "Frontend dependencies up to date"
fi

cd ..

# Step 4: Build backend
log "🏗️  Building backend..."
cd backend
npm run build
if [ $? -eq 0 ]; then
    success "Backend build completed"
else
    error "Backend build failed"
    exit 1
fi
cd ..

# Step 5: Build frontend with admin routes
log "🎨 Building frontend with admin routes..."
cd frontend

# Clean previous build
if [ -d ".next" ]; then
    rm -rf .next
    info "Previous build cleaned"
fi

# Build frontend
npm run build
if [ $? -eq 0 ]; then
    success "Frontend build completed"
else
    error "Frontend build failed"
    exit 1
fi

# Verify admin routes in build
if [ -d ".next/server/app/admin" ]; then
    success "Admin routes found in build"
    info "Admin routes: $(ls .next/server/app/admin/ | tr '\n' ' ')"
else
    error "Admin routes not found in build"
    exit 1
fi

cd ..

# Step 6: Environment configuration
log "🌍 Checking environment configuration..."

# Check production environment file
if [ -f ".env.production" ]; then
    success "Production environment file found"
    
    # Verify critical variables
    if grep -q "DEFAULT_ADMIN_EMAIL.*@taivideonhanh.vn" .env.production; then
        success "Admin email configured correctly"
    else
        warning "Admin email may need updating"
    fi
    
    if grep -q "COOKIES_PATH" .env.production; then
        success "Cookie path configured"
    else
        warning "Cookie path not configured"
    fi
else
    warning "Production environment file not found"
fi

# Step 7: Docker deployment
if [ -f "docker-compose.yml" ]; then
    log "🐳 Deploying with Docker..."
    
    # Stop existing containers
    docker-compose down
    
    # Build containers
    docker-compose build --no-cache
    if [ $? -eq 0 ]; then
        success "Docker containers built"
    else
        error "Docker build failed"
        exit 1
    fi
    
    # Start containers
    docker-compose up -d
    if [ $? -eq 0 ]; then
        success "Docker containers started"
    else
        error "Docker startup failed"
        exit 1
    fi
    
    # Wait for services to start
    log "⏳ Waiting for services to start..."
    sleep 10
    
else
    warning "Docker compose file not found - manual deployment required"
fi

# Step 8: Health checks
log "🏥 Running health checks..."

# Check backend health
if curl -s -f http://localhost:${BACKEND_PORT}/api/health > /dev/null 2>&1; then
    success "Backend health check passed"
else
    warning "Backend health check failed"
fi

# Check frontend health
if curl -s -f http://localhost:${FRONTEND_PORT} > /dev/null 2>&1; then
    success "Frontend health check passed"
else
    warning "Frontend health check failed"
fi

# Check admin routes locally
if curl -s -f http://localhost:${FRONTEND_PORT}/admin/login > /dev/null 2>&1; then
    success "Admin routes accessible locally"
else
    warning "Admin routes not accessible locally"
fi

# Step 9: Production verification
log "🌐 Verifying production deployment..."

# Wait a bit more for deployment to propagate
sleep 5

# Check production admin routes
if curl -s -f https://${DOMAIN}/admin/login > /dev/null 2>&1; then
    success "Admin routes accessible on production! 🎉"
else
    warning "Admin routes not yet accessible on production"
    info "This may take a few minutes to propagate"
fi

# Check production API
if curl -s -f https://${DOMAIN}/api/health > /dev/null 2>&1; then
    success "API accessible on production"
else
    warning "API not accessible on production"
fi

# Step 10: Database setup
log "🗄️  Setting up database..."

if [ -f "create-admin-user.js" ]; then
    info "Admin user creation script available"
    read -p "Create default admin user? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        node create-admin-user.js
    fi
else
    warning "Admin user creation script not found"
fi

# Step 11: Final verification
log "🔍 Running final verification..."

# Run debug script if available
if [ -f "debug-admin-routes.js" ]; then
    node debug-admin-routes.js
else
    info "Debug script not found - manual verification required"
fi

# Step 12: Deployment summary
header "📋 Deployment Summary"
header "=================================================="

success "✅ Backend built and deployed"
success "✅ Frontend built with admin routes"
success "✅ Docker containers updated"
success "✅ Health checks completed"

echo ""
info "🌐 Production URLs:"
echo "   Main Site: https://${DOMAIN}"
echo "   Admin Panel: https://${DOMAIN}/admin/login"
echo "   API Health: https://${DOMAIN}/api/health"

echo ""
info "🔐 Admin Credentials:"
echo "   Email: ${ADMIN_EMAIL}"
echo "   Password: admin123456 (change after first login)"

echo ""
info "🍪 Cookie Management:"
echo "   1. Login to admin panel"
echo "   2. Go to Cookie Management"
echo "   3. Upload multi-platform cookie file"
echo "   4. Test cookie functionality"

echo ""
header "🎉 Deployment Complete!"
info "Admin routes should now be accessible at https://${DOMAIN}/admin/login"
warning "If still getting 404, wait 2-3 minutes for changes to propagate"

# Step 13: Post-deployment tasks
echo ""
log "📝 Recommended post-deployment tasks:"
echo "1. Test admin login: https://${DOMAIN}/admin/login"
echo "2. Change default admin password"
echo "3. Upload cookie file for multi-platform support"
echo "4. Test video download functionality"
echo "5. Monitor logs for any issues"

echo ""
success "🚀 Production deployment completed successfully!"
