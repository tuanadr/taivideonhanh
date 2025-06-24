#!/usr/bin/env node

/**
 * Production validation test for YouTube cookie authentication
 * Validates the complete implementation with real-world scenarios
 */

const { spawn } = require('child_process');

// Test configuration
const TEST_CONFIG = {
  timeout: 60000,
  testUrls: [
    'https://www.youtube.com/watch?v=U_kEC7kjA8k', // Original failing video
    'https://www.youtube.com/watch?v=jNQXAC9IVRw', // Me at the zoo
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ', // Rick Roll
    'https://www.youtube.com/watch?v=9bZkp7q19f0', // Gangnam Style
  ]
};

/**
 * Test video with production-ready arguments
 */
async function testProductionVideo(url) {
  return new Promise((resolve) => {
    console.log(`\n🧪 Testing production setup: ${url}`);
    
    // Use exact arguments from StreamingService implementation
    const ytdlpArgs = [
      '--dump-json',
      '--no-warnings',
      '--no-check-certificates',
      '--ignore-errors',
      '--extractor-args', 'youtube:skip=dash,hls',
      '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      url
    ];

    console.log(`📋 Production args: yt-dlp ${ytdlpArgs.join(' ')}`);

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
            url,
            duration,
            error: 'JSON parse failed'
          });
        }
      } else {
        console.log(`❌ FAILED (${duration}ms, code: ${code}):`);
        console.log(`   Error: ${errorData}`);
        
        // Analyze error for production insights
        let errorType = 'unknown';
        if (errorData.includes('Sign in to confirm')) {
          errorType = 'auth_required';
          console.log('   🚨 AUTHENTICATION ERROR DETECTED - Cookie setup needed');
        } else if (errorData.includes('Video unavailable')) {
          errorType = 'video_unavailable';
        } else if (errorData.includes('Private video')) {
          errorType = 'private_video';
        }
        
        resolve({
          success: false,
          url,
          duration,
          error: errorType,
          rawError: errorData
        });
      }
    });

    setTimeout(() => {
      ytdlp.kill('SIGTERM');
      console.log(`⏰ TIMEOUT (${TEST_CONFIG.timeout}ms)`);
      resolve({
        success: false,
        url,
        duration: TEST_CONFIG.timeout,
        error: 'timeout'
      });
    }, TEST_CONFIG.timeout);
  });
}

/**
 * Test cookie authentication availability
 */
async function testCookieSetup() {
  console.log('\n🍪 Testing Cookie Authentication Setup...');
  console.log('=' .repeat(50));
  
  const browsers = ['chrome', 'firefox'];
  const results = [];
  
  for (const browser of browsers) {
    console.log(`\n🌐 Testing ${browser} cookie availability...`);
    
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
          console.log(`   ✅ ${browser}: Available for production use`);
          resolve({ browser, available: true, error: null });
        } else {
          let errorType = 'unknown';
          if (errorOutput.includes('could not find') && errorOutput.includes('cookies database')) {
            errorType = 'browser_not_installed';
            console.log(`   ❌ ${browser}: Not installed or no cookies`);
          } else if (errorOutput.includes('unsupported platform')) {
            errorType = 'platform_unsupported';
            console.log(`   ❌ ${browser}: Platform not supported`);
          } else {
            console.log(`   ❌ ${browser}: ${errorType}`);
          }
          
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
 * Generate production validation report
 */
function generateProductionReport(videoResults, cookieResults) {
  console.log('\n📊 PRODUCTION VALIDATION REPORT');
  console.log('=' .repeat(60));
  
  // Video test results
  const successfulVideos = videoResults.filter(r => r.success);
  const failedVideos = videoResults.filter(r => !r.success);
  
  console.log('\n📺 VIDEO TEST RESULTS:');
  console.log(`   Total videos tested: ${videoResults.length}`);
  console.log(`   Successful: ${successfulVideos.length}`);
  console.log(`   Failed: ${failedVideos.length}`);
  console.log(`   Success rate: ${Math.round(successfulVideos.length / videoResults.length * 100)}%`);
  
  if (successfulVideos.length > 0) {
    const avgDuration = successfulVideos.reduce((sum, r) => sum + r.duration, 0) / successfulVideos.length;
    console.log(`   Average response time: ${Math.round(avgDuration)}ms`);
    
    console.log('\n   📋 Successful videos:');
    successfulVideos.forEach(video => {
      console.log(`   ✅ ${video.info.title} (${video.duration}ms)`);
    });
  }
  
  if (failedVideos.length > 0) {
    console.log('\n   ❌ Failed videos:');
    failedVideos.forEach(video => {
      console.log(`   ❌ ${video.url}: ${video.error}`);
    });
  }
  
  // Cookie setup results
  const availableBrowsers = cookieResults.filter(r => r.available);
  
  console.log('\n🍪 COOKIE AUTHENTICATION STATUS:');
  console.log(`   Available browsers: ${availableBrowsers.length}/${cookieResults.length}`);
  
  if (availableBrowsers.length > 0) {
    console.log('   ✅ Cookie authentication ready for production');
    availableBrowsers.forEach(browser => {
      console.log(`   ✅ ${browser.browser}: Ready`);
    });
  } else {
    console.log('   ⚠️ No browsers available for cookie authentication');
    console.log('   📋 This is normal in headless environments');
  }
  
  // Production readiness assessment
  console.log('\n🚀 PRODUCTION READINESS ASSESSMENT:');
  
  if (successfulVideos.length === videoResults.length) {
    console.log('   ✅ EXCELLENT - All videos working without authentication');
    console.log('   ✅ Platform optimizations are highly effective');
    console.log('   ✅ Ready for immediate deployment');
  } else if (successfulVideos.length >= videoResults.length * 0.8) {
    console.log('   ✅ GOOD - Most videos working');
    console.log('   🔧 Consider cookie setup for failed videos');
  } else {
    console.log('   ⚠️ NEEDS ATTENTION - Multiple failures detected');
    console.log('   🔧 Cookie authentication setup required');
  }
  
  // Deployment recommendations
  console.log('\n💡 DEPLOYMENT RECOMMENDATIONS:');
  
  if (successfulVideos.length === videoResults.length) {
    console.log('   🚀 DEPLOY IMMEDIATELY');
    console.log('     - All tests passed');
    console.log('     - No authentication issues');
    console.log('     - Cookie auth available as enhancement');
  } else {
    console.log('   🔧 SETUP COOKIE AUTHENTICATION');
    console.log('     - Install Chrome/Firefox on server');
    console.log('     - Login to YouTube in browser');
    console.log('     - Test cookie extraction');
  }
  
  console.log('\n✨ Production Validation Complete!');
}

/**
 * Run production validation tests
 */
async function runProductionValidation() {
  console.log('🚀 Starting Production Validation Tests...\n');
  console.log('🎯 Goal: Validate production readiness');
  console.log('📋 Testing: Real YouTube videos with production arguments');
  console.log('=' .repeat(60));
  
  try {
    // Test video extraction
    const videoResults = [];
    for (const url of TEST_CONFIG.testUrls) {
      const result = await testProductionVideo(url);
      videoResults.push(result);
    }
    
    // Test cookie setup
    const cookieResults = await testCookieSetup();
    
    // Generate comprehensive report
    generateProductionReport(videoResults, cookieResults);
    
  } catch (error) {
    console.error('❌ Production validation failed:', error.message);
  }
}

// Run tests if called directly
if (require.main === module) {
  runProductionValidation().catch(console.error);
}

module.exports = { 
  runProductionValidation, 
  testProductionVideo, 
  testCookieSetup 
};
