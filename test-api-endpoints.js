#!/usr/bin/env node

/**
 * Test API endpoints for video download fixes
 */

const http = require('http');
const https = require('https');

// Test configuration
const API_CONFIG = {
  baseUrl: 'http://localhost:5000',
  timeout: 60000,
  testUrls: {
    youtube: 'https://www.youtube.com/watch?v=jNQXAC9IVRw',
    tiktok: 'https://www.tiktok.com/@tiktok/video/6829267836783971589',
    invalid: 'https://www.youtube.com/watch?v=invalid_video_id'
  }
};

/**
 * Make HTTP request
 */
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const protocol = options.protocol === 'https:' ? https : http;
    
    const req = protocol.request(options, (res) => {
      let body = '';
      
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonBody = body ? JSON.parse(body) : {};
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: jsonBody
          });
        } catch (parseError) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: body,
            parseError: parseError.message
          });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.setTimeout(API_CONFIG.timeout, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    if (data) {
      req.write(data);
    }
    
    req.end();
  });
}

/**
 * Test /api/info endpoint
 */
async function testVideoInfoEndpoint(url, expectedSuccess = true) {
  console.log(`\n🧪 Testing /api/info with: ${url}`);
  
  const requestData = JSON.stringify({ url });
  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/info',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(requestData),
      'Authorization': 'Bearer test-token' // Mock token for testing
    }
  };
  
  try {
    const startTime = Date.now();
    const response = await makeRequest(options, requestData);
    const duration = Date.now() - startTime;
    
    console.log(`📊 Response (${duration}ms):`);
    console.log(`   Status: ${response.statusCode}`);
    
    if (response.statusCode === 200) {
      console.log(`✅ SUCCESS:`);
      console.log(`   Title: ${response.body.title}`);
      console.log(`   Formats: ${response.body.formats?.length || 0}`);
      console.log(`   Uploader: ${response.body.uploader}`);
      
      return {
        success: true,
        url,
        duration,
        response: response.body
      };
    } else {
      console.log(`❌ FAILED:`);
      console.log(`   Error: ${response.body.error || 'Unknown error'}`);
      console.log(`   Code: ${response.body.code || 'N/A'}`);
      
      return {
        success: false,
        url,
        duration,
        statusCode: response.statusCode,
        error: response.body.error || 'Unknown error',
        code: response.body.code
      };
    }
  } catch (error) {
    console.log(`❌ REQUEST FAILED: ${error.message}`);
    return {
      success: false,
      url,
      error: error.message
    };
  }
}

/**
 * Test server health
 */
async function testServerHealth() {
  console.log('\n🏥 Testing server health...');
  
  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/health',
    method: 'GET'
  };
  
  try {
    const response = await makeRequest(options);
    
    if (response.statusCode === 200) {
      console.log('✅ Server is healthy');
      return true;
    } else {
      console.log(`❌ Server health check failed: ${response.statusCode}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Cannot connect to server: ${error.message}`);
    return false;
  }
}

/**
 * Start backend server for testing
 */
function startBackendServer() {
  return new Promise((resolve, reject) => {
    console.log('🚀 Starting backend server...');
    
    const { spawn } = require('child_process');
    const serverProcess = spawn('npm', ['start'], {
      cwd: './backend',
      stdio: 'pipe',
      env: {
        ...process.env,
        NODE_ENV: 'test',
        PORT: '5000',
        DB_HOST: 'localhost',
        DB_USER: 'test',
        DB_PASSWORD: 'test',
        DB_NAME: 'test',
        REDIS_URL: 'redis://localhost:6379',
        JWT_ACCESS_SECRET: 'test-secret',
        JWT_REFRESH_SECRET: 'test-refresh-secret'
      }
    });
    
    let serverReady = false;
    
    serverProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log(`📝 Server: ${output.trim()}`);
      
      if (output.includes('Server running on port') || output.includes('listening on')) {
        if (!serverReady) {
          serverReady = true;
          console.log('✅ Backend server started successfully');
          resolve(serverProcess);
        }
      }
    });
    
    serverProcess.stderr.on('data', (data) => {
      const error = data.toString();
      console.log(`⚠️ Server Error: ${error.trim()}`);
    });
    
    serverProcess.on('close', (code) => {
      console.log(`🛑 Server process exited with code ${code}`);
    });
    
    serverProcess.on('error', (error) => {
      console.log(`❌ Failed to start server: ${error.message}`);
      reject(error);
    });
    
    // Timeout for server startup
    setTimeout(() => {
      if (!serverReady) {
        console.log('⏰ Server startup timeout');
        serverProcess.kill();
        reject(new Error('Server startup timeout'));
      }
    }, 30000);
  });
}

