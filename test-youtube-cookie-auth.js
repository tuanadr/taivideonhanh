#!/usr/bin/env node

/**
 * Comprehensive test for YouTube cookie authentication
 * Tests the specific failing video ID: U_kEC7kjA8k
 */

const { spawn } = require('child_process');
const fs = require('fs');

// Test configuration
const TEST_CONFIG = {
  timeout: 60000,
  failingVideoId: 'U_kEC7kjA8k',
  testUrls: {
    failing: 'https://www.youtube.com/watch?v=U_kEC7kjA8k',
    working: 'https://www.youtube.com/watch?v=jNQXAC9IVRw', // Me at the zoo
    popular: 'https://www.youtube.com/watch?v=9bZkp7q19f0'  // Gangnam Style
  },
  browsers: ['chrome', 'firefox', 'safari', 'edge']
};

/**
 * Test cookie authentication methods
 */
async function testCookieAuth(url, method, browser = null) {
  return new Promise((resolve) => {
    console.log(`\n🧪 Testing ${method} authentication for: ${url}`);
    if (browser) {
      console.log(`🌐 Browser: ${browser}`);
    }
    
    let ytdlpArgs = [
      '--dump-json',
      '--no-warnings',
      '--no-check-certificates',
      '--ignore-errors',
    ];

    // Add cookie authentication
    if (method === 'browser' && browser) {
      ytdlpArgs.push('--cookies-from-browser', browser);
    } else if (method === 'file') {
      ytdlpArgs.push('--cookies', '/tmp/youtube-cookies.txt');
    }

    // Add YouTube optimizations
    ytdlpArgs.push(
      '--extractor-args', 'youtube:skip=dash,hls',
      '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      url
    );

    console.log(`📋 Args: ${ytdlpArgs.join(' ')}`);

    const startTime = Date.now();
    const ytdlp = spawn('yt-dlp', ytdlpArgs);
    
    let jsonData = '';
    let errorData = '';
    let hasOutput = false;

    ytdlp.stdout.on('data', (data) => {
      jsonData += data.toString();
      hasOutput = true;
    });

    ytdlp.stderr.on('data', (data) => {
      errorData += data.toString();
    });

    ytdlp.on('close', (code) => {
      const duration = Date.now() - startTime;
      
      if (code === 0 && hasOutput) {
        try {
          const info = JSON.parse(jsonData);
          console.log(`✅ SUCCESS (${duration}ms):`);
          console.log(`   📺 Title: ${info.title}`);
          console.log(`   ⏱️ Duration: ${info.duration}s`);
          console.log(`   🎬 Formats: ${info.formats?.length || 0}`);
          console.log(`   👤 Uploader: ${info.uploader}`);
          
          resolve({
            success: true,
            method,
            browser,
            url,
            duration,
            info: {
              title: info.title,
              duration: info.duration,
              formatsCount: info.formats?.length || 0,
              uploader: info.uploader
            }
          });
        } catch (parseError) {
          console.log(`❌ JSON PARSE ERROR (${duration}ms): ${parseError.message}`);
          resolve({
            success: false,
            method,
            browser,
            url,
            duration,
            error: 'JSON parse failed',
            rawError: parseError.message
          });
        }
      } else {
        console.log(`❌ FAILED (${duration}ms, code: ${code}):`);
        console.log(`   Error: ${errorData}`);
        
        // Analyze error types
        let errorType = 'unknown';
        let userFriendlyMessage = errorData;
        
        if (errorData.includes('Sign in to confirm')) {
          errorType = 'auth_required';
          userFriendlyMessage = 'YouTube yêu cầu xác thực cookies';
        } else if (errorData.includes('cookies')) {
          errorType = 'cookie_error';
          userFriendlyMessage = 'Lỗi xử lý cookies';
        } else if (errorData.includes('Video unavailable')) {
          errorType = 'video_unavailable';
          userFriendlyMessage = 'Video không khả dụng';
        } else if (errorData.includes('Private video')) {
          errorType = 'private_video';
          userFriendlyMessage = 'Video riêng tư';
        }
        
        console.log(`   🔍 Error Type: ${errorType}`);
        console.log(`   💬 User Message: ${userFriendlyMessage}`);
        
        resolve({
          success: false,
          method,
          browser,
          url,
          duration,
          error: errorType,
          userFriendlyMessage,
          rawError: errorData
        });
      }
    });

    // Timeout handling
    setTimeout(() => {
      ytdlp.kill('SIGTERM');
      console.log(`⏰ TIMEOUT (${TEST_CONFIG.timeout}ms)`);
      resolve({
        success: false,
        method,
        browser,
        url,
        duration: TEST_CONFIG.timeout,
        error: 'timeout',
        userFriendlyMessage: 'Quá thời gian chờ'
      });
    }, TEST_CONFIG.timeout);
  });
}

