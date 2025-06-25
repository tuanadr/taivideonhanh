#!/usr/bin/env node

/**
 * Admin Setup Wizard for TaiVideoNhanh
 * Interactive setup for admin users and cookie management
 */

require('dotenv').config();
const readline = require('readline');
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

function header(message) {
  log(`\n${message}`, 'magenta');
  log('='.repeat(message.length), 'magenta');
}

// Readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

function questionYesNo(prompt, defaultValue = false) {
  const defaultText = defaultValue ? 'Y/n' : 'y/N';
  return question(`${prompt} (${defaultText}): `).then(answer => {
    if (!answer) return defaultValue;
    return answer.toLowerCase().startsWith('y');
  });
}

async function welcomeScreen() {
  header('🎉 Welcome to TaiVideoNhanh Admin Setup Wizard');
  log('\nThis wizard will help you set up:', 'bright');
  log('• Admin user accounts');
  log('• Cookie management system');
  log('• Multi-platform video download support');
  log('• System configuration');
  
  const proceed = await questionYesNo('\nWould you like to continue?', true);
  if (!proceed) {
    log('\nSetup cancelled by user.', 'yellow');
    process.exit(0);
  }
}

async function checkSystemRequirements() {
  header('🔍 Checking System Requirements');
  
  const checks = [
    {
      name: 'Node.js version',
      check: () => {
        const version = process.version;
        const major = parseInt(version.slice(1).split('.')[0]);
        return major >= 18;
      },
      fix: 'Please upgrade to Node.js 18 or higher'
    },
    {
      name: 'Project structure',
      check: () => {
        return fs.existsSync('package.json') && 
               fs.existsSync('frontend') && 
               fs.existsSync('backend');
      },
      fix: 'Please run this script from the project root directory'
    },
    {
      name: 'Environment file',
      check: () => fs.existsSync('.env.production'),
      fix: 'Environment file will be created'
    },
    {
      name: 'Admin creation script',
      check: () => fs.existsSync('create-admin-user.js'),
      fix: 'Admin creation script not found'
    }
  ];

  let allPassed = true;
  
  for (const check of checks) {
    if (check.check()) {
      logSuccess(check.name);
    } else {
      logError(`${check.name}: ${check.fix}`);
      allPassed = false;
    }
  }

  if (!allPassed) {
    const continueAnyway = await questionYesNo('\nSome checks failed. Continue anyway?', false);
    if (!continueAnyway) {
      process.exit(1);
    }
  }

  return allPassed;
}

async function setupEnvironment() {
  header('🌍 Environment Configuration');
  
  const envFile = '.env.production';
  let envContent = '';
  
  if (fs.existsSync(envFile)) {
    envContent = fs.readFileSync(envFile, 'utf8');
    logInfo('Existing environment file found');
  } else {
    logInfo('Creating new environment file');
  }

  // Admin configuration
  log('\n📧 Admin Configuration:', 'bright');
  
  const adminEmail = await question('Admin email (admin@taivideonhanh.vn): ') || 'admin@taivideonhanh.vn';
  const adminPassword = await question('Admin password (admin123456): ') || 'admin123456';
  
  // Cookie configuration
  log('\n🍪 Cookie Configuration:', 'bright');
  
  const cookiePath = await question('Cookie file path (/tmp/cookies/platform-cookies.txt): ') || '/tmp/cookies/platform-cookies.txt';
  const enableCookieAuth = await questionYesNo('Enable cookie authentication?', true);
  
  // Database configuration
  log('\n🗄️  Database Configuration:', 'bright');
  
  const dbName = await question('Database name (taivideonhanh_prod): ') || 'taivideonhanh_prod';
  const dbUser = await question('Database user (postgres): ') || 'postgres';
  const dbPassword = await question('Database password: ');
  const dbHost = await question('Database host (localhost): ') || 'localhost';
  
  // Update environment content
  const newEnvVars = {
    'DEFAULT_ADMIN_EMAIL': adminEmail,
    'DEFAULT_ADMIN_PASSWORD': adminPassword,
    'COOKIES_PATH': cookiePath,
    'ENABLE_COOKIE_AUTH': enableCookieAuth.toString(),
    'DB_NAME': dbName,
    'DB_USER': dbUser,
    'DB_PASSWORD': dbPassword,
    'DB_HOST': dbHost
  };

  // Merge with existing environment
  for (const [key, value] of Object.entries(newEnvVars)) {
    const regex = new RegExp(`^${key}=.*$`, 'm');
    if (envContent.match(regex)) {
      envContent = envContent.replace(regex, `${key}=${value}`);
    } else {
      envContent += `\n${key}=${value}`;
    }
  }

  // Write environment file
  fs.writeFileSync(envFile, envContent.trim() + '\n');
  logSuccess('Environment configuration saved');
  
  return newEnvVars;
}

async function setupAdminUser(config) {
  header('👤 Admin User Setup');
  
  const createAdmin = await questionYesNo('Create default admin user?', true);
  
  if (createAdmin) {
    try {
      // Check if admin creation script exists
      if (!fs.existsSync('create-admin-user.js')) {
        logError('Admin creation script not found');
        return false;
      }

      logInfo('Creating admin user...');
      
      // Set environment variables for the script
      process.env.DEFAULT_ADMIN_EMAIL = config.DEFAULT_ADMIN_EMAIL;
      process.env.DEFAULT_ADMIN_PASSWORD = config.DEFAULT_ADMIN_PASSWORD;
      
      // Import and run admin creation
      const { exec } = require('child_process');
      
      return new Promise((resolve) => {
        exec('echo "1" | node create-admin-user.js', (error, stdout, stderr) => {
          if (error) {
            logError(`Admin creation failed: ${error.message}`);
            resolve(false);
          } else {
            logSuccess('Admin user created successfully');
            logInfo(`Email: ${config.DEFAULT_ADMIN_EMAIL}`);
            logInfo(`Password: ${config.DEFAULT_ADMIN_PASSWORD}`);
            resolve(true);
          }
        });
      });
      
    } catch (error) {
      logError(`Admin creation failed: ${error.message}`);
      return false;
    }
  }
  
  return true;
}

