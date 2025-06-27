#!/usr/bin/env node

/**
 * Script để tạo admin user trực tiếp trong database production
 */

const { Client } = require('pg');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

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

// Database connection configurations to try
const dbConfigs = [
  {
    name: 'Production (External)',
    host: 'taivideonhanh.vn',
    port: 5432,
    database: 'taivideonhanh_prod',
    user: 'taivideonhanh_user',
    password: 'your_secure_db_password_here' // This won't work, just for testing
  },
  {
    name: 'Local Docker',
    host: 'localhost',
    port: 5432,
    database: 'taivideonhanh_dev',
    user: 'postgres',
    password: 'postgres123'
  }
];

async function testDatabaseConnection(config) {
  const client = new Client(config);
  
  try {
    logInfo(`Testing connection to ${config.name}...`);
    await client.connect();
    
    // Test query
    const result = await client.query('SELECT NOW() as current_time');
    logSuccess(`Connected to ${config.name}: ${result.rows[0].current_time}`);
    
    return client;
  } catch (error) {
    logWarning(`Failed to connect to ${config.name}: ${error.message}`);
    try {
      await client.end();
    } catch (e) {}
    return null;
  }
}

async function checkExistingAdmins(client) {
  try {
    logInfo('🔍 Checking existing admin users...');
    
    const result = await client.query(`
      SELECT id, email, role, is_active, created_at 
      FROM admins 
      ORDER BY created_at DESC
    `);
    
    if (result.rows.length > 0) {
      logInfo('📋 Existing admin users:');
      result.rows.forEach(admin => {
        console.log(`   - ${admin.email} (${admin.role}) - ${admin.is_active ? 'Active' : 'Inactive'} - Created: ${admin.created_at}`);
      });
    } else {
      logInfo('No existing admin users found');
    }
    
    return result.rows;
  } catch (error) {
    logError(`Error checking existing admins: ${error.message}`);
    return [];
  }
}

async function createAdminUser(client, email, password) {
  try {
    logInfo(`👤 Creating admin user: ${email}`);
    
    // Check if admin already exists
    const existingResult = await client.query(
      'SELECT id FROM admins WHERE email = $1',
      [email]
    );
    
    if (existingResult.rows.length > 0) {
      logWarning(`Admin user ${email} already exists`);
      
      // Update password
      logInfo('🔄 Updating password...');
      const hashedPassword = await bcrypt.hash(password, 12);
      
      await client.query(`
        UPDATE admins 
        SET password_hash = $1, updated_at = NOW()
        WHERE email = $2
      `, [hashedPassword, email]);
      
      logSuccess('Password updated successfully');
      return true;
    }
    
    // Create new admin user
    const id = uuidv4();
    const hashedPassword = await bcrypt.hash(password, 12);
    const permissions = JSON.stringify([
      'user_management',
      'subscription_management',
      'payment_management',
      'system_settings',
      'analytics_view'
    ]);
    
    await client.query(`
      INSERT INTO admins (
        id, email, password_hash, role, permissions, 
        is_active, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
    `, [id, email, hashedPassword, 'super_admin', permissions, true]);
    
    logSuccess(`Admin user created successfully: ${email}`);
    return true;
    
  } catch (error) {
    logError(`Error creating admin user: ${error.message}`);
    return false;
  }
}

async function testAdminLogin(email, password) {
  try {
    logInfo(`🧪 Testing login for ${email}...`);
    
    const https = require('https');
    
    const options = {
      hostname: 'taivideonhanh.vn',
      port: 443,
      path: '/api/admin/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    const data = JSON.stringify({ email, password });
    
    return new Promise((resolve) => {
      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          try {
            const response = JSON.parse(body);
            if (res.statusCode === 200) {
              logSuccess(`✓ Login successful for ${email}`);
              resolve(true);
            } else {
              logWarning(`✗ Login failed for ${email}: ${response.error}`);
              resolve(false);
            }
          } catch (e) {
            logError(`✗ Login test error for ${email}: ${body}`);
            resolve(false);
          }
        });
      });
      
      req.on('error', (error) => {
        logError(`✗ Request error for ${email}: ${error.message}`);
        resolve(false);
      });
      
      req.write(data);
      req.end();
    });
  } catch (error) {
    logError(`Error testing login: ${error.message}`);
    return false;
  }
}

async function main() {
  logInfo('🚀 Starting direct database admin creation...');
  
  let client = null;
  
  // Try to connect to database
  for (const config of dbConfigs) {
    client = await testDatabaseConnection(config);
    if (client) break;
  }
  
  if (!client) {
    logError('❌ Could not connect to any database');
    logInfo('💡 Possible solutions:');
    logInfo('   1. Check database connection settings');
    logInfo('   2. Ensure database is accessible from this location');
    logInfo('   3. Use the existing admin@taivideonhanh.com account');
    logInfo('   4. Create admin user via server console/SSH');
    return;
  }
  
  try {
    // Check existing admins
    await checkExistingAdmins(client);
    
    // Create new admin user
    const success = await createAdminUser(client, 'admin@taivideonhanh.vn', 'admin123456');
    
    if (success) {
      // Test login
      await testAdminLogin('admin@taivideonhanh.vn', 'admin123456');
      
      logSuccess('🎉 Admin user setup completed!');
      logInfo('📧 Email: admin@taivideonhanh.vn');
      logInfo('🔑 Password: admin123456');
      logInfo('🌐 Login URL: https://taivideonhanh.vn/admin/login');
    }
    
  } finally {
    await client.end();
  }
}

// Install required packages if not available
async function checkAndInstallDependencies() {
  try {
    require('uuid');
  } catch (error) {
    logInfo('Installing required dependencies...');
    const { execSync } = require('child_process');
    execSync('npm install uuid', { stdio: 'inherit' });
  }
}

// Run the script
checkAndInstallDependencies().then(() => {
  main().catch(console.error);
});
