#!/usr/bin/env node

/**
 * Comprehensive YouTube Debug Script
 * Tests the entire flow from API to frontend to identify where quality options are lost
 */

const fetch = require('node-fetch');
const { spawn } = require('child_process');

// Test configuration
const TEST_CONFIG = {
  apiUrl: process.env.API_URL || 'http://localhost:5000',
  testVideos: [
    'https://www.youtube.com/watch?v=jNQXAC9IVRw', // Test video
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ', // Popular video
  ]
};

class ComprehensiveDebugger {
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
   * Test direct yt-dlp extraction
   */
  async testDirectYtDlp(url) {
    this.log('info', `Testing direct yt-dlp extraction: ${url}`);
    
    return new Promise((resolve) => {
      const ytdlpArgs = [
        '--dump-json',
        '--no-warnings',
        '--no-check-certificates',
        '--ignore-errors',
        '--extractor-args', 'youtube:skip=hls',
        '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        url
      ];

      console.log('Direct yt-dlp command:', `yt-dlp ${ytdlpArgs.join(' ')}`);
      
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
        if (code === 0 && jsonData) {
          try {
            const info = JSON.parse(jsonData);
            this.log('success', `✅ Direct yt-dlp success: ${info.formats ? info.formats.length : 0} formats`);
            
            resolve({
              success: true,
              title: info.title,
              totalFormats: info.formats ? info.formats.length : 0,
              formats: info.formats || []
            });
          } catch (parseError) {
            this.log('error', `❌ Direct yt-dlp JSON parse error: ${parseError.message}`);
            resolve({ success: false, error: 'JSON parse error' });
          }
        } else {
          this.log('error', `❌ Direct yt-dlp failed (code ${code}): ${errorData.substring(0, 200)}...`);
          resolve({ success: false, error: errorData });
        }
      });

      setTimeout(() => {
        ytdlp.kill('SIGTERM');
        resolve({ success: false, error: 'Timeout' });
      }, 30000);
    });
  }

  /**
   * Test API endpoint
   */
  async testAPI(url) {
    this.log('info', `Testing API endpoint: ${url}`);
    
    try {
      const response = await fetch(`${TEST_CONFIG.apiUrl}/api/info`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url }),
        timeout: 45000
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.log('error', `❌ API failed (${response.status}): ${errorText}`);
        return { success: false, error: `HTTP ${response.status}` };
      }

      const data = await response.json();
      this.log('success', `✅ API success: ${data.formats ? data.formats.length : 0} formats`);
      
      return {
        success: true,
        data
      };
      
    } catch (error) {
      this.log('error', `❌ API request failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Analyze format filtering
   */
  analyzeFormatFiltering(rawFormats, apiFormats) {
    this.log('info', 'Analyzing format filtering...');
    
    const analysis = {
      rawTotal: rawFormats.length,
      apiTotal: apiFormats.length,
      filteredOut: rawFormats.length - apiFormats.length,
      filteringIssues: []
    };

    // Analyze what was filtered out
    const rawByExt = {};
    const apiByExt = {};
    
    rawFormats.forEach(f => {
      rawByExt[f.ext] = (rawByExt[f.ext] || 0) + 1;
    });
    
    apiFormats.forEach(f => {
      apiByExt[f.ext] = (apiByExt[f.ext] || 0) + 1;
    });

    // Check for filtering issues
    if (analysis.filteredOut > analysis.rawTotal * 0.8) {
      analysis.filteringIssues.push('Too many formats filtered out (>80%)');
    }

    if (!apiByExt.mp4 && rawByExt.mp4) {
      analysis.filteringIssues.push('All MP4 formats were filtered out');
    }

    if (!apiByExt.webm && rawByExt.webm) {
      analysis.filteringIssues.push('All WebM formats were filtered out');
    }

    // Check for video-only formats
    const rawVideoOnly = rawFormats.filter(f => f.vcodec && f.vcodec !== 'none' && (!f.acodec || f.acodec === 'none')).length;
    const apiVideoOnly = apiFormats.filter(f => !f.has_audio).length;
    
    if (rawVideoOnly > 0 && apiVideoOnly === 0) {
      analysis.filteringIssues.push('All video-only formats were filtered out');
    }

    console.log('Format filtering analysis:', analysis);
    return analysis;
  }

  /**
   * Test frontend simulation
   */
  simulateFrontendProcessing(apiResponse) {
    this.log('info', 'Simulating frontend processing...');
    
    const issues = [];
    
    // Check if frontend would receive formats
    if (!apiResponse.formats || !Array.isArray(apiResponse.formats)) {
      issues.push('No formats array in API response');
      return { success: false, issues };
    }

    if (apiResponse.formats.length === 0) {
      issues.push('Empty formats array');
      return { success: false, issues };
    }

    // Check format structure
    const sampleFormat = apiResponse.formats[0];
    const requiredFields = ['format_id', 'ext'];
    const missingFields = requiredFields.filter(field => !sampleFormat[field]);
    
    if (missingFields.length > 0) {
      issues.push(`Missing required fields: ${missingFields.join(', ')}`);
    }

    // Check quality labels
    const hasQualityLabels = apiResponse.formats.every(f => f.quality_label || f.format_note);
    if (!hasQualityLabels) {
      issues.push('Some formats missing quality labels');
    }

    // Simulate frontend rendering
    const renderableFormats = apiResponse.formats.filter(format => {
      return format.format_id && format.ext && (format.quality_label || format.format_note);
    });

    this.log('info', `Frontend would render ${renderableFormats.length}/${apiResponse.formats.length} formats`);

    return {
      success: renderableFormats.length > 0,
      renderableFormats: renderableFormats.length,
      totalFormats: apiResponse.formats.length,
      issues
    };
  }

  /**
   * Run comprehensive test for a single URL
   */
  async runComprehensiveTest(url) {
    this.log('info', `\n${'='.repeat(60)}`);
    this.log('info', `COMPREHENSIVE TEST: ${url}`);
    this.log('info', '='.repeat(60));

    const result = {
      url,
      directYtDlp: null,
      api: null,
      filtering: null,
      frontend: null,
      issues: [],
      recommendations: []
    };

    // Step 1: Test direct yt-dlp
    this.log('info', '\n📋 STEP 1: Direct yt-dlp extraction');
    result.directYtDlp = await this.testDirectYtDlp(url);
    
    if (!result.directYtDlp.success) {
      result.issues.push('Direct yt-dlp extraction fails');
      result.recommendations.push('Fix yt-dlp extraction or implement cookie authentication');
    }

    // Step 2: Test API
    this.log('info', '\n📋 STEP 2: API endpoint test');
    result.api = await this.testAPI(url);
    
    if (!result.api.success) {
      result.issues.push('API endpoint fails');
      result.recommendations.push('Fix backend API or streaming service');
    }

    // Step 3: Analyze filtering (if both previous steps succeeded)
    if (result.directYtDlp.success && result.api.success) {
      this.log('info', '\n📋 STEP 3: Format filtering analysis');
      result.filtering = this.analyzeFormatFiltering(
        result.directYtDlp.formats,
        result.api.data.formats || []
      );
      
      if (result.filtering.filteringIssues.length > 0) {
        result.issues.push('Format filtering too restrictive');
        result.recommendations.push('Review and adjust format filtering logic');
      }
    }

    // Step 4: Frontend simulation
    if (result.api.success) {
      this.log('info', '\n📋 STEP 4: Frontend processing simulation');
      result.frontend = this.simulateFrontendProcessing(result.api.data);
      
      if (!result.frontend.success) {
        result.issues.push('Frontend would not render quality options');
        result.recommendations.push('Fix frontend component or API response structure');
      }
    }

    return result;
  }

  /**
   * Run tests for all URLs
   */
  async runAllTests() {
    this.log('info', 'Starting comprehensive YouTube debug...');
    
    for (const url of TEST_CONFIG.testVideos) {
      const result = await this.runComprehensiveTest(url);
      this.results.push(result);
      
      // Wait between tests
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    return this.generateFinalReport();
  }

  /**
   * Generate final comprehensive report
   */
  generateFinalReport() {
    console.log('\n' + '='.repeat(80));
    this.log('info', 'FINAL COMPREHENSIVE REPORT');
    console.log('='.repeat(80));

    const allIssues = new Set();
    const allRecommendations = new Set();

    this.results.forEach(result => {
      console.log(`\n📹 ${result.url}:`);
      console.log(`  Direct yt-dlp: ${result.directYtDlp?.success ? '✅' : '❌'}`);
      console.log(`  API: ${result.api?.success ? '✅' : '❌'}`);
      console.log(`  Frontend: ${result.frontend?.success ? '✅' : '❌'}`);
      
      if (result.issues.length > 0) {
        console.log(`  Issues: ${result.issues.join(', ')}`);
        result.issues.forEach(issue => allIssues.add(issue));
      }
      
      result.recommendations.forEach(rec => allRecommendations.add(rec));
    });

    console.log('\n🔍 ROOT CAUSE ANALYSIS:');
    
    const directYtDlpFailures = this.results.filter(r => !r.directYtDlp?.success).length;
    const apiFailures = this.results.filter(r => !r.api?.success).length;
    const frontendFailures = this.results.filter(r => !r.frontend?.success).length;

    if (directYtDlpFailures === this.results.length) {
      console.log('❌ PRIMARY ISSUE: yt-dlp extraction completely failing');
      console.log('🔧 CAUSE: YouTube authentication/bot detection');
      console.log('💡 SOLUTION: Implement cookie authentication immediately');
    } else if (apiFailures === this.results.length) {
      console.log('❌ PRIMARY ISSUE: API endpoint failing');
      console.log('🔧 CAUSE: Backend service issues');
      console.log('💡 SOLUTION: Check backend logs and fix streaming service');
    } else if (frontendFailures === this.results.length) {
      console.log('❌ PRIMARY ISSUE: Frontend not rendering quality options');
      console.log('🔧 CAUSE: API response structure or frontend component issues');
      console.log('💡 SOLUTION: Debug frontend JavaScript and React components');
    } else {
      console.log('⚠️ MIXED ISSUES: Multiple points of failure');
      console.log('🔧 CAUSE: Various issues in the pipeline');
      console.log('💡 SOLUTION: Address each issue systematically');
    }

    console.log('\n📋 ALL IDENTIFIED ISSUES:');
    Array.from(allIssues).forEach(issue => {
      console.log(`  - ${issue}`);
    });

    console.log('\n🛠️ RECOMMENDED ACTIONS:');
    Array.from(allRecommendations).forEach(rec => {
      console.log(`  - ${rec}`);
    });

    console.log('\n🚀 IMMEDIATE NEXT STEPS:');
    console.log('1. Set up YouTube cookie authentication');
    console.log('2. Test API responses with working videos');
    console.log('3. Check frontend console for JavaScript errors');
    console.log('4. Verify React component rendering logic');

    return {
      success: this.results.some(r => r.frontend?.success),
      results: this.results,
      issues: Array.from(allIssues),
      recommendations: Array.from(allRecommendations)
    };
  }
}

// Main execution
async function main() {
  const debugger = new ComprehensiveDebugger();
  
  try {
    const report = await debugger.runAllTests();
    
    // Save detailed report
    const reportFile = `comprehensive-youtube-debug-${Date.now()}.json`;
    require('fs').writeFileSync(reportFile, JSON.stringify(report, null, 2));
    console.log(`\n💾 Detailed report saved to: ${reportFile}`);
    
    process.exit(report.success ? 0 : 1);
  } catch (error) {
    console.error('❌ Comprehensive debug failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = ComprehensiveDebugger;
