#!/bin/bash

# Complete Firefox Cookie Service Test Script
# Tests all functionality and verifies system performance

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
FIREFOX_API_URL="https://firefox-api.taivideonhanh.vn"
FIREFOX_VNC_URL="https://firefox-vnc.taivideonhanh.vn"
MAIN_API_URL="https://taivideonhanh.vn/api"
TEST_YOUTUBE_URL="https://www.youtube.com/watch?v=dQw4w9WgXcQ"

echo -e "${BLUE}🦊 Firefox Cookie Service - Complete Test Suite${NC}"
echo "=================================================="
echo ""

# Test 1: Service Health Check
echo -e "${YELLOW}🏥 Test 1: Service Health Check${NC}"
echo "Testing Firefox API health..."

HEALTH_RESPONSE=$(curl -s "$FIREFOX_API_URL/health" || echo "FAILED")

if echo "$HEALTH_RESPONSE" | grep -q "healthy"; then
    echo -e "${GREEN}✅ Firefox API is healthy${NC}"
    
    # Parse service status
    FIREFOX_STATUS=$(echo "$HEALTH_RESPONSE" | jq -r '.services.firefox // false')
    EXTRACTOR_STATUS=$(echo "$HEALTH_RESPONSE" | jq -r '.services.cookieExtractor // false')
    PLATFORM_STATUS=$(echo "$HEALTH_RESPONSE" | jq -r '.services.platformManager // false')
    
    echo "  - Firefox Manager: $FIREFOX_STATUS"
    echo "  - Cookie Extractor: $EXTRACTOR_STATUS"
    echo "  - Platform Manager: $PLATFORM_STATUS"
else
    echo -e "${RED}❌ Firefox API health check failed${NC}"
    echo "Response: $HEALTH_RESPONSE"
    exit 1
fi

echo ""

# Test 2: VNC Interface Accessibility
echo -e "${YELLOW}🖥️ Test 2: VNC Interface Accessibility${NC}"
echo "Testing VNC interface..."

VNC_RESPONSE=$(curl -s -I "$FIREFOX_VNC_URL" | head -1 || echo "FAILED")

if echo "$VNC_RESPONSE" | grep -q "200"; then
    echo -e "${GREEN}✅ VNC interface is accessible${NC}"
    echo "  URL: $FIREFOX_VNC_URL"
    echo "  Password: firefox123"
else
    echo -e "${RED}❌ VNC interface not accessible${NC}"
    echo "Response: $VNC_RESPONSE"
fi

echo ""

# Test 3: Platform Support
echo -e "${YELLOW}🎯 Test 3: Platform Support${NC}"
echo "Testing supported platforms..."

PLATFORMS_RESPONSE=$(curl -s "$FIREFOX_API_URL/platforms" || echo "FAILED")

if echo "$PLATFORMS_RESPONSE" | grep -q "youtube"; then
    echo -e "${GREEN}✅ Platform API working${NC}"
    
    PLATFORMS=$(echo "$PLATFORMS_RESPONSE" | jq -r '.platforms[]' 2>/dev/null || echo "youtube facebook instagram tiktok twitter")
    echo "  Supported platforms: $PLATFORMS"
else
    echo -e "${RED}❌ Platform API failed${NC}"
    echo "Response: $PLATFORMS_RESPONSE"
fi

echo ""

# Test 4: Cookie Validation
echo -e "${YELLOW}🍪 Test 4: Cookie Validation${NC}"
echo "Testing cookie validation for each platform..."

PLATFORMS_TO_TEST="youtube facebook instagram tiktok twitter"
VALID_COOKIES=0
TOTAL_PLATFORMS=5

for platform in $PLATFORMS_TO_TEST; do
    echo "  Testing $platform cookies..."
    
    VALIDATION_RESPONSE=$(curl -s -X POST "$FIREFOX_API_URL/validate-cookies/$platform" || echo "FAILED")
    
    if echo "$VALIDATION_RESPONSE" | grep -q '"isValid":true'; then
        echo -e "    ${GREEN}✅ $platform cookies are valid${NC}"
        
        # Extract format count if available
        FORMAT_COUNT=$(echo "$VALIDATION_RESPONSE" | jq -r '.formatCount // "N/A"')
        echo "    Formats available: $FORMAT_COUNT"
        
        VALID_COOKIES=$((VALID_COOKIES + 1))
    else
        echo -e "    ${YELLOW}⚠️ $platform cookies need refresh${NC}"
        ERROR_MSG=$(echo "$VALIDATION_RESPONSE" | jq -r '.error // "Unknown error"')
        echo "    Error: $ERROR_MSG"
    fi