async function setupCookieSystem(config) {
  header('🍪 Cookie System Setup');
  
  const setupCookies = await questionYesNo('Set up cookie system?', true);
  
  if (setupCookies) {
    // Create cookie directories
    const cookieDir = path.dirname(config.COOKIES_PATH);
    const backupDir = path.join(cookieDir, 'backup');
    
    try {
      if (!fs.existsSync(cookieDir)) {
        fs.mkdirSync(cookieDir, { recursive: true });
        logSuccess(`Created cookie directory: ${cookieDir}`);
      }
      
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
        logSuccess(`Created backup directory: ${backupDir}`);
      }
      
      // Set permissions (Unix only)
      if (process.platform !== 'win32') {
        const { exec } = require('child_process');
        exec(`chmod 700 ${cookieDir} ${backupDir}`, (error) => {
          if (error) {
            logWarning(`Could not set directory permissions: ${error.message}`);
          } else {
            logSuccess('Directory permissions set');
          }
        });
      }
      
      // Create sample cookie file
      const sampleCookieContent = `# Netscape HTTP Cookie File
# Sample multi-platform cookie file
# Replace with real cookies from your browser

# YouTube cookies
.youtube.com	TRUE	/	FALSE	1735689600	session_token	your_youtube_session_here
.youtube.com	TRUE	/	FALSE	1735689600	VISITOR_INFO1_LIVE	your_youtube_visitor_here

# TikTok cookies
.tiktok.com	TRUE	/	FALSE	1735689600	sessionid	your_tiktok_session_here

# Facebook cookies
.facebook.com	TRUE	/	FALSE	1735689600	c_user	your_facebook_user_here

# Add more platform cookies as needed
`;
      
      const samplePath = path.join(cookieDir, 'sample-cookies.txt');
      fs.writeFileSync(samplePath, sampleCookieContent);
      logSuccess(`Sample cookie file created: ${samplePath}`);
      
      logInfo('\n📋 Cookie Setup Instructions:');
      log('1. Install browser extension "Get cookies.txt LOCALLY"');
      log('2. Login to YouTube, TikTok, Facebook, etc.');
      log('3. Export cookies using the extension');
      log('4. Upload the cookie file via admin panel');
      log('5. Test cookie functionality');
      
    } catch (error) {
      logError(`Cookie system setup failed: ${error.message}`);
      return false;
    }
  }
  
  return true;
}

async function deploymentInstructions() {
  header('🚀 Deployment Instructions');
  
  log('\n📋 Next Steps:', 'bright');
  log('1. Build and deploy the application:');
  log('   ./scripts/deploy-production.sh');
  log('');
  log('2. Access the admin panel:');
  log('   https://taivideonhanh.vn/admin/login');
  log('');
  log('3. Upload cookie file for multi-platform support');
  log('');
  log('4. Test video download functionality');
  log('');
  log('5. Monitor system health:');
  log('   ./scripts/health-check.sh');
  
  const runDeployment = await questionYesNo('\nRun deployment script now?', false);
  
  if (runDeployment) {
    const { exec } = require('child_process');
    
    logInfo('Starting deployment...');
    
    exec('./scripts/deploy-production.sh', (error, stdout, stderr) => {
      if (error) {
        logError(`Deployment failed: ${error.message}`);
      } else {
        logSuccess('Deployment completed');
        console.log(stdout);
      }
    });
  }
}

async function completionSummary(config) {
  header('🎉 Setup Complete!');
  
  log('\n📊 Configuration Summary:', 'bright');
  log(`Admin Email: ${config.DEFAULT_ADMIN_EMAIL}`);
  log(`Admin Password: ${config.DEFAULT_ADMIN_PASSWORD}`);
  log(`Cookie Path: ${config.COOKIES_PATH}`);
  log(`Cookie Auth: ${config.ENABLE_COOKIE_AUTH}`);
  log(`Database: ${config.DB_NAME}@${config.DB_HOST}`);
  
  log('\n🔗 Important URLs:', 'bright');
  log('Admin Panel: https://taivideonhanh.vn/admin/login');
  log('Cookie Management: https://taivideonhanh.vn/admin/cookie');
  log('Main Site: https://taivideonhanh.vn');
  
  log('\n⚠️  Security Reminders:', 'yellow');
  log('• Change default admin password after first login');
  log('• Use real cookies from browser extension');
  log('• Rotate cookies monthly for security');
  log('• Monitor admin access logs');
  
  logSuccess('\n🚀 TaiVideoNhanh admin system is ready to use!');
}

async function main() {
  try {
    await welcomeScreen();
    await checkSystemRequirements();
    const config = await setupEnvironment();
    await setupAdminUser(config);
    await setupCookieSystem(config);
    await deploymentInstructions();
    await completionSummary(config);
    
  } catch (error) {
    logError(`Setup failed: ${error.message}`);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Handle process termination
process.on('SIGINT', () => {
  log('\n\nSetup interrupted by user', 'yellow');
  rl.close();
  process.exit(0);
});

// Run the wizard
main().catch(error => {
  logError(`Setup wizard failed: ${error.message}`);
  process.exit(1);
});
