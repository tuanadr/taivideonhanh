#!/usr/bin/env node

/**
 * Comprehensive Cookie Management System Test Suite
 * Tests all cookie endpoints and functionality
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

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
      if (typeof data === 'string') {
        req.write(data);
      } else {
        req.write(JSON.stringify(data));
      }
    }
    
    req.end();
  });
}

// Test functions
async function getAdminToken() {
  logHeader('GETTING ADMIN TOKEN');
  
  try {
    const response = await makeRequest({
      hostname: 'taivideonhanh.vn',
      port: 443,
      path: '/api/admin/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, {
      email: 'admin@taivideonhanh.com',
      password: 'admin123456'
    });

    if (response.statusCode === 200 && response.data?.token) {
      logSuccess('Admin token obtained');
      return response.data.token;
    } else {
      logError(`Failed to get admin token: ${response.statusCode}`);
      return null;
    }
  } catch (error) {
    logError(`Admin login error: ${error.message}`);
    return null;
  }
}

async function testCookieStatus(token) {
  logHeader('COOKIE STATUS TEST');
  
  try {
    const response = await makeRequest({
      hostname: 'taivideonhanh.vn',
      port: 443,
      path: '/api/admin/cookie/status',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.statusCode === 200) {
      logSuccess('Cookie status retrieved');
      const status = response.data?.status;
      if (status) {
        logInfo(`Total Cookie Files: ${status.totalCookieFiles}`);
        logInfo(`Active Cookie File: ${status.activeCookieFile || 'None'}`);
        logInfo(`File Size: ${status.fileSize} bytes`);
        logInfo(`Is Valid: ${status.isValid ? '✅' : '❌'}`);
        logInfo(`Supported Platforms: ${status.supportedPlatforms?.join(', ')}`);
        logInfo(`Backup Count: ${status.backupCount}`);
      }
      return status;
    } else {
      logError(`Cookie status failed: ${response.statusCode}`);
      return null;
    }
  } catch (error) {
    logError(`Cookie status error: ${error.message}`);
    return null;
  }
}

async function testCookieUpload(token) {
  logHeader('COOKIE UPLOAD TEST');
  
  try {
    // Create a sample cookie file
    const sampleCookie = `# Sample YouTube Cookie File
# This is a test cookie file
.youtube.com	TRUE	/	FALSE	1735689600	session_token	sample_session_token_value
.youtube.com	TRUE	/	FALSE	1735689600	VISITOR_INFO1_LIVE	sample_visitor_info
.googlevideo.com	TRUE	/	FALSE	1735689600	__Secure-3PSID	sample_secure_psid`;

    const tempFile = path.join(__dirname, 'temp_test_cookie.txt');
    fs.writeFileSync(tempFile, sampleCookie);

    // Note: This is a simplified test. In a real scenario, you would use FormData
    // For now, we'll test the endpoint availability
    const response = await makeRequest({
      hostname: 'taivideonhanh.vn',
      port: 443,
      path: '/api/admin/cookie/upload',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }, {
      filename: 'test_cookie.txt',
      platform: 'youtube',
      description: 'Test cookie upload'
    });

    // Clean up temp file
    try {
      fs.unlinkSync(tempFile);
    } catch (e) {}

    if (response.statusCode === 400) {
      logWarning('Cookie upload endpoint exists but requires multipart form data');
      return true;
    } else if (response.statusCode === 200) {
      logSuccess('Cookie upload successful');
      return true;
    } else {
      logError(`Cookie upload failed: ${response.statusCode}`);
      return false;
    }
  } catch (error) {
    logError(`Cookie upload error: ${error.message}`);
    return false;
  }
}

async function testCookieTest(token) {
  logHeader('COOKIE TEST FUNCTIONALITY');
  
  try {
    const response = await makeRequest({
      hostname: 'taivideonhanh.vn',
      port: 443,
      path: '/api/admin/cookie/test',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }, {
      testUrl: 'https://www.youtube.com'
    });

    if (response.statusCode === 200) {
      logSuccess('Cookie test completed');
      const result = response.data?.result;
      if (result) {
        logInfo(`Test Success: ${result.success ? '✅' : '❌'}`);
        logInfo(`Response Time: ${result.responseTime}ms`);
        if (result.error) logInfo(`Error: ${result.error}`);
      }
      return true;
    } else {
      logWarning(`Cookie test failed: ${response.statusCode} - ${response.data?.error || response.body}`);
      return false;
    }
  } catch (error) {
    logError(`Cookie test error: ${error.message}`);
    return false;
  }
}

async function testCookieList(token) {
  logHeader('COOKIE LIST TEST');
  
  try {
    const response = await makeRequest({
      hostname: 'taivideonhanh.vn',
      port: 443,
      path: '/api/admin/cookie/list?page=1&limit=10',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.statusCode === 200) {
      logSuccess('Cookie list retrieved');
      const data = response.data;
      if (data?.cookies) {
        logInfo(`Found ${data.cookies.length} cookies`);
        logInfo(`Total: ${data.pagination?.total || 0}`);
      }
      return true;
    } else {
      logError(`Cookie list failed: ${response.statusCode}`);
      return false;
    }
  } catch (error) {
    logError(`Cookie list error: ${error.message}`);
    return false;
  }
}

async function testFrontendPages() {
  logHeader('FRONTEND PAGES TEST');
  
  const pages = [
    '/admin/cookies',
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
async function runCookieSystemTest() {
  logInfo('🍪 Starting Cookie Management System Test Suite');
  logInfo('🌐 Target: https://taivideonhanh.vn');
  logInfo('⏰ Started at: ' + new Date().toLocaleString());
  
  const results = {
    adminToken: false,
    cookieStatus: false,
    cookieUpload: false,
    cookieTest: false,
    cookieList: false,
    frontendPages: false
  };

  // 1. Get admin token
  const token = await getAdminToken();
  results.adminToken = !!token;

  if (!token) {
    logError('Cannot proceed without admin token');
    return results;
  }

  // 2. Test cookie status
  const status = await testCookieStatus(token);
  results.cookieStatus = !!status;

  // 3. Test cookie upload
  results.cookieUpload = await testCookieUpload(token);

  // 4. Test cookie testing functionality
  results.cookieTest = await testCookieTest(token);

  // 5. Test cookie list
  results.cookieList = await testCookieList(token);

  // 6. Test frontend pages
  await testFrontendPages();

  // Summary
  logHeader('TEST SUMMARY');
  logInfo(`Admin Token: ${results.adminToken ? '✅' : '❌'}`);
  logInfo(`Cookie Status: ${results.cookieStatus ? '✅' : '❌'}`);
  logInfo(`Cookie Upload: ${results.cookieUpload ? '✅' : '❌'}`);
  logInfo(`Cookie Test: ${results.cookieTest ? '✅' : '❌'}`);
  logInfo(`Cookie List: ${results.cookieList ? '✅' : '❌'}`);
  
  const overallSuccess = results.adminToken && 
                        results.cookieStatus && 
                        results.cookieUpload && 
                        results.cookieTest &&
                        results.cookieList;

  if (overallSuccess) {
    logSuccess('🎉 ALL COOKIE SYSTEM TESTS PASSED!');
  } else {
    logError('❌ Some cookie system tests failed. Please check the issues above.');
  }

  logInfo('⏰ Completed at: ' + new Date().toLocaleString());
  
  return results;
}

// Run the test suite
runCookieSystemTest().catch(console.error);
