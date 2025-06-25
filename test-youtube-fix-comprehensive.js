#!/usr/bin/env node

/**
 * Comprehensive test for YouTube formats fix
 * Tests both /api/info and /streaming/analyze endpoints
 */

const axios = require('axios');

// Configuration
const API_BASE = process.env.API_BASE || 'http://localhost:5000/api';
const TEST_YOUTUBE_URL = process.env.TEST_YOUTUBE_URL || 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

// Test credentials - you need to set these environment variables
const TEST_EMAIL = process.env.TEST_EMAIL;
const TEST_PASSWORD = process.env.TEST_PASSWORD;

let accessToken = null;

/**
 * Utility functions
 */
function log(level, message) {
  const timestamp = new Date().toISOString();
  const colors = {
    info: '\x1b[36m',
    success: '\x1b[32m',
    warning: '\x1b[33m',
    error: '\x1b[31m',
    reset: '\x1b[0m'
  };
  
  const color = colors[level] || colors.reset;
  console.log(`${color}[${timestamp}] ${level.toUpperCase()}: ${message}${colors.reset}`);
}

function logFormats(formats, title) {
  log('info', `\n${title}:`);
  if (!formats || formats.length === 0) {
    log('warning', '  ❌ No formats found!');
    return;
  }
  
  formats.forEach((format, index) => {
    const hasAudio = format.acodec && format.acodec !== 'none';
    const audioIndicator = hasAudio ? '🔊' : '🔇';
    const quality = format.quality_label || format.format_note || `${format.resolution} ${format.ext}`;
    log('info', `  ${index + 1}. ${quality} ${audioIndicator} (ID: ${format.format_id})`);
  });
}

/**
 * Authentication
 */
async function authenticate() {
  if (!TEST_EMAIL || !TEST_PASSWORD) {
    log('error', 'Please set TEST_EMAIL and TEST_PASSWORD environment variables');
    return false;
  }

  try {
    log('info', 'Authenticating...');
    const response = await axios.post(`${API_BASE}/auth/login`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });
    
    accessToken = response.data.accessToken;
    log('success', 'Authentication successful');
    return true;
  } catch (error) {
    log('error', `Authentication failed: ${error.response?.data?.error || error.message}`);
    return false;
  }
}

/**
 * Test /api/info endpoint
 */
async function testInfoEndpoint(url) {
  try {
    log('info', 'Testing /api/info endpoint...');
    
    const response = await axios.post(`${API_BASE}/info`, {
      url: url
    }, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
    
    const data = response.data;
    log('success', `/api/info endpoint successful`);
    log('info', `Title: ${data.title}`);
    log('info', `Platform: ${data.platform}`);
    log('info', `Total formats: ${data.total_formats}`);
    log('info', `Available formats: ${data.available_formats}`);
    
    logFormats(data.formats, 'Formats from /api/info');
    
    return {
      success: true,
      data: data,
      formatCount: data.formats?.length || 0
    };
  } catch (error) {
    log('error', `/api/info failed: ${error.response?.data?.error || error.message}`);
    return {
      success: false,
      error: error.response?.data?.error || error.message,
      formatCount: 0
    };
  }
}

/**
 * Test /streaming/analyze endpoint
 */
async function testStreamingAnalyze(url) {
  try {
    log('info', 'Testing /streaming/analyze endpoint...');
    
    // Start analysis
    const startResponse = await axios.post(`${API_BASE}/streaming/analyze`, {
      url: url
    }, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    const requestId = startResponse.data.requestId;
    log('info', `Analysis started with request ID: ${requestId}`);
    
    // Poll for results
    let attempts = 0;
    const maxAttempts = 30;
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
      
      try {
        const resultResponse = await axios.get(`${API_BASE}/streaming/analyze/${requestId}`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          },
          timeout: 10000
        });
        
        const result = resultResponse.data;
        log('info', `Analysis progress: ${result.progress}% (Status: ${result.status})`);
        
        if (result.status === 'completed') {
          log('success', 'Streaming analysis completed');
          const videoInfo = result.result.videoInfo;
          log('info', `Title: ${videoInfo.title}`);
          log('info', `Platform: ${result.result.platform || 'unknown'}`);
          log('info', `Total formats: ${result.result.total_formats || videoInfo.formats.length}`);
          log('info', `Available formats: ${result.result.available_formats || videoInfo.formats.length}`);
          
          logFormats(videoInfo.formats, 'Formats from /streaming/analyze');
          
          return {
            success: true,
            data: result.result,
            formatCount: videoInfo.formats?.length || 0
          };
        } else if (result.status === 'failed') {
          log('error', `Analysis failed: ${result.error}`);
          return {
            success: false,
            error: result.error,
            formatCount: 0
          };
        }
      } catch (pollError) {
        log('warning', `Polling attempt ${attempts + 1} failed: ${pollError.message}`);
      }
      
      attempts++;
    }
    
    log('error', 'Analysis timed out');
    return {
      success: false,
      error: 'Analysis timed out',
      formatCount: 0
    };
    
  } catch (error) {
    log('error', `/streaming/analyze failed: ${error.response?.data?.error || error.message}`);
    return {
      success: false,
      error: error.response?.data?.error || error.message,
      formatCount: 0
    };
  }
}

