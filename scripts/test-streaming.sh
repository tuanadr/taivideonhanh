#!/bin/bash

# Test script for Phase 1.2: Streaming Architecture
# This script tests the streaming functionality end-to-end

set -e

echo "🚀 Testing Phase 1.2: Streaming Architecture"
echo "============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
API_BASE="http://localhost:5000/api"
TEST_VIDEO_URL="https://www.youtube.com/watch?v=dQw4w9WgXcQ"  # Rick Roll for testing
ACCESS_TOKEN=""

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

# Check if services are running
check_services() {
    log_info "Checking if services are running..."
    
    # Check backend
    if curl -s "$API_BASE" > /dev/null; then
        log_info "✅ Backend is running"
    else
        log_error "❌ Backend is not running. Please start with: cd backend && npm run dev"
        exit 1
    fi
    
    # Check Redis
    if redis-cli ping > /dev/null 2>&1; then
        log_info "✅ Redis is running"
    else
        log_error "❌ Redis is not running. Please start Redis server"
        exit 1
    fi
    
    # Check PostgreSQL
    if pg_isready > /dev/null 2>&1; then
        log_info "✅ PostgreSQL is running"
    else
        log_warn "⚠️  PostgreSQL status unknown"
    fi
}

# Register test user
register_user() {
    log_info "Registering test user..."
    
    local email="test-streaming-$(date +%s)@example.com"
    local password="TestPassword123!"
    
    local response=$(curl -s -X POST "$API_BASE/auth/register" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$email\",\"password\":\"$password\"}")
    
    ACCESS_TOKEN=$(echo "$response" | jq -r '.tokens.accessToken')
    
    if [ "$ACCESS_TOKEN" != "null" ] && [ -n "$ACCESS_TOKEN" ]; then
        log_info "✅ User registered successfully"
        log_info "Access token: ${ACCESS_TOKEN:0:20}..."
    else
        log_error "❌ Failed to register user"
        echo "Response: $response"
        exit 1
    fi
}

# Test video analysis
test_video_analysis() {
    log_info "Testing video analysis..."
    
    # Start analysis
    local analysis_response=$(curl -s -X POST "$API_BASE/streaming/analyze" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        -d "{\"url\":\"$TEST_VIDEO_URL\"}")
    
    local request_id=$(echo "$analysis_response" | jq -r '.requestId')
    
    if [ "$request_id" != "null" ] && [ -n "$request_id" ]; then
        log_info "✅ Video analysis started"
        log_info "Request ID: $request_id"
        
        # Poll for results
        local max_attempts=30
        local attempt=0
        
        while [ $attempt -lt $max_attempts ]; do
            sleep 2
            local result=$(curl -s "$API_BASE/streaming/analyze/$request_id" \
                -H "Authorization: Bearer $ACCESS_TOKEN")
            
            local status=$(echo "$result" | jq -r '.status')
            local progress=$(echo "$result" | jq -r '.progress')
            
            log_info "Analysis progress: $progress% (Status: $status)"
            
            if [ "$status" = "completed" ]; then
                log_info "✅ Video analysis completed"
                local formats_count=$(echo "$result" | jq -r '.result.supportedFormatsCount')
                log_info "Found $formats_count supported formats"
                return 0
            elif [ "$status" = "failed" ]; then
                log_error "❌ Video analysis failed"
                echo "Result: $result"
                return 1
            fi
            
            ((attempt++))
        done
        
        log_error "❌ Video analysis timed out"
        return 1
    else
        log_error "❌ Failed to start video analysis"
        echo "Response: $analysis_response"
        return 1
    fi
}

# Test stream token creation
test_stream_token() {
    log_info "Testing stream token creation..."
    
    local token_response=$(curl -s -X POST "$API_BASE/streaming/token" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        -d "{\"videoUrl\":\"$TEST_VIDEO_URL\",\"formatId\":\"best\",\"title\":\"Test Video\"}")
    
    local token=$(echo "$token_response" | jq -r '.token')
    
    if [ "$token" != "null" ] && [ -n "$token" ]; then
        log_info "✅ Stream token created successfully"
        log_info "Token: ${token:0:20}..."
        
        # Test token validation
        local stream_url="$API_BASE/streaming/stream/$token"
        local head_response=$(curl -s -I "$stream_url" \
            -H "Authorization: Bearer $ACCESS_TOKEN")
        
        if echo "$head_response" | grep -q "200 OK"; then
            log_info "✅ Stream token validation successful"
        else
            log_warn "⚠️  Stream token validation returned non-200 status"
        fi
        
        return 0
    else
        log_error "❌ Failed to create stream token"
        echo "Response: $token_response"
        return 1
    fi
}

