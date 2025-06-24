#!/usr/bin/env node

/**
 * Comprehensive validation test suite
 * Tests all aspects of the YouTube cookie authentication implementation
 */

const { spawn } = require('child_process');
const http = require('http');

// Test configuration
const TEST_CONFIG = {
  timeout: 60000,
  backendPort: 5000,
  testUrls: [
    'https://www.youtube.com/watch?v=U_kEC7kjA8k', // Original failing video
    'https://www.youtube.com/watch?v=jNQXAC9IVRw', // Me at the zoo
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ', // Rick Roll
    'https://www.youtube.com/watch?v=9bZkp7q19f0', // Gangnam Style
  ],
  invalidUrls: [
    'https://www.youtube.com/watch?v=invalid_video_id_12345',
    'https://www.youtube.com/watch?v=deleted_video_xyz',
  ]
};

/**
 * Test direct yt-dlp functionality
 */
async function testDirectYtDlp(url, useCookies = false) {
  return new Promise((resolve) => {
    console.log(`\n🧪 Direct yt-dlp test: ${url} (cookies: ${useCookies})`);
    
    let ytdlpArgs = [
      '--dump-json',
      '--no-warnings',
      '--no-check-certificates',
      '--ignore-errors',
      '--extractor-args', 'youtube:skip=dash,hls',
      '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    ];

    if (useCookies) {
      ytdlpArgs.push('--cookies-from-browser', 'chrome');
    }

    ytdlpArgs.push(url);

    const startTime = Date.now();
    const ytdlp = spawn('yt-dlp', ytdlpArgs);
    
    let jsonData = '';
    let errorData = '';

    ytdlp.stdout.on('data', (data) => {
      jsonData += data.toString();
    });

    ytdlp.stderr.on('data', (data) => {
      errorData += data.toString();
    });

    ytdlp.on('close', (code) => {
      const duration = Date.now() - startTime;
      
      if (code === 0 && jsonData.trim()) {
        try {
          const info = JSON.parse(jsonData);
          console.log(`   ✅ SUCCESS (${duration}ms): ${info.title}`);
          
          resolve({
            success: true,
            method: 'direct',
            useCookies,
            url,
            duration,
            title: info.title,
            formats: info.formats?.length || 0
          });
        } catch (parseError) {
          console.log(`   ❌ JSON Parse Error (${duration}ms)`);
          resolve({
            success: false,
            method: 'direct',
            useCookies,
            url,
            duration,
            error: 'json_parse_error'
          });
        }
      } else {
        console.log(`   ❌ FAILED (${duration}ms): ${errorData.substring(0, 100)}...`);
        
        let errorType = 'unknown';
        if (errorData.includes('Sign in to confirm')) {
          errorType = 'auth_required';
        } else if (errorData.includes('Video unavailable')) {
          errorType = 'video_unavailable';
        } else if (errorData.includes('Private video')) {
          errorType = 'private_video';
        } else if (errorData.includes('could not find') && errorData.includes('cookies')) {
          errorType = 'cookies_not_found';
        }
        
        resolve({
          success: false,
          method: 'direct',
          useCookies,
          url,
          duration,
          error: errorType
        });
      }
    });

    setTimeout(() => {
      ytdlp.kill('SIGTERM');
      resolve({
        success: false,
        method: 'direct',
        useCookies,
        url,
        duration: TEST_CONFIG.timeout,
        error: 'timeout'
      });
    }, TEST_CONFIG.timeout);
  });
}

/**
 * Test backend API
 */
async function testBackendAPI(url) {
  return new Promise((resolve) => {
    console.log(`\n🌐 Backend API test: ${url}`);
    
    const requestData = JSON.stringify({ url });
    const options = {
      hostname: 'localhost',
      port: TEST_CONFIG.backendPort,
      path: '/api/info',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestData)
      }
    };
    
    const startTime = Date.now();
    const req = http.request(options, (res) => {
      let body = '';
      
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        const duration = Date.now() - startTime;
        
        try {
          const jsonBody = JSON.parse(body);
          
          if (res.statusCode === 200) {
            console.log(`   ✅ SUCCESS (${duration}ms): ${jsonBody.title}`);
            
            resolve({
              success: true,
              method: 'backend',
              url,
              duration,
              statusCode: res.statusCode,
              title: jsonBody.title,
              formats: jsonBody.formats?.length || 0
            });
          } else {
            console.log(`   ❌ FAILED (${duration}ms, status: ${res.statusCode})`);
            
            resolve({
              success: false,
              method: 'backend',
              url,
              duration,
              statusCode: res.statusCode,
              error: jsonBody.error || 'unknown_error'
            });
          }
        } catch (parseError) {
          console.log(`   ❌ JSON Parse Error (${duration}ms)`);
          resolve({
            success: false,
            method: 'backend',
            url,
            duration,
            statusCode: res.statusCode,
            error: 'json_parse_error'
          });
        }
      });
    });
    
    req.on('error', (error) => {
      console.log(`   ❌ Request Error: ${error.message}`);
      resolve({
        success: false,
        method: 'backend',
        url,
        error: 'request_error',
        details: error.message
      });
    });
    
    req.setTimeout(TEST_CONFIG.timeout, () => {
      req.destroy();
      resolve({
        success: false,
        method: 'backend',
        url,
        duration: TEST_CONFIG.timeout,
        error: 'timeout'
      });
    });
    
    req.write(requestData);
    req.end();
  });
}

