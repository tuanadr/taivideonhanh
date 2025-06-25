#!/usr/bin/env node

/**
 * Debug Admin Routes Script
 * Helps diagnose why admin routes are returning 404
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

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

async function checkAdminFiles() {
  log('\n🔍 Checking Admin Files...', 'cyan');
  
  const adminFiles = [
    'frontend/src/app/admin/layout.tsx',
    'frontend/src/app/admin/page.tsx',
    'frontend/src/app/admin/login/page.tsx',
    'frontend/src/app/admin/cookie/page.tsx'
  ];

  let allExist = true;
  
  for (const file of adminFiles) {
    if (fs.existsSync(file)) {
      logSuccess(`${file} exists`);
    } else {
      logError(`${file} missing`);
      allExist = false;
    }
  }

  return allExist;
}

async function checkNextJSBuild() {
  log('\n🏗️  Checking Next.js Build...', 'cyan');
  
  const buildDir = 'frontend/.next';
  const standaloneBuildDir = 'frontend/.next/standalone';
  
  if (fs.existsSync(buildDir)) {
    logSuccess('Next.js build directory exists');
    
    // Check if admin routes are in the build
    const serverDir = path.join(buildDir, 'server/app');
    if (fs.existsSync(serverDir)) {
      const adminDir = path.join(serverDir, 'admin');
      if (fs.existsSync(adminDir)) {
        logSuccess('Admin routes found in build');
        
        // List admin routes in build
        try {
          const adminFiles = fs.readdirSync(adminDir, { recursive: true });
          logInfo(`Admin routes in build: ${adminFiles.join(', ')}`);
        } catch (error) {
          logWarning('Could not list admin build files');
        }
      } else {
        logError('Admin routes NOT found in build');
        return false;
      }
    } else {
      logWarning('Server build directory not found');
    }
    
    if (fs.existsSync(standaloneBuildDir)) {
      logSuccess('Standalone build exists');
    } else {
      logWarning('Standalone build not found');
    }
  } else {
    logError('Next.js build directory not found');
    return false;
  }

  return true;
}

async function checkNextJSConfig() {
  log('\n⚙️  Checking Next.js Configuration...', 'cyan');
  
  const configFile = 'frontend/next.config.js';
  
  if (fs.existsSync(configFile)) {
    logSuccess('next.config.js exists');
    
    const config = fs.readFileSync(configFile, 'utf8');
    
    // Check for potential issues
    if (config.includes('output: \'export\'')) {
      logError('Static export detected - this breaks dynamic routes!');
      logInfo('Admin routes require server-side rendering');
      return false;
    }
    
    if (config.includes('output: \'standalone\'')) {
      logSuccess('Standalone output configured correctly');
    }
    
    if (config.includes('trailingSlash: true')) {
      logWarning('Trailing slash enabled - may affect routing');
    }
    
  } else {
    logWarning('next.config.js not found');
  }

  return true;
}

async function checkEnvironmentVariables() {
  log('\n🌍 Checking Environment Variables...', 'cyan');
  
  const envFiles = ['.env.production', 'frontend/.env.local', 'frontend/.env.production'];
  
  for (const envFile of envFiles) {
    if (fs.existsSync(envFile)) {
      logInfo(`Found ${envFile}`);
      
      const content = fs.readFileSync(envFile, 'utf8');
      
      // Check for admin-related variables
      if (content.includes('DEFAULT_ADMIN_EMAIL')) {
        logSuccess('Admin email configured');
      }
      
      if (content.includes('ADMIN_JWT_SECRET')) {
        logSuccess('Admin JWT secret configured');
      }
    }
  }
}

async function testLocalRoutes() {
  log('\n🌐 Testing Local Routes...', 'cyan');
  
  return new Promise((resolve) => {
    // Test if frontend server is running
    exec('curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/admin/login', (error, stdout, stderr) => {
      if (error) {
        logError('Cannot connect to localhost:3000');
        logInfo('Make sure frontend server is running: cd frontend && npm run dev');
        resolve(false);
      } else {
        const statusCode = stdout.trim();
        if (statusCode === '200') {
          logSuccess('Admin login route works on localhost');
          resolve(true);
        } else if (statusCode === '404') {
          logError('Admin login returns 404 on localhost');
          resolve(false);
        } else {
          logWarning(`Admin login returns status ${statusCode} on localhost`);
          resolve(false);
        }
      }
    });
  });
}

async function testProductionRoutes() {
  log('\n🚀 Testing Production Routes...', 'cyan');
  
  return new Promise((resolve) => {
    exec('curl -s -o /dev/null -w "%{http_code}" https://taivideonhanh.vn/admin/login', (error, stdout, stderr) => {
      if (error) {
        logError('Cannot connect to taivideonhanh.vn');
        resolve(false);
      } else {
        const statusCode = stdout.trim();
        if (statusCode === '200') {
          logSuccess('Admin login route works on production');
          resolve(true);
        } else if (statusCode === '404') {
          logError('Admin login returns 404 on production');
          logInfo('This suggests the routes are not deployed or nginx is not configured correctly');
          resolve(false);
        } else {
          logWarning(`Admin login returns status ${statusCode} on production`);
          resolve(false);
        }
      }
    });
  });
}

async function suggestFixes() {
  log('\n🔧 Suggested Fixes:', 'magenta');
  log('='.repeat(50), 'magenta');
  
  log('\n1. Rebuild Frontend with Admin Routes:', 'bright');
  log('   cd frontend');
  log('   rm -rf .next');
  log('   npm run build');
  
  log('\n2. Check Build Output:', 'bright');
  log('   ls -la frontend/.next/server/app/admin/');
  
  log('\n3. Test Locally First:', 'bright');
  log('   cd frontend && npm run dev');
  log('   curl http://localhost:3000/admin/login');
  
  log('\n4. Deploy Updated Build:', 'bright');
  log('   # If using Docker:');
  log('   docker-compose build frontend');
  log('   docker-compose up -d');
  
  log('\n5. Check Nginx Logs:', 'bright');
  log('   docker logs <nginx_container>');
  log('   # Look for 404 errors or routing issues');
  
  log('\n6. Verify Environment Variables:', 'bright');
  log('   # Make sure admin credentials are set:');
  log('   DEFAULT_ADMIN_EMAIL=admin@taivideonhanh.vn');
  log('   DEFAULT_ADMIN_PASSWORD=your_password');
  
  log('\n7. Create Admin User:', 'bright');
  log('   node create-admin-user.js');
  log('   # Or run the quick setup:');
  log('   node quick-setup-admin.js');
}

async function main() {
  log('🔍 Admin Routes Debug Tool', 'bright');
  log('='.repeat(50), 'bright');
  
  const checks = [
    { name: 'Admin Files', fn: checkAdminFiles },
    { name: 'Next.js Build', fn: checkNextJSBuild },
    { name: 'Next.js Config', fn: checkNextJSConfig },
    { name: 'Environment Variables', fn: checkEnvironmentVariables },
    { name: 'Local Routes', fn: testLocalRoutes },
    { name: 'Production Routes', fn: testProductionRoutes }
  ];

  let passedChecks = 0;
  
  for (const check of checks) {
    const result = await check.fn();
    if (result) {
      passedChecks++;
    }
  }

  log(`\n📊 Debug Results: ${passedChecks}/${checks.length} checks passed`, 'bright');
  
  if (passedChecks < checks.length) {
    suggestFixes();
  } else {
    logSuccess('All checks passed! Admin routes should be working.');
  }
}

// Handle process termination
process.on('SIGINT', () => {
  log('\n\nDebug interrupted by user', 'yellow');
  process.exit(0);
});

// Run the debug tool
main().catch(error => {
  logError(`Debug failed: ${error.message}`);
  process.exit(1);
});
