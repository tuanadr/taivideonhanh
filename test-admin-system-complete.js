#!/usr/bin/env node

/**
 * Comprehensive Admin System Test Suite
 * Tests all admin endpoints and functionality
 */

const https = require('https');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
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

function logHeader(message) {
  log(`\n🚀 ${message}`, 'cyan');
  log('='.repeat(50), 'cyan');
}

// Function to make HTTP request
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = {
            statusCode: res.statusCode,
            headers: res.headers,
            body: body,
            data: body ? JSON.parse(body) : null
          };
          resolve(response);
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: body,
            data: null
          });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// Test functions
async function testHealthCheck() {
  logHeader('HEALTH CHECK');
  
  try {
    const response = await makeRequest({
      hostname: 'taivideonhanh.vn',
      port: 443,
      path: '/api/health',
      method: 'GET'
    });

    if (response.statusCode === 200) {
      logSuccess('Server is healthy');
      logInfo(`Services: ${JSON.stringify(response.data?.services || {})}`);
      return true;
    } else {
      logError(`Health check failed: ${response.statusCode}`);
      return false;
    }
  } catch (error) {
    logError(`Health check error: ${error.message}`);
    return false;
  }
}

async function testAdminStatus() {
  logHeader('ADMIN STATUS CHECK');
  
  try {
    const response = await makeRequest({
      hostname: 'taivideonhanh.vn',
      port: 443,
      path: '/api/admin/status',
      method: 'GET'
    });

    if (response.statusCode === 200) {
      logSuccess('Admin status retrieved');
      const status = response.data?.status;
      if (status) {
        logInfo(`Total Admins: ${status.totalAdmins}`);
        logInfo(`Active Admins: ${status.activeAdmins}`);
        logInfo(`Has .com Admin: ${status.hasComAdmin ? '✅' : '❌'}`);
        logInfo(`Has .vn Admin: ${status.hasVnAdmin ? '✅' : '❌'}`);
        logInfo(`System Healthy: ${status.systemHealthy ? '✅' : '❌'}`);
      }
      return status;
    } else {
      logError(`Admin status failed: ${response.statusCode}`);
      return null;
    }
  } catch (error) {
    logError(`Admin status error: ${error.message}`);
    return null;
  }
}

async function testAdminLogin(email, password) {
  logHeader(`ADMIN LOGIN TEST: ${email}`);
  
  try {
    const response = await makeRequest({
      hostname: 'taivideonhanh.vn',
      port: 443,
      path: '/api/admin/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, { email, password });

    if (response.statusCode === 200 && response.data?.token) {
      logSuccess(`Login successful for ${email}`);
      logInfo(`Role: ${response.data.admin?.role}`);
      logInfo(`Permissions: ${response.data.admin?.permissions?.length || 0}`);
      return response.data.token;
    } else {
      logWarning(`Login failed for ${email}: ${response.data?.error || response.statusCode}`);
      return null;
    }
  } catch (error) {
    logError(`Login error for ${email}: ${error.message}`);
    return null;
  }
}

async function testAdminVerify(token) {
  logHeader('ADMIN TOKEN VERIFICATION');
  
  try {
    const response = await makeRequest({
      hostname: 'taivideonhanh.vn',
      port: 443,
      path: '/api/admin/verify',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.statusCode === 200) {
      logSuccess('Token verification successful');
      logInfo(`Admin: ${response.data?.admin?.email}`);
      return true;
    } else {
      logError(`Token verification failed: ${response.statusCode}`);
      return false;
    }
  } catch (error) {
    logError(`Token verification error: ${error.message}`);
    return false;
  }
}

async function testCreateVnAdmin() {
  logHeader('CREATE .VN ADMIN USER');
  
  try {
    const response = await makeRequest({
      hostname: 'taivideonhanh.vn',
      port: 443,
      path: '/api/admin/create-vn-admin',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, {});

    if (response.statusCode === 200) {
      logSuccess('VN admin user created successfully');
      logInfo(`Admin: ${response.data?.admin?.email}`);
      return true;
    } else if (response.statusCode === 400 && response.data?.code === 'ADMIN_EXISTS') {
      logWarning('VN admin user already exists');
      return true;
    } else {
      logError(`VN admin creation failed: ${response.data?.error || response.statusCode}`);
      return false;
    }
  } catch (error) {
    logError(`VN admin creation error: ${error.message}`);
    return false;
  }
}

async function testFrontendPages() {
  logHeader('FRONTEND PAGES TEST');
  
  const pages = [
    '/admin/direct-login',
    '/admin/simple-dashboard',
    '/admin/setup'
  ];

  for (const page of pages) {
    try {
      const response = await makeRequest({
        hostname: 'taivideonhanh.vn',
        port: 443,
        path: page,
        method: 'GET'
      });

      if (response.statusCode === 200) {
        logSuccess(`Page accessible: ${page}`);
      } else {
        logWarning(`Page issue: ${page} (${response.statusCode})`);
      }
    } catch (error) {
      logError(`Page error: ${page} - ${error.message}`);
    }
  }
}

// Main test suite
async function runCompleteTest() {
  logInfo('🧪 Starting Comprehensive Admin System Test Suite');
  logInfo('🌐 Target: https://taivideonhanh.vn');
  logInfo('⏰ Started at: ' + new Date().toLocaleString());
  
  const results = {
    healthCheck: false,
    adminStatus: null,
    comAdminLogin: false,
    vnAdminLogin: false,
    tokenVerify: false,
    vnAdminCreation: false,
    frontendPages: false
  };

  // 1. Health Check
  results.healthCheck = await testHealthCheck();

  // 2. Admin Status
  results.adminStatus = await testAdminStatus();

  // 3. Test .com admin login
  const comToken = await testAdminLogin('admin@taivideonhanh.com', 'admin123456');
  results.comAdminLogin = !!comToken;

  // 4. Test token verification
  if (comToken) {
    results.tokenVerify = await testAdminVerify(comToken);
  }

  // 5. Create .vn admin if needed
  if (results.adminStatus && !results.adminStatus.hasVnAdmin) {
    results.vnAdminCreation = await testCreateVnAdmin();
  }

  // 6. Test .vn admin login
  const vnToken = await testAdminLogin('admin@taivideonhanh.vn', 'admin123456');
  results.vnAdminLogin = !!vnToken;

  // 7. Test frontend pages
  await testFrontendPages();

  // Summary
  logHeader('TEST SUMMARY');
  logInfo(`Health Check: ${results.healthCheck ? '✅' : '❌'}`);
  logInfo(`Admin Status: ${results.adminStatus ? '✅' : '❌'}`);
  logInfo(`COM Admin Login: ${results.comAdminLogin ? '✅' : '❌'}`);
  logInfo(`VN Admin Login: ${results.vnAdminLogin ? '✅' : '❌'}`);
  logInfo(`Token Verify: ${results.tokenVerify ? '✅' : '❌'}`);
  
  const overallSuccess = results.healthCheck && 
                        results.adminStatus && 
                        (results.comAdminLogin || results.vnAdminLogin) && 
                        results.tokenVerify;

  if (overallSuccess) {
    logSuccess('🎉 ALL TESTS PASSED! Admin system is working correctly.');
  } else {
    logError('❌ Some tests failed. Please check the issues above.');
  }

  logInfo('⏰ Completed at: ' + new Date().toLocaleString());
  
  return results;
}

// Run the test suite
runCompleteTest().catch(console.error);
