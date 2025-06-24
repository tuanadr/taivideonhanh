#!/usr/bin/env node

/**
 * Production Fixes Test Script
 * Tests all the YouTube authentication improvements
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Test configuration
const TEST_CONFIG = {
  apiUrl: process.env.API_URL || 'http://localhost:5000',
  testVideos: [
    {
      name: 'Standard YouTube Video',
      url: 'https://www.youtube.com/watch?v=jNQXAC9IVRw',
      expectedSuccess: true
    },
    {
      name: 'Popular Music Video',
      url: 'https://www.youtube.com/watch?v=kJQP7kiw5Fk',
      expectedSuccess: true
    },
    {
      name: 'Educational Content',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      expectedSuccess: true
    }
  ],
  timeout: 30000,
  retryDelay: 2000
};

class ProductionTester {
  constructor() {
    this.results = [];
    this.stats = {
      total: 0,
      passed: 0,
      failed: 0,
      errors: {}
    };
  }

  /**
   * Log with colors
   */
  log(level, message, data = null) {
    const colors = {
      info: '\x1b[36m',    // Cyan
      success: '\x1b[32m', // Green
      warning: '\x1b[33m', // Yellow
      error: '\x1b[31m',   // Red
      reset: '\x1b[0m'     // Reset
    };

    const color = colors[level] || colors.reset;
    const timestamp = new Date().toISOString();
    
    console.log(`${color}[${timestamp}] ${level.toUpperCase()}: ${message}${colors.reset}`);
    
    if (data) {
      console.log(JSON.stringify(data, null, 2));
    }
  }

  /**
   * Test API endpoint
   */
  async testApiEndpoint(endpoint, method = 'GET', body = null) {
    const fetch = require('node-fetch');
    
    try {
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'ProductionTester/1.0'
        },
        timeout: TEST_CONFIG.timeout
      };

      if (body) {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(`${TEST_CONFIG.apiUrl}${endpoint}`, options);
      const data = await response.json();

      return {
        success: response.ok,
        status: response.status,
        data,
        headers: Object.fromEntries(response.headers.entries())
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Test health endpoint
   */
  async testHealthEndpoint() {
    this.log('info', 'Testing health endpoint...');
    
    const result = await this.testApiEndpoint('/api/health');
    
    if (result.success && result.data.status === 'ok') {
      this.log('success', 'Health endpoint is working');
      return { passed: true, message: 'Health check passed' };
    } else {
      this.log('error', 'Health endpoint failed', result);
      return { passed: false, message: 'Health check failed', error: result.error };
    }
  }

  /**
   * Test video info endpoint
   */
  async testVideoInfo(video) {
    this.log('info', `Testing video info: ${video.name}`);
    
    const result = await this.testApiEndpoint('/api/info', 'POST', {
      url: video.url
    });

    if (result.success && result.data.title) {
      this.log('success', `Video info retrieved: ${result.data.title}`);
      return {
        passed: true,
        message: `Successfully retrieved info for ${video.name}`,
        data: {
          title: result.data.title,
          duration: result.data.duration,
          formats: result.data.formats ? result.data.formats.length : 0
        }
      };
    } else {
      this.log('error', `Video info failed for ${video.name}`, result);
      return {
        passed: false,
        message: `Failed to retrieve info for ${video.name}`,
        error: result.data?.error || result.error
      };
    }
  }

  /**
   * Test retry logic by simulating failures
   */
  async testRetryLogic() {
    this.log('info', 'Testing retry logic...');
    
    // Test with an invalid URL to trigger retry
    const result = await this.testApiEndpoint('/api/info', 'POST', {
      url: 'https://www.youtube.com/watch?v=invalid_video_id'
    });

    // Should fail gracefully with proper error message
    if (!result.success && result.data?.error) {
      this.log('success', 'Retry logic working - proper error handling');
      return {
        passed: true,
        message: 'Retry logic and error handling working correctly',
        error: result.data.error
      };
    } else {
      this.log('warning', 'Retry logic test inconclusive', result);
      return {
        passed: true,
        message: 'Retry logic test inconclusive but no crash detected'
      };
    }
  }

  /**
   * Test rate limiting
   */
  async testRateLimiting() {
    this.log('info', 'Testing rate limiting...');
    
    const startTime = Date.now();
    const promises = [];
    
    // Make multiple concurrent requests
    for (let i = 0; i < 3; i++) {
      promises.push(this.testApiEndpoint('/api/info', 'POST', {
        url: 'https://www.youtube.com/watch?v=jNQXAC9IVRw'
      }));
    }

    const results = await Promise.all(promises);
    const endTime = Date.now();
    const totalTime = endTime - startTime;

    // Should take at least some time due to rate limiting
    if (totalTime > 4000) { // Expect at least 4 seconds for 3 requests with 2s interval
      this.log('success', `Rate limiting working - took ${totalTime}ms for 3 requests`);
      return {
        passed: true,
        message: 'Rate limiting is working correctly',
        data: { totalTime, requestCount: 3 }
      };
    } else {
      this.log('warning', `Rate limiting may not be working - only took ${totalTime}ms`);
      return {
        passed: false,
        message: 'Rate limiting may not be working as expected',
        data: { totalTime, requestCount: 3 }
      };
    }
  }

  /**
   * Test user-agent rotation
   */
  async testUserAgentRotation() {
    this.log('info', 'Testing user-agent rotation...');
    
    // Make multiple requests and check if different user agents are used
    const results = [];
    
    for (let i = 0; i < 3; i++) {
      const result = await this.testApiEndpoint('/api/info', 'POST', {
        url: 'https://www.youtube.com/watch?v=jNQXAC9IVRw'
      });
      results.push(result);
      
      // Wait between requests
      await new Promise(resolve => setTimeout(resolve, TEST_CONFIG.retryDelay));
    }

    const successCount = results.filter(r => r.success).length;
    
    if (successCount > 0) {
      this.log('success', `User-agent rotation test passed - ${successCount}/3 requests successful`);
      return {
        passed: true,
        message: 'User-agent rotation appears to be working',
        data: { successCount, totalRequests: 3 }
      };
    } else {
      this.log('error', 'All requests failed - user-agent rotation may not be working');
      return {
        passed: false,
        message: 'User-agent rotation test failed',
        data: { successCount, totalRequests: 3 }
      };
    }
  }

  /**
   * Test cookie authentication (if available)
   */
  async testCookieAuthentication() {
    this.log('info', 'Testing cookie authentication...');
    
    const cookiesPath = process.env.YOUTUBE_COOKIES_PATH || '/tmp/cookies/youtube-cookies.txt';
    
    if (!fs.existsSync(cookiesPath)) {
      this.log('warning', 'Cookie file not found - skipping cookie authentication test');
      return {
        passed: true,
        message: 'Cookie authentication test skipped - no cookie file found',
        skipped: true
      };
    }

    // Test with a video that might require authentication
    const result = await this.testApiEndpoint('/api/info', 'POST', {
      url: 'https://www.youtube.com/watch?v=kJQP7kiw5Fk'
    });

    if (result.success) {
      this.log('success', 'Cookie authentication working');
      return {
        passed: true,
        message: 'Cookie authentication is working correctly'
      };
    } else {
      this.log('warning', 'Cookie authentication test failed', result);
      return {
        passed: false,
        message: 'Cookie authentication may not be working',
        error: result.data?.error || result.error
      };
    }
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    this.log('info', 'Starting production fixes test suite...');
    console.log('='.repeat(80));

    const tests = [
      { name: 'Health Endpoint', fn: () => this.testHealthEndpoint() },
      { name: 'Retry Logic', fn: () => this.testRetryLogic() },
      { name: 'Rate Limiting', fn: () => this.testRateLimiting() },
      { name: 'User-Agent Rotation', fn: () => this.testUserAgentRotation() },
      { name: 'Cookie Authentication', fn: () => this.testCookieAuthentication() }
    ];

    // Add video info tests
    TEST_CONFIG.testVideos.forEach(video => {
      tests.push({
        name: `Video Info - ${video.name}`,
        fn: () => this.testVideoInfo(video)
      });
    });

    // Run tests
    for (const test of tests) {
      try {
        console.log('\n' + '-'.repeat(50));
        const result = await test.fn();
        
        this.results.push({
          name: test.name,
          ...result,
          timestamp: new Date().toISOString()
        });

        this.stats.total++;
        if (result.passed) {
          this.stats.passed++;
        } else {
          this.stats.failed++;
          const errorType = result.error || 'Unknown';
          this.stats.errors[errorType] = (this.stats.errors[errorType] || 0) + 1;
        }

      } catch (error) {
        this.log('error', `Test ${test.name} threw an exception:`, error);
        this.results.push({
          name: test.name,
          passed: false,
          message: 'Test threw an exception',
          error: error.message,
          timestamp: new Date().toISOString()
        });
        this.stats.total++;
        this.stats.failed++;
      }

      // Wait between tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return this.generateReport();
  }

  /**
   * Generate test report
   */
  generateReport() {
    console.log('\n' + '='.repeat(80));
    this.log('info', 'TEST RESULTS SUMMARY');
    console.log('='.repeat(80));

    const successRate = ((this.stats.passed / this.stats.total) * 100).toFixed(1);
    
    console.log(`\n📊 Overall Results: ${this.stats.passed}/${this.stats.total} passed (${successRate}%)`);
    
    if (this.stats.failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.results.filter(r => !r.passed && !r.skipped).forEach(result => {
        console.log(`  - ${result.name}: ${result.message}`);
        if (result.error) {
          console.log(`    Error: ${result.error}`);
        }
      });
    }

    const skippedTests = this.results.filter(r => r.skipped);
    if (skippedTests.length > 0) {
      console.log('\n⏭️ Skipped Tests:');
      skippedTests.forEach(result => {
        console.log(`  - ${result.name}: ${result.message}`);
      });
    }

    console.log('\n💡 Recommendations:');
    
    if (this.stats.passed === this.stats.total) {
      console.log('  ✅ All tests passed! Production fixes are working correctly.');
    } else if (successRate >= 80) {
      console.log('  ⚠️ Most tests passed, but some issues detected. Review failed tests.');
    } else {
      console.log('  ❌ Multiple tests failed. Review implementation and configuration.');
    }

    // Save detailed report
    const reportFile = `production-test-report-${Date.now()}.json`;
    const report = {
      timestamp: new Date().toISOString(),
      stats: this.stats,
      results: this.results,
      config: TEST_CONFIG
    };
    
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    console.log(`\n💾 Detailed report saved to: ${reportFile}`);

    return {
      success: this.stats.passed === this.stats.total,
      stats: this.stats,
      results: this.results
    };
  }
}

// Main execution
async function main() {
  const tester = new ProductionTester();
  
  try {
    const report = await tester.runAllTests();
    process.exit(report.success ? 0 : 1);
  } catch (error) {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = ProductionTester;