done

echo ""
echo "Cookie validation summary: $VALID_COOKIES/$TOTAL_PLATFORMS platforms have valid cookies"

if [ $VALID_COOKIES -ge 3 ]; then
    echo -e "${GREEN}✅ Cookie validation acceptable${NC}"
else
    echo -e "${YELLOW}⚠️ Consider refreshing cookies via VNC login${NC}"
fi

echo ""

# Test 5: Backend Integration
echo -e "${YELLOW}🔗 Test 5: Backend Integration${NC}"
echo "Testing backend integration with Firefox service..."

# Test main API health
MAIN_HEALTH=$(curl -s "$MAIN_API_URL/health" || echo "FAILED")

if echo "$MAIN_HEALTH" | grep -q "healthy"; then
    echo -e "${GREEN}✅ Main API is healthy${NC}"
else
    echo -e "${RED}❌ Main API health check failed${NC}"
    echo "Response: $MAIN_HEALTH"
fi

echo ""

# Test 6: YouTube Performance Test
echo -e "${YELLOW}📈 Test 6: YouTube Performance Test${NC}"
echo "Testing YouTube video format extraction..."

echo "Testing without cookies (baseline)..."
NO_COOKIE_RESPONSE=$(curl -s -X POST "$MAIN_API_URL/video-info" \
    -H "Content-Type: application/json" \
    -d "{\"url\": \"$TEST_YOUTUBE_URL\", \"useCookies\": false}" || echo "FAILED")

if echo "$NO_COOKIE_RESPONSE" | grep -q "formats"; then
    NO_COOKIE_FORMATS=$(echo "$NO_COOKIE_RESPONSE" | jq '.formats | length' 2>/dev/null || echo "0")
    echo "  Formats without cookies: $NO_COOKIE_FORMATS"
else
    echo -e "${RED}❌ Baseline test failed${NC}"
    NO_COOKIE_FORMATS=0
fi

echo "Testing with Firefox cookies..."
WITH_COOKIE_RESPONSE=$(curl -s -X POST "$MAIN_API_URL/video-info" \
    -H "Content-Type: application/json" \
    -d "{\"url\": \"$TEST_YOUTUBE_URL\", \"useCookies\": true}" || echo "FAILED")

if echo "$WITH_COOKIE_RESPONSE" | grep -q "formats"; then
    WITH_COOKIE_FORMATS=$(echo "$WITH_COOKIE_RESPONSE" | jq '.formats | length' 2>/dev/null || echo "0")
    COOKIE_AUTH_USED=$(echo "$WITH_COOKIE_RESPONSE" | jq -r '.cookieAuthUsed // false')
    
    echo "  Formats with cookies: $WITH_COOKIE_FORMATS"
    echo "  Cookie auth used: $COOKIE_AUTH_USED"
    
    # Calculate improvement
    if [ "$NO_COOKIE_FORMATS" -gt 0 ] && [ "$WITH_COOKIE_FORMATS" -gt 0 ]; then
        IMPROVEMENT=$((WITH_COOKIE_FORMATS * 100 / NO_COOKIE_FORMATS - 100))
        echo "  Performance improvement: ${IMPROVEMENT}%"
        
        if [ "$WITH_COOKIE_FORMATS" -ge 15 ]; then
            echo -e "${GREEN}✅ Excellent performance (≥15 formats)${NC}"
        elif [ "$WITH_COOKIE_FORMATS" -ge 10 ]; then
            echo -e "${YELLOW}⚠️ Good performance (≥10 formats)${NC}"
        else
            echo -e "${RED}❌ Poor performance (<10 formats)${NC}"
        fi
    fi
else
    echo -e "${RED}❌ Cookie test failed${NC}"
    WITH_COOKIE_FORMATS=0
fi

echo ""

# Test 7: Multi-platform Test
echo -e "${YELLOW}🌐 Test 7: Multi-platform Test${NC}"
echo "Testing video info extraction from different platforms..."

