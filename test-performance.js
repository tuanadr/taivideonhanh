#!/usr/bin/env node

/**
 * Performance and load testing for video download improvements
 */

const { spawn } = require('child_process');

// Performance test configuration
const PERF_CONFIG = {
  concurrentRequests: 3,
  testDuration: 30000, // 30 seconds
  requestTimeout: 45000,
  testUrls: [
    'https://www.youtube.com/watch?v=jNQXAC9IVRw',
    'https://youtu.be/jNQXAC9IVRw',
    'https://www.youtube.com/watch?v=9bZkp7q19f0'
  ]
};

/**
 * Single performance test
 */
async function performanceTest(url, testId) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    console.log(`🏃 Test ${testId}: Starting performance test for ${url}`);
    
    const ytdlpArgs = [
      '--dump-json',
      '--no-warnings',
      '--no-check-certificates',
      '--ignore-errors',
      '--extractor-args', 'youtube:skip=dash,hls',
      '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      url
    ];

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
          console.log(`✅ Test ${testId}: SUCCESS (${duration}ms) - ${info.title}`);
          resolve({
            testId,
            success: true,
            duration,
            url,
            title: info.title,
            formatsCount: info.formats?.length || 0
          });
        } catch (parseError) {
          console.log(`❌ Test ${testId}: JSON Parse Error (${duration}ms)`);
          resolve({
            testId,
            success: false,
            duration,
            url,
            error: 'JSON parse failed'
          });
        }
      } else {
        console.log(`❌ Test ${testId}: FAILED (${duration}ms) - ${errorData.substring(0, 100)}...`);
        resolve({
          testId,
          success: false,
          duration,
          url,
          error: errorData
        });
      }
    });

    // Timeout
    setTimeout(() => {
      ytdlp.kill('SIGTERM');
      const duration = Date.now() - startTime;
      console.log(`⏰ Test ${testId}: TIMEOUT (${duration}ms)`);
      resolve({
        testId,
        success: false,
        duration,
        url,
        error: 'timeout'
      });
    }, PERF_CONFIG.requestTimeout);
  });
}

/**
 * Run concurrent performance tests
 */
async function runConcurrentTests() {
  console.log('🚀 Starting Concurrent Performance Tests...\n');
  console.log(`📊 Configuration:`);
  console.log(`   Concurrent Requests: ${PERF_CONFIG.concurrentRequests}`);
  console.log(`   Test Duration: ${PERF_CONFIG.testDuration / 1000}s`);
  console.log(`   Request Timeout: ${PERF_CONFIG.requestTimeout / 1000}s`);
  console.log('=' .repeat(60));

  const results = [];
  const startTime = Date.now();
  let testCounter = 0;

  // Function to run a batch of concurrent tests
  const runTestBatch = async () => {
    const promises = [];
    
    for (let i = 0; i < PERF_CONFIG.concurrentRequests; i++) {
      const url = PERF_CONFIG.testUrls[testCounter % PERF_CONFIG.testUrls.length];
      const testId = ++testCounter;
      promises.push(performanceTest(url, testId));
    }
    
    const batchResults = await Promise.all(promises);
    results.push(...batchResults);
    
    return batchResults;
  };

  // Run tests for the specified duration
  while (Date.now() - startTime < PERF_CONFIG.testDuration) {
    await runTestBatch();
    
    // Small delay between batches
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Generate performance report
  generatePerformanceReport(results, Date.now() - startTime);
}

/**
 * Memory usage test
 */
async function testMemoryUsage() {
  console.log('\n🧠 Testing Memory Usage...\n');
  
  const initialMemory = process.memoryUsage();
  console.log('📊 Initial Memory Usage:');
  console.log(`   RSS: ${Math.round(initialMemory.rss / 1024 / 1024)}MB`);
  console.log(`   Heap Used: ${Math.round(initialMemory.heapUsed / 1024 / 1024)}MB`);
  console.log(`   Heap Total: ${Math.round(initialMemory.heapTotal / 1024 / 1024)}MB`);

  const results = [];
  
  // Run multiple tests and monitor memory
  for (let i = 0; i < 10; i++) {
    const url = PERF_CONFIG.testUrls[i % PERF_CONFIG.testUrls.length];
    console.log(`\n🧪 Memory Test ${i + 1}/10: ${url}`);
    
    const result = await performanceTest(url, `MEM-${i + 1}`);
    results.push(result);
    
    const currentMemory = process.memoryUsage();
    console.log(`   Memory after test: RSS ${Math.round(currentMemory.rss / 1024 / 1024)}MB, Heap ${Math.round(currentMemory.heapUsed / 1024 / 1024)}MB`);
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
      const afterGC = process.memoryUsage();
      console.log(`   Memory after GC: RSS ${Math.round(afterGC.rss / 1024 / 1024)}MB, Heap ${Math.round(afterGC.heapUsed / 1024 / 1024)}MB`);
    }
  }

  const finalMemory = process.memoryUsage();
  console.log('\n📊 Final Memory Usage:');
  console.log(`   RSS: ${Math.round(finalMemory.rss / 1024 / 1024)}MB (${finalMemory.rss > initialMemory.rss ? '+' : ''}${Math.round((finalMemory.rss - initialMemory.rss) / 1024 / 1024)}MB)`);
  console.log(`   Heap Used: ${Math.round(finalMemory.heapUsed / 1024 / 1024)}MB (${finalMemory.heapUsed > initialMemory.heapUsed ? '+' : ''}${Math.round((finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024)}MB)`);

  return {
    initialMemory,
    finalMemory,
    testResults: results
  };
}

