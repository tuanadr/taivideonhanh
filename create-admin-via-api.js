#!/usr/bin/env node

/**
 * Script để tạo admin user thông qua API call trực tiếp
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

async function testAdminLogin() {
  try {
    logInfo('🧪 Testing admin login with different credentials...');
    
    const testCredentials = [
      { email: 'admin@taivideonhanh.vn', password: 'admin123456' },
      { email: 'admin@taivideonhanh.com', password: 'admin123456' },
      { email: 'admin@taivideonhanh.com', password: 'TaiVideo2024!Admin' },
      { email: 'admin@taivideonhanh.vn', password: 'TaiVideo2024!Admin' }
    ];

    for (const creds of testCredentials) {
      logInfo(`Testing: ${creds.email} / ${creds.password}`);
      
      const options = {
        hostname: 'taivideonhanh.vn',
        port: 443,
        path: '/api/admin/login',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Admin-Setup-Script/1.0'
        }
      };

      try {
        const response = await makeRequest(options, creds);
        
        if (response.statusCode === 200) {
          logSuccess(`✓ Login successful with ${creds.email}`);
          logInfo(`Response: ${JSON.stringify(response.data, null, 2)}`);
          return true;
        } else {
          logWarning(`✗ Login failed with ${creds.email}: ${response.statusCode} - ${response.data?.error || response.body}`);
        }
      } catch (error) {
        logError(`✗ Request failed for ${creds.email}: ${error.message}`);
      }
    }

    return false;
  } catch (error) {
    logError(`Error during testing: ${error.message}`);
    return false;
  }
}

async function checkHealthAndInfo() {
  try {
    logInfo('🏥 Checking server health...');
    
    const healthOptions = {
      hostname: 'taivideonhanh.vn',
      port: 443,
      path: '/api/health',
      method: 'GET',
      headers: {
        'User-Agent': 'Admin-Setup-Script/1.0'
      }
    };

    const healthResponse = await makeRequest(healthOptions);
    
    if (healthResponse.statusCode === 200) {
      logSuccess('Server is healthy');
      logInfo(`Health info: ${JSON.stringify(healthResponse.data, null, 2)}`);
    } else {
      logWarning(`Health check failed: ${healthResponse.statusCode}`);
    }

    // Check if there's an endpoint to get admin info
    logInfo('🔍 Checking admin endpoints...');
    
    const adminOptions = {
      hostname: 'taivideonhanh.vn',
      port: 443,
      path: '/api/admin',
      method: 'GET',
      headers: {
        'User-Agent': 'Admin-Setup-Script/1.0'
      }
    };

    const adminResponse = await makeRequest(adminOptions);
    logInfo(`Admin endpoint response: ${adminResponse.statusCode} - ${adminResponse.body}`);

  } catch (error) {
    logError(`Error checking health: ${error.message}`);
  }
}

async function main() {
  logInfo('🚀 Starting admin user diagnosis...');
  
  await checkHealthAndInfo();
  
  const loginSuccess = await testAdminLogin();
  
  if (loginSuccess) {
    logSuccess('🎉 Admin login is working!');
  } else {
    logError('❌ No working admin credentials found');
    logInfo('💡 Possible solutions:');
    logInfo('   1. Check if admin user exists in database');
    logInfo('   2. Verify email domain (.vn vs .com)');
    logInfo('   3. Check password hash in database');
    logInfo('   4. Run database migration to create default admin');
  }
}

// Run the script
main().catch(console.error);
