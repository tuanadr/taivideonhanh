#!/usr/bin/env node

/**
 * Quick Setup Script for TaiVideoNhanh Admin System
 * Automatically creates default admin user and sets up cookie system
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');

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

async function checkEnvironment() {
  log('\n🔍 Checking Environment...', 'cyan');
  
  const requiredEnvVars = [
    'DB_NAME',
    'DB_USER', 
    'DB_PASSWORD',
    'DB_HOST',
    'JWT_SECRET',
    'ADMIN_JWT_SECRET'
  ];

  let allPresent = true;
  
  for (const envVar of requiredEnvVars) {
    if (process.env[envVar]) {
      logSuccess(`${envVar} is set`);
    } else {
      logError(`${envVar} is missing`);
      allPresent = false;
    }
  }

  // Check optional but recommended vars
  const optionalVars = [
    'DEFAULT_ADMIN_EMAIL',
    'DEFAULT_ADMIN_PASSWORD',
    'COOKIES_PATH',
    'ENABLE_COOKIE_AUTH'
  ];

  for (const envVar of optionalVars) {
    if (process.env[envVar]) {
      logInfo(`${envVar} is set: ${envVar.includes('PASSWORD') ? '***' : process.env[envVar]}`);
    } else {
      logWarning(`${envVar} is not set (will use default)`);
    }
  }

  return allPresent;
}

async function setupCookieDirectories() {
  log('\n📁 Setting up Cookie Directories...', 'cyan');
  
  const cookieDirs = [
    '/tmp/cookies',
    '/tmp/cookies/backup'
  ];

  for (const dir of cookieDirs) {
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
        logSuccess(`Created directory: ${dir}`);
      } else {
        logInfo(`Directory already exists: ${dir}`);
      }

      // Set permissions (Unix only)
      if (process.platform !== 'win32') {
        const { exec } = require('child_process');
        exec(`chmod 700 ${dir}`, (error) => {
          if (error) {
            logWarning(`Could not set permissions for ${dir}: ${error.message}`);
          }
        });
      }
    } catch (error) {
      logError(`Failed to create directory ${dir}: ${error.message}`);
      return false;
    }
  }

  return true;
}

async function runDatabaseMigration() {
  log('\n🗄️  Running Database Migration...', 'cyan');
  
  try {
    const { Sequelize } = require('sequelize');
    
    const sequelize = new Sequelize(
      process.env.DB_NAME,
      process.env.DB_USER,
      process.env.DB_PASSWORD,
      {
        host: process.env.DB_HOST,
        dialect: 'postgres',
        logging: false,
      }
    );

    // Test connection
    await sequelize.authenticate();
    logSuccess('Database connection established');

    // Read and execute migration
    const migrationPath = path.join(__dirname, 'backend/migrations/001-create-default-admin.sql');
    
    if (fs.existsSync(migrationPath)) {
      const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
      await sequelize.query(migrationSQL);
      logSuccess('Database migration executed successfully');
    } else {
      logWarning('Migration file not found, will use AdminService.initializeDefaultAdmin()');
      
      // Fallback to AdminService
      const AdminService = require('./backend/dist/services/adminService.js').default;
      await AdminService.initializeDefaultAdmin();
      logSuccess('Default admin initialized via AdminService');
    }

    await sequelize.close();
    return true;
  } catch (error) {
    logError(`Database migration failed: ${error.message}`);
    return false;
  }
}

async function createSampleCookieFile() {
  log('\n🍪 Creating Sample Cookie File...', 'cyan');
  
  const sampleCookieContent = `# Netscape HTTP Cookie File
# This is a sample multi-platform cookie file
# Replace with real cookies from your browser

# YouTube cookies
.youtube.com	TRUE	/	FALSE	1735689600	session_token	your_youtube_session_token_here
.youtube.com	TRUE	/	FALSE	1735689600	VISITOR_INFO1_LIVE	your_youtube_visitor_info_here
youtube.com	FALSE	/	FALSE	1735689600	YSC	your_youtube_ysc_value_here

# TikTok cookies  
.tiktok.com	TRUE	/	FALSE	1735689600	sessionid	your_tiktok_session_id_here
.tiktok.com	TRUE	/	FALSE	1735689600	tt_webid	your_tiktok_webid_here

# Facebook cookies
.facebook.com	TRUE	/	FALSE	1735689600	c_user	your_facebook_user_id_here
.facebook.com	TRUE	/	FALSE	1735689600	xs	your_facebook_xs_token_here

# Instagram cookies
.instagram.com	TRUE	/	FALSE	1735689600	sessionid	your_instagram_session_id_here
.instagram.com	TRUE	/	FALSE	1735689600	csrftoken	your_instagram_csrf_token_here

# Twitter/X cookies
.twitter.com	TRUE	/	FALSE	1735689600	auth_token	your_twitter_auth_token_here
.x.com	TRUE	/	FALSE	1735689600	auth_token	your_x_auth_token_here

# Note: Replace all "your_*_here" values with real cookies from your browser
# Use browser extension "Get cookies.txt LOCALLY" to export real cookies
`;

  const samplePath = path.join(__dirname, 'sample-multi-platform-cookies.txt');
  
  try {
    fs.writeFileSync(samplePath, sampleCookieContent);
    logSuccess(`Sample cookie file created: ${samplePath}`);
    logInfo('Edit this file with real cookies from your browser');
    return true;
  } catch (error) {
    logError(`Failed to create sample cookie file: ${error.message}`);
    return false;
  }
}

async function testSystemIntegration() {
  log('\n🧪 Testing System Integration...', 'cyan');
  
  try {
    // Test backend build
    const { exec } = require('child_process');
    
    return new Promise((resolve) => {
      exec('cd backend && npm run build', (error, stdout, stderr) => {
        if (error) {
          logError(`Backend build failed: ${error.message}`);
          resolve(false);
        } else {
          logSuccess('Backend builds successfully');
          
          // Test frontend build
          exec('cd frontend && npm run build', (error2, stdout2, stderr2) => {
            if (error2) {
              logError(`Frontend build failed: ${error2.message}`);
              resolve(false);
            } else {
              logSuccess('Frontend builds successfully');
              resolve(true);
            }
          });
        }
      });
    });
  } catch (error) {
    logError(`System integration test failed: ${error.message}`);
    return false;
  }
}

function printSetupSummary() {
  log('\n📋 Setup Summary', 'magenta');
  log('='.repeat(50), 'magenta');
  
  const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@taivideonhanh.vn';
  const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123456';
  
  log('\n🔐 Admin Credentials:', 'bright');
  log(`Email: ${adminEmail}`, 'green');
  log(`Password: ${adminPassword}`, 'green');
  log(`Role: super_admin`, 'green');
  log(`Permissions: user_management, subscription_management, payment_management, system_settings, analytics_view`, 'green');
  
  log('\n🌐 Access URLs:', 'bright');
  log(`Admin Login: http://localhost:3000/admin/login`, 'blue');
  log(`Cookie Management: http://localhost:3000/admin/cookie`, 'blue');
  log(`Admin Dashboard: http://localhost:3000/admin`, 'blue');
  
  log('\n🍪 Cookie System:', 'bright');
  log(`Cookie Path: ${process.env.COOKIES_PATH || '/tmp/cookies/platform-cookies.txt'}`, 'cyan');
  log(`Backup Path: /tmp/cookies/backup/`, 'cyan');
  log(`Multi-Platform Support: Enabled`, 'cyan');
  
  log('\n🚀 Next Steps:', 'bright');
  log('1. Start the backend server: cd backend && npm start');
  log('2. Start the frontend server: cd frontend && npm run dev');
  log('3. Login to admin panel with credentials above');
  log('4. Upload real cookie file in Cookie Management page');
  log('5. Test video download functionality');
  
  log('\n⚠️  Security Reminders:', 'yellow');
  log('• Change default admin password after first login');
  log('• Use real cookies from browser extension');
  log('• Rotate cookies monthly for security');
  log('• Monitor admin access logs');
  
  log('\n🛠️  Management Tools:', 'bright');
  log('• Admin Management: node create-admin-user.js');
  log('• System Test: node test-cookie-upload-system.js');
  log('• Quick Setup: node quick-setup-admin.js (this script)');
}

async function main() {
  log('🚀 TaiVideoNhanh Quick Setup', 'bright');
  log('='.repeat(50), 'bright');
  
  const steps = [
    { name: 'Environment Check', fn: checkEnvironment },
    { name: 'Cookie Directories', fn: setupCookieDirectories },
    { name: 'Database Migration', fn: runDatabaseMigration },
    { name: 'Sample Cookie File', fn: createSampleCookieFile },
    { name: 'System Integration Test', fn: testSystemIntegration }
  ];

  let completedSteps = 0;
  
  for (const step of steps) {
    const success = await step.fn();
    if (success) {
      completedSteps++;
    } else {
      logWarning(`Step "${step.name}" had issues but continuing...`);
    }
  }

  log(`\n📊 Setup Results: ${completedSteps}/${steps.length} steps completed`, 'bright');
  
  if (completedSteps === steps.length) {
    logSuccess('🎉 Setup completed successfully!');
  } else {
    logWarning('⚠️  Setup completed with some warnings');
  }

  printSetupSummary();
}

// Handle process termination
process.on('SIGINT', () => {
  log('\n\nSetup interrupted by user', 'yellow');
  process.exit(0);
});

// Run the setup
main().catch(error => {
  logError(`Setup failed: ${error.message}`);
  process.exit(1);
});
