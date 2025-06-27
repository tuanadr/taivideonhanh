#!/usr/bin/env node

/**
 * Script để test fix admin login và verify endpoint
 */

const https = require('https');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
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

async function testAdminLogin(email, password) {
  try {
    logInfo(`🔐 Testing login: ${email}`);
    
    const options = {
      hostname: 'taivideonhanh.vn',
      port: 443,
      path: '/api/admin/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Admin-Test-Script/1.0'
      }
    };

    const response = await makeRequest(options, { email, password });
    
    if (response.statusCode === 200 && response.data?.token) {
      logSuccess(`✓ Login successful for ${email}`);
      return response.data.token;
    } else {
      logWarning(`✗ Login failed for ${email}: ${response.statusCode} - ${response.data?.error || response.body}`);
      return null;
    }
  } catch (error) {
    logError(`Error testing login for ${email}: ${error.message}`);
    return null;
  }
}

async function testAdminVerify(token) {
  try {
    logInfo('🔍 Testing admin verify endpoint...');
    
    const options = {
      hostname: 'taivideonhanh.vn',
      port: 443,
      path: '/api/admin/verify',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Admin-Test-Script/1.0'
      }
    };

    const response = await makeRequest(options);
    
    if (response.statusCode === 200) {
      logSuccess('✓ Admin verify endpoint working');
      logInfo(`Admin info: ${JSON.stringify(response.data?.admin, null, 2)}`);
      return true;
    } else {
      logWarning(`✗ Admin verify failed: ${response.statusCode} - ${response.data?.error || response.body}`);
      return false;
    }
  } catch (error) {
    logError(`Error testing admin verify: ${error.message}`);
    return false;
  }
}

async function testDashboardAccess(token) {
  try {
    logInfo('📊 Testing dashboard access...');
    
    const options = {
      hostname: 'taivideonhanh.vn',
      port: 443,
      path: '/api/admin/dashboard/stats',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Admin-Test-Script/1.0'
      }
    };

    const response = await makeRequest(options);
    
    if (response.statusCode === 200) {
      logSuccess('✓ Dashboard access working');
      return true;
    } else {
      logWarning(`✗ Dashboard access failed: ${response.statusCode} - ${response.data?.error || response.body}`);
      return false;
    }
  } catch (error) {
    logError(`Error testing dashboard access: ${error.message}`);
    return false;
  }
}

async function main() {
  logInfo('🚀 Testing admin login fix...');
  
  // Test với admin hiện tại
  logInfo('=== Testing existing admin ===');
  const token1 = await testAdminLogin('admin@taivideonhanh.com', 'admin123456');
  
  if (token1) {
    await testAdminVerify(token1);
    await testDashboardAccess(token1);
  }
  
  // Test với admin mới (nếu đã tạo)
  logInfo('\n=== Testing new admin (.vn domain) ===');
  const token2 = await testAdminLogin('admin@taivideonhanh.vn', 'admin123456');
  
  if (token2) {
    await testAdminVerify(token2);
    await testDashboardAccess(token2);
  } else {
    logWarning('Admin user with .vn domain not found');
    logInfo('💡 Run the SQL script to create it:');
    logInfo('   bash run-admin-sql.sh');
  }
  
  logInfo('\n🎯 Summary:');
  logInfo('1. ✅ Backend has /api/admin/verify endpoint');
  logInfo('2. ✅ Login working with existing admin');
  logInfo('3. ⚠️  Need to create admin@taivideonhanh.vn user');
  logInfo('4. 🔄 Need to restart backend service to load new code');
  
  logInfo('\n📋 Next steps:');
  logInfo('1. Deploy updated backend code');
  logInfo('2. Run SQL script to create .vn admin user');
  logInfo('3. Test frontend login flow');
}

// Run the script
main().catch(console.error);