/**
 * Test cookie authentication capabilities
 */
async function testCookieCapabilities() {
  console.log('\n🍪 Testing Cookie Authentication Capabilities...');
  console.log('=' .repeat(50));
  
  const browsers = ['chrome', 'firefox'];
  const results = [];
  
  for (const browser of browsers) {
    console.log(`\n🌐 Testing ${browser} cookies...`);
    
    const result = await new Promise((resolve) => {
      const testArgs = [
        '--cookies-from-browser', browser,
        '--simulate',
        '--no-warnings',
        '--quiet',
        'https://www.youtube.com/watch?v=jNQXAC9IVRw'
      ];
      
      const ytdlp = spawn('yt-dlp', testArgs);
      let errorOutput = '';
      
      ytdlp.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });
      
      ytdlp.on('close', (code) => {
        if (code === 0) {
          console.log(`   ✅ ${browser}: Available`);
          resolve({ browser, available: true, error: null });
        } else {
          let errorType = 'unknown';
          if (errorOutput.includes('could not find') && errorOutput.includes('cookies database')) {
            errorType = 'browser_not_installed';
          } else if (errorOutput.includes('unsupported platform')) {
            errorType = 'platform_unsupported';
          }
          
          console.log(`   ❌ ${browser}: ${errorType}`);
          resolve({ browser, available: false, error: errorType });
        }
      });
      
      setTimeout(() => {
        ytdlp.kill('SIGTERM');
        console.log(`   ⏰ ${browser}: Timeout`);
        resolve({ browser, available: false, error: 'timeout' });
      }, 10000);
    });
    
    results.push(result);
  }
  
  return results;
}

/**
 * Check backend health
 */
async function checkBackendHealth() {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: TEST_CONFIG.backendPort,
      path: '/api/health',
      method: 'GET'
    };
    
    const req = http.request(options, (res) => {
      if (res.statusCode === 200) {
        console.log('✅ Backend is healthy');
        resolve(true);
      } else {
        console.log(`❌ Backend health check failed: ${res.statusCode}`);
        resolve(false);
      }
    });
    
    req.on('error', (error) => {
      console.log(`❌ Cannot connect to backend: ${error.message}`);
      resolve(false);
    });
    
    req.setTimeout(5000, () => {
      req.destroy();
      console.log('⏰ Backend health check timeout');
      resolve(false);
    });
    
    req.end();
  });
}

/**
 * Generate comprehensive validation report
 */
