#!/bin/bash

# TaiVideoNhanh Monorepo Startup Script
# Starts both backend and frontend in a single container

set -e

# Colors for logging
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

# Function to handle shutdown gracefully
cleanup() {
    log "Shutting down services..."
    
    if [ ! -z "$BACKEND_PID" ]; then
        log "Stopping backend (PID: $BACKEND_PID)..."
        kill -TERM $BACKEND_PID 2>/dev/null || true
        wait $BACKEND_PID 2>/dev/null || true
    fi
    
    if [ ! -z "$FRONTEND_PID" ]; then
        log "Stopping frontend (PID: $FRONTEND_PID)..."
        kill -TERM $FRONTEND_PID 2>/dev/null || true
        wait $FRONTEND_PID 2>/dev/null || true
    fi
    
    log "Shutdown complete"
    exit 0
}

# Set up signal handlers
trap cleanup SIGTERM SIGINT

log "🚀 Starting TaiVideoNhanh Monorepo..."

# Verify required directories exist
log "📁 Checking application directories..."
if [ ! -d "/app/data/cookies" ]; then
    warning "Cookie directory not found, creating..."
    mkdir -p /app/data/cookies/backup
    chmod 755 /app/data/cookies /app/data/cookies/backup
fi

if [ ! -d "/app/data/uploads" ]; then
    warning "Upload directory not found, creating..."
    mkdir -p /app/data/uploads
    chmod 755 /app/data/uploads
fi

if [ ! -d "/app/logs" ]; then
    warning "Logs directory not found, creating..."
    mkdir -p /app/logs
    chmod 755 /app/logs
fi

success "Application directories verified"

# Set environment variables for backend
export PORT=5000
export COOKIES_PATH=${COOKIES_PATH:-/app/data/cookies/platform-cookies.txt}
export UPLOAD_PATH=${UPLOAD_PATH:-/app/data/uploads}

# Set environment variables for frontend
export HOSTNAME=0.0.0.0
export NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL:-http://localhost:5000/api}

log "🔧 Environment configuration:"
info "Backend Port: $PORT"
info "Frontend Port: 3000"
info "Cookie Path: $COOKIES_PATH"
info "Upload Path: $UPLOAD_PATH"
info "API URL: $NEXT_PUBLIC_API_URL"

# Start backend server
log "🚀 Starting backend server..."
cd /app/backend

# Create log file for backend
touch /app/logs/backend.log

# Start backend in background
node build/server.js > /app/logs/backend.log 2>&1 &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Check if backend is running
if kill -0 $BACKEND_PID 2>/dev/null; then
    success "Backend server started (PID: $BACKEND_PID)"
else
    error "Backend server failed to start"
    cat /app/logs/backend.log
    exit 1
fi

# Test backend health
log "🏥 Testing backend health..."
for i in {1..10}; do
    if curl -s -f http://localhost:5000/api/health > /dev/null 2>&1; then
        success "Backend health check passed"
        break
    else
        if [ $i -eq 10 ]; then
            error "Backend health check failed after 10 attempts"
            cat /app/logs/backend.log
            exit 1
        fi
        info "Waiting for backend to be ready... (attempt $i/10)"
        sleep 2
    fi
done

# Start frontend server
log "🎨 Starting frontend server..."
cd /app/frontend

# Create log file for frontend
touch /app/logs/frontend.log

# Start frontend in background
node server.js > /app/logs/frontend.log 2>&1 &
FRONTEND_PID=$!

# Wait a moment for frontend to start
sleep 3

# Check if frontend is running
if kill -0 $FRONTEND_PID 2>/dev/null; then
    success "Frontend server started (PID: $FRONTEND_PID)"
else
    error "Frontend server failed to start"
    cat /app/logs/frontend.log
    exit 1
fi

# Test frontend health
log "🏥 Testing frontend health..."
for i in {1..10}; do
    if curl -s -f http://localhost:3000 > /dev/null 2>&1; then
        success "Frontend health check passed"
        break
    else
        if [ $i -eq 10 ]; then
            error "Frontend health check failed after 10 attempts"
            cat /app/logs/frontend.log
            exit 1
        fi
        info "Waiting for frontend to be ready... (attempt $i/10)"
        sleep 2
    fi
done

# Test admin routes
log "🔐 Testing admin routes..."
if curl -s -f http://localhost:3000/admin/login > /dev/null 2>&1; then
    success "Admin routes are accessible"
else
    warning "Admin routes may not be accessible yet"
fi

# Display startup summary
log "📊 Startup Summary:"
success "✅ Backend running on port 5000 (PID: $BACKEND_PID)"
success "✅ Frontend running on port 3000 (PID: $FRONTEND_PID)"
success "✅ Admin routes: http://localhost:3000/admin/login"
success "✅ API health: http://localhost:5000/api/health"
success "✅ Cookie path: $COOKIES_PATH"

log "🎉 TaiVideoNhanh Monorepo started successfully!"
log "📝 Logs available at:"
info "  Backend: /app/logs/backend.log"
info "  Frontend: /app/logs/frontend.log"

# Keep the script running and monitor processes
log "👀 Monitoring services..."
while true; do
    # Check if backend is still running
    if ! kill -0 $BACKEND_PID 2>/dev/null; then
        error "Backend process died, exiting..."
        exit 1
    fi
    
    # Check if frontend is still running
    if ! kill -0 $FRONTEND_PID 2>/dev/null; then
        error "Frontend process died, exiting..."
        exit 1
    fi
    
    # Sleep for 30 seconds before next check
    sleep 30
done