/**
 * Run API tests
 */
async function runApiTests() {
  console.log('🚀 Starting API Endpoint Tests...\n');
  console.log('=' .repeat(50));
  
  // Check if server is already running
  const isHealthy = await testServerHealth();
  
  let serverProcess = null;
  if (!isHealthy) {
    try {
      serverProcess = await startBackendServer();
      // Wait a bit for server to fully initialize
      await new Promise(resolve => setTimeout(resolve, 5000));
    } catch (error) {
      console.log('❌ Cannot start backend server for testing');
      console.log('💡 Please start the backend server manually: cd backend && npm start');
      return;
    }
  }
  
  const results = [];
  
  try {
    // Test YouTube URL
    console.log('\n📺 TESTING YOUTUBE API');
    console.log('=' .repeat(25));
    const youtubeResult = await testVideoInfoEndpoint(API_CONFIG.testUrls.youtube, true);
    results.push(youtubeResult);
    
    // Test TikTok URL
    console.log('\n🎵 TESTING TIKTOK API');
    console.log('=' .repeat(23));
    const tiktokResult = await testVideoInfoEndpoint(API_CONFIG.testUrls.tiktok, true);
    results.push(tiktokResult);
    
    // Test Invalid URL (error handling)
    console.log('\n❌ TESTING ERROR HANDLING');
    console.log('=' .repeat(27));
    const invalidResult = await testVideoInfoEndpoint(API_CONFIG.testUrls.invalid, false);
    results.push(invalidResult);
    
    // Generate report
    generateApiTestReport(results);
    
  } finally {
    // Cleanup
    if (serverProcess) {
      console.log('\n🛑 Stopping test server...');
      serverProcess.kill();
    }
  }
}

/**
 * Generate API test report
 */
function generateApiTestReport(results) {
  console.log('\n📊 API TEST REPORT');
  console.log('=' .repeat(30));
  
  const successfulTests = results.filter(r => r.success);
  const failedTests = results.filter(r => !r.success);
  
  console.log(`\n📈 RESULTS:`);
  console.log(`   Successful: ${successfulTests.length}/${results.length}`);
  console.log(`   Failed: ${failedTests.length}/${results.length}`);
  
  if (successfulTests.length > 0) {
    const avgDuration = successfulTests.reduce((sum, r) => sum + (r.duration || 0), 0) / successfulTests.length;
    console.log(`   Average Response Time: ${Math.round(avgDuration)}ms`);
  }
  
  console.log('\n🔍 DETAILED RESULTS:');
  results.forEach((result, index) => {
    console.log(`\n   Test ${index + 1}: ${result.url}`);
    console.log(`   Status: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    if (result.duration) {
      console.log(`   Duration: ${result.duration}ms`);
    }
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
    if (result.response) {
      console.log(`   Title: ${result.response.title}`);
      console.log(`   Formats: ${result.response.formats?.length || 0}`);
    }
  });
  
  console.log('\n💡 RECOMMENDATIONS:');
  if (failedTests.length === 0) {
    console.log('   ✅ All API tests passed! The improvements are working correctly.');
  } else {
    console.log('   🔧 Some tests failed. Check error messages for debugging.');
    failedTests.forEach(test => {
      console.log(`   - ${test.url}: ${test.error}`);
    });
  }
  
  console.log('\n✨ API Test Report Complete!');
}

// Run tests if called directly
if (require.main === module) {
  runApiTests().catch(console.error);
}

module.exports = { runApiTests, testVideoInfoEndpoint, testServerHealth };
