#!/bin/bash

# Test Firefox API Endpoints
# Quick verification script for deployed Firefox service

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
FIREFOX_API_URL="https://firefox-api.taivideonhanh.vn"

echo -e "${BLUE}🦊 Firefox API Endpoints Test${NC}"
echo "=================================="
echo ""

# Test 1: Root endpoint
echo -e "${YELLOW}📡 Test 1: Root Endpoint${NC}"
echo "Testing: $FIREFOX_API_URL/"

ROOT_RESPONSE=$(curl -s "$FIREFOX_API_URL/" || echo "FAILED")

if echo "$ROOT_RESPONSE" | grep -q "Firefox Cookie Management Service"; then
    echo -e "${GREEN}✅ Root endpoint working${NC}"
    echo "Service: $(echo "$ROOT_RESPONSE" | jq -r '.service // "Unknown"')"
    echo "Version: $(echo "$ROOT_RESPONSE" | jq -r '.version // "Unknown"')"
else
    echo -e "${RED}❌ Root endpoint failed${NC}"
    echo "Response: $ROOT_RESPONSE"
fi

echo ""

# Test 2: Health endpoint
echo -e "${YELLOW}🏥 Test 2: Health Endpoint${NC}"
echo "Testing: $FIREFOX_API_URL/health"

HEALTH_RESPONSE=$(curl -s "$FIREFOX_API_URL/health" || echo "FAILED")

if echo "$HEALTH_RESPONSE" | grep -q "healthy"; then
    echo -e "${GREEN}✅ Health endpoint working${NC}"
    
    STATUS=$(echo "$HEALTH_RESPONSE" | jq -r '.status // "unknown"')
    UPTIME=$(echo "$HEALTH_RESPONSE" | jq -r '.uptime // "unknown"')
    
    echo "Status: $STATUS"
    echo "Uptime: $UPTIME seconds"
    
    # Check service status
    FIREFOX_STATUS=$(echo "$HEALTH_RESPONSE" | jq -r '.services.firefox // false')
    EXTRACTOR_STATUS=$(echo "$HEALTH_RESPONSE" | jq -r '.services.cookieExtractor // false')
    PLATFORM_STATUS=$(echo "$HEALTH_RESPONSE" | jq -r '.services.platformManager // false')
    
    echo "Services:"
    echo "  - Firefox Manager: $FIREFOX_STATUS"
    echo "  - Cookie Extractor: $EXTRACTOR_STATUS"
    echo "  - Platform Manager: $PLATFORM_STATUS"
else
    echo -e "${RED}❌ Health endpoint failed${NC}"
    echo "Response: $HEALTH_RESPONSE"
fi

echo ""

# Test 3: Platforms endpoint
echo -e "${YELLOW}🎯 Test 3: Platforms Endpoint${NC}"
echo "Testing: $FIREFOX_API_URL/platforms"

PLATFORMS_RESPONSE=$(curl -s "$FIREFOX_API_URL/platforms" || echo "FAILED")

if echo "$PLATFORMS_RESPONSE" | grep -q "platforms"; then
    echo -e "${GREEN}✅ Platforms endpoint working${NC}"
    
    PLATFORMS=$(echo "$PLATFORMS_RESPONSE" | jq -r '.platforms[]' 2>/dev/null | tr '\n' ', ' | sed 's/,$//')
    COUNT=$(echo "$PLATFORMS_RESPONSE" | jq -r '.count // 0')
    
    echo "Supported platforms ($COUNT): $PLATFORMS"
else
    echo -e "${RED}❌ Platforms endpoint failed${NC}"
    echo "Response: $PLATFORMS_RESPONSE"
fi

echo ""

# Test 4: Status endpoint
echo -e "${YELLOW}📊 Test 4: Status Endpoint${NC}"
echo "Testing: $FIREFOX_API_URL/status"

STATUS_RESPONSE=$(curl -s "$FIREFOX_API_URL/status" || echo "FAILED")

if echo "$STATUS_RESPONSE" | grep -q "Firefox Cookie Management Service"; then
    echo -e "${GREEN}✅ Status endpoint working${NC}"
    
    SERVICE=$(echo "$STATUS_RESPONSE" | jq -r '.service // "Unknown"')
    VERSION=$(echo "$STATUS_RESPONSE" | jq -r '.version // "Unknown"')
    UPTIME=$(echo "$STATUS_RESPONSE" | jq -r '.uptime // "Unknown"')
    
    echo "Service: $SERVICE"
    echo "Version: $VERSION"
    echo "Uptime: $UPTIME seconds"