/**
 * Error rate test
 */
async function testErrorRates() {
  console.log('\n🎯 Testing Error Rates...\n');
  
  const testUrls = [
    ...PERF_CONFIG.testUrls, // Valid URLs
    'https://www.youtube.com/watch?v=invalid_video_1',
    'https://www.youtube.com/watch?v=invalid_video_2',
    'https://invalid-domain.com/video'
  ];

  const results = [];
  
  for (let i = 0; i < testUrls.length; i++) {
    const url = testUrls[i];
    console.log(`🧪 Error Rate Test ${i + 1}/${testUrls.length}: ${url}`);
    
    const result = await performanceTest(url, `ERR-${i + 1}`);
    results.push(result);
  }

  const successCount = results.filter(r => r.success).length;
  const errorCount = results.filter(r => !r.success).length;
  const errorRate = (errorCount / results.length) * 100;

  console.log('\n📊 Error Rate Analysis:');
  console.log(`   Total Tests: ${results.length}`);
  console.log(`   Successful: ${successCount}`);
  console.log(`   Failed: ${errorCount}`);
  console.log(`   Error Rate: ${errorRate.toFixed(1)}%`);

  // Analyze error types
  const errorTypes = {};
  results.filter(r => !r.success).forEach(r => {
    const errorType = r.error.includes('timeout') ? 'timeout' :
                     r.error.includes('Video unavailable') ? 'video_unavailable' :
                     r.error.includes('Unable to download') ? 'network_error' :
                     'other';
    errorTypes[errorType] = (errorTypes[errorType] || 0) + 1;
  });

  console.log('\n🔍 Error Type Breakdown:');
  Object.entries(errorTypes).forEach(([type, count]) => {
    console.log(`   ${type}: ${count} (${((count / errorCount) * 100).toFixed(1)}%)`);
  });

  return {
    totalTests: results.length,
    successCount,
    errorCount,
    errorRate,
    errorTypes,
    results
  };
}

/**
 * Generate comprehensive performance report
 */
function generatePerformanceReport(results, totalDuration) {
  console.log('\n📊 PERFORMANCE TEST REPORT');
  console.log('=' .repeat(50));
  
  const successfulTests = results.filter(r => r.success);
  const failedTests = results.filter(r => !r.success);
  
  console.log(`\n📈 OVERALL STATISTICS:`);
  console.log(`   Total Tests: ${results.length}`);
  console.log(`   Successful: ${successfulTests.length} (${Math.round(successfulTests.length / results.length * 100)}%)`);
  console.log(`   Failed: ${failedTests.length} (${Math.round(failedTests.length / results.length * 100)}%)`);
  console.log(`   Total Duration: ${Math.round(totalDuration / 1000)}s`);
  console.log(`   Tests per Second: ${(results.length / (totalDuration / 1000)).toFixed(2)}`);

  if (successfulTests.length > 0) {
    const durations = successfulTests.map(r => r.duration);
    const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    const minDuration = Math.min(...durations);
    const maxDuration = Math.max(...durations);
    const medianDuration = durations.sort((a, b) => a - b)[Math.floor(durations.length / 2)];
    
    console.log(`\n⏱️ RESPONSE TIME STATISTICS:`);
    console.log(`   Average: ${Math.round(avgDuration)}ms`);
    console.log(`   Median: ${Math.round(medianDuration)}ms`);
    console.log(`   Min: ${minDuration}ms`);
    console.log(`   Max: ${maxDuration}ms`);
    
    // Percentiles
    const p95 = durations[Math.floor(durations.length * 0.95)];
    const p99 = durations[Math.floor(durations.length * 0.99)];
    console.log(`   95th Percentile: ${p95}ms`);
    console.log(`   99th Percentile: ${p99}ms`);
  }

  console.log(`\n🎯 PERFORMANCE ASSESSMENT:`);
  if (successfulTests.length / results.length >= 0.95) {
    console.log('   ✅ Excellent reliability (≥95% success rate)');
  } else if (successfulTests.length / results.length >= 0.90) {
    console.log('   ✅ Good reliability (≥90% success rate)');
  } else {
    console.log('   ⚠️ Reliability needs improvement (<90% success rate)');
  }

  if (successfulTests.length > 0) {
    const avgDuration = successfulTests.reduce((sum, r) => sum + r.duration, 0) / successfulTests.length;
    if (avgDuration < 3000) {
      console.log('   ✅ Excellent response time (<3s average)');
    } else if (avgDuration < 5000) {
      console.log('   ✅ Good response time (<5s average)');
    } else {
      console.log('   ⚠️ Response time needs improvement (≥5s average)');
    }
  }

  console.log('\n✨ Performance Test Complete!');
}

/**
 * Run all performance tests
 */
async function runAllPerformanceTests() {
  console.log('🚀 Starting Comprehensive Performance Testing...\n');
  console.log('=' .repeat(60));

  try {
    // 1. Concurrent performance tests
    await runConcurrentTests();
    
    // 2. Memory usage tests
    await testMemoryUsage();
    
    // 3. Error rate tests
    await testErrorRates();
    
    console.log('\n🎉 All Performance Tests Completed Successfully!');
    
  } catch (error) {
    console.error('❌ Performance testing failed:', error.message);
  }
}

// Run tests if called directly
if (require.main === module) {
  runAllPerformanceTests().catch(console.error);
}

module.exports = { 
  runAllPerformanceTests, 
  runConcurrentTests, 
  testMemoryUsage, 
  testErrorRates 
};