/**
 * Test browser availability
 */
async function testBrowserAvailability() {
  console.log('\n🌐 Testing Browser Cookie Availability...');
  console.log('=' .repeat(50));
  
  const results = [];
  
  for (const browser of TEST_CONFIG.browsers) {
    console.log(`\n🧪 Testing ${browser} cookies...`);
    
    const result = await testCookieAuth(TEST_CONFIG.testUrls.working, 'browser', browser);
    results.push(result);
    
    if (result.success) {
      console.log(`✅ ${browser} cookies are working!`);
    } else {
      console.log(`❌ ${browser} cookies failed: ${result.error}`);
    }
  }
  
  return results;
}

/**
 * Test the specific failing video
 */
async function testFailingVideo() {
  console.log('\n🎯 Testing Specific Failing Video...');
  console.log('=' .repeat(50));
  console.log(`Video ID: ${TEST_CONFIG.failingVideoId}`);
  console.log(`URL: ${TEST_CONFIG.testUrls.failing}`);
  
  const results = [];
  
  // Test without cookies first
  console.log('\n📋 Test 1: Without cookies (should fail)');
  const noCookieResult = await testCookieAuth(TEST_CONFIG.testUrls.failing, 'none');
  results.push(noCookieResult);
  
  // Test with each browser's cookies
  for (const browser of TEST_CONFIG.browsers) {
    console.log(`\n📋 Test with ${browser} cookies`);
    const browserResult = await testCookieAuth(TEST_CONFIG.testUrls.failing, 'browser', browser);
    results.push(browserResult);
    
    // If successful, we found a working solution
    if (browserResult.success) {
      console.log(`🎉 SUCCESS! ${browser} cookies work for the failing video!`);
      break;
    }
  }
  
  return results;
}

/**
 * Test cookie file method
 */
async function testCookieFile() {
  console.log('\n📁 Testing Cookie File Method...');
  console.log('=' .repeat(50));
  
  const cookieFilePath = '/tmp/youtube-cookies.txt';
  
  // Check if cookie file exists
  if (fs.existsSync(cookieFilePath)) {
    console.log(`✅ Cookie file found at ${cookieFilePath}`);
    
    const result = await testCookieAuth(TEST_CONFIG.testUrls.failing, 'file');
    return [result];
  } else {
    console.log(`❌ Cookie file not found at ${cookieFilePath}`);
    console.log(`💡 To create a cookie file:`);
    console.log(`   1. Install browser extension to export cookies`);
    console.log(`   2. Export YouTube cookies to ${cookieFilePath}`);
    console.log(`   3. Run this test again`);
    
    return [{
      success: false,
      method: 'file',
      error: 'cookie_file_not_found',
      userFriendlyMessage: 'Cookie file không tồn tại'
    }];
  }
}

/**
 * Comprehensive cookie authentication test
 */