else
    echo -e "${RED}❌ Status endpoint failed${NC}"
    echo "Response: $STATUS_RESPONSE"
fi

echo ""

# Test 5: VNC endpoint
echo -e "${YELLOW}🖥️ Test 5: VNC Endpoint${NC}"
echo "Testing: $FIREFOX_API_URL/vnc"

VNC_RESPONSE=$(curl -s "$FIREFOX_API_URL/vnc" || echo "FAILED")

if echo "$VNC_RESPONSE" | grep -q "vnc"; then
    echo -e "${GREEN}✅ VNC endpoint working${NC}"
    
    VNC_URL=$(echo "$VNC_RESPONSE" | jq -r '.vnc.url // "Unknown"')
    VNC_PORT=$(echo "$VNC_RESPONSE" | jq -r '.vnc.port // "Unknown"')
    VNC_PASSWORD=$(echo "$VNC_RESPONSE" | jq -r '.vnc.password // "Unknown"')
    
    echo "VNC URL: $VNC_URL"
    echo "VNC Port: $VNC_PORT"
    echo "VNC Password: $VNC_PASSWORD"
    
    INSTRUCTIONS=$(echo "$VNC_RESPONSE" | jq -r '.instructions[]' 2>/dev/null | head -2)
    echo "Instructions:"
    echo "$INSTRUCTIONS" | sed 's/^/  /'
else
    echo -e "${RED}❌ VNC endpoint failed${NC}"
    echo "Response: $VNC_RESPONSE"
fi

echo ""

# Summary
echo -e "${BLUE}📋 Test Summary${NC}"
echo "==============="

TOTAL_TESTS=5
PASSED_TESTS=0

# Count passed tests
[ "$ROOT_RESPONSE" != "FAILED" ] && echo "$ROOT_RESPONSE" | grep -q "Firefox Cookie Management Service" && PASSED_TESTS=$((PASSED_TESTS + 1))
[ "$HEALTH_RESPONSE" != "FAILED" ] && echo "$HEALTH_RESPONSE" | grep -q "healthy" && PASSED_TESTS=$((PASSED_TESTS + 1))
[ "$PLATFORMS_RESPONSE" != "FAILED" ] && echo "$PLATFORMS_RESPONSE" | grep -q "platforms" && PASSED_TESTS=$((PASSED_TESTS + 1))
[ "$STATUS_RESPONSE" != "FAILED" ] && echo "$STATUS_RESPONSE" | grep -q "Firefox Cookie Management Service" && PASSED_TESTS=$((PASSED_TESTS + 1))
[ "$VNC_RESPONSE" != "FAILED" ] && echo "$VNC_RESPONSE" | grep -q "vnc" && PASSED_TESTS=$((PASSED_TESTS + 1))

SCORE=$((PASSED_TESTS * 100 / TOTAL_TESTS))

echo "Tests passed: $PASSED_TESTS/$TOTAL_TESTS"
echo "Score: $SCORE%"

if [ $SCORE -ge 80 ]; then
    echo -e "${GREEN}🎉 Firefox API endpoints are working well!${NC}"
elif [ $SCORE -ge 60 ]; then
    echo -e "${YELLOW}⚠️ Firefox API partially working${NC}"
else
    echo -e "${RED}❌ Firefox API needs attention${NC}"
fi

echo ""
echo -e "${BLUE}🔗 Next Steps:${NC}"

if [ $PASSED_TESTS -ge 3 ]; then
    echo "1. ✅ API endpoints are functional"
    echo "2. 🖥️ Access VNC interface: https://firefox-vnc.taivideonhanh.vn"
    echo "3. 🔐 Login to platforms manually"
    echo "4. 🍪 Extract cookies via API"
    echo "5. 🧪 Test cookie extraction functionality"
else
    echo "1. 🔧 Check Firefox service deployment"
    echo "2. 📋 Review service logs"
    echo "3. 🔄 Restart service if needed"
    echo "4. 🐛 Debug initialization issues"
fi

echo ""
echo -e "${GREEN}✅ Firefox API endpoints test completed!${NC}"
