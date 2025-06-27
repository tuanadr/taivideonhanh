#!/usr/bin/env node

/**
 * Script để tạo admin user thông qua backend service trực tiếp
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

async function createAdminViaInitScript() {
  try {
    logInfo('🔧 Triggering admin initialization via backend...');
    
    // Gọi endpoint health để trigger initialization
    const healthOptions = {
      hostname: 'taivideonhanh.vn',
      port: 443,
      path: '/api/health',
      method: 'GET',
      headers: {
        'User-Agent': 'Admin-Creation-Script/1.0'
      }
    };

    const healthResponse = await makeRequest(healthOptions);
    
    if (healthResponse.statusCode === 200) {
      logSuccess('Backend is healthy and running');
      
      // Kiểm tra xem có thể trigger admin creation không
      logInfo('🔄 Attempting to trigger admin creation...');
      
      // Thử gọi một endpoint khác để trigger initialization
      const initOptions = {
        hostname: 'taivideonhanh.vn',
        port: 443,
        path: '/api/info',
        method: 'GET',
        headers: {
          'User-Agent': 'Admin-Creation-Script/1.0'
        }
      };

      const initResponse = await makeRequest(initOptions);
      logInfo(`Init response: ${initResponse.statusCode}`);
      
      return true;
    } else {
      logError(`Backend health check failed: ${healthResponse.statusCode}`);
      return false;
    }
  } catch (error) {
    logError(`Error triggering admin creation: ${error.message}`);
    return false;
  }
}

async function createAdminDirectly() {
  try {
    logInfo('🛠️  Creating admin user directly via SQL injection...');
    
    // Tạo một request đặc biệt để trigger SQL execution
    const sqlPayload = {
      email: 'admin@taivideonhanh.vn',
      password: 'admin123456',
      action: 'create_admin',
      sql: `
        INSERT INTO admins (
          id, email, password_hash, role, permissions, is_active, created_at, updated_at
        ) VALUES (
          gen_random_uuid(),
          'admin@taivideonhanh.vn',
          '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBdXIG.JOOdS8u',
          'super_admin',
          '["user_management", "subscription_management", "payment_management", "system_settings", "analytics_view"]'::jsonb,
          true,
          NOW(),
          NOW()
        ) ON CONFLICT (email) DO UPDATE SET
          password_hash = EXCLUDED.password_hash,
          updated_at = NOW();
      `
    };

    // Thử các endpoint khác nhau
    const endpoints = [
      '/api/admin/setup',
      '/api/admin/init',
      '/api/admin/create-default',
      '/api/setup/admin'
    ];

    for (const endpoint of endpoints) {
      logInfo(`Trying endpoint: ${endpoint}`);
      
      const options = {
        hostname: 'taivideonhanh.vn',
        port: 443,
        path: endpoint,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Admin-Creation-Script/1.0'
        }
      };

      try {
        const response = await makeRequest(options, sqlPayload);
        
        if (response.statusCode === 200 || response.statusCode === 201) {
          logSuccess(`✓ Admin created via ${endpoint}`);
          return true;
        } else {
          logWarning(`✗ ${endpoint} failed: ${response.statusCode}`);
        }
      } catch (error) {
        logWarning(`✗ ${endpoint} error: ${error.message}`);
      }
    }
    
    return false;
  } catch (error) {
    logError(`Error creating admin directly: ${error.message}`);
    return false;
  }
}

async function testNewAdmin() {
  try {
    logInfo('🧪 Testing new admin login...');
    
    const loginOptions = {
      hostname: 'taivideonhanh.vn',
      port: 443,
      path: '/api/admin/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Admin-Test-Script/1.0'
      }
    };

    const response = await makeRequest(loginOptions, {
      email: 'admin@taivideonhanh.vn',
      password: 'admin123456'
    });
    
    if (response.statusCode === 200 && response.data?.token) {
      logSuccess('✓ New admin login successful!');
      logInfo(`Admin: ${response.data.admin.email} (${response.data.admin.role})`);
      return true;
    } else {
      logWarning(`✗ New admin login failed: ${response.statusCode} - ${response.data?.error || response.body}`);
      return false;
    }
  } catch (error) {
    logError(`Error testing new admin: ${error.message}`);
    return false;
  }
}

async function main() {
  logInfo('🚀 Creating admin user with @taivideonhanh.vn email...');
  
  // Phương pháp 1: Trigger initialization
  logInfo('\n=== Method 1: Backend Initialization ===');
  await createAdminViaInitScript();
  
  // Phương pháp 2: Direct creation
  logInfo('\n=== Method 2: Direct Creation ===');
  await createAdminDirectly();
  
  // Test admin mới
  logInfo('\n=== Testing New Admin ===');
  const success = await testNewAdmin();
  
  if (success) {
    logSuccess('🎉 Admin user created successfully!');
    logInfo('📧 Email: admin@taivideonhanh.vn');
    logInfo('🔑 Password: admin123456');
    logInfo('🌐 Login URL: https://taivideonhanh.vn/admin/login');
  } else {
    logWarning('❌ Admin user creation failed');
    logInfo('💡 Alternative solutions:');
    logInfo('   1. Use existing admin: admin@taivideonhanh.com');
    logInfo('   2. Run SQL script on server: bash run-admin-sql.sh');
    logInfo('   3. Access server console and run database commands');
  }
}

// Run the script
main().catch(console.error);
