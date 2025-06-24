#!/usr/bin/env node

/**
 * Enhanced YouTube Authentication Test Script
 * Tests the improved cookie authentication and retry logic
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Test configuration
const TEST_VIDEOS = [
  {
    name: 'Public Video',
    url: 'https://www.youtube.com/watch?v=jNQXAC9IVRw',
    shouldWork: true
  },
  {
    name: 'Popular Music Video',
    url: 'https://www.youtube.com/watch?v=kJQP7kiw5Fk',
    shouldWork: true
  },
  {
    name: 'Educational Content',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    shouldWork: true
  }
];

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0'
];

/**
 * Test video extraction with different authentication methods
 */
async function testVideoAuth(url, authMethod = 'none', userAgent = null) {
  return new Promise((resolve) => {
    console.log(`\n🧪 Testing: ${url}`);
    console.log(`🔐 Auth method: ${authMethod}`);
    console.log(`🌐 User-Agent: ${userAgent ? userAgent.substring(0, 50) + '...' : 'default'}`);
    
    let ytdlpArgs = [
      '--dump-json',
      '--no-warnings',
      '--no-check-certificates',
      '--ignore-errors',
      '--extractor-args', 'youtube:skip=dash,hls'
    ];

    // Add authentication if specified
    if (authMethod === 'chrome') {
      ytdlpArgs.push('--cookies-from-browser', 'chrome');
    } else if (authMethod === 'firefox') {
      ytdlpArgs.push('--cookies-from-browser', 'firefox');
    } else if (authMethod === 'cookies-file') {
      const cookiesPath = process.env.YOUTUBE_COOKIES_PATH || '/tmp/youtube-cookies.txt';
      if (fs.existsSync(cookiesPath)) {
        ytdlpArgs.push('--cookies', cookiesPath);
      }
    }

    // Add user agent
    if (userAgent) {
      ytdlpArgs.push('--user-agent', userAgent);
    }

    ytdlpArgs.push(url);

    console.log('📋 Command:', `yt-dlp ${ytdlpArgs.join(' ')}`);

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
      
      if (code === 0 && jsonData) {
        try {
          const info = JSON.parse(jsonData);
          console.log(`✅ SUCCESS (${duration}ms)`);
          console.log(`📺 Title: ${info.title}`);
          console.log(`⏱️ Duration: ${info.duration}s`);
          console.log(`📊 Formats: ${info.formats ? info.formats.length : 0}`);
          
          resolve({
            success: true,
            title: info.title,
            duration: info.duration,
            formats: info.formats ? info.formats.length : 0,
            authMethod,
            userAgent: userAgent ? userAgent.substring(0, 50) + '...' : 'default',
            responseTime: duration
          });
        } catch (parseError) {
          console.log(`❌ PARSE ERROR (${duration}ms): ${parseError.message}`);
          resolve({
            success: false,
            error: 'JSON parse error',
            authMethod,
            userAgent: userAgent ? userAgent.substring(0, 50) + '...' : 'default',
            responseTime: duration
          });
        }
      } else {
        console.log(`❌ FAILED (${duration}ms)`);
        console.log(`🔍 Error: ${errorData.substring(0, 200)}...`);
        
        // Analyze error type
        let errorType = 'Unknown';
        if (errorData.includes('Sign in to confirm')) {
          errorType = 'Authentication Required';
        } else if (errorData.includes('Video unavailable')) {
          errorType = 'Video Unavailable';
        } else if (errorData.includes('HTTP Error 403')) {
          errorType = 'Access Forbidden';
        } else if (errorData.includes('network')) {
          errorType = 'Network Error';
        }
        
        resolve({
          success: false,
          error: errorType,
          errorDetails: errorData.substring(0, 200),
          authMethod,
          userAgent: userAgent ? userAgent.substring(0, 50) + '...' : 'default',
          responseTime: duration
        });
      }
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      ytdlp.kill('SIGTERM');
      resolve({
        success: false,
        error: 'Timeout',
        authMethod,
        userAgent: userAgent ? userAgent.substring(0, 50) + '...' : 'default',
        responseTime: 30000
      });
    }, 30000);
  });
}