/**
 * Compare and analyze results
 */
function analyzeResults(infoResult, streamingResult) {
  log('info', '\n' + '='.repeat(80));
  log('info', '📊 ANALYSIS RESULTS');
  log('info', '='.repeat(80));
  
  // Basic success check
  log('info', `/api/info: ${infoResult.success ? '✅ SUCCESS' : '❌ FAILED'} (${infoResult.formatCount} formats)`);
  log('info', `/streaming/analyze: ${streamingResult.success ? '✅ SUCCESS' : '❌ FAILED'} (${streamingResult.formatCount} formats)`);
  
  // Detailed analysis
  if (!infoResult.success && !streamingResult.success) {
    log('error', '❌ CRITICAL: Both endpoints failed!');
    return { status: 'critical', success: false };
  }
  
  if (!streamingResult.success) {
    log('error', '❌ ISSUE: Streaming endpoint failed while info endpoint worked');
    log('error', `   Streaming error: ${streamingResult.error}`);
    return { status: 'streaming_failed', success: false };
  }
  
  if (!infoResult.success) {
    log('warning', '⚠️ INFO: Info endpoint failed but streaming worked');
    return { status: 'info_failed', success: true };
  }
  
  // Both succeeded - compare format counts
  if (streamingResult.formatCount === 0) {
    log('error', '❌ ISSUE: Streaming endpoint returned 0 formats (this was the original bug!)');
    return { status: 'no_streaming_formats', success: false };
  }
  
  if (infoResult.formatCount === 0) {
    log('warning', '⚠️ INFO: Info endpoint returned 0 formats');
    return { status: 'no_info_formats', success: true };
  }
  
  // Both have formats - success!
  log('success', '✅ SUCCESS: Both endpoints returned formats!');
  
  const formatDiff = Math.abs(infoResult.formatCount - streamingResult.formatCount);
  const formatDiffPercent = (formatDiff / Math.max(infoResult.formatCount, streamingResult.formatCount)) * 100;
  
  if (formatDiffPercent <= 20) {
    log('success', `✅ Format counts are similar (difference: ${formatDiff} formats, ${formatDiffPercent.toFixed(1)}%)`);
  } else {
    log('warning', `⚠️ Format counts differ significantly (difference: ${formatDiff} formats, ${formatDiffPercent.toFixed(1)}%)`);
  }
  
  return { 
    status: 'success', 
    success: true,
    infoFormats: infoResult.formatCount,
    streamingFormats: streamingResult.formatCount,
    formatDiff: formatDiff
  };
}

/**
 * Main test function
 */
async function runTest() {
  log('info', '🚀 Starting Comprehensive YouTube Formats Fix Test');
  log('info', `Testing URL: ${TEST_YOUTUBE_URL}`);
  log('info', `API Base: ${API_BASE}`);
  
  // Check if we have credentials
  if (!TEST_EMAIL || !TEST_PASSWORD) {
    log('error', 'Missing credentials. Please set environment variables:');
    log('error', 'export TEST_EMAIL="your-email@example.com"');
    log('error', 'export TEST_PASSWORD="your-password"');
    process.exit(1);
  }
  
  // Authenticate
  const authSuccess = await authenticate();
  if (!authSuccess) {
    log('error', 'Authentication failed - cannot proceed with tests');
    process.exit(1);
  }
  
  // Test both endpoints
  log('info', '\n' + '='.repeat(80));
  log('info', '🧪 RUNNING TESTS');
  log('info', '='.repeat(80));
  
  const infoResult = await testInfoEndpoint(TEST_YOUTUBE_URL);
  await new Promise(resolve => setTimeout(resolve, 2000)); // Wait between tests
  const streamingResult = await testStreamingAnalyze(TEST_YOUTUBE_URL);
  
  // Analyze results
  const analysis = analyzeResults(infoResult, streamingResult);
  
  // Final verdict
  log('info', '\n' + '='.repeat(80));
  log('info', '🏁 FINAL VERDICT');
  log('info', '='.repeat(80));
  
  if (analysis.success) {
    log('success', '🎉 TEST PASSED: YouTube formats fix is working!');
    if (analysis.status === 'success') {
      log('success', '✨ Both endpoints are working correctly with multiple formats');
    }
    process.exit(0);
  } else {
    log('error', '💥 TEST FAILED: YouTube formats fix needs more work');
    log('error', `Issue: ${analysis.status}`);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  runTest().catch(error => {
    log('error', `Test failed with error: ${error.message}`);
    console.error(error);
    process.exit(1);
  });
}

module.exports = {
  runTest,
  testInfoEndpoint,
  testStreamingAnalyze
};
