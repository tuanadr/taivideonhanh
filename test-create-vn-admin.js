#!/usr/bin/env node

/**
 * Script để test endpoint tạo admin .vn
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

async function createVnAdmin() {
  try {
    logInfo('🔧 Creating admin@taivideonhanh.vn user...');
    
    const options = {
      hostname: 'taivideonhanh.vn',
      port: 443,
      path: '/api/admin/create-vn-admin',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Admin-Creation-Script/1.0'
      }
    };

    const response = await makeRequest(options, {});
    
    if (response.statusCode === 200) {
      logSuccess('✓ Admin user created successfully!');
      logInfo(`Admin info: ${JSON.stringify(response.data?.admin, null, 2)}`);
      return true;
    } else {
      logWarning(`✗ Admin creation failed: ${response.statusCode} - ${response.data?.error || response.body}`);
      return false;
    }
  } catch (error) {
    logError(`Error creating admin: ${error.message}`);
    return false;
  }
}

async function testVnAdminLogin() {
  try {
    logInfo('🧪 Testing admin@taivideonhanh.vn login...');
    
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

    const response = await makeRequest(options, {
      email: 'admin@taivideonhanh.vn',
      password: 'admin123456'
    });
    
    if (response.statusCode === 200 && response.data?.token) {
      logSuccess('✓ Login successful!');
      logInfo(`Token: ${response.data.token.substring(0, 50)}...`);
      return response.data.token;
    } else {
      logWarning(`✗ Login failed: ${response.statusCode} - ${response.data?.error || response.body}`);
      return null;
    }
  } catch (error) {
    logError(`Error testing login: ${error.message}`);
    return null;
  }
}

async function testVerifyEndpoint(token) {
  try {
    logInfo('🔍 Testing /api/admin/verify endpoint...');
    
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
      logSuccess('✓ Verify endpoint working!');
      logInfo(`Admin: ${response.data?.admin?.email} (${response.data?.admin?.role})`);
      return true;
    } else {
      logWarning(`✗ Verify failed: ${response.statusCode} - ${response.data?.error || response.body}`);
      return false;
    }
  } catch (error) {
    logError(`Error testing verify: ${error.message}`);
    return false;
  }
}

async function main() {
  logInfo('🚀 Testing admin creation and login flow...');
  
  // Bước 1: Tạo admin user
  logInfo('\n=== Step 1: Create Admin User ===');
  const created = await createVnAdmin();
  
  if (!created) {
    logError('Failed to create admin user');
    return;
  }
  
  // Bước 2: Test login
  logInfo('\n=== Step 2: Test Login ===');
  const token = await testVnAdminLogin();
  
  if (!token) {
    logError('Failed to login with new admin');
    return;
  }
  
  // Bước 3: Test verify endpoint
  logInfo('\n=== Step 3: Test Verify Endpoint ===');
  const verified = await testVerifyEndpoint(token);
  
  if (verified) {
    logSuccess('🎉 All tests passed!');
    logInfo('\n📋 Summary:');
    logInfo('✅ Admin user created: admin@taivideonhanh.vn');
    logInfo('✅ Login working');
    logInfo('✅ Verify endpoint working');
    logInfo('✅ Frontend redirect loop should be fixed');
    
    logInfo('\n🎯 Next steps:');
    logInfo('1. Test frontend login at https://taivideonhanh.vn/admin/login');
    logInfo('2. Use credentials: admin@taivideonhanh.vn / admin123456');
    logInfo('3. Verify dashboard access works');
  } else {
    logError('Verify endpoint failed');
  }
}

// Run the script
main().catch(console.error);
