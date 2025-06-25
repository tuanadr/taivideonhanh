#!/bin/bash

# Health Check Script for TaiVideoNhanh Monorepo
# Used by Docker HEALTHCHECK and monitoring

set -e

# Exit codes
EXIT_SUCCESS=0
EXIT_FAILURE=1

# Timeout for curl requests
TIMEOUT=5

# Function to check if a service is responding
check_service() {
    local url=$1
    local name=$2
    
    if curl -s -f --max-time $TIMEOUT "$url" > /dev/null 2>&1; then
        return 0
    else
        echo "❌ $name health check failed"
        return 1
    fi
}

# Function to check if process is running
check_process() {
    local pid_file=$1
    local name=$2
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if kill -0 "$pid" 2>/dev/null; then
            return 0
        else
            echo "❌ $name process not running (PID: $pid)"
            return 1
        fi
    else
        echo "❌ $name PID file not found"
        return 1
    fi
}

# Main health check
main() {
    local failed_checks=0
    
    # Check backend health
    if check_service "http://localhost:5000/api/health" "Backend"; then
        echo "✅ Backend is healthy"
    else
        ((failed_checks++))
    fi
    
    # Check frontend health
    if check_service "http://localhost:3000" "Frontend"; then
        echo "✅ Frontend is healthy"
    else
        ((failed_checks++))
    fi
    
    # Check admin routes (optional - may require authentication)
    if check_service "http://localhost:3000/admin/login" "Admin routes"; then
        echo "✅ Admin routes are accessible"
    else
        echo "⚠️  Admin routes may require authentication"
        # Don't count this as a failure
    fi
    
    # Check critical directories
    if [ -d "/app/data/cookies" ] && [ -w "/app/data/cookies" ]; then
        echo "✅ Cookie directory is accessible"
    else
        echo "❌ Cookie directory is not accessible"
        ((failed_checks++))
    fi
    
    if [ -d "/app/data/uploads" ] && [ -w "/app/data/uploads" ]; then
        echo "✅ Upload directory is accessible"
    else
        echo "❌ Upload directory is not accessible"
        ((failed_checks++))
    fi
    
    # Check log files exist and are writable
    if [ -f "/app/logs/backend.log" ] && [ -w "/app/logs/backend.log" ]; then
        echo "✅ Backend logs are accessible"
    else
        echo "⚠️  Backend logs may not be accessible"
    fi
    
    if [ -f "/app/logs/frontend.log" ] && [ -w "/app/logs/frontend.log" ]; then
        echo "✅ Frontend logs are accessible"
    else
        echo "⚠️  Frontend logs may not be accessible"
    fi
    
    # Summary
    if [ $failed_checks -eq 0 ]; then
        echo "🎉 All critical health checks passed"
        exit $EXIT_SUCCESS
    else
        echo "💥 $failed_checks critical health check(s) failed"
        exit $EXIT_FAILURE
    fi
}

# Handle different modes
case "${1:-health}" in
    "health"|"")
        main
        ;;
    "backend")
        if check_service "http://localhost:5000/api/health" "Backend"; then
            echo "✅ Backend is healthy"
            exit $EXIT_SUCCESS
        else
            exit $EXIT_FAILURE
        fi
        ;;
    "frontend")
        if check_service "http://localhost:3000" "Frontend"; then
            echo "✅ Frontend is healthy"
            exit $EXIT_SUCCESS
        else
            exit $EXIT_FAILURE
        fi
        ;;
    "admin")
        if check_service "http://localhost:3000/admin/login" "Admin routes"; then
            echo "✅ Admin routes are accessible"
            exit $EXIT_SUCCESS
        else
            exit $EXIT_FAILURE
        fi
        ;;
    "quick")
        # Quick check - just verify both services respond
        if check_service "http://localhost:5000/api/health" "Backend" && \
           check_service "http://localhost:3000" "Frontend"; then
            echo "✅ Quick health check passed"
            exit $EXIT_SUCCESS
        else
            echo "❌ Quick health check failed"
            exit $EXIT_FAILURE
        fi
        ;;
    *)
        echo "Usage: $0 [health|backend|frontend|admin|quick]"
        echo ""
        echo "Options:"
        echo "  health    - Full health check (default)"
        echo "  backend   - Check backend only"
        echo "  frontend  - Check frontend only"
        echo "  admin     - Check admin routes only"
        echo "  quick     - Quick check of both services"
        exit $EXIT_FAILURE
        ;;
esac
