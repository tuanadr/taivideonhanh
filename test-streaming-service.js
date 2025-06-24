#!/usr/bin/env node

/**
 * Standalone test for StreamingService improvements
 * Tests the actual backend service without Jest dependencies
 */

const { spawn } = require('child_process');
const path = require('path');

// Test configuration
const TEST_CONFIG = {
  timeout: 45000,
  maxRetries: 2,
  testUrls: {
    youtube: [
      'https://www.youtube.com/watch?v=jNQXAC9IVRw', // Me at the zoo
      'https://youtu.be/jNQXAC9IVRw', // Short format
    ],
    tiktok: [
      'https://www.tiktok.com/@tiktok/video/6829267836783971589',
    ],
    invalid: [
      'https://www.youtube.com/watch?v=invalid_video_id',
      'https://invalid-domain.com/video',
    ]
  }
};

/**
 * Test the enhanced yt-dlp arguments
 */
async function testYtDlpArgs(url, platform) {
  return new Promise((resolve) => {
    console.log(`\n🧪 Testing ${platform} with enhanced args: ${url}`);
    
    const isYouTube = platform === 'youtube';
    const isTikTok = platform === 'tiktok';
    
    let ytdlpArgs = [
      '--dump-json',
      '--no-warnings',
      '--no-check-certificates',
      '--ignore-errors',
    ];

    // Apply platform-specific optimizations (matching our backend code)
    if (isYouTube) {
      ytdlpArgs.push(
        '--extractor-args', 'youtube:skip=dash,hls',
        '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );
    } else if (isTikTok) {
      ytdlpArgs.push(
        '--user-agent', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
      );
    }

    ytdlpArgs.push(url);

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
            platform,
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
            platform,
            url,
            duration,
            error: 'JSON parse failed',
            rawError: parseError.message
          });
        }
      } else {
        console.log(`❌ FAILED (${duration}ms, code: ${code}):`);
        console.log(`   Error: ${errorData}`);
        
        // Analyze error types for better reporting
        let errorType = 'unknown';
        let userFriendlyMessage = errorData;
        
        if (errorData.includes('Sign in to confirm')) {
          errorType = 'youtube_auth';
          userFriendlyMessage = 'YouTube yêu cầu xác thực';
        } else if (errorData.includes('Unable to extract')) {
          errorType = 'extraction_failed';
          userFriendlyMessage = 'Không thể trích xuất video';
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
          platform,
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
        platform,
        url,
        duration: TEST_CONFIG.timeout,
        error: 'timeout',
        userFriendlyMessage: 'Quá thời gian chờ'
      });
    }, TEST_CONFIG.timeout);
  });
}

/**
 * Test fallback method for YouTube
 */
async function testYouTubeFallback(url) {
  return new Promise((resolve) => {
    console.log(`\n🔄 Testing YouTube fallback: ${url}`);
    
    const ytdlpArgs = [
      '--dump-json',
      '--no-warnings',
      '--no-check-certificates',
      '--ignore-errors',
      '--extractor-args', 'youtube:skip=dash',
      '--user-agent', 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      url
    ];

    console.log(`📋 Fallback Args: ${ytdlpArgs.join(' ')}`);

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
      
      if (code === 0) {
        try {
          const info = JSON.parse(jsonData);
          console.log(`✅ FALLBACK SUCCESS (${duration}ms):`);
          console.log(`   📺 Title: ${info.title}`);
          console.log(`   🎬 Formats: ${info.formats?.length || 0}`);
          
          resolve({
            success: true,
            method: 'fallback',
            url,
            duration,
            info: {
              title: info.title,
              formatsCount: info.formats?.length || 0
            }
          });
        } catch (parseError) {
          console.log(`❌ FALLBACK JSON PARSE ERROR (${duration}ms)`);
          resolve({
            success: false,
            method: 'fallback',
            url,
            duration,
            error: 'JSON parse failed'
          });
        }
      } else {
        console.log(`❌ FALLBACK FAILED (${duration}ms, code: ${code})`);
        console.log(`   Error: ${errorData}`);
        resolve({
          success: false,
          method: 'fallback',
          url,
          duration,
          error: errorData
        });
      }
    });

    setTimeout(() => {
      ytdlp.kill('SIGTERM');
      console.log(`⏰ FALLBACK TIMEOUT (${TEST_CONFIG.timeout}ms)`);
      resolve({
        success: false,
        method: 'fallback',
        url,
        duration: TEST_CONFIG.timeout,
        error: 'timeout'
      });
    }, TEST_CONFIG.timeout);
  });
}

/**
 * Run comprehensive tests
 */
