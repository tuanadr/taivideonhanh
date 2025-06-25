#!/bin/bash

# Setup Firefox Cookie Service for TaiVideoNhanh
# This script helps deploy Firefox service on EasyPanel

set -e

echo "🦊 Firefox Cookie Service Setup"
echo "==============================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
FIREFOX_SERVICE_DIR="firefox-service"
DATA_DIR="$FIREFOX_SERVICE_DIR/data"
PROFILE_DIR="$DATA_DIR/firefox-profile"
COOKIES_DIR="$DATA_DIR/cookies"
LOGS_DIR="$DATA_DIR/logs"

echo -e "${BLUE}📋 FIREFOX SERVICE SETUP GUIDE${NC}"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "backend" ]; then
    echo -e "${RED}❌ Error: Please run this script from the project root directory${NC}"
    exit 1
fi

echo -e "${YELLOW}🔧 Step 1: Creating Firefox Service Structure${NC}"

# Create Firefox service directory structure
mkdir -p "$FIREFOX_SERVICE_DIR"
mkdir -p "$DATA_DIR"
mkdir -p "$PROFILE_DIR"
mkdir -p "$COOKIES_DIR"
mkdir -p "$LOGS_DIR"
mkdir -p "$FIREFOX_SERVICE_DIR/src"
mkdir -p "$FIREFOX_SERVICE_DIR/scripts"
mkdir -p "$FIREFOX_SERVICE_DIR/novnc"

echo "✅ Created directory structure"

# Set permissions
chmod 755 "$FIREFOX_SERVICE_DIR"
chmod 755 "$DATA_DIR"
chmod 755 "$PROFILE_DIR"
chmod 755 "$COOKIES_DIR"
chmod 755 "$LOGS_DIR"

echo "✅ Set directory permissions"

echo ""
echo -e "${YELLOW}🔧 Step 2: Firefox Service Configuration${NC}"

# Check if Firefox service files exist
if [ ! -f "$FIREFOX_SERVICE_DIR/package.json" ]; then
    echo -e "${RED}❌ Firefox service files not found. Please ensure all Firefox service files are created.${NC}"
    echo "Required files:"
    echo "  - $FIREFOX_SERVICE_DIR/package.json"
    echo "  - $FIREFOX_SERVICE_DIR/Dockerfile"
    echo "  - $FIREFOX_SERVICE_DIR/src/server.js"
    echo "  - $FIREFOX_SERVICE_DIR/src/firefoxManager.js"
    echo "  - $FIREFOX_SERVICE_DIR/src/cookieExtractor.js"
    echo "  - $FIREFOX_SERVICE_DIR/src/platformManager.js"
    exit 1
fi

echo "✅ Firefox service files found"

echo ""
echo -e "${YELLOW}🔧 Step 3: Installing Firefox Service Dependencies${NC}"

cd "$FIREFOX_SERVICE_DIR"

if [ -f "package.json" ]; then
    echo "Installing Node.js dependencies..."
    npm install
    echo "✅ Dependencies installed"
else
    echo -e "${RED}❌ package.json not found in Firefox service directory${NC}"
    exit 1
fi

cd ..

echo ""
echo -e "${YELLOW}🔧 Step 4: Docker Configuration${NC}"

# Check if Docker is available
if command -v docker &> /dev/null; then
    echo "✅ Docker is available"
    
    # Build Firefox service image
    echo "Building Firefox service Docker image..."
    cd "$FIREFOX_SERVICE_DIR"
    docker build -t firefox-cookie-service .
    echo "✅ Docker image built successfully"
    cd ..
else
    echo -e "${YELLOW}⚠️ Docker not found. You'll need to build the image on EasyPanel.${NC}"
fi

echo ""
echo -e "${YELLOW}🔧 Step 5: EasyPanel Deployment Configuration${NC}"

# Create EasyPanel deployment guide
cat > easypanel-firefox-deployment.md << 'EOF'
# Firefox Cookie Service - EasyPanel Deployment Guide

## 🚀 Deployment Steps

### 1. Create New App on EasyPanel
- Name: `firefox-cookie-service`
- Type: `Docker Compose` or `Custom Build`

### 2. Upload Files
Upload the entire `firefox-service/` directory to your EasyPanel project.

### 3. Environment Variables
Set these environment variables in EasyPanel:

```
NODE_ENV=production
PORT=3000
DISPLAY=:99
FIREFOX_PROFILE_PATH=/app/firefox-profile
COOKIES_PATH=/app/cookies
VNC_PASSWORD=firefox123
ALLOWED_ORIGINS=https://taivideonhanh.vn
```

### 4. Port Configuration
- **Port 3000**: API endpoints
- **Port 6080**: noVNC web interface (for manual login)

