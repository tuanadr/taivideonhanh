#!/usr/bin/env node

/**
 * Script để tạo admin user với email @taivideonhanh.vn thông qua API
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

async function getAdminToken() {
  try {
    logInfo('🔑 Getting admin token...');
    
    const loginOptions = {
      hostname: 'taivideonhanh.vn',
      port: 443,
      path: '/api/admin/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Admin-Setup-Script/1.0'
      }
    };

    const loginData = {
      email: 'admin@taivideonhanh.com',
      password: 'admin123456'
    };

    const response = await makeRequest(loginOptions, loginData);
    
    if (response.statusCode === 200 && response.data?.token) {
      logSuccess('Admin token obtained');
      return response.data.token;
    } else {
      logError(`Failed to get admin token: ${response.statusCode} - ${response.data?.error || response.body}`);
      return null;
    }
  } catch (error) {
    logError(`Error getting admin token: ${error.message}`);
    return null;
  }
}

async function createAdminUser(token) {
  try {
    logInfo('👤 Creating new admin user with @taivideonhanh.vn email...');
    
    // Kiểm tra xem có endpoint để tạo admin user không
    const createOptions = {
      hostname: 'taivideonhanh.vn',
      port: 443,
      path: '/api/admin/users', // Thử endpoint này
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'Admin-Setup-Script/1.0'
      }
    };

    const newAdminData = {
      email: 'admin@taivideonhanh.vn',
      password: 'admin123456',
      role: 'super_admin',
      permissions: [
        'user_management',
        'subscription_management',
        'payment_management',
        'system_settings',
        'analytics_view'
      ]
    };

    const response = await makeRequest(createOptions, newAdminData);
    
    if (response.statusCode === 200 || response.statusCode === 201) {
      logSuccess('New admin user created successfully!');
      logInfo(`Response: ${JSON.stringify(response.data, null, 2)}`);
      return true;
    } else {
      logWarning(`Create admin failed: ${response.statusCode} - ${response.data?.error || response.body}`);
      
      // Thử endpoint khác
      logInfo('Trying alternative endpoint...');
      const altOptions = {
        ...createOptions,
        path: '/api/admin/create'
      };
      
      const altResponse = await makeRequest(altOptions, newAdminData);
      
      if (altResponse.statusCode === 200 || altResponse.statusCode === 201) {
        logSuccess('New admin user created via alternative endpoint!');
        return true;
      } else {
        logError(`Alternative endpoint also failed: ${altResponse.statusCode} - ${altResponse.data?.error || altResponse.body}`);
        return false;
      }
    }
  } catch (error) {
    logError(`Error creating admin user: ${error.message}`);
    return false;
  }
}

async function testNewAdminLogin() {
  try {
    logInfo('🧪 Testing new admin login...');
    
    const loginOptions = {
      hostname: 'taivideonhanh.vn',
      port: 443,
      path: '/api/admin/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Admin-Setup-Script/1.0'
      }
    };

    const loginData = {
      email: 'admin@taivideonhanh.vn',
      password: 'admin123456'
    };

    const response = await makeRequest(loginOptions, loginData);
    
    if (response.statusCode === 200) {
      logSuccess('✓ New admin login successful!');
      logInfo(`Admin info: ${JSON.stringify(response.data.admin, null, 2)}`);
      return true;
    } else {
      logError(`✗ New admin login failed: ${response.statusCode} - ${response.data?.error || response.body}`);
      return false;
    }
  } catch (error) {
    logError(`Error testing new admin login: ${error.message}`);
    return false;
  }
}

async function main() {
  logInfo('🚀 Starting admin user creation process...');
  
  // Bước 1: Lấy admin token
  const token = await getAdminToken();
  if (!token) {
    logError('Cannot proceed without admin token');
    return;
  }

  // Bước 2: Tạo admin user mới
  const created = await createAdminUser(token);
  if (!created) {
    logWarning('Failed to create admin user via API');
    logInfo('💡 You may need to create the admin user directly in the database');
    logInfo('   or check if there\'s a specific admin creation endpoint');
  }

  // Bước 3: Test login với user mới
  await testNewAdminLogin();
  
  logInfo('🎯 Summary:');
  logInfo('   - Current working admin: admin@taivideonhanh.com');
  logInfo('   - Desired admin: admin@taivideonhanh.vn');
  logInfo('   - Next step: Check frontend redirect logic');
}

// Run the script
main().catch(console.error);
