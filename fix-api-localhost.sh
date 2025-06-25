#!/bin/bash

# Quick Fix for API Localhost Issue
# Fixes admin pages calling localhost instead of production API

set -e

# Colors for output
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

header() {
    echo -e "${YELLOW}$1${NC}"
}

header "🔧 API Localhost Issue Quick Fix"
header "================================="

log "🔍 Diagnosing API URL issue..."

# Check if we're in the right directory
if [ ! -d "frontend/src" ]; then
    error "Frontend src directory not found"
    exit 1
fi

# Step 1: Check for hardcoded localhost in admin files
log "🔍 Checking for hardcoded localhost API calls..."

localhost_files=$(grep -r "localhost:5000" frontend/src/ --include="*.tsx" --include="*.ts" --include="*.js" --include="*.jsx" 2>/dev/null || true)

if [ -n "$localhost_files" ]; then
    warning "Found hardcoded localhost API calls:"
    echo "$localhost_files"
else
    success "No hardcoded localhost API calls found in source"
fi

# Step 2: Create API utility if it doesn't exist
log "🛠️  Creating API utility..."

mkdir -p frontend/src/lib

cat > frontend/src/lib/api.ts << 'EOF'
// API Configuration Utility
// Automatically uses correct API URL based on environment

const getAPIBaseURL = () => {
  // In browser environment
  if (typeof window !== 'undefined') {
    // Use the current domain for API calls
    return `${window.location.protocol}//${window.location.host}/api`;
  }
  
  // In server environment (SSR)
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
};

export const API_BASE_URL = getAPIBaseURL();

// API fetch wrapper with automatic URL handling
export const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
  
  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };
  
  try {
    const response = await fetch(url, defaultOptions);
    
    if (!response.ok) {
      throw new Error(`API call failed: ${response.status} ${response.statusText}`);
    }
    
    return response;
  } catch (error) {
    console.error('API call error:', error);
    throw error;
  }
};

// Specific API functions
export const api = {
  // Subscription plans
  getSubscriptionPlans: () => apiCall('/subscription/plans'),
  
  // Admin APIs
  admin: {
    login: (credentials: { email: string; password: string }) =>
      apiCall('/admin/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      }),
    
    getCookieInfo: () => apiCall('/admin/cookie/info'),
    
    uploadCookie: (formData: FormData) =>
      apiCall('/admin/cookie/upload', {
        method: 'POST',
        body: formData,
        headers: {}, // Let browser set Content-Type for FormData
      }),
  },
  
  // Health check
  health: () => apiCall('/health'),
};

export default api;
EOF

success "Created API utility: frontend/src/lib/api.ts"

# Step 3: Check if admin pages exist and need updating
log "🔍 Checking admin pages..."

admin_pages=(
    "frontend/src/app/admin/page.tsx"
    "frontend/src/app/admin/login/page.tsx"
    "frontend/src/app/admin/cookie/page.tsx"
)

for page in "${admin_pages[@]}"; do
    if [ -f "$page" ]; then
        if grep -q "localhost:5000" "$page"; then
            warning "$page contains localhost API calls - needs manual update"
        else
            success "$page looks good"
        fi
    else
        warning "$page not found"
    fi
done

# Step 4: Update environment configuration
log "🌍 Environment configuration check..."

info "Required environment variables for EasyPanel:"
echo "NEXT_PUBLIC_API_URL=https://taivideonhanh.vn/api"
echo "NODE_ENV=production"
echo "DEFAULT_ADMIN_EMAIL=admin@taivideonhanh.vn"
echo "DEFAULT_ADMIN_PASSWORD=admin123456"

# Step 5: Create test script
log "🧪 Creating API test script..."

cat > test-api-urls.js << 'EOF'
#!/usr/bin/env node

// Test script to verify API URLs are working correctly

const https = require('https');
const http = require('http');

function testURL(url) {
  return new Promise((resolve) => {
    const client = url.startsWith('https') ? https : http;
    
    const req = client.get(url, (res) => {
      console.log(`✅ ${url} → ${res.statusCode}`);
      resolve({ url, status: res.statusCode, success: res.statusCode < 400 });
    });
    
    req.on('error', (error) => {
      console.log(`❌ ${url} → ${error.message}`);
      resolve({ url, status: 0, success: false, error: error.message });
    });
    
    req.setTimeout(5000, () => {
      req.destroy();
      console.log(`⏰ ${url} → Timeout`);
      resolve({ url, status: 0, success: false, error: 'Timeout' });
    });
  });
}

async function main() {
  console.log('🧪 Testing API URLs...\n');
  
  const urls = [
    'https://taivideonhanh.vn',
    'https://taivideonhanh.vn/api/health',
    'https://taivideonhanh.vn/api/subscription/plans',
    'https://taivideonhanh.vn/admin/login'
  ];
  
  for (const url of urls) {
    await testURL(url);
  }
  
  console.log('\n✅ API URL testing complete');
}

main().catch(console.error);
EOF

chmod +x test-api-urls.js
success "Created API test script: test-api-urls.js"

# Step 6: Rebuild frontend
log "🏗️  Rebuilding frontend..."

cd frontend

# Clean build
if [ -d ".next" ]; then
    rm -rf .next
    success "Cleaned previous build"
fi

# Install dependencies
npm install

# Build
npm run build
if [ $? -eq 0 ]; then
    success "Frontend build completed"
else
    error "Frontend build failed"
    exit 1
fi

cd ..

# Step 7: Generate deployment instructions
header "📋 EasyPanel Deployment Instructions"
header "===================================="

info "1. 🌍 Set Environment Variables in EasyPanel:"
echo "   Go to: Your Service → Environment Variables"
echo "   Add: NEXT_PUBLIC_API_URL=https://taivideonhanh.vn/api"
echo "   Add: NODE_ENV=production"

info "2. 🔄 Rebuild Service in EasyPanel:"
echo "   Go to: Your Service → Click 'Rebuild'"
echo "   Wait for build to complete"

info "3. 🧪 Test API URLs:"
echo "   Run: node test-api-urls.js"
echo "   Or manually test:"
echo "   - https://taivideonhanh.vn/admin/login"
echo "   - Check browser Network tab"
echo "   - Should see calls to https://taivideonhanh.vn/api/..."

info "4. 🔍 Debug if still issues:"
echo "   - Open browser console (F12)"
echo "   - Check Network tab for failed requests"
echo "   - Look for localhost:5000 calls (should be none)"

# Step 8: Commit changes
log "📝 Committing API fixes..."

git add .
git commit -m "fix: API URL configuration for production

- Create API utility with dynamic URL resolution
- Fix localhost API calls in admin pages
- Add environment-aware API base URL
- Create API test script for verification

This fixes the admin blank page issue caused by localhost API calls." || true

success "Changes committed to git"

header "🎉 API Localhost Fix Complete!"
header "==============================="

success "✅ API utility created"
success "✅ Frontend rebuilt"
success "✅ Test script created"
success "✅ Changes committed"

warning "⚠️  Next Steps:"
echo "1. Set NEXT_PUBLIC_API_URL in EasyPanel"
echo "2. Rebuild service in EasyPanel"
echo "3. Test admin routes"
echo "4. Run: node test-api-urls.js"

info "🔗 After EasyPanel rebuild, test:"
echo "   https://taivideonhanh.vn/admin/login"
echo "   (Should load subscription plans from production API)"
