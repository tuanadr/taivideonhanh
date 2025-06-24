#!/usr/bin/env node

/**
 * Debug YouTube API Response
 * Tests the actual API response to understand why quality options aren't showing
 */

const fetch = require('node-fetch');

// Test configuration
const TEST_CONFIG = {
  apiUrl: process.env.API_URL || 'http://localhost:5000',
  testVideos: [
    'https://www.youtube.com/watch?v=jNQXAC9IVRw', // Test video
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ', // Popular video
    'https://www.youtube.com/watch?v=U_kEC7kjA8k', // Video from logs
  ]
};

class APIDebugger {
  constructor() {
    this.results = [];
  }

  /**
   * Log with colors and timestamps
   */
  log(level, message, data = null) {
    const colors = {
      info: '\x1b[36m',
      success: '\x1b[32m',
      warning: '\x1b[33m',
      error: '\x1b[31m',
      debug: '\x1b[35m',
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
   * Test API endpoint with detailed analysis
   */
  async testAPI(url) {
    this.log('info', `Testing YouTube URL: ${url}`);
    
    try {
      const startTime = Date.now();
      
      const response = await fetch(`${TEST_CONFIG.apiUrl}/api/info`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url }),
        timeout: 45000
      });

      const responseTime = Date.now() - startTime;
      
      if (!response.ok) {
        const errorText = await response.text();
        this.log('error', `HTTP ${response.status}: ${errorText}`);
        
        return {
          success: false,
          error: `HTTP ${response.status}`,
          errorDetails: errorText,
          responseTime
        };
      }

      const data = await response.json();
      
      // Analyze the response structure
      const analysis = this.analyzeResponse(data);
      
      this.log('success', `✅ API Response received (${responseTime}ms)`);
      this.log('info', 'Response Analysis:', analysis);
      
      // Show detailed format information
      if (data.formats && data.formats.length > 0) {
        console.log('\n📋 Available Formats:');
        data.formats.forEach((format, index) => {
          console.log(`  ${index + 1}. ${format.quality_label || format.format_note || 'Unknown'} (${format.ext || 'unknown'})`);
          console.log(`     - Format ID: ${format.format_id || 'N/A'}`);
          console.log(`     - Resolution: ${format.resolution || 'N/A'}`);
          console.log(`     - Has Audio: ${format.has_audio ? 'Yes' : 'No'}`);
          console.log(`     - File Size: ${format.filesize ? (format.filesize / 1024 / 1024).toFixed(2) + ' MB' : 'Unknown'}`);
        });
      } else {
        this.log('warning', '⚠️ No formats found in response!');
      }
      
      return {
        success: true,
        data,
        analysis,
        responseTime
      };
      
    } catch (error) {
      this.log('error', `❌ Request failed: ${error.message}`);
      
      return {
        success: false,
        error: error.message,
        responseTime: 0
      };
    }
  }

  /**
   * Analyze API response structure
   */
  analyzeResponse(data) {
    const analysis = {
      hasTitle: !!data.title,
      hasThumbnail: !!data.thumbnail,
      hasDuration: !!data.duration,
      platform: data.platform || 'unknown',
      totalFormats: data.total_formats || 0,
      availableFormats: data.available_formats || 0,
      formatsArray: data.formats ? data.formats.length : 0,
      formatTypes: {},
      resolutions: new Set(),
      extensions: new Set(),
      hasAudioFormats: 0,
      hasVideoOnlyFormats: 0
    };

    // Analyze formats if available
    if (data.formats && Array.isArray(data.formats)) {
      data.formats.forEach(format => {
        // Count format types
        const hasAudio = format.has_audio || (format.acodec && format.acodec !== 'none');
        const hasVideo = format.vcodec && format.vcodec !== 'none';
        
        if (hasAudio && hasVideo) {
          analysis.formatTypes['combined'] = (analysis.formatTypes['combined'] || 0) + 1;
          analysis.hasAudioFormats++;
        } else if (hasVideo) {
          analysis.formatTypes['video-only'] = (analysis.formatTypes['video-only'] || 0) + 1;
          analysis.hasVideoOnlyFormats++;
        } else if (hasAudio) {
          analysis.formatTypes['audio-only'] = (analysis.formatTypes['audio-only'] || 0) + 1;
        }
        
        // Collect resolutions and extensions
        if (format.resolution) {
          analysis.resolutions.add(format.resolution);
        }
        if (format.ext) {
          analysis.extensions.add(format.ext);
        }
      });
    }

    analysis.resolutions = Array.from(analysis.resolutions).sort();
    analysis.extensions = Array.from(analysis.extensions);

    return analysis;
  }

  /**
   * Test frontend compatibility
   */
  testFrontendCompatibility(data) {
    const issues = [];
    
    // Check required fields for frontend
    if (!data.title) issues.push('Missing title');
    if (!data.thumbnail) issues.push('Missing thumbnail');
    if (!data.formats || !Array.isArray(data.formats)) {
      issues.push('Missing or invalid formats array');
    } else if (data.formats.length === 0) {
      issues.push('Empty formats array');
    }
    
    // Check format structure
    if (data.formats && data.formats.length > 0) {
      const firstFormat = data.formats[0];
      if (!firstFormat.format_id) issues.push('Format missing format_id');
      if (!firstFormat.quality_label && !firstFormat.format_note) {
        issues.push('Format missing quality label');
      }
      if (!firstFormat.ext) issues.push('Format missing extension');
    }
    
    return {
      compatible: issues.length === 0,
      issues
    };
  }

  /**
   * Run comprehensive tests
   */
  async runTests() {
    this.log('info', 'Starting YouTube API Response Debug...');
    console.log('='.repeat(80));

    for (const url of TEST_CONFIG.testVideos) {
      console.log('\n' + '-'.repeat(60));
      
      const result = await this.testAPI(url);
      result.url = url;
      
      if (result.success) {
        // Test frontend compatibility
        const compatibility = this.testFrontendCompatibility(result.data);
        result.frontendCompatible = compatibility.compatible;
        result.frontendIssues = compatibility.issues;
        
        if (compatibility.compatible) {
          this.log('success', '✅ Frontend compatible');
        } else {
          this.log('warning', '⚠️ Frontend compatibility issues:', compatibility.issues);
        }
      }
      
      this.results.push(result);
      
      // Wait between tests
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    return this.generateReport();
  }

  /**
   * Generate comprehensive report
   */
  generateReport() {
    console.log('\n' + '='.repeat(80));
    this.log('info', 'COMPREHENSIVE ANALYSIS REPORT');
    console.log('='.repeat(80));

    const successful = this.results.filter(r => r.success);
    const failed = this.results.filter(r => !r.success);

    console.log(`\n📊 Test Results: ${successful.length}/${this.results.length} successful`);

    if (failed.length > 0) {
      console.log('\n❌ Failed Tests:');
      failed.forEach(result => {
        console.log(`  - ${result.url}: ${result.error}`);
        if (result.errorDetails) {
          console.log(`    Details: ${result.errorDetails.substring(0, 100)}...`);
        }
      });
    }

    if (successful.length > 0) {
      console.log('\n✅ Successful Tests Analysis:');
      successful.forEach(result => {
        console.log(`\n📹 ${result.url}:`);
        console.log(`  - Platform: ${result.analysis.platform}`);
        console.log(`  - Total Formats: ${result.analysis.totalFormats}`);
        console.log(`  - Available Formats: ${result.analysis.availableFormats}`);
        console.log(`  - Formats Array Length: ${result.analysis.formatsArray}`);
        console.log(`  - Format Types: ${JSON.stringify(result.analysis.formatTypes)}`);
        console.log(`  - Resolutions: ${result.analysis.resolutions.join(', ')}`);
        console.log(`  - Extensions: ${result.analysis.extensions.join(', ')}`);
        console.log(`  - Frontend Compatible: ${result.frontendCompatible ? 'Yes' : 'No'}`);
        
        if (result.frontendIssues && result.frontendIssues.length > 0) {
          console.log(`  - Issues: ${result.frontendIssues.join(', ')}`);
        }
      });
    }

    console.log('\n🔍 ROOT CAUSE ANALYSIS:');
    
    if (failed.length === this.results.length) {
      console.log('❌ All API calls failed - this explains why no quality options show');
      console.log('🔧 Primary issue: YouTube authentication/extraction failure');
      console.log('💡 Solution: Implement cookie authentication or improve fallback methods');
    } else if (successful.some(r => r.analysis.formatsArray === 0)) {
      console.log('⚠️ API succeeds but returns no formats');
      console.log('🔧 Primary issue: Format filtering too restrictive or extraction incomplete');
      console.log('💡 Solution: Review format filtering logic and extraction parameters');
    } else if (successful.some(r => !r.frontendCompatible)) {
      console.log('⚠️ API returns formats but frontend compatibility issues');
      console.log('🔧 Primary issue: Response structure mismatch with frontend expectations');
      console.log('💡 Solution: Fix response structure or update frontend parsing');
    } else {
      console.log('✅ API appears to be working correctly');
      console.log('🔧 Issue likely in frontend rendering logic');
      console.log('💡 Solution: Debug frontend JavaScript and React components');
    }

    console.log('\n📋 RECOMMENDED ACTIONS:');
    console.log('1. Set up YouTube cookie authentication');
    console.log('2. Test with working YouTube URLs');
    console.log('3. Check frontend console for JavaScript errors');
    console.log('4. Verify frontend component rendering logic');
    console.log('5. Compare with TikTok API response structure');

    return {
      success: successful.length > 0,
      totalTests: this.results.length,
      successfulTests: successful.length,
      failedTests: failed.length,
      results: this.results
    };
  }
}

// Main execution
async function main() {
  const debugger = new APIDebugger();
  
  try {
    const report = await debugger.runTests();
    
    // Save detailed report
    const reportFile = `youtube-api-debug-${Date.now()}.json`;
    require('fs').writeFileSync(reportFile, JSON.stringify(report, null, 2));
    console.log(`\n💾 Detailed report saved to: ${reportFile}`);
    
    process.exit(report.success ? 0 : 1);
  } catch (error) {
    console.error('❌ Debug failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = APIDebugger;
