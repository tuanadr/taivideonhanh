#!/bin/bash

# Health Check Script for TaiVideoNhanh
# Monitors system health and admin routes accessibility

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
LOCAL_FRONTEND="http://localhost:3000"
LOCAL_BACKEND="http://localhost:5000"
PRODUCTION_URL="https://${DOMAIN}"

header "🏥 TaiVideoNhanh Health Check"
header "=================================="

# Function to check URL with timeout
check_url() {
    local url=$1
    local name=$2
    local timeout=${3:-10}
    
    if curl -s -f --max-time $timeout "$url" > /dev/null 2>&1; then
        success "$name is accessible"
        return 0
    else
        error "$name is not accessible"
        return 1
    fi
}

# Function to check URL and get status code
check_url_status() {
    local url=$1
    local name=$2
    local timeout=${3:-10}
    
    local status_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time $timeout "$url" 2>/dev/null)
    
    if [ "$status_code" = "200" ]; then
        success "$name returned 200 OK"
        return 0
    elif [ "$status_code" = "404" ]; then
        error "$name returned 404 Not Found"
        return 1
    elif [ "$status_code" = "000" ]; then
        error "$name is unreachable (connection failed)"
        return 1
    else
        warning "$name returned status code: $status_code"
        return 1
    fi
}

# Function to check Docker containers
check_docker() {
    if command -v docker-compose &> /dev/null; then
        log "🐳 Checking Docker containers..."
        
        # Check if containers are running
        local running_containers=$(docker-compose ps --services --filter "status=running" 2>/dev/null | wc -l)
        local total_containers=$(docker-compose ps --services 2>/dev/null | wc -l)
        
        if [ "$running_containers" -eq "$total_containers" ] && [ "$total_containers" -gt 0 ]; then
            success "All Docker containers are running ($running_containers/$total_containers)"
        else
            warning "Some Docker containers may not be running ($running_containers/$total_containers)"
            docker-compose ps
        fi
    else
        info "Docker Compose not available"
    fi
}

# Function to check disk space
check_disk_space() {
    log "💾 Checking disk space..."
    
    local disk_usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
    
    if [ "$disk_usage" -lt 80 ]; then
        success "Disk usage is healthy: ${disk_usage}%"
    elif [ "$disk_usage" -lt 90 ]; then
        warning "Disk usage is high: ${disk_usage}%"
    else
        error "Disk usage is critical: ${disk_usage}%"
    fi
}

# Function to check memory usage
check_memory() {
    log "🧠 Checking memory usage..."
    
    if command -v free &> /dev/null; then
        local mem_usage=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
        
        if [ "$mem_usage" -lt 80 ]; then
            success "Memory usage is healthy: ${mem_usage}%"
        elif [ "$mem_usage" -lt 90 ]; then
            warning "Memory usage is high: ${mem_usage}%"
        else
            error "Memory usage is critical: ${mem_usage}%"
        fi
    else
        info "Memory check not available on this system"
    fi
}

# Function to check admin routes specifically
check_admin_routes() {
    log "🔐 Checking admin routes..."
    
    local routes=(
        "/admin/login"
        "/admin"
        "/admin/cookie"
    )
    
    local failed_routes=0
    
    for route in "${routes[@]}"; do
        if check_url_status "${PRODUCTION_URL}${route}" "Admin route: ${route}"; then
            continue
        else
            ((failed_routes++))
        fi
    done
    
    if [ $failed_routes -eq 0 ]; then
        success "All admin routes are accessible"
    else
        error "$failed_routes admin route(s) failed"
    fi
    
    return $failed_routes
}

# Function to check API endpoints
check_api_endpoints() {
    log "🔌 Checking API endpoints..."
    
    local endpoints=(
        "/api/health"
        "/api/admin/cookie/info"
    )
    
    local failed_endpoints=0
    
    for endpoint in "${endpoints[@]}"; do
        if check_url_status "${PRODUCTION_URL}${endpoint}" "API endpoint: ${endpoint}"; then
            continue
        else
            ((failed_endpoints++))
        fi
    done
    
    if [ $failed_endpoints -eq 0 ]; then
        success "All API endpoints are accessible"
    else
        warning "$failed_endpoints API endpoint(s) failed (may require authentication)"
    fi
}

# Function to check SSL certificate
check_ssl() {
    log "🔒 Checking SSL certificate..."
    
    if command -v openssl &> /dev/null; then
        local ssl_info=$(echo | openssl s_client -servername $DOMAIN -connect $DOMAIN:443 2>/dev/null | openssl x509 -noout -dates 2>/dev/null)
        
        if [ $? -eq 0 ]; then
            success "SSL certificate is valid"
            local expiry=$(echo "$ssl_info" | grep "notAfter" | cut -d= -f2)
            info "Certificate expires: $expiry"
        else
            warning "Could not verify SSL certificate"
        fi
    else
        info "OpenSSL not available for certificate check"
    fi
}

# Main health check execution
main() {
    local start_time=$(date +%s)
    local total_checks=0
    local failed_checks=0
    
    # System checks
    check_disk_space
    ((total_checks++))
    
    check_memory
    ((total_checks++))
    
    check_docker
    ((total_checks++))
    
    # Network checks
    log "🌐 Checking network connectivity..."
    
    # Production site
    if check_url "$PRODUCTION_URL" "Production site"; then
        ((total_checks++))
    else
        ((total_checks++))
        ((failed_checks++))
    fi
    
    # Admin routes
    check_admin_routes
    local admin_result=$?
    ((total_checks++))
    if [ $admin_result -ne 0 ]; then
        ((failed_checks++))
    fi
    
    # API endpoints
    check_api_endpoints
    ((total_checks++))
    
    # SSL certificate
    check_ssl
    ((total_checks++))
    
    # Local services (if available)
    if check_url "$LOCAL_FRONTEND" "Local frontend" 5; then
        ((total_checks++))
    else
        ((total_checks++))
        info "Local frontend not running (this is normal for production)"
    fi
    
    if check_url "$LOCAL_BACKEND/api/health" "Local backend" 5; then
        ((total_checks++))
    else
        ((total_checks++))
        info "Local backend not running (this is normal for production)"
    fi
    
    # Summary
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    header "📊 Health Check Summary"
    header "========================"
    
    echo "Duration: ${duration}s"
    echo "Total checks: $total_checks"
    echo "Failed checks: $failed_checks"
    echo "Success rate: $(( (total_checks - failed_checks) * 100 / total_checks ))%"
    
    if [ $failed_checks -eq 0 ]; then
        success "🎉 All health checks passed!"
        exit 0
    elif [ $failed_checks -le 2 ]; then
        warning "⚠️  Some non-critical checks failed"
        exit 1
    else
        error "❌ Multiple critical checks failed"
        exit 2
    fi
}

# Handle script arguments
case "${1:-}" in
    --admin-only)
        header "🔐 Admin Routes Health Check"
        check_admin_routes
        exit $?
        ;;
    --api-only)
        header "🔌 API Health Check"
        check_api_endpoints
        exit $?
        ;;
    --quick)
        header "⚡ Quick Health Check"
        check_url "$PRODUCTION_URL" "Production site"
        check_admin_routes
        exit $?
        ;;
    --help)
        echo "Usage: $0 [--admin-only|--api-only|--quick|--help]"
        echo ""
        echo "Options:"
        echo "  --admin-only  Check only admin routes"
        echo "  --api-only    Check only API endpoints"
        echo "  --quick       Quick check of main site and admin routes"
        echo "  --help        Show this help message"
        exit 0
        ;;
    *)
        main
        ;;
esac