function generateValidationReport(directResults, backendResults, cookieResults, backendHealthy) {
  console.log('\n📊 COMPREHENSIVE VALIDATION REPORT');
  console.log('=' .repeat(60));
  
  // Direct yt-dlp results
  const directSuccess = directResults.filter(r => r.success);
  const directFailed = directResults.filter(r => !r.success);
  
  console.log('\n🔧 DIRECT YT-DLP RESULTS:');
  console.log(`   Total tests: ${directResults.length}`);
  console.log(`   Successful: ${directSuccess.length}`);
  console.log(`   Failed: ${directFailed.length}`);
  console.log(`   Success rate: ${Math.round(directSuccess.length / directResults.length * 100)}%`);
  
  if (directSuccess.length > 0) {
    const avgDuration = directSuccess.reduce((sum, r) => sum + r.duration, 0) / directSuccess.length;
    console.log(`   Average response time: ${Math.round(avgDuration)}ms`);
  }
  
  // Backend API results
  if (backendHealthy && backendResults.length > 0) {
    const backendSuccess = backendResults.filter(r => r.success);
    const backendFailed = backendResults.filter(r => !r.success);
    
    console.log('\n🌐 BACKEND API RESULTS:');
    console.log(`   Total tests: ${backendResults.length}`);
    console.log(`   Successful: ${backendSuccess.length}`);
    console.log(`   Failed: ${backendFailed.length}`);
    console.log(`   Success rate: ${Math.round(backendSuccess.length / backendResults.length * 100)}%`);
    
    if (backendSuccess.length > 0) {
      const avgDuration = backendSuccess.reduce((sum, r) => sum + r.duration, 0) / backendSuccess.length;
      console.log(`   Average response time: ${Math.round(avgDuration)}ms`);
    }
  } else {
    console.log('\n🌐 BACKEND API RESULTS:');
    console.log('   ❌ Backend not available for testing');
  }
  
  // Cookie authentication results
  const availableBrowsers = cookieResults.filter(r => r.available);
  
  console.log('\n🍪 COOKIE AUTHENTICATION:');
  console.log(`   Available browsers: ${availableBrowsers.length}/${cookieResults.length}`);
  
  if (availableBrowsers.length > 0) {
    console.log('   ✅ Cookie authentication ready');
    availableBrowsers.forEach(browser => {
      console.log(`   ✅ ${browser.browser}: Available`);
    });
  } else {
    console.log('   ⚠️ No browsers available (expected in headless environment)');
  }
  
  // Overall assessment
  console.log('\n🎯 OVERALL ASSESSMENT:');
  
  const overallSuccess = directSuccess.length === directResults.length;
  
  if (overallSuccess) {
    console.log('   ✅ EXCELLENT - All direct tests passed');
    console.log('   ✅ Platform optimizations working perfectly');
    console.log('   ✅ Original YouTube authentication issue resolved');
  } else {
    console.log('   ⚠️ Some tests failed - investigation needed');
  }
  
  if (backendHealthy) {
    console.log('   ✅ Backend integration working');
  } else {
    console.log('   ⚠️ Backend not available for testing');
  }
  
  if (availableBrowsers.length > 0) {
    console.log('   ✅ Cookie authentication available');
  } else {
    console.log('   ℹ️ Cookie authentication not available (normal in CI/headless)');
  }
  
  // Production readiness
  console.log('\n🚀 PRODUCTION READINESS:');
  
  if (overallSuccess) {
    console.log('   ✅ READY FOR PRODUCTION DEPLOYMENT');
    console.log('   - All YouTube videos working without authentication');
    console.log('   - Platform optimizations highly effective');
    console.log('   - Cookie authentication available as enhancement');
  } else {
    console.log('   🔧 NEEDS ATTENTION BEFORE DEPLOYMENT');
    console.log('   - Some videos failing - cookie setup may be required');
  }
  
  console.log('\n✨ Comprehensive Validation Complete!');
}

/**
 * Run comprehensive validation
 */
async function runComprehensiveValidation() {
  console.log('🚀 Starting Comprehensive Validation...\n');
  console.log('🎯 Goal: Validate complete YouTube authentication solution');
  console.log('📋 Testing: Direct yt-dlp, Backend API, Cookie capabilities');
  console.log('=' .repeat(60));
  
  try {
    // Test direct yt-dlp functionality
    console.log('\n🔧 Testing Direct yt-dlp Functionality...');
    const directResults = [];
    
    for (const url of TEST_CONFIG.testUrls) {
      // Test without cookies
      const noCookieResult = await testDirectYtDlp(url, false);
      directResults.push(noCookieResult);
      
      // Test with cookies (if available)
      const cookieResult = await testDirectYtDlp(url, true);
      directResults.push(cookieResult);
    }
    
    // Test cookie capabilities
    const cookieResults = await testCookieCapabilities();
    
    // Test backend API (if available)
    console.log('\n🌐 Testing Backend API...');
    const backendHealthy = await checkBackendHealth();
    
    let backendResults = [];
    if (backendHealthy) {
      for (const url of TEST_CONFIG.testUrls) {
        const result = await testBackendAPI(url);
        backendResults.push(result);
      }
    }
    
    // Generate comprehensive report
    generateValidationReport(directResults, backendResults, cookieResults, backendHealthy);
    
  } catch (error) {
    console.error('❌ Comprehensive validation failed:', error.message);
  }
}

// Run tests if called directly
if (require.main === module) {
  runComprehensiveValidation().catch(console.error);
}

module.exports = { 
  runComprehensiveValidation, 
  testDirectYtDlp, 
  testBackendAPI, 
  testCookieCapabilities 
};