async function runCookieAuthTests() {
  console.log('🚀 Starting YouTube Cookie Authentication Tests...\n');
  console.log('🎯 Goal: Resolve "Sign in to confirm you\'re not a bot" error');
  console.log('📺 Target Video ID: U_kEC7kjA8k');
  console.log('=' .repeat(60));
  
  const allResults = {
    browserAvailability: [],
    failingVideoTests: [],
    cookieFileTests: []
  };

  try {
    // 1. Test browser availability
    allResults.browserAvailability = await testBrowserAvailability();
    
    // 2. Test the specific failing video
    allResults.failingVideoTests = await testFailingVideo();
    
    // 3. Test cookie file method
    allResults.cookieFileTests = await testCookieFile();
    
    // Generate comprehensive report
    generateCookieAuthReport(allResults);
    
  } catch (error) {
    console.error('❌ Cookie authentication testing failed:', error.message);
  }
}

/**
 * Generate detailed cookie authentication report
 */
function generateCookieAuthReport(results) {
  console.log('\n📊 COOKIE AUTHENTICATION TEST REPORT');
  console.log('=' .repeat(60));
  
  // Browser availability summary
  const workingBrowsers = results.browserAvailability.filter(r => r.success);
  const failedBrowsers = results.browserAvailability.filter(r => !r.success);
  
  console.log('\n🌐 BROWSER COOKIE AVAILABILITY:');
  console.log(`   Working browsers: ${workingBrowsers.length}/${results.browserAvailability.length}`);
  
  workingBrowsers.forEach(browser => {
    console.log(`   ✅ ${browser.browser}: Available (${browser.duration}ms)`);
  });
  
  failedBrowsers.forEach(browser => {
    console.log(`   ❌ ${browser.browser}: ${browser.error}`);
  });
  
  // Failing video test results
  const failingVideoSuccess = results.failingVideoTests.filter(r => r.success);
  
  console.log('\n🎯 FAILING VIDEO TEST RESULTS:');
  console.log(`   Video ID: ${TEST_CONFIG.failingVideoId}`);
  console.log(`   Successful methods: ${failingVideoSuccess.length}/${results.failingVideoTests.length}`);
  
  if (failingVideoSuccess.length > 0) {
    console.log('   🎉 SOLUTION FOUND:');
    failingVideoSuccess.forEach(result => {
      console.log(`   ✅ ${result.method}${result.browser ? ` (${result.browser})` : ''}: SUCCESS`);
      console.log(`      Title: ${result.info.title}`);
      console.log(`      Duration: ${result.duration}ms`);
    });
  } else {
    console.log('   ❌ No working solutions found');
  }
  
  // Cookie file results
  const cookieFileSuccess = results.cookieFileTests.filter(r => r.success);
  
  console.log('\n📁 COOKIE FILE TEST RESULTS:');
  if (cookieFileSuccess.length > 0) {
    console.log('   ✅ Cookie file method working');
  } else {
    console.log('   ❌ Cookie file method not available');
  }
  
  // Recommendations
  console.log('\n💡 RECOMMENDATIONS:');
  
  if (workingBrowsers.length > 0) {
    console.log('   🔧 IMPLEMENTATION READY:');
    console.log(`   - Use browser cookie extraction with: ${workingBrowsers.map(b => b.browser).join(', ')}`);
    console.log('   - Implement fallback chain: browser cookies → cookie file → no auth');
    console.log('   - Add proper error messages for each failure mode');
  } else {
    console.log('   🔧 SETUP REQUIRED:');
    console.log('   - Install Chrome/Firefox browser');
    console.log('   - Login to YouTube in browser');
    console.log('   - Ensure browser allows cookie access');
  }
  
  if (failingVideoSuccess.length > 0) {
    console.log('   ✅ PROBLEM SOLVED: Cookie authentication resolves the failing video');
  } else {
    console.log('   ⚠️ ADDITIONAL INVESTIGATION NEEDED: Cookie auth may not be sufficient');
  }
  
  console.log('\n✨ Cookie Authentication Test Complete!');
}

// Run tests if called directly
if (require.main === module) {
  runCookieAuthTests().catch(console.error);
}

module.exports = { 
  runCookieAuthTests, 
  testCookieAuth, 
  testBrowserAvailability, 
  testFailingVideo 
};
