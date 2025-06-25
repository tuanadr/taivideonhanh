#!/usr/bin/env node

/**
 * Fix API URL Issue - Admin pages calling localhost instead of production API
 * This script finds and fixes hardcoded localhost API calls
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

function header(message) {
  log(`\n${message}`, 'magenta');
  log('='.repeat(message.length), 'magenta');
}

// Function to recursively find files
function findFiles(dir, extension) {
  const files = [];
  
  function traverse(currentDir) {
    const items = fs.readdirSync(currentDir);
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        traverse(fullPath);
      } else if (stat.isFile() && item.endsWith(extension)) {
        files.push(fullPath);
      }
    }
  }
  
  traverse(dir);
  return files;
}

// Function to check for hardcoded localhost API calls
function checkForLocalhostAPICalls() {
  header('🔍 Checking for Hardcoded Localhost API Calls');
  
  const frontendDir = 'frontend/src';
  if (!fs.existsSync(frontendDir)) {
    logError('Frontend src directory not found');
    return [];
  }
  
  const files = [
    ...findFiles(frontendDir, '.tsx'),
    ...findFiles(frontendDir, '.ts'),
    ...findFiles(frontendDir, '.js'),
    ...findFiles(frontendDir, '.jsx')
  ];
  
  const issues = [];
  
  // Patterns to look for
  const patterns = [
    /http:\/\/localhost:5000/g,
    /localhost:5000/g,
    /'http:\/\/localhost:5000'/g,
    /"http:\/\/localhost:5000"/g,
    /`http:\/\/localhost:5000`/g
  ];
  
  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      
      for (const pattern of patterns) {
        const matches = content.match(pattern);
        if (matches) {
          issues.push({
            file: file,
            matches: matches,
            content: content
          });
          logWarning(`Found localhost API call in: ${file}`);
          matches.forEach(match => {
            log(`  → ${match}`, 'yellow');
          });
        }
      }
    } catch (error) {
      logError(`Error reading ${file}: ${error.message}`);
    }
  }
  
  if (issues.length === 0) {
    logSuccess('No hardcoded localhost API calls found');
  } else {
    logError(`Found ${issues.length} files with hardcoded localhost API calls`);
  }
  
  return issues;
}

// Function to create API utility file
function createAPIUtility() {
  header('🛠️  Creating API Utility');
  
  const apiUtilContent = `// API Configuration Utility
// Automatically uses correct API URL based on environment

const getAPIBaseURL = () => {
  // In browser environment
  if (typeof window !== 'undefined') {
    // Use the current domain for API calls
    return \`\${window.location.protocol}//\${window.location.host}/api\`;
  }
  
  // In server environment (SSR)
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
};

export const API_BASE_URL = getAPIBaseURL();

// API fetch wrapper with automatic URL handling
export const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const url = \`\${API_BASE_URL}\${endpoint.startsWith('/') ? endpoint : '/' + endpoint}\`;
  
  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };
  
  try {
    const response = await fetch(url, defaultOptions);
    
    if (!response.ok) {
      throw new Error(\`API call failed: \${response.status} \${response.statusText}\`);
    }
    
    return response;
  } catch (error) {
    console.error('API call error:', error);
    throw error;
  }
};

// Specific API functions
export const api = {
  // Subscription plans
  getSubscriptionPlans: () => apiCall('/subscription/plans'),
  
  // Admin APIs
  admin: {
    login: (credentials: { email: string; password: string }) =>
      apiCall('/admin/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      }),
    
    getCookieInfo: () => apiCall('/admin/cookie/info'),
    
    uploadCookie: (formData: FormData) =>
      apiCall('/admin/cookie/upload', {
        method: 'POST',
        body: formData,
        headers: {}, // Let browser set Content-Type for FormData
      }),
  },
  
  // Health check
  health: () => apiCall('/health'),
};

export default api;
`;
  
  const apiUtilPath = 'frontend/src/lib/api.ts';
  const libDir = 'frontend/src/lib';
  
  // Create lib directory if it doesn't exist
  if (!fs.existsSync(libDir)) {
    fs.mkdirSync(libDir, { recursive: true });
    logInfo('Created lib directory');
  }
  
  fs.writeFileSync(apiUtilPath, apiUtilContent);
  logSuccess('Created API utility file: frontend/src/lib/api.ts');
  
  return apiUtilPath;
}

// Function to generate fix instructions
function generateFixInstructions(issues) {
  header('💡 Fix Instructions');
  
  log('To fix the API URL issue:', 'bright');
  
  log('\n1. 🌍 Set Environment Variable in EasyPanel:', 'yellow');
  log('   NEXT_PUBLIC_API_URL=https://taivideonhanh.vn/api');
  
  log('\n2. 🔄 Use the API Utility:', 'yellow');
  log('   Import: import { api, apiCall } from "@/lib/api"');
  log('   Replace: fetch("http://localhost:5000/api/...")');
  log('   With: api.getSubscriptionPlans() or apiCall("/endpoint")');
  
  log('\n3. 🔧 Update Admin Components:', 'yellow');
  if (issues.length > 0) {
    log('   Files that need updating:');
    issues.forEach(issue => {
      log(`   - ${issue.file}`, 'cyan');
    });
  }
  
  log('\n4. 🏗️  Rebuild in EasyPanel:', 'yellow');
  log('   - Go to your service');
  log('   - Click "Rebuild"');
  log('   - Wait for completion');
  
  log('\n5. 🧪 Test Admin Routes:', 'yellow');
  log('   - https://taivideonhanh.vn/admin/login');
  log('   - Check browser console for API calls');
  log('   - Should see calls to https://taivideonhanh.vn/api/...');
}

// Function to create environment check
function createEnvironmentCheck() {
  header('🌍 Environment Configuration Check');
  
  const envVars = [
    'NEXT_PUBLIC_API_URL',
    'NODE_ENV',
    'DEFAULT_ADMIN_EMAIL',
    'DEFAULT_ADMIN_PASSWORD'
  ];
  
  log('Current environment variables:', 'bright');
  
  let missingVars = 0;
  for (const varName of envVars) {
    if (process.env[varName]) {
      logSuccess(`${varName} = ${process.env[varName]}`);
    } else {
      logError(`${varName} not set`);
      missingVars++;
    }
  }
  
  if (missingVars > 0) {
    logWarning(`${missingVars} environment variables missing`);
    log('\nAdd these to EasyPanel Environment Variables:', 'yellow');
    log('NEXT_PUBLIC_API_URL=https://taivideonhanh.vn/api');
    log('NODE_ENV=production');
    log('DEFAULT_ADMIN_EMAIL=admin@taivideonhanh.vn');
    log('DEFAULT_ADMIN_PASSWORD=admin123456');
  }
  
  return missingVars === 0;
}

async function main() {
  log('🔧 API URL Issue Fix Tool', 'bright');
  log('==========================', 'bright');
  
  try {
    // Check environment
    const envOk = createEnvironmentCheck();
    
    // Check for hardcoded localhost calls
    const issues = checkForLocalhostAPICalls();
    
    // Create API utility
    createAPIUtility();
    
    // Generate fix instructions
    generateFixInstructions(issues);
    
    // Summary
    header('📊 Summary');
    
    if (issues.length === 0 && envOk) {
      logSuccess('No API URL issues found');
    } else {
      logWarning('API URL configuration needs attention');
      
      if (issues.length > 0) {
        logError(`${issues.length} files have hardcoded localhost API calls`);
      }
      
      if (!envOk) {
        logError('Environment variables not properly configured');
      }
    }
    
    log('\n🎯 Next Steps:', 'bright');
    log('1. Set NEXT_PUBLIC_API_URL in EasyPanel');
    log('2. Update admin components to use API utility');
    log('3. Rebuild in EasyPanel');
    log('4. Test admin routes');
    
  } catch (error) {
    logError(`Fix tool failed: ${error.message}`);
  }
}

// Run the fix tool
main().catch(error => {
  logError(`API URL fix tool failed: ${error.message}`);
  process.exit(1);
});