### 5. Volume Mounts
Create persistent volumes:
- `/app/firefox-profile` → Store Firefox profiles
- `/app/cookies` → Store extracted cookies
- `/app/logs` → Store service logs

### 6. Domain Configuration
Set up domains:
- `firefox-api.taivideonhanh.vn` → Port 3000 (API)
- `firefox-vnc.taivideonhanh.vn` → Port 6080 (VNC)

### 7. Resource Allocation
Recommended resources:
- **Memory**: 4GB minimum, 8GB recommended
- **CPU**: 2 cores minimum
- **Storage**: 10GB for profiles and cookies

## 🔧 Usage

### Manual Login (Recommended)
1. Access VNC: `https://firefox-vnc.taivideonhanh.vn`
2. Login to video platforms manually
3. Use API to extract cookies

### API Endpoints
- `GET /health` - Health check
- `GET /status` - Service status
- `POST /extract-cookies` - Extract cookies
- `GET /platforms` - Supported platforms
- `POST /validate-cookies/:platform` - Validate cookies

### Integration with Main App
Update your main app's environment:
```
FIREFOX_SERVICE_URL=https://firefox-api.taivideonhanh.vn
ENABLE_AUTO_COOKIE_EXTRACTION=true
```

## 🔒 Security Notes
- Protect VNC access with strong authentication
- Consider IP restrictions for VNC
- Regular cookie refresh recommended
- Monitor for unauthorized access
EOF

echo "✅ Created EasyPanel deployment guide: easypanel-firefox-deployment.md"

echo ""
echo -e "${YELLOW}🔧 Step 6: Backend Integration${NC}"

# Update backend configuration
if [ -f "backend/.env" ]; then
    # Check if Firefox service URL is already configured
    if ! grep -q "FIREFOX_SERVICE_URL" backend/.env; then
        echo "" >> backend/.env
        echo "# Firefox Cookie Service" >> backend/.env
        echo "FIREFOX_SERVICE_URL=http://firefox:3000" >> backend/.env
        echo "ENABLE_AUTO_COOKIE_EXTRACTION=true" >> backend/.env
        echo "COOKIE_REFRESH_INTERVAL=24h" >> backend/.env
        echo "✅ Updated backend .env configuration"
    else
        echo "✅ Backend already configured for Firefox service"
    fi
else
    echo -e "${YELLOW}⚠️ Backend .env file not found${NC}"
fi

echo ""
echo -e "${GREEN}🎉 FIREFOX SERVICE SETUP COMPLETED!${NC}"
echo ""
echo -e "${BLUE}📋 NEXT STEPS:${NC}"
echo ""
echo "1. 🚀 Deploy on EasyPanel:"
echo "   - Upload firefox-service/ directory"
echo "   - Configure environment variables"
echo "   - Set up domains and ports"
echo "   - Deploy the service"
echo ""
echo "2. 🔧 Manual Login Setup:"
echo "   - Access VNC interface: https://firefox-vnc.taivideonhanh.vn"
echo "   - Login to video platforms manually"
echo "   - Verify cookies are working"
echo ""
echo "3. 🔗 Backend Integration:"
echo "   - Update FIREFOX_SERVICE_URL in production"
echo "   - Enable auto-cookie extraction"
echo "   - Test cookie extraction API"
echo ""
echo "4. 🧪 Testing:"
echo "   - Test API endpoints"
echo "   - Validate cookie extraction"
echo "   - Verify video format improvements"
echo ""
echo -e "${BLUE}📚 Documentation:${NC}"
echo "   - Read: easypanel-firefox-deployment.md"
echo "   - API docs: https://firefox-api.taivideonhanh.vn/health"
echo "   - VNC access: https://firefox-vnc.taivideonhanh.vn"
echo ""
echo -e "${GREEN}✨ Firefox Cookie Service is ready for deployment!${NC}"
echo ""

# Create a quick test script
cat > test-firefox-service.sh << 'EOF'
#!/bin/bash

# Quick test script for Firefox Cookie Service
echo "🧪 Testing Firefox Cookie Service..."

FIREFOX_URL=${FIREFOX_SERVICE_URL:-"http://localhost:3000"}

echo "Testing health endpoint..."
curl -f "$FIREFOX_URL/health" || echo "❌ Health check failed"

echo "Testing status endpoint..."
curl -f "$FIREFOX_URL/status" || echo "❌ Status check failed"

echo "Testing platforms endpoint..."
curl -f "$FIREFOX_URL/platforms" || echo "❌ Platforms check failed"

echo "✅ Basic tests completed"
EOF

chmod +x test-firefox-service.sh
echo "✅ Created test script: test-firefox-service.sh"

echo ""
echo -e "${YELLOW}💡 TIP: Run './test-firefox-service.sh' after deployment to verify the service${NC}"
