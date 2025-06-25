#!/usr/bin/env node

/**
 * Test Script for Admin Blank Page Fix
 * Verifies that the fix is working correctly
 */

const https = require('https');
const http = require('http');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function header(message) {
  log(`\n${message}`, 'magenta');
  log('='.repeat(message.length), 'magenta');
}

// Function to test URL with detailed response
function testURL(url, expectedStatus = 200) {
  return new Promise((resolve) => {
    const client = url.startsWith('https') ? https : http;
    
    const req = client.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const result = {
          url,
          status: res.statusCode,
          headers: res.headers,
          data: data.substring(0, 200), // First 200 chars
          success: res.statusCode === expectedStatus
        };
        
        if (result.success) {
          logSuccess(`${url} → ${res.statusCode}`);
        } else {
          logError(`${url} → ${res.statusCode} (expected ${expectedStatus})`);
        }
        
        resolve(result);
      });
    });
    
    req.on('error', (error) => {
      logError(`${url} → ${error.message}`);
      resolve({
        url,
        status: 0,
        success: false,
        error: error.message
      });
    });
    
    req.setTimeout(10000, () => {
      req.destroy();
      logWarning(`${url} → Timeout`);
      resolve({
        url,
        status: 0,
        success: false,
        error: 'Timeout'
      });
    });
  });
}

// Function to check if response contains expected content
function checkContent(result, expectedContent, description) {
  if (result.success && result.data.includes(expectedContent)) {
    logSuccess(`${description} - Content verified`);
    return true;
  } else {
    logError(`${description} - Content not found`);
    return false;
  }
}

async function testMainSite() {
  header('🌐 Testing Main Site');
  
  const result = await testURL('https://taivideonhanh.vn');
  
  if (result.success) {
    logSuccess('Main site is accessible');
    return true;
  } else {
    logError('Main site is not accessible');
    return false;
  }
}

async function testAPIEndpoints() {
  header('🔌 Testing API Endpoints');
  
  const endpoints = [
    { url: 'https://taivideonhanh.vn/api/health', description: 'Health check' },
    { url: 'https://taivideonhanh.vn/api/subscription/plans', description: 'Subscription plans' }
  ];
  
  let allPassed = true;
  
  for (const endpoint of endpoints) {
    const result = await testURL(endpoint.url);
    
    if (result.success) {
      logSuccess(`${endpoint.description} API working`);
      
      // Check if response is JSON
      try {
        JSON.parse(result.data);
        logSuccess(`${endpoint.description} returns valid JSON`);
      } catch (error) {
        logWarning(`${endpoint.description} response may not be JSON`);
      }
    } else {
      logError(`${endpoint.description} API failed`);
      allPassed = false;
    }
  }
  
  return allPassed;
}

async function testAdminRoutes() {
  header('🔐 Testing Admin Routes');
  
  const adminRoutes = [
    { url: 'https://taivideonhanh.vn/admin', description: 'Admin root' },
    { url: 'https://taivideonhanh.vn/admin/login', description: 'Admin login' }
  ];
  
  let allPassed = true;
  
  for (const route of adminRoutes) {
    const result = await testURL(route.url);
    
    if (result.success) {
      logSuccess(`${route.description} accessible`);
      
      // Check if it's not a blank page
      if (result.data.length > 100) {
        logSuccess(`${route.description} has content (not blank)`);
      } else {
        logWarning(`${route.description} may be blank or minimal content`);
      }
      
      // Check for HTML content
      if (result.data.includes('<html') || result.data.includes('<!DOCTYPE')) {
        logSuccess(`${route.description} returns HTML page`);
      } else {
        logWarning(`${route.description} may not be returning HTML`);
      }
    } else {
      logError(`${route.description} not accessible`);
      allPassed = false;
    }
  }
  
  return allPassed;
}