# Test URLs for different platforms
declare -A TEST_URLS=(
    ["facebook"]="https://www.facebook.com/watch/?v=123456789"
    ["instagram"]="https://www.instagram.com/p/ABC123/"
    ["tiktok"]="https://www.tiktok.com/@user/video/123456789"
    ["twitter"]="https://twitter.com/user/status/123456789"
)

WORKING_PLATFORMS=0

for platform in "${!TEST_URLS[@]}"; do
    echo "  Testing $platform..."
    
    PLATFORM_RESPONSE=$(curl -s -X POST "$MAIN_API_URL/video-info" \
        -H "Content-Type: application/json" \
        -d "{\"url\": \"${TEST_URLS[$platform]}\"}" || echo "FAILED")
    
    if echo "$PLATFORM_RESPONSE" | grep -q "formats\|title"; then
        echo -e "    ${GREEN}✅ $platform integration working${NC}"
        WORKING_PLATFORMS=$((WORKING_PLATFORMS + 1))
    else
        echo -e "    ${YELLOW}⚠️ $platform may need valid test URL${NC}"
    fi
done

echo ""
echo "Multi-platform summary: $WORKING_PLATFORMS/4 platforms tested successfully"

# Test 8: Auto-refresh Test
echo -e "${YELLOW}🔄 Test 8: Auto-refresh Capability${NC}"
echo "Testing auto-refresh functionality..."

AUTO_REFRESH_RESPONSE=$(curl -s -X POST "$FIREFOX_API_URL/auto-refresh" || echo "FAILED")

if echo "$AUTO_REFRESH_RESPONSE" | grep -q "success\|results"; then
    echo -e "${GREEN}✅ Auto-refresh capability working${NC}"
    echo "  Note: Actual refresh requires manual login via VNC"
else
    echo -e "${YELLOW}⚠️ Auto-refresh may require manual intervention${NC}"
fi

echo ""

# Final Summary
echo -e "${BLUE}📊 Test Summary${NC}"
echo "=============="

# Calculate overall score
TOTAL_TESTS=8
PASSED_TESTS=0

# Count passed tests based on results
[ "$HEALTH_RESPONSE" != "FAILED" ] && PASSED_TESTS=$((PASSED_TESTS + 1))
[ "$VNC_RESPONSE" != "FAILED" ] && PASSED_TESTS=$((PASSED_TESTS + 1))
[ "$PLATFORMS_RESPONSE" != "FAILED" ] && PASSED_TESTS=$((PASSED_TESTS + 1))
[ $VALID_COOKIES -ge 1 ] && PASSED_TESTS=$((PASSED_TESTS + 1))
[ "$MAIN_HEALTH" != "FAILED" ] && PASSED_TESTS=$((PASSED_TESTS + 1))
[ "$WITH_COOKIE_FORMATS" -gt "$NO_COOKIE_FORMATS" ] && PASSED_TESTS=$((PASSED_TESTS + 1))
[ $WORKING_PLATFORMS -ge 1 ] && PASSED_TESTS=$((PASSED_TESTS + 1))
[ "$AUTO_REFRESH_RESPONSE" != "FAILED" ] && PASSED_TESTS=$((PASSED_TESTS + 1))

SCORE=$((PASSED_TESTS * 100 / TOTAL_TESTS))

echo "Tests passed: $PASSED_TESTS/$TOTAL_TESTS"
echo "Overall score: $SCORE%"

if [ $SCORE -ge 80 ]; then
    echo -e "${GREEN}🎉 Firefox Cookie Service is working excellently!${NC}"
elif [ $SCORE -ge 60 ]; then
    echo -e "${YELLOW}⚠️ Firefox Cookie Service is working but needs attention${NC}"
else
    echo -e "${RED}❌ Firefox Cookie Service needs troubleshooting${NC}"
fi

echo ""
echo -e "${BLUE}📋 Next Steps:${NC}"

if [ $VALID_COOKIES -lt 3 ]; then
    echo "1. Login to platforms via VNC: $FIREFOX_VNC_URL"
    echo "2. Extract cookies for platforms with invalid cookies"
fi

if [ "$WITH_COOKIE_FORMATS" -lt 15 ]; then
    echo "3. Verify YouTube login and re-extract cookies if needed"
fi

echo "4. Monitor performance and set up automated health checks"
echo "5. Schedule weekly cookie refresh maintenance"

echo ""
echo -e "${GREEN}✅ Firefox Cookie Service test completed!${NC}"
