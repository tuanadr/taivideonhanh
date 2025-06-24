#!/usr/bin/env node

/**
 * Test YouTube Formats Fix
 * Verifies that YouTube videos now show multiple quality options
 */

const fetch = require('node-fetch');

// Test configuration
const TEST_CONFIG = {
  apiUrl: process.env.API_URL || 'http://localhost:5000',
  testVideos: [
    {
      name: 'Standard YouTube Video',
      url: 'https://www.youtube.com/watch?v=jNQXAC9IVRw',
      expectedMinFormats: 2
    },
    {
      name: 'Popular Music Video',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      expectedMinFormats: 2
    },
    {
      name: 'Short URL Format',
      url: 'https://youtu.be/kJQP7kiw5Fk',
      expectedMinFormats: 1
    }
  ]
};

class FormatTester {
  constructor() {
    this.results = [];
    this.stats = {
      total: 0,
      passed: 0,
      failed: 0,
      avgFormats: 0
    };
  }

  log(level, message, data = null) {
    const colors = {
      info: '\x1b[36m',
      success: '\x1b[32m',
      warning: '\x1b[33m',
      error: '\x1b[31m',
      reset: '\x1b[0m'
    };

    const color = colors[level] || colors.reset;
    const timestamp = new Date().toISOString();
    
    console.log(`${color}[${timestamp}] ${level.toUpperCase()}: ${message}${colors.reset}`);
    
    if (data) {
      console.log(JSON.stringify(data, null, 2));
    }
  }

  async testVideoInfo(video) {
    this.log('info', `Testing: ${video.name}`);
    
    try {
      const response = await fetch(`${TEST_CONFIG.apiUrl}/api/info`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url: video.url }),
        timeout: 30000
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      
      const formatCount = data.formats ? data.formats.length : 0;
      const meetsExpectation = formatCount >= video.expectedMinFormats;
      
      this.log('success', `✅ ${video.name}: ${formatCount} formats found`);
      
      if (data.formats && data.formats.length > 0) {
        console.log('Available quality options:');
        data.formats.forEach((format, index) => {
          console.log(`  ${index + 1}. ${format.quality_label || format.format_note} (${format.ext})`);
        });
      } else {
        this.log('warning', 'No formats available!');
      }
      
      return {
        success: true,
        video: video.name,
        formatCount,
        meetsExpectation,
        data
      };
      
    } catch (error) {
      this.log('error', `❌ ${video.name}: ${error.message}`);
      
      return {
        success: false,
        video: video.name,
        error: error.message
      };
    }
  }

  async runAllTests() {
    this.log('info', 'Starting YouTube formats fix verification...');
    console.log('='.repeat(80));

    for (const video of TEST_CONFIG.testVideos) {
      const result = await this.testVideoInfo(video);
      this.results.push(result);
      this.stats.total++;
      
      if (result.success) {
        this.stats.passed++;
        this.stats.avgFormats += result.formatCount;
      } else {
        this.stats.failed++;
      }
      
      // Wait between tests
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    if (this.stats.passed > 0) {
      this.stats.avgFormats = (this.stats.avgFormats / this.stats.passed).toFixed(1);
    }

    return this.generateReport();
  }

  generateReport() {
    console.log('\n' + '='.repeat(80));
    this.log('info', 'TEST RESULTS SUMMARY');
    console.log('='.repeat(80));

    const successRate = ((this.stats.passed / this.stats.total) * 100).toFixed(1);
    
    console.log(`\n📊 Overall Results: ${this.stats.passed}/${this.stats.total} passed (${successRate}%)`);
    console.log(`📺 Average formats per video: ${this.stats.avgFormats}`);

    console.log('\n📋 Detailed Results:');
    this.results.forEach(result => {
      if (result.success) {
        const status = result.meetsExpectation ? '✅' : '⚠️';
        console.log(`${status} ${result.video}: ${result.formatCount} formats`);
      } else {
        console.log(`❌ ${result.video}: ${result.error}`);
      }
    });

    console.log('\n💡 ANALYSIS:');
    
    if (this.stats.avgFormats >= 3) {
      console.log('✅ Excellent! YouTube videos show multiple quality options.');
    } else if (this.stats.avgFormats >= 2) {
      console.log('✅ Good! YouTube videos show quality options.');
    } else if (this.stats.avgFormats >= 1) {
      console.log('⚠️ Basic functionality working, but could be improved.');
    } else {
      console.log('❌ YouTube format extraction needs more work.');
    }

    const expectationsMet = this.results.filter(r => r.success && r.meetsExpectation).length;
    console.log(`📈 Expectations met: ${expectationsMet}/${this.stats.passed} successful tests`);

    return {
      success: this.stats.passed === this.stats.total && expectationsMet === this.stats.passed,
      stats: this.stats,
      results: this.results
    };
  }
}

// Main execution
async function main() {
  const tester = new FormatTester();
  
  try {
    const report = await tester.runAllTests();
    
    // Save detailed report
    const reportFile = `youtube-formats-test-${Date.now()}.json`;
    require('fs').writeFileSync(reportFile, JSON.stringify(report, null, 2));
    console.log(`\n💾 Detailed report saved to: ${reportFile}`);
    
    process.exit(report.success ? 0 : 1);
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = FormatTester;