async function runComprehensiveTests() {
  console.log('🚀 Starting Comprehensive StreamingService Tests...\n');
  console.log('=' .repeat(60));
  
  const results = {
    youtube: [],
    tiktok: [],
    invalid: [],
    fallback: []
  };

  // Test YouTube URLs
  console.log('\n📺 TESTING YOUTUBE URLS');
  console.log('=' .repeat(30));
  
  for (const url of TEST_CONFIG.testUrls.youtube) {
    const result = await testYtDlpArgs(url, 'youtube');
    results.youtube.push(result);
    
    // If primary method failed, test fallback
    if (!result.success && result.error === 'youtube_auth') {
      const fallbackResult = await testYouTubeFallback(url);
      results.fallback.push(fallbackResult);
    }
  }

  // Test TikTok URLs
  console.log('\n🎵 TESTING TIKTOK URLS');
  console.log('=' .repeat(30));
  
  for (const url of TEST_CONFIG.testUrls.tiktok) {
    const result = await testYtDlpArgs(url, 'tiktok');
    results.tiktok.push(result);
  }

  // Test Invalid URLs (for error handling)
  console.log('\n❌ TESTING INVALID URLS (Error Handling)');
  console.log('=' .repeat(45));
  
  for (const url of TEST_CONFIG.testUrls.invalid) {
    const result = await testYtDlpArgs(url, 'invalid');
    results.invalid.push(result);
  }

  // Generate comprehensive report
  generateTestReport(results);
}

/**
 * Generate detailed test report
 */
function generateTestReport(results) {
  console.log('\n📊 COMPREHENSIVE TEST REPORT');
  console.log('=' .repeat(50));
  
  // Success rates
  const youtubeSuccess = results.youtube.filter(r => r.success).length;
  const youtubeTotal = results.youtube.length;
  const tiktokSuccess = results.tiktok.filter(r => r.success).length;
  const tiktokTotal = results.tiktok.length;
  const fallbackSuccess = results.fallback.filter(r => r.success).length;
  const fallbackTotal = results.fallback.length;
  
  console.log('\n📈 SUCCESS RATES:');
  console.log(`   YouTube: ${youtubeSuccess}/${youtubeTotal} (${Math.round(youtubeSuccess/youtubeTotal*100)}%)`);
  console.log(`   TikTok:  ${tiktokSuccess}/${tiktokTotal} (${Math.round(tiktokSuccess/tiktokTotal*100)}%)`);
  if (fallbackTotal > 0) {
    console.log(`   Fallback: ${fallbackSuccess}/${fallbackTotal} (${Math.round(fallbackSuccess/fallbackTotal*100)}%)`);
  }
  
  // Performance metrics
  const allResults = [...results.youtube, ...results.tiktok, ...results.fallback];
  const successfulResults = allResults.filter(r => r.success);
  
  if (successfulResults.length > 0) {
    const avgDuration = successfulResults.reduce((sum, r) => sum + r.duration, 0) / successfulResults.length;
    const minDuration = Math.min(...successfulResults.map(r => r.duration));
    const maxDuration = Math.max(...successfulResults.map(r => r.duration));
    
    console.log('\n⏱️ PERFORMANCE METRICS:');
    console.log(`   Average Response Time: ${Math.round(avgDuration)}ms`);
    console.log(`   Fastest Response: ${minDuration}ms`);
    console.log(`   Slowest Response: ${maxDuration}ms`);
  }
  
  // Error analysis
  const failedResults = allResults.filter(r => !r.success);
  if (failedResults.length > 0) {
    console.log('\n🔍 ERROR ANALYSIS:');
    const errorTypes = {};
    failedResults.forEach(r => {
      errorTypes[r.error] = (errorTypes[r.error] || 0) + 1;
    });
    
    Object.entries(errorTypes).forEach(([error, count]) => {
      console.log(`   ${error}: ${count} occurrences`);
    });
  }
  
  // Recommendations
  console.log('\n💡 RECOMMENDATIONS:');
  if (youtubeSuccess < youtubeTotal) {
    console.log('   🔧 YouTube: Consider implementing cookie authentication');
    console.log('   🔧 YouTube: Update user agents regularly');
  }
  if (tiktokSuccess < tiktokTotal) {
    console.log('   🔧 TikTok: Try different mobile user agents');
    console.log('   🔧 TikTok: Monitor for API changes');
  }
  if (fallbackSuccess > 0) {
    console.log('   ✅ Fallback mechanisms are working');
  }
  
  console.log('\n✨ Test Report Complete!');
}

// Run the tests
if (require.main === module) {
  runComprehensiveTests().catch(console.error);
}

module.exports = { runComprehensiveTests, testYtDlpArgs, testYouTubeFallback };
