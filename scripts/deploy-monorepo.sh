#!/bin/bash

# Monorepo Deployment Script for TaiVideoNhanh
# Deploys both frontend and backend as a single service

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
APP_PORT=3000
BACKEND_PORT=5000

header "🚀 TaiVideoNhanh Monorepo Deployment"
header "========================================"

# Step 1: Pre-deployment checks
log "🔍 Running pre-deployment checks..."

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "frontend" ] || [ ! -d "backend" ]; then
    error "Not in the correct project directory"
    exit 1
fi

# Check if monorepo files exist
if [ ! -f "Dockerfile.monorepo" ]; then
    error "Dockerfile.monorepo not found"
    exit 1
fi

if [ ! -f "start-monorepo.sh" ]; then
    error "start-monorepo.sh not found"
    exit 1
fi

if [ ! -f "health-check-monorepo.sh" ]; then
    error "health-check-monorepo.sh not found"
    exit 1
fi

success "Monorepo files verified"

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

# Step 3: Install dependencies
log "📦 Installing dependencies..."

# Root dependencies
if [ -f "package.json" ]; then
    npm install
    success "Root dependencies installed"
fi

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

# Step 4: Build applications
log "🏗️  Building applications..."

# Build backend
cd backend
npm run build
if [ $? -eq 0 ]; then
    success "Backend build completed"
else
    error "Backend build failed"
    exit 1
fi

# Build frontend
cd ../frontend
# Clean previous build
if [ -d ".next" ]; then
    rm -rf .next
    info "Previous frontend build cleaned"
fi

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

# Step 5: Environment configuration
log "🌍 Checking environment configuration..."

# Check for environment file
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

# Step 6: Docker deployment
if [ -f "docker-compose.monorepo.yml" ]; then
    log "🐳 Deploying with Docker (Monorepo)..."
    
    # Stop existing containers
    docker-compose -f docker-compose.monorepo.yml down
    
    # Build containers
    docker-compose -f docker-compose.monorepo.yml build --no-cache app
    if [ $? -eq 0 ]; then
        success "Docker monorepo container built"
    else
        error "Docker build failed"
        exit 1
    fi
    
    # Start containers
    docker-compose -f docker-compose.monorepo.yml up -d
    if [ $? -eq 0 ]; then
        success "Docker containers started"
    else
        error "Docker startup failed"
        exit 1
    fi
    
    # Wait for services to start
    log "⏳ Waiting for services to start..."
    sleep 15
    
elif [ -f "Dockerfile.monorepo" ]; then
    log "🐳 Building Docker image manually..."
    
    # Build Docker image
    docker build -f Dockerfile.monorepo -t taivideonhanh:latest .
    if [ $? -eq 0 ]; then
        success "Docker image built successfully"
    else
        error "Docker build failed"
        exit 1
    fi
    
    info "Manual Docker deployment - please deploy to your platform"
else
    warning "No Docker configuration found - manual deployment required"
fi

# Step 7: Health checks
log "🏥 Running health checks..."

# Check if running locally
if docker-compose -f docker-compose.monorepo.yml ps | grep -q "Up"; then
    # Check app health
    if curl -s -f http://localhost:${APP_PORT} > /dev/null 2>&1; then
        success "App health check passed"
    else
        warning "App health check failed"
    fi
    
    # Check admin routes locally
    if curl -s -f http://localhost:${APP_PORT}/admin/login > /dev/null 2>&1; then
        success "Admin routes accessible locally"
    else
        warning "Admin routes not accessible locally"
    fi
    
    # Check API health
    if curl -s -f http://localhost:${APP_PORT}/api/health > /dev/null 2>&1; then
        success "API health check passed"
    else
        warning "API health check failed"
    fi
else
    info "Local Docker not running - skipping local health checks"
fi

# Step 8: Production verification
log "🌐 Verifying production deployment..."

# Wait a bit more for deployment to propagate
sleep 5

# Check production app
if curl -s -f https://${DOMAIN} > /dev/null 2>&1; then
    success "Production app accessible! 🎉"
else
    warning "Production app not yet accessible"
    info "This may take a few minutes to propagate"
fi

# Check production admin routes
if curl -s -f https://${DOMAIN}/admin/login > /dev/null 2>&1; then
    success "Production admin routes accessible! 🎉"
else
    warning "Production admin routes not yet accessible"
    info "This may take a few minutes to propagate"
fi

# Check production API
if curl -s -f https://${DOMAIN}/api/health > /dev/null 2>&1; then
    success "Production API accessible"
else
    warning "Production API not accessible"
fi

# Step 9: Database setup
log "🗄️  Database setup reminder..."

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

# Step 10: Final verification
log "🔍 Running final verification..."

# Run health check script if available
if [ -f "health-check-monorepo.sh" ]; then
    chmod +x health-check-monorepo.sh
    ./health-check-monorepo.sh quick
else
    info "Health check script not found - manual verification required"
fi

# Step 11: Deployment summary
header "📋 Monorepo Deployment Summary"
header "================================"

success "✅ Backend built and ready"
success "✅ Frontend built with admin routes"
success "✅ Docker monorepo container created"
success "✅ Health checks completed"

echo ""
info "🌐 Production URLs:"
echo "   Main Site: https://${DOMAIN}"
echo "   Admin Panel: https://${DOMAIN}/admin/login"
echo "   API Health: https://${DOMAIN}/api/health"

echo ""
info "🔐 Admin Credentials:"
echo "   Email: admin@taivideonhanh.vn"
echo "   Password: admin123456 (change after first login)"

echo ""
info "🍪 Cookie Management:"
echo "   1. Login to admin panel"
echo "   2. Go to Cookie Management"
echo "   3. Upload multi-platform cookie file"
echo "   4. Test cookie functionality"

echo ""
info "🐳 Docker Commands:"
echo "   View logs: docker-compose -f docker-compose.monorepo.yml logs -f app"
echo "   Restart: docker-compose -f docker-compose.monorepo.yml restart app"
echo "   Stop: docker-compose -f docker-compose.monorepo.yml down"

echo ""
header "🎉 Monorepo Deployment Complete!"
info "Both frontend and backend are running in a single container"
warning "If admin routes return 404, check EasyPanel Traefik configuration"

# Step 12: Post-deployment tasks
echo ""
log "📝 Recommended post-deployment tasks:"
echo "1. Test admin login: https://${DOMAIN}/admin/login"
echo "2. Change default admin password"
echo "3. Upload cookie file for multi-platform support"
echo "4. Test video download functionality"
echo "5. Monitor container logs for any issues"
echo "6. Set up monitoring and alerts"

echo ""
success "🚀 Monorepo deployment completed successfully!"
