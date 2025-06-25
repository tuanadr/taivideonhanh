#!/usr/bin/env node

/**
 * Test script for Cookie Upload System
 * Tests the complete cookie management functionality
 */

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

async function testCookieService() {
  log('\n🧪 Testing Cookie Service...', 'cyan');
  
  try {
    // Test 1: Check if CookieService exists
    const cookieServicePath = path.join(__dirname, 'backend/src/services/cookieService.ts');
    if (fs.existsSync(cookieServicePath)) {
      logSuccess('CookieService file exists');
    } else {
      logError('CookieService file not found');
      return false;
    }

    // Test 2: Check if admin routes exist
    const adminRoutesPath = path.join(__dirname, 'backend/src/routes/admin.ts');
    if (fs.existsSync(adminRoutesPath)) {
      const adminRoutes = fs.readFileSync(adminRoutesPath, 'utf8');
      if (adminRoutes.includes('/cookie/upload')) {
        logSuccess('Cookie upload route exists');
      } else {
        logError('Cookie upload route not found');
        return false;
      }
    }

    // Test 3: Check if frontend admin pages exist
    const adminLayoutPath = path.join(__dirname, 'frontend/src/app/admin/layout.tsx');
    const cookiePagePath = path.join(__dirname, 'frontend/src/app/admin/cookie/page.tsx');
    
    if (fs.existsSync(adminLayoutPath)) {
      logSuccess('Admin layout exists');
    } else {
      logError('Admin layout not found');
    }

    if (fs.existsSync(cookiePagePath)) {
      logSuccess('Cookie management page exists');
    } else {
      logError('Cookie management page not found');
    }

    return true;
  } catch (error) {
    logError(`Cookie service test failed: ${error.message}`);
    return false;
  }
}

async function testBackendBuild() {
  log('\n🔨 Testing Backend Build...', 'cyan');
  
  try {
    const { exec } = require('child_process');
    
    return new Promise((resolve) => {
      exec('cd backend && npm run build', (error, stdout, stderr) => {
        if (error) {
          logError(`Backend build failed: ${error.message}`);
          if (stderr) logError(stderr);
          resolve(false);
        } else {
          logSuccess('Backend builds successfully');
          resolve(true);
        }
      });
    });
  } catch (error) {
    logError(`Backend build test failed: ${error.message}`);
    return false;
  }
}

async function testFrontendBuild() {
  log('\n🎨 Testing Frontend Build...', 'cyan');
  
  try {
    const { exec } = require('child_process');
    
    return new Promise((resolve) => {
      exec('cd frontend && npm run build', (error, stdout, stderr) => {
        if (error) {
          logError(`Frontend build failed: ${error.message}`);
          if (stderr) logError(stderr);
          resolve(false);
        } else {
          logSuccess('Frontend builds successfully');
          resolve(true);
        }
      });
    });
  } catch (error) {
    logError(`Frontend build test failed: ${error.message}`);
    return false;
  }
}

async function testEnvironmentVariables() {
  log('\n🌍 Testing Environment Variables...', 'cyan');
  
  const requiredEnvVars = [
    'YOUTUBE_COOKIES_PATH',
    'ENABLE_COOKIE_AUTH'
  ];

  const envFiles = [
    '.env.production',
    'backend/.env.example'
  ];

  let allFound = true;

  for (const envFile of envFiles) {
    if (fs.existsSync(envFile)) {
      const content = fs.readFileSync(envFile, 'utf8');
      logInfo(`Checking ${envFile}...`);
      
      for (const envVar of requiredEnvVars) {
        if (content.includes(envVar)) {
          logSuccess(`${envVar} found in ${envFile}`);
        } else {
          logWarning(`${envVar} not found in ${envFile}`);
          allFound = false;
        }
      }
    } else {
      logWarning(`${envFile} not found`);
    }
  }

  return allFound;
}

