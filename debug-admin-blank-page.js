#!/usr/bin/env node

/**
 * Debug Script for Admin Blank Page Issue
 * Helps diagnose why admin routes show blank page
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

function header(message) {
  log(`\n${message}`, 'magenta');
  log('='.repeat(message.length), 'magenta');
}

async function checkAdminFiles() {
  header('🔍 Checking Admin Files');
  
  const adminPaths = [
    'frontend/src/app/admin',
    'frontend/src/app/admin/layout.tsx',
    'frontend/src/app/admin/page.tsx',
    'frontend/src/app/admin/login',
    'frontend/src/app/admin/login/page.tsx',
    'frontend/src/app/admin/cookie',
    'frontend/src/app/admin/cookie/page.tsx'
  ];

  let allExist = true;
  
  for (const adminPath of adminPaths) {
    if (fs.existsSync(adminPath)) {
      logSuccess(`${adminPath} exists`);
    } else {
      logError(`${adminPath} missing`);
      allExist = false;
    }
  }
  
  return allExist;
}

async function checkBuildOutput() {
  header('🏗️  Checking Build Output');
  
  const buildPaths = [
    'frontend/.next',
    'frontend/.next/server',
    'frontend/.next/server/app',
    'frontend/.next/server/app/admin',
    'frontend/.next/server/app/admin/layout.js',
    'frontend/.next/server/app/admin/page.js',
    'frontend/.next/server/app/admin/login',
    'frontend/.next/server/app/admin/login/page.js'
  ];

  let buildExists = true;
  
  for (const buildPath of buildPaths) {
    if (fs.existsSync(buildPath)) {
      logSuccess(`${buildPath} exists in build`);
    } else {
      logError(`${buildPath} missing in build`);
      buildExists = false;
    }
  }
  
  if (!buildExists) {
    logWarning('Admin routes not found in build - this causes blank page');
    logInfo('Try rebuilding: cd frontend && npm run build');
  }
  
  return buildExists;
}

async function checkNextConfig() {
  header('⚙️  Checking Next.js Configuration');
  
  const configPath = 'frontend/next.config.js';
  
  if (!fs.existsSync(configPath)) {
    logError('next.config.js not found');
    return false;
  }
  
  const configContent = fs.readFileSync(configPath, 'utf8');
  
  // Check for important configurations
  const checks = [
    { pattern: /output:\s*['"]standalone['"]/, name: 'Standalone output' },
    { pattern: /trailingSlash:\s*false/, name: 'Trailing slash disabled' },
    { pattern: /appDir:\s*true/, name: 'App directory enabled' },
    { pattern: /async\s+headers\(\)/, name: 'Headers configuration' },
    { pattern: /async\s+redirects\(\)/, name: 'Redirects configuration' }
  ];
  
  for (const check of checks) {
    if (check.pattern.test(configContent)) {
      logSuccess(check.name);
    } else {
      logWarning(`${check.name} not configured`);
    }
  }
  
  return true;
}

async function checkEnvironmentVariables() {
  header('🌍 Checking Environment Variables');
  
  const requiredVars = [
    'NODE_ENV',
    'NEXT_PUBLIC_API_URL',
    'DEFAULT_ADMIN_EMAIL',
    'DEFAULT_ADMIN_PASSWORD'
  ];
  
  let allSet = true;
  
  for (const varName of requiredVars) {
    if (process.env[varName]) {
      logSuccess(`${varName} = ${process.env[varName]}`);
    } else {
      logError(`${varName} not set`);
      allSet = false;
    }
  }
  
  return allSet;
}

function testUrls() {
  return new Promise((resolve) => {
    header('🌐 Testing URLs');
    
    const urls = [
      'https://taivideonhanh.vn',
      'https://taivideonhanh.vn/api/health',
      'https://taivideonhanh.vn/admin',
      'https://taivideonhanh.vn/admin/login'
    ];
    
    let completed = 0;
    const results = [];
    
    urls.forEach(url => {
      exec(`curl -s -o /dev/null -w "%{http_code}" "${url}"`, (error, stdout, stderr) => {
        const statusCode = stdout.trim();
        
        if (statusCode === '200') {
          logSuccess(`${url} → ${statusCode}`);
        } else if (statusCode === '404') {
          logError(`${url} → ${statusCode} (Not Found)`);
        } else if (statusCode === '000') {
          logError(`${url} → Connection failed`);
        } else {
          logWarning(`${url} → ${statusCode}`);
        }
        
        results.push({ url, statusCode });
        completed++;
        
        if (completed === urls.length) {
          resolve(results);
        }
      });
    });
  });
}

async function checkDockerLogs() {
  header('🐳 Checking Docker Logs (if available)');
  
  return new Promise((resolve) => {
    exec('docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "(frontend|backend|app|taivideonhanh)"', (error, stdout, stderr) => {
      if (error) {
        logInfo('Docker not available or no containers running');
        resolve(false);
        return;
      }
      
      const containers = stdout.trim().split('\n').slice(1); // Remove header
      
      if (containers.length === 0) {
        logInfo('No relevant Docker containers found');
        resolve(false);
        return;
      }
      
      logInfo('Found Docker containers:');
      containers.forEach(container => {
        log(`  ${container}`, 'cyan');
      });
      
      logInfo('To check logs, run:');
      containers.forEach(container => {
        const name = container.split('\t')[0];
        log(`  docker logs ${name}`, 'cyan');
      });
      
      resolve(true);
    });
  });
}

async function generateSolution() {
  header('💡 Recommended Solutions');
  
  log('Based on the diagnosis, try these solutions in order:', 'bright');
  
  log('\n1. 🔄 Rebuild Frontend:', 'yellow');
  log('   cd frontend');
  log('   rm -rf .next');
  log('   npm run build');
  
  log('\n2. 🌍 Check Environment Variables in EasyPanel:', 'yellow');
  log('   NODE_ENV=production');
  log('   NEXT_PUBLIC_API_URL=https://taivideonhanh.vn/api');
  log('   DEFAULT_ADMIN_EMAIL=admin@taivideonhanh.vn');
  log('   DEFAULT_ADMIN_PASSWORD=admin123456');
  
  log('\n3. 🔧 Verify EasyPanel Service Settings:', 'yellow');
  log('   Port: 3000');
  log('   Dockerfile: Dockerfile (or Dockerfile.monorepo)');
  log('   Domain: taivideonhanh.vn');
  
  log('\n4. 🐳 Rebuild Container in EasyPanel:', 'yellow');
  log('   Go to your service → Click "Rebuild"');
  log('   Wait for build to complete');
  log('   Check logs for errors');
  
  log('\n5. 🔍 Check Browser Console:', 'yellow');
  log('   Open https://taivideonhanh.vn/admin/login');
  log('   Press F12 → Console tab');
  log('   Look for JavaScript errors');
  log('   Check Network tab for failed requests');
  
  log('\n6. 📝 Check Service Logs in EasyPanel:', 'yellow');
  log('   Go to your service → Logs');
  log('   Look for errors when accessing /admin/login');
  log('   Check for "404" or "Cannot GET /admin/login" errors');
}

async function main() {
  log('🔍 Admin Blank Page Diagnostic Tool', 'bright');
  log('=====================================', 'bright');
  
  try {
    // Run all checks
    const adminFilesExist = await checkAdminFiles();
    const buildOutputExists = await checkBuildOutput();
    const configOk = await checkNextConfig();
    const envVarsOk = await checkEnvironmentVariables();
    const urlResults = await testUrls();
    const dockerAvailable = await checkDockerLogs();
    
    // Summary
    header('📊 Diagnostic Summary');
    
    if (adminFilesExist) {
      logSuccess('Admin source files exist');
    } else {
      logError('Admin source files missing');
    }
    
    if (buildOutputExists) {
      logSuccess('Admin routes in build output');
    } else {
      logError('Admin routes missing from build - LIKELY CAUSE OF BLANK PAGE');
    }
    
    if (configOk) {
      logSuccess('Next.js configuration looks good');
    } else {
      logWarning('Next.js configuration may need updates');
    }
    
    if (envVarsOk) {
      logSuccess('Environment variables configured');
    } else {
      logWarning('Some environment variables missing');
    }
    
    // Check URL results
    const adminLoginResult = urlResults.find(r => r.url.includes('/admin/login'));
    if (adminLoginResult && adminLoginResult.statusCode === '200') {
      logSuccess('Admin login URL accessible');
    } else {
      logError('Admin login URL not accessible');
    }
    
    await generateSolution();
    
  } catch (error) {
    logError(`Diagnostic failed: ${error.message}`);
  }
}

// Run the diagnostic
main().catch(error => {
  logError(`Diagnostic tool failed: ${error.message}`);
  process.exit(1);
});
