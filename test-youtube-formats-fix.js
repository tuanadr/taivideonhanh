#!/usr/bin/env node

/**
 * Test YouTube Formats Fix
 * Verifies that the format filtering improvements work correctly
 */

const fetch = require('node-fetch');

// Test configuration
const TEST_CONFIG = {
  apiUrl: process.env.API_URL || 'http://localhost:5000',
  testVideos: {
    youtube: [
      {
        name: 'Standard YouTube Video',
        url: 'https://www.youtube.com/watch?v=jNQXAC9IVRw',
        expectedFormats: 3 // Expect at least 3 quality options
      },
      {
        name: 'Popular Music Video',
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        expectedFormats: 3
      },
      {
        name: 'Short URL Format',
        url: 'https://youtu.be/kJQP7kiw5Fk',
        expectedFormats: 2
      }
    ],
    tiktok: [
      {
        name: 'TikTok Video (for comparison)',
        url: 'https://www.tiktok.com/@username/video/1234567890123456789',
        expectedFormats: 1 // TikTok usually has fewer options
      }
    ]
  }
};

class FormatTester {
  constructor() {
    this.results = [];
    this.stats = {
      total: 0,
      passed: 0,
      failed: 0,
      youtubeTests: 0,
      tiktokTests: 0,
      avgFormatsYoutube: 0,
      avgFormatsTiktok: 0
    };
  }

  /**
   * Log with colors
   */
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

  /**
   * Test video info API
   */
  async testVideoInfo(video, platform) {
    this.log('info', `Testing ${platform} video: ${video.name}`);
    
    try {
      const response = await fetch(`${TEST_CONFIG.apiUrl}/api/info`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token' // You may need to get a real token
        },
        body: JSON.stringify({ url: video.url }),
        timeout: 30000
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      
      // Analyze the response
      const analysis = this.analyzeVideoInfo(data, video, platform);
      
      this.log('success', `✅ ${video.name}: ${analysis.formatCount} formats found`);
      
      // Show format details
      if (analysis.formats.length > 0) {
        console.log('Available formats:');
        analysis.formats.forEach((format, index) => {
          console.log(`  ${index + 1}. ${format.quality_label || format.format_note} (${format.ext})`);
        });
      }
      
      return {
        success: true,
        video: video.name,
        platform,
        analysis,
        data
      };
      
    } catch (error) {
      this.log('error', `❌ ${video.name}: ${error.message}`);
      
      return {
        success: false,
        video: video.name,
        platform,
        error: error.message
      };
    }
  }