async function testDockerConfiguration() {
  log('\n🐳 Testing Docker Configuration...', 'cyan');
  
  try {
    const dockerfilePath = path.join(__dirname, 'Dockerfile');
    if (fs.existsSync(dockerfilePath)) {
      const dockerfile = fs.readFileSync(dockerfilePath, 'utf8');
      
      if (dockerfile.includes('YOUTUBE_COOKIES_PATH')) {
        logSuccess('Docker environment variables configured');
      } else {
        logWarning('Docker environment variables may need updating');
      }
      
      if (dockerfile.includes('/tmp/cookies')) {
        logSuccess('Cookie directory configured in Docker');
      } else {
        logWarning('Cookie directory may need configuration in Docker');
      }
    } else {
      logWarning('Dockerfile not found');
    }

    return true;
  } catch (error) {
    logError(`Docker configuration test failed: ${error.message}`);
    return false;
  }
}

function generateTestCookieFile() {
  log('\n📝 Generating Test Cookie File...', 'cyan');
  
  const testCookieContent = `# Netscape HTTP Cookie File
# This is a test cookie file for demonstration
.youtube.com	TRUE	/	FALSE	1735689600	session_token	test_session_token_value
.youtube.com	TRUE	/	FALSE	1735689600	VISITOR_INFO1_LIVE	test_visitor_info_value
youtube.com	FALSE	/	FALSE	1735689600	YSC	test_ysc_value
`;

  const testCookiePath = path.join(__dirname, 'test-youtube-cookies.txt');
  
  try {
    fs.writeFileSync(testCookiePath, testCookieContent);
    logSuccess(`Test cookie file created: ${testCookiePath}`);
    logInfo('You can use this file to test the upload functionality');
    return testCookiePath;
  } catch (error) {
    logError(`Failed to create test cookie file: ${error.message}`);
    return null;
  }
}

function printUsageInstructions() {
  log('\n📖 Usage Instructions:', 'magenta');
  log('='.repeat(50), 'magenta');
  
  log('\n1. Start the backend server:', 'bright');
  log('   cd backend && npm start');
  
  log('\n2. Start the frontend server:', 'bright');
  log('   cd frontend && npm run dev');
  
  log('\n3. Access admin panel:', 'bright');
  log('   http://localhost:3000/admin/login');
  
  log('\n4. Default admin credentials (if configured):', 'bright');
  log('   Email: admin@taivideonhanh.com');
  log('   Password: admin123456');
  
  log('\n5. Upload cookie file:', 'bright');
  log('   - Go to http://localhost:3000/admin/cookie');
  log('   - Upload the test-youtube-cookies.txt file');
  log('   - Or get real cookies from YouTube using browser extension');
  
  log('\n6. Test YouTube video download:', 'bright');
  log('   - Try downloading a YouTube video');
  log('   - Check if authentication errors are resolved');
}

async function main() {
  log('🚀 Cookie Upload System Test Suite', 'bright');
  log('='.repeat(50), 'bright');
  
  const tests = [
    { name: 'Cookie Service', fn: testCookieService },
    { name: 'Backend Build', fn: testBackendBuild },
    { name: 'Frontend Build', fn: testFrontendBuild },
    { name: 'Environment Variables', fn: testEnvironmentVariables },
    { name: 'Docker Configuration', fn: testDockerConfiguration }
  ];

  let passedTests = 0;
  let totalTests = tests.length;

  for (const test of tests) {
    const result = await test.fn();
    if (result) {
      passedTests++;
    }
  }

  // Generate test cookie file
  generateTestCookieFile();

  // Print results
  log('\n📊 Test Results:', 'bright');
  log('='.repeat(30), 'bright');
  log(`Passed: ${passedTests}/${totalTests}`, passedTests === totalTests ? 'green' : 'yellow');
  
  if (passedTests === totalTests) {
    logSuccess('All tests passed! 🎉');
  } else {
    logWarning(`${totalTests - passedTests} test(s) failed or had warnings`);
  }

  printUsageInstructions();
}

// Run the test suite
main().catch(error => {
  logError(`Test suite failed: ${error.message}`);
  process.exit(1);
});