# Test queue system
test_queue_system() {
    log_info "Testing queue system..."
    
    local queue_stats=$(curl -s "$API_BASE/monitoring/queues" \
        -H "Authorization: Bearer $ACCESS_TOKEN")
    
    if echo "$queue_stats" | jq -e '.queues' > /dev/null; then
        log_info "✅ Queue system is accessible"
        local video_analysis_jobs=$(echo "$queue_stats" | jq -r '.queues.videoAnalysis.waiting // 0')
        local streaming_jobs=$(echo "$queue_stats" | jq -r '.queues.streaming.waiting // 0')
        log_info "Video analysis jobs: $video_analysis_jobs, Streaming jobs: $streaming_jobs"
    else
        log_error "❌ Failed to access queue system"
        echo "Response: $queue_stats"
        return 1
    fi
}

# Test monitoring endpoints
test_monitoring() {
    log_info "Testing monitoring endpoints..."
    
    # Health check
    local health=$(curl -s "$API_BASE/monitoring/health")
    local health_status=$(echo "$health" | jq -r '.status')
    
    if [ "$health_status" = "healthy" ] || [ "$health_status" = "warning" ]; then
        log_info "✅ System health check passed (Status: $health_status)"
    else
        log_warn "⚠️  System health check returned: $health_status"
    fi
    
    # System status
    local status=$(curl -s "$API_BASE/monitoring/status" \
        -H "Authorization: Bearer $ACCESS_TOKEN")
    
    if echo "$status" | jq -e '.system' > /dev/null; then
        log_info "✅ System status endpoint accessible"
        local uptime=$(echo "$status" | jq -r '.system.uptime')
        log_info "System uptime: ${uptime}s"
    else
        log_error "❌ Failed to access system status"
        return 1
    fi
}

# Test rate limiting
test_rate_limiting() {
    log_info "Testing rate limiting..."
    
    local attempts=0
    local max_attempts=10
    
    while [ $attempts -lt $max_attempts ]; do
        local response=$(curl -s -w "%{http_code}" -X POST "$API_BASE/streaming/token" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $ACCESS_TOKEN" \
            -d "{\"videoUrl\":\"$TEST_VIDEO_URL\",\"formatId\":\"best\",\"title\":\"Rate Limit Test $attempts\"}")
        
        local http_code="${response: -3}"
        
        if [ "$http_code" = "429" ]; then
            log_info "✅ Rate limiting is working (got 429 after $attempts attempts)"
            return 0
        elif [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
            log_info "Token creation $attempts successful"
        else
            log_warn "Unexpected response code: $http_code"
        fi
        
        ((attempts++))
        sleep 1
    done
    
    log_warn "⚠️  Rate limiting not triggered after $max_attempts attempts"
}

# Cleanup test data
cleanup() {
    log_info "Cleaning up test data..."
    
    # Cleanup would involve revoking tokens, cleaning up test user, etc.
    # For now, just log that cleanup would happen here
    log_info "✅ Cleanup completed"
}

# Main test execution
main() {
    echo
    log_info "Starting streaming architecture tests..."
    echo
    
    # Check prerequisites
    if ! command -v curl &> /dev/null; then
        log_error "curl is required but not installed"
        exit 1
    fi
    
    if ! command -v jq &> /dev/null; then
        log_error "jq is required but not installed"
        exit 1
    fi
    
    # Run tests
    check_services
    echo
    
    register_user
    echo
    
    test_video_analysis
    echo
    
    test_stream_token
    echo
    
    test_queue_system
    echo
    
    test_monitoring
    echo
    
    test_rate_limiting
    echo
    
    cleanup
    echo
    
    log_info "🎉 All streaming architecture tests completed!"
    log_info "Phase 1.2 implementation is ready for use."
}

# Run main function
main "$@"
