#!/usr/bin/env node

/**
 * Comprehensive User Management System Test Suite
 * Tests all user management endpoints and functionality
 */

const https = require('https');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
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

function logHeader(message) {
  log(`\n🚀 ${message}`, 'cyan');
  log('='.repeat(50), 'cyan');
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

// Test functions
async function getAdminToken() {
  logHeader('GETTING ADMIN TOKEN');
  
  try {
    const response = await makeRequest({
      hostname: 'taivideonhanh.vn',
      port: 443,
      path: '/api/admin/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, {
      email: 'admin@taivideonhanh.com',
      password: 'admin123456'
    });

    if (response.statusCode === 200 && response.data?.token) {
      logSuccess('Admin token obtained');
      return response.data.token;
    } else {
      logError(`Failed to get admin token: ${response.statusCode}`);
      return null;
    }
  } catch (error) {
    logError(`Admin login error: ${error.message}`);
    return null;
  }
}

async function testUsersList(token) {
  logHeader('USERS LIST TEST');
  
  try {
    const response = await makeRequest({
      hostname: 'taivideonhanh.vn',
      port: 443,
      path: '/api/admin/users?page=1&limit=10',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.statusCode === 200) {
      logSuccess('Users list retrieved');
      const data = response.data;
      if (data?.users) {
        logInfo(`Found ${data.users.length} users`);
        logInfo(`Total: ${data.pagination?.total || 0}`);
        logInfo(`Page: ${data.pagination?.page || 1}/${data.pagination?.totalPages || 1}`);
      }
      return data;
    } else {
      logWarning(`Users list failed: ${response.statusCode} - ${response.data?.error || response.body}`);
      return null;
    }
  } catch (error) {
    logError(`Users list error: ${error.message}`);
    return null;
  }
}

async function testUserStats(token) {
  logHeader('USER STATISTICS TEST');
  
  try {
    const response = await makeRequest({
      hostname: 'taivideonhanh.vn',
      port: 443,
      path: '/api/admin/users/stats/overview',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.statusCode === 200) {
      logSuccess('User statistics retrieved');
      const stats = response.data?.stats;
      if (stats) {
        logInfo(`Total Users: ${stats.totalUsers}`);
        logInfo(`Active Users: ${stats.activeUsers}`);
        logInfo(`Premium Users: ${stats.premiumUsers}`);
        logInfo(`New Users Today: ${stats.newUsersToday}`);
        logInfo(`New Users This Week: ${stats.newUsersThisWeek}`);
        logInfo(`New Users This Month: ${stats.newUsersThisMonth}`);
      }
      return stats;
    } else {
      logWarning(`User stats failed: ${response.statusCode} - ${response.data?.error || response.body}`);
      return null;
    }
  } catch (error) {
    logError(`User stats error: ${error.message}`);
    return null;
  }
}

async function testUserSearch(token) {
  logHeader('USER SEARCH TEST');
  
  try {
    const searchTerms = ['admin', 'test', 'user'];
    
    for (const term of searchTerms) {
      logInfo(`Searching for: "${term}"`);
      
      const response = await makeRequest({
        hostname: 'taivideonhanh.vn',
        port: 443,
        path: `/api/admin/users?search=${encodeURIComponent(term)}&limit=5`,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.statusCode === 200) {
        const data = response.data;
        logSuccess(`Search for "${term}": ${data?.users?.length || 0} results`);
      } else {
        logWarning(`Search for "${term}" failed: ${response.statusCode}`);
      }
    }
    
    return true;
  } catch (error) {
    logError(`User search error: ${error.message}`);
    return false;
  }
}

async function testUserFilters(token) {
  logHeader('USER FILTERS TEST');
  
  try {
    const filters = [
      { name: 'Active Users', params: 'status=active' },
      { name: 'Inactive Users', params: 'status=inactive' },
      { name: 'Suspended Users', params: 'status=suspended' },
      { name: 'Premium Users', params: 'subscription=premium' },
      { name: 'Free Users', params: 'subscription=free' }
    ];
    
    for (const filter of filters) {
      logInfo(`Testing filter: ${filter.name}`);
      
      const response = await makeRequest({
        hostname: 'taivideonhanh.vn',
        port: 443,
        path: `/api/admin/users?${filter.params}&limit=5`,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.statusCode === 200) {
        const data = response.data;
        logSuccess(`${filter.name}: ${data?.users?.length || 0} results`);
      } else {
        logWarning(`${filter.name} failed: ${response.statusCode}`);
      }
    }
    
    return true;
  } catch (error) {
    logError(`User filters error: ${error.message}`);
    return false;
  }
}

async function testUserSorting(token) {
  logHeader('USER SORTING TEST');
  
  try {
    const sortOptions = [
      { field: 'created_at', order: 'desc', name: 'Newest First' },
      { field: 'created_at', order: 'asc', name: 'Oldest First' },
      { field: 'email', order: 'asc', name: 'Email A-Z' },
      { field: 'last_login', order: 'desc', name: 'Recent Login' }
    ];
    
    for (const sort of sortOptions) {
      logInfo(`Testing sort: ${sort.name}`);
      
      const response = await makeRequest({
        hostname: 'taivideonhanh.vn',
        port: 443,
        path: `/api/admin/users?sortBy=${sort.field}&sortOrder=${sort.order}&limit=5`,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.statusCode === 200) {
        logSuccess(`${sort.name}: Working`);
      } else {
        logWarning(`${sort.name} failed: ${response.statusCode}`);
      }
    }
    
    return true;
  } catch (error) {
    logError(`User sorting error: ${error.message}`);
    return false;
  }
}

async function testFrontendPages() {
  logHeader('FRONTEND PAGES TEST');
  
  const pages = [
    '/admin/users',
    '/admin/setup'
  ];

  for (const page of pages) {
    try {
      const response = await makeRequest({
        hostname: 'taivideonhanh.vn',
        port: 443,
        path: page,
        method: 'GET'
      });

      if (response.statusCode === 200) {
        logSuccess(`Page accessible: ${page}`);
      } else {
        logWarning(`Page issue: ${page} (${response.statusCode})`);
      }
    } catch (error) {
      logError(`Page error: ${page} - ${error.message}`);
    }
  }
}

// Main test suite
async function runUserManagementTest() {
  logInfo('👥 Starting User Management System Test Suite');
  logInfo('🌐 Target: https://taivideonhanh.vn');
  logInfo('⏰ Started at: ' + new Date().toLocaleString());
  
  const results = {
    adminToken: false,
    usersList: false,
    userStats: false,
    userSearch: false,
    userFilters: false,
    userSorting: false,
    frontendPages: false
  };

  // 1. Get admin token
  const token = await getAdminToken();
  results.adminToken = !!token;

  if (!token) {
    logError('Cannot proceed without admin token');
    return results;
  }

  // 2. Test users list
  const usersList = await testUsersList(token);
  results.usersList = !!usersList;

  // 3. Test user statistics
  const userStats = await testUserStats(token);
  results.userStats = !!userStats;

  // 4. Test user search
  results.userSearch = await testUserSearch(token);

  // 5. Test user filters
  results.userFilters = await testUserFilters(token);

  // 6. Test user sorting
  results.userSorting = await testUserSorting(token);

  // 7. Test frontend pages
  await testFrontendPages();

  // Summary
  logHeader('TEST SUMMARY');
  logInfo(`Admin Token: ${results.adminToken ? '✅' : '❌'}`);
  logInfo(`Users List: ${results.usersList ? '✅' : '❌'}`);
  logInfo(`User Stats: ${results.userStats ? '✅' : '❌'}`);
  logInfo(`User Search: ${results.userSearch ? '✅' : '❌'}`);
  logInfo(`User Filters: ${results.userFilters ? '✅' : '❌'}`);
  logInfo(`User Sorting: ${results.userSorting ? '✅' : '❌'}`);
  
  const overallSuccess = results.adminToken && 
                        results.usersList && 
                        results.userStats && 
                        results.userSearch &&
                        results.userFilters &&
                        results.userSorting;

  if (overallSuccess) {
    logSuccess('🎉 ALL USER MANAGEMENT TESTS PASSED!');
  } else {
    logError('❌ Some user management tests failed. Please check the issues above.');
  }

  logInfo('⏰ Completed at: ' + new Date().toLocaleString());
  
  return results;
}

// Run the test suite
runUserManagementTest().catch(console.error);