async function checkEnvironmentConfiguration() {
  header('🌍 Environment Configuration Check');
  
  logInfo('Expected environment variables in EasyPanel:');
  log('  NEXT_PUBLIC_API_URL=https://taivideonhanh.vn/api', 'cyan');
  log('  NODE_ENV=production', 'cyan');
  log('  DEFAULT_ADMIN_EMAIL=admin@taivideonhanh.vn', 'cyan');
  log('  DEFAULT_ADMIN_PASSWORD=admin123456', 'cyan');
  
  logInfo('To verify these are set:');
  log('  1. Go to EasyPanel → Your Service → Environment Variables', 'yellow');
  log('  2. Check that NEXT_PUBLIC_API_URL is set correctly', 'yellow');
  log('  3. Rebuild service if any variables were missing', 'yellow');
  
  return true;
}

async function performBrowserTests() {
  header('🌐 Browser Testing Instructions');
  
  logInfo('Manual browser tests to perform:');
  
  log('\n1. 🔍 Admin Login Page Test:', 'yellow');
  log('   - Open: https://taivideonhanh.vn/admin/login');
  log('   - Should show login form (not blank page)');
  log('   - Press F12 → Network tab → Refresh');
  log('   - Should see: GET https://taivideonhanh.vn/api/subscription/plans');
  log('   - Should NOT see: http://localhost:5000/...');
  
  log('\n2. 🔍 Console Error Check:', 'yellow');
  log('   - Press F12 → Console tab');
  log('   - Should have no red errors');
  log('   - Should have no "Failed to fetch" errors');
  log('   - Should have no CORS errors');
  
  log('\n3. 🔍 Network Request Check:', 'yellow');
  log('   - F12 → Network tab → Clear → Refresh');
  log('   - Look for subscription/plans request');
  log('   - Should be: https://taivideonhanh.vn/api/subscription/plans');
  log('   - Status should be: 200 OK');
  log('   - Response should be: JSON with plans data');
  
  log('\n4. 🔍 Login Functionality Test:', 'yellow');
  log('   - Try logging in with:');
  log('     Email: admin@taivideonhanh.vn');
  log('     Password: admin123456');
  log('   - Should redirect to admin dashboard');
  log('   - Should not show blank page');
  
  return true;
}

async function generateReport(results) {
  header('📊 Test Report');
  
  const { mainSite, api, admin } = results;
  
  log('Test Results Summary:', 'bright');
  
  if (mainSite) {
    logSuccess('Main site accessible');
  } else {
    logError('Main site not accessible');
  }
  
  if (api) {
    logSuccess('API endpoints working');
  } else {
    logError('API endpoints have issues');
  }
  
  if (admin) {
    logSuccess('Admin routes accessible');
  } else {
    logError('Admin routes have issues');
  }
  
  const overallSuccess = mainSite && api && admin;
  
  if (overallSuccess) {
    logSuccess('\n🎉 All tests passed! Admin blank page fix appears to be working.');
    logInfo('Next steps:');
    log('  1. Test admin login in browser');
    log('  2. Verify no localhost API calls in Network tab');
    log('  3. Confirm admin functionality works');
  } else {
    logError('\n💥 Some tests failed. Admin blank page fix may need attention.');
    logInfo('Troubleshooting steps:');
    log('  1. Check environment variables in EasyPanel');
    log('  2. Rebuild service if variables were missing');
    log('  3. Check service logs for errors');
    log('  4. Run diagnostic tools: node debug-admin-blank-page.js');
  }
  
  return overallSuccess;
}

async function main() {
  log('🧪 Admin Blank Page Fix Test Suite', 'bright');
  log('====================================', 'bright');
  
  try {
    // Run all tests
    const mainSiteResult = await testMainSite();
    const apiResult = await testAPIEndpoints();
    const adminResult = await testAdminRoutes();
    
    // Check environment
    await checkEnvironmentConfiguration();
    
    // Browser testing instructions
    await performBrowserTests();
    
    // Generate report
    const results = {
      mainSite: mainSiteResult,
      api: apiResult,
      admin: adminResult
    };
    
    const overallSuccess = await generateReport(results);
    
    process.exit(overallSuccess ? 0 : 1);
    
  } catch (error) {
    logError(`Test suite failed: ${error.message}`);
    process.exit(1);
  }
}

// Run the test suite
main().catch(error => {
  logError(`Test suite crashed: ${error.message}`);
  process.exit(1);
});