/**
 * Test different authentication methods
 */
async function runAuthenticationTests() {
  console.log('🚀 Starting Enhanced YouTube Authentication Tests\n');
  console.log('=' .repeat(80));

  const results = [];
  const authMethods = ['none', 'chrome', 'firefox', 'cookies-file'];
  
  for (const video of TEST_VIDEOS) {
    console.log(`\n📹 Testing Video: ${video.name}`);
    console.log('-'.repeat(50));
    
    for (const authMethod of authMethods) {
      // Test with random user agent
      const userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
      const result = await testVideoAuth(video.url, authMethod, userAgent);
      result.videoName = video.name;
      result.videoUrl = video.url;
      results.push(result);
      
      // Wait between tests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  return results;
}

/**
 * Generate test report
 */
function generateReport(results) {
  console.log('\n' + '='.repeat(80));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('='.repeat(80));

  const successCount = results.filter(r => r.success).length;
  const totalCount = results.length;
  const successRate = ((successCount / totalCount) * 100).toFixed(1);

  console.log(`\n📈 Overall Success Rate: ${successCount}/${totalCount} (${successRate}%)`);

  // Group by authentication method
  const byAuthMethod = {};
  results.forEach(result => {
    if (!byAuthMethod[result.authMethod]) {
      byAuthMethod[result.authMethod] = { success: 0, total: 0, errors: {} };
    }
    byAuthMethod[result.authMethod].total++;
    if (result.success) {
      byAuthMethod[result.authMethod].success++;
    } else {
      const error = result.error || 'Unknown';
      byAuthMethod[result.authMethod].errors[error] = (byAuthMethod[result.authMethod].errors[error] || 0) + 1;
    }
  });

  console.log('\n🔐 Results by Authentication Method:');
  Object.entries(byAuthMethod).forEach(([method, stats]) => {
    const rate = ((stats.success / stats.total) * 100).toFixed(1);
    console.log(`  ${method}: ${stats.success}/${stats.total} (${rate}%)`);
    
    if (Object.keys(stats.errors).length > 0) {
      console.log('    Errors:');
      Object.entries(stats.errors).forEach(([error, count]) => {
        console.log(`      - ${error}: ${count}`);
      });
    }
  });

  // Average response times
  const avgResponseTime = (results.reduce((sum, r) => sum + r.responseTime, 0) / results.length).toFixed(0);
  console.log(`\n⏱️ Average Response Time: ${avgResponseTime}ms`);

  // Recommendations
  console.log('\n💡 RECOMMENDATIONS:');
  
  const bestAuthMethod = Object.entries(byAuthMethod)
    .sort((a, b) => (b[1].success / b[1].total) - (a[1].success / a[1].total))[0];
  
  if (bestAuthMethod) {
    console.log(`  - Best authentication method: ${bestAuthMethod[0]} (${((bestAuthMethod[1].success / bestAuthMethod[1].total) * 100).toFixed(1)}% success rate)`);
  }

  const authRequiredCount = results.filter(r => r.error === 'Authentication Required').length;
  if (authRequiredCount > 0) {
    console.log(`  - ${authRequiredCount} videos require authentication - consider implementing cookie support`);
  }

  const networkErrorCount = results.filter(r => r.error === 'Network Error').length;
  if (networkErrorCount > 0) {
    console.log(`  - ${networkErrorCount} network errors detected - consider implementing retry logic`);
  }

  console.log('\n🔧 NEXT STEPS:');
  console.log('  1. Set up cookie authentication for production');
  console.log('  2. Implement user-agent rotation');
  console.log('  3. Add retry logic for transient failures');
  console.log('  4. Monitor success rates in production');
}

/**
 * Main execution
 */
async function main() {
  try {
    const results = await runAuthenticationTests();
    generateReport(results);
    
    // Save detailed results to file
    const reportFile = `youtube-auth-test-${Date.now()}.json`;
    fs.writeFileSync(reportFile, JSON.stringify(results, null, 2));
    console.log(`\n💾 Detailed results saved to: ${reportFile}`);
    
  } catch (error) {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  main();
}

module.exports = { testVideoAuth, runAuthenticationTests };
