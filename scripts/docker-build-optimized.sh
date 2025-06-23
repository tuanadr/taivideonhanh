#!/bin/bash

# Optimized Docker Build Script for TaiVideoNhanh
# This script provides faster Docker builds with caching and parallel processing

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="docker-compose.yml"
BUILD_CACHE_DIR=".docker-cache"
PARALLEL_BUILDS=true

# Helper functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_step "Checking prerequisites..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed"
        exit 1
    fi
    
    # Check Docker daemon
    if ! docker info &> /dev/null; then
        log_error "Docker daemon is not running"
        exit 1
    fi
    
    log_info "✅ All prerequisites met"
}

# Clean up old containers and images
cleanup_old_resources() {
    log_step "Cleaning up old resources..."
    
    # Stop and remove containers
    docker-compose -f $COMPOSE_FILE down --remove-orphans 2>/dev/null || true
    
    # Remove dangling images
    docker image prune -f 2>/dev/null || true
    
    # Remove unused volumes (optional)
    # docker volume prune -f 2>/dev/null || true
    
    log_info "✅ Cleanup completed"
}

# Enable BuildKit for faster builds
enable_buildkit() {
    log_step "Enabling Docker BuildKit..."
    export DOCKER_BUILDKIT=1
    export COMPOSE_DOCKER_CLI_BUILD=1
    log_info "✅ BuildKit enabled"
}

# Build with cache optimization
build_with_cache() {
    log_step "Building with cache optimization..."
    
    # Create cache directory
    mkdir -p $BUILD_CACHE_DIR
    
    if [ "$PARALLEL_BUILDS" = true ]; then
        log_info "Building services in parallel..."
        
        # Build backend and frontend in parallel
        docker-compose -f $COMPOSE_FILE build \
            --parallel \
            --build-arg BUILDKIT_INLINE_CACHE=1 \
            backend frontend &
        
        # Wait for builds to complete
        wait
    else
        log_info "Building services sequentially..."
        docker-compose -f $COMPOSE_FILE build \
            --build-arg BUILDKIT_INLINE_CACHE=1
    fi
    
    log_info "✅ Build completed"
}

# Verify build success
verify_build() {
    log_step "Verifying build success..."
    
    # Check if images were created
    if docker images | grep -q "taivideonhanh"; then
        log_info "✅ Images created successfully"
        
        # Show image sizes
        echo
        log_info "Image sizes:"
        docker images | grep "taivideonhanh" | awk '{print $1":"$2" - "$7$8}'
    else
        log_error "❌ Build verification failed"
        exit 1
    fi
}

# Show build statistics
show_build_stats() {
    log_step "Build Statistics"
    
    echo
    echo "📊 Build Summary:"
    echo "=================="
    
    # Total build time (calculated externally)
    echo "⏱️  Total build time: $BUILD_TIME seconds"
    
    # Image information
    echo "🐳 Images created:"
    docker images | grep "taivideonhanh" | while read line; do
        echo "   • $line"
    done
    
    # Disk usage
    echo "💾 Docker disk usage:"
    docker system df
    
    echo
    log_info "🎉 Build completed successfully!"
}

# Main build function
main() {
    local start_time=$(date +%s)
    
    echo
    log_info "🚀 Starting optimized Docker build for TaiVideoNhanh"
    echo "=================================================="
    
    # Run build steps
    check_prerequisites
    echo
    
    cleanup_old_resources
    echo
    
    enable_buildkit
    echo
    
    build_with_cache
    echo
    
    verify_build
    echo
    
    # Calculate build time
    local end_time=$(date +%s)
    BUILD_TIME=$((end_time - start_time))
    
    show_build_stats
}

# Handle script arguments
case "${1:-}" in
    --no-parallel)
        PARALLEL_BUILDS=false
        shift
        ;;
    --clean)
        log_info "Performing deep clean..."
        docker system prune -af
        docker volume prune -f
        exit 0
        ;;
    --help|-h)
        echo "Usage: $0 [OPTIONS]"
        echo
        echo "Options:"
        echo "  --no-parallel    Build services sequentially"
        echo "  --clean          Clean all Docker resources and exit"
        echo "  --help, -h       Show this help message"
        echo
        echo "Environment variables:"
        echo "  COMPOSE_FILE     Docker Compose file to use (default: docker-compose.yml)"
        echo
        exit 0
        ;;
esac

# Run main function
main "$@"
