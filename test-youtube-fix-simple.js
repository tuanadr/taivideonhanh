#!/usr/bin/env node

/**
 * Simple test for YouTube formats fix
 * Tests the /api/info endpoint directly without authentication
 */

const axios = require('axios');

// Configuration
const API_BASE = 'http://localhost:5000/api';
const TEST_YOUTUBE_URL = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

/**
 * Utility functions
 */
function log(level, message) {
  const timestamp = new Date().toISOString();
  const colors = {
    info: '\x1b[36m',
    success: '\x1b[32m',
    warning: '\x1b[33m',
    error: '\x1b[31m',
    reset: '\x1b[0m'
  };
  
  const color = colors[level] || colors.reset;
  console.log(`${color}[${timestamp}] ${level.toUpperCase()}: ${message}${colors.reset}`);
}

/**
 * Create a test user using admin API
 */
async function createTestUser() {
  try {
    // First login as admin to create a user
    log('info', 'Logging in as admin to create test user...');
    const adminResponse = await axios.post(`${API_BASE}/admin/login`, {
      email: 'admin@taivideonhanh.com',
      password: 'admin123456'
    });

    const adminToken = adminResponse.data.token;

    // Create a test user via admin API
    const email = `test-${Date.now()}@example.com`;
    const password = 'TestPassword123!'; // Strong password with special characters

    log('info', `Creating test user: ${email}`);

    try {
      const createResponse = await axios.post(`${API_BASE}/admin/users`, {
        email: email,
        password: password,
        role: 'user'
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      });

      log('success', 'Test user created successfully via admin API');
      return { email, password };
    } catch (createError) {
      // If admin user creation fails, try regular registration
      log('info', 'Admin user creation failed, trying regular registration...');

      const registerResponse = await axios.post(`${API_BASE}/auth/register`, {
        email: email,
        password: password
      });

      log('success', 'Test user created successfully via registration');
      return { email, password };
    }

  } catch (error) {
    log('error', `Failed to create test user: ${error.response?.data?.error || error.message}`);
    throw error;
  }
}

/**
 * Login and get access token (using user endpoint)
 */
async function login(email, password) {
  try {
    log('info', 'Logging in as user...');
    const response = await axios.post(`${API_BASE}/auth/login`, {
      email: email,
      password: password
    });

    log('success', 'User login successful');
    return response.data.tokens.accessToken; // User endpoint returns tokens.accessToken
  } catch (error) {
    log('error', `User login failed: ${error.response?.data?.error || error.message}`);
    throw error;
  }
}

/**
 * Test /api/info endpoint
 */
async function testInfoEndpoint(accessToken, url) {
  try {
    log('info', 'Testing /api/info endpoint...');
    log('info', `URL: ${url}`);
    
    const response = await axios.post(`${API_BASE}/info`, {
      url: url
    }, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      timeout: 60000 // 60 seconds timeout
    });
    
    const data = response.data;
    log('success', `/api/info endpoint successful`);
    log('info', `Title: ${data.title}`);
    log('info', `Platform: ${data.platform}`);
    log('info', `Total formats: ${data.total_formats}`);
    log('info', `Available formats: ${data.available_formats}`);
    
    if (data.formats && data.formats.length > 0) {
      log('info', '\nAvailable formats:');
      data.formats.forEach((format, index) => {
        const hasAudio = format.acodec && format.acodec !== 'none';
        const audioIndicator = hasAudio ? '🔊' : '🔇';
        const quality = format.quality_label || format.format_note || `${format.resolution} ${format.ext}`;
        log('info', `  ${index + 1}. ${quality} ${audioIndicator} (ID: ${format.format_id})`);
      });
    } else {
      log('warning', 'No formats found!');
    }
    
    return {
      success: true,
      data: data,
      formatCount: data.formats?.length || 0
    };
  } catch (error) {
    log('error', `/api/info failed: ${error.response?.data?.error || error.message}`);
    if (error.response?.data) {
      log('error', `Response data: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    return {
      success: false,
      error: error.response?.data?.error || error.message,
      formatCount: 0
    };
  }
}

/**
 * Main test function
 */
async function runTest() {
  log('info', '🚀 Starting Simple YouTube Formats Fix Test');
  log('info', `Testing URL: ${TEST_YOUTUBE_URL}`);
  log('info', `API Base: ${API_BASE}`);
  
  try {
    // Create test user and login
    const userInfo = await createTestUser();
    const accessToken = await login(userInfo.email, userInfo.password);
    
    // Test the endpoint
    log('info', '\n' + '='.repeat(80));
    log('info', '🧪 TESTING /api/info ENDPOINT');
    log('info', '='.repeat(80));
    
    const result = await testInfoEndpoint(accessToken, TEST_YOUTUBE_URL);
    
    // Analyze results
    log('info', '\n' + '='.repeat(80));
    log('info', '📊 ANALYSIS RESULTS');
    log('info', '='.repeat(80));
    
    if (result.success) {
      if (result.formatCount === 0) {
        log('error', '❌ ISSUE: API returned 0 formats (this was the original bug!)');
        log('error', 'The YouTube formats fix is NOT working correctly.');
        process.exit(1);
      } else if (result.formatCount >= 3) {
        log('success', `✅ EXCELLENT: Found ${result.formatCount} formats!`);
        log('success', '🎉 YouTube formats fix is working perfectly!');
        process.exit(0);
      } else if (result.formatCount >= 1) {
        log('success', `✅ GOOD: Found ${result.formatCount} formats.`);
        log('success', '🎉 YouTube formats fix is working!');
        process.exit(0);
      }
    } else {
      log('error', '❌ CRITICAL: API endpoint failed completely');
      log('error', `Error: ${result.error}`);
      process.exit(1);
    }
    
  } catch (error) {
    log('error', `Test failed with error: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  runTest();
}

module.exports = { runTest };