  /**
   * Analyze video info response
   */
  analyzeVideoInfo(data, video, platform) {
    const analysis = {
      title: data.title,
      platform: data.platform || platform,
      totalFormats: data.total_formats || 0,
      availableFormats: data.available_formats || 0,
      formatCount: data.formats ? data.formats.length : 0,
      formats: data.formats || [],
      hasAudioFormats: 0,
      hasVideoOnlyFormats: 0,
      resolutions: new Set(),
      extensions: new Set(),
      meetsExpectation: false
    };

    // Analyze formats
    if (data.formats) {
      data.formats.forEach(format => {
        if (format.has_audio) {
          analysis.hasAudioFormats++;
        } else {
          analysis.hasVideoOnlyFormats++;
        }
        
        if (format.resolution) {
          analysis.resolutions.add(format.resolution);
        }
        
        if (format.ext) {
          analysis.extensions.add(format.ext);
        }
      });
    }

    analysis.resolutions = Array.from(analysis.resolutions);
    analysis.extensions = Array.from(analysis.extensions);
    analysis.meetsExpectation = analysis.formatCount >= video.expectedFormats;

    return analysis;
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    this.log('info', 'Starting YouTube formats fix verification...');
    console.log('='.repeat(80));

    // Test YouTube videos
    this.log('info', '\n🔴 Testing YouTube Videos:');
    console.log('-'.repeat(50));
    
    for (const video of TEST_CONFIG.testVideos.youtube) {
      const result = await this.testVideoInfo(video, 'youtube');
      this.results.push(result);
      this.stats.total++;
      this.stats.youtubeTests++;
      
      if (result.success) {
        this.stats.passed++;
        this.stats.avgFormatsYoutube += result.analysis.formatCount;
      } else {
        this.stats.failed++;
      }
      
      // Wait between tests
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    // Test TikTok videos (for comparison)
    this.log('info', '\n⚫ Testing TikTok Videos (for comparison):');
    console.log('-'.repeat(50));
    
    for (const video of TEST_CONFIG.testVideos.tiktok) {
      const result = await this.testVideoInfo(video, 'tiktok');
      this.results.push(result);
      this.stats.total++;
      this.stats.tiktokTests++;
      
      if (result.success) {
        this.stats.passed++;
        this.stats.avgFormatsTiktok += result.analysis.formatCount;
      } else {
        this.stats.failed++;
      }
      
      // Wait between tests
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    // Calculate averages
    if (this.stats.youtubeTests > 0) {
      this.stats.avgFormatsYoutube = (this.stats.avgFormatsYoutube / this.stats.youtubeTests).toFixed(1);
    }
    
    if (this.stats.tiktokTests > 0) {
      this.stats.avgFormatsTiktok = (this.stats.avgFormatsTiktok / this.stats.tiktokTests).toFixed(1);
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
    console.log(`📺 YouTube Tests: ${this.stats.youtubeTests} (avg ${this.stats.avgFormatsYoutube} formats)`);
    console.log(`⚫ TikTok Tests: ${this.stats.tiktokTests} (avg ${this.stats.avgFormatsTiktok} formats)`);

    // Detailed results
    console.log('\n📋 Detailed Results:');
    this.results.forEach(result => {
      if (result.success) {
        const analysis = result.analysis;
        console.log(`✅ ${result.video} (${result.platform}):`);
        console.log(`   - ${analysis.formatCount} formats available`);
        console.log(`   - Resolutions: ${analysis.resolutions.join(', ')}`);
        console.log(`   - Extensions: ${analysis.extensions.join(', ')}`);
        console.log(`   - Audio formats: ${analysis.hasAudioFormats}`);
        console.log(`   - Video-only: ${analysis.hasVideoOnlyFormats}`);
        console.log(`   - Meets expectation: ${analysis.meetsExpectation ? 'Yes' : 'No'}`);
      } else {
        console.log(`❌ ${result.video} (${result.platform}): ${result.error}`);
      }
    });

    // Analysis and recommendations
    console.log('\n💡 ANALYSIS:');
    
    const youtubeResults = this.results.filter(r => r.platform === 'youtube' && r.success);
    const tiktokResults = this.results.filter(r => r.platform === 'tiktok' && r.success);
    
    if (youtubeResults.length > 0) {
      const avgYouTubeFormats = youtubeResults.reduce((sum, r) => sum + r.analysis.formatCount, 0) / youtubeResults.length;
      
      if (avgYouTubeFormats >= 3) {
        console.log('✅ YouTube format extraction is working well');
      } else if (avgYouTubeFormats >= 1) {
        console.log('⚠️ YouTube format extraction is working but could be improved');
      } else {
        console.log('❌ YouTube format extraction needs more work');
      }
    }

    console.log('\n🎯 RECOMMENDATIONS:');
    
    if (this.stats.avgFormatsYoutube < 3) {
      console.log('- Consider adjusting YouTube extractor args to get more formats');
      console.log('- Check if DASH streams are being properly included');
      console.log('- Verify format filtering logic is not too restrictive');
    }
    
    if (this.stats.failed > 0) {
      console.log('- Check authentication and API connectivity');
      console.log('- Verify test URLs are still valid');
      console.log('- Review error messages for specific issues');
    }

    return {
      success: this.stats.passed === this.stats.total,
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
