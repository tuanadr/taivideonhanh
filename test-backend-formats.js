#!/usr/bin/env node

/**
 * Test Backend Formats
 * Tests the actual backend API to verify YouTube formats are working
 */

const { spawn } = require('child_process');
const path = require('path');

class BackendTester {
  constructor() {
    this.backendProcess = null;
    this.apiUrl = 'http://localhost:5000';
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
   * Start backend server
   */
  async startBackend() {
    return new Promise((resolve, reject) => {
      this.log('info', 'Starting backend server...');
      
      const backendPath = path.join(__dirname, 'backend');
      
      // Check if we can start the backend
      this.backendProcess = spawn('npm', ['run', 'dev'], {
        cwd: backendPath,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          NODE_ENV: 'development',
          PORT: '5000'
        }
      });

      let output = '';
      let started = false;

      this.backendProcess.stdout.on('data', (data) => {
        output += data.toString();
        console.log(data.toString());
        
        // Check if server started
        if (output.includes('Server running on') || output.includes('listening on')) {
          if (!started) {
            started = true;
            this.log('success', 'Backend server started');
            resolve();
          }
        }
      });

      this.backendProcess.stderr.on('data', (data) => {
        console.error(data.toString());
      });

      this.backendProcess.on('close', (code) => {
        if (!started) {
          reject(new Error(`Backend failed to start with code ${code}`));
        }
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        if (!started) {
          reject(new Error('Backend startup timeout'));
        }
      }, 30000);
    });
  }

  /**
   * Stop backend server
   */
  stopBackend() {
    if (this.backendProcess) {
      this.log('info', 'Stopping backend server...');
      this.backendProcess.kill('SIGTERM');
      this.backendProcess = null;
    }
  }

  /**
   * Test API endpoint
   */
  async testAPI(url) {
    const fetch = require('node-fetch');
    
    try {
      this.log('info', `Testing video: ${url}`);
      
      const response = await fetch(`${this.apiUrl}/api/info`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url }),
        timeout: 30000
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      
      this.log('success', `✅ Video info retrieved: ${data.title}`);
      this.log('info', `Platform: ${data.platform || 'unknown'}`);
      this.log('info', `Total formats: ${data.total_formats || 0}`);
      this.log('info', `Available formats: ${data.available_formats || 0}`);
      
      if (data.formats && data.formats.length > 0) {
        console.log('\nAvailable quality options:');
        data.formats.forEach((format, index) => {
          console.log(`  ${index + 1}. ${format.quality_label || format.format_note} (${format.ext})`);
        });
      } else {
        this.log('warning', 'No formats available!');
      }

      return {
        success: true,
        data,
        formatCount: data.formats ? data.formats.length : 0
      };

    } catch (error) {
      this.log('error', `❌ API test failed: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Run comprehensive tests
   */
  async runTests() {
    const testUrls = [
      'https://www.youtube.com/watch?v=jNQXAC9IVRw', // Test video
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ', // Popular video
      'https://youtu.be/kJQP7kiw5Fk' // Short URL
    ];

    const results = [];

    for (const url of testUrls) {
      const result = await this.testAPI(url);
      results.push({ url, ...result });
      
      // Wait between tests
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    return results;
  }

  /**
   * Generate report
   */
  generateReport(results) {
    console.log('\n' + '='.repeat(80));
    this.log('info', 'TEST RESULTS SUMMARY');
    console.log('='.repeat(80));

    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    console.log(`\n📊 Results: ${successful.length}/${results.length} successful`);

    if (successful.length > 0) {
      const avgFormats = successful.reduce((sum, r) => sum + r.formatCount, 0) / successful.length;
      console.log(`📺 Average formats per video: ${avgFormats.toFixed(1)}`);
      
      console.log('\n✅ Successful tests:');
      successful.forEach(result => {
        console.log(`  - ${result.url}: ${result.formatCount} formats`);
      });
    }

    if (failed.length > 0) {
      console.log('\n❌ Failed tests:');
      failed.forEach(result => {
        console.log(`  - ${result.url}: ${result.error}`);
      });
    }

    console.log('\n💡 Analysis:');
    if (successful.length === results.length) {
      console.log('✅ All tests passed! YouTube format extraction is working correctly.');
    } else if (successful.length > 0) {
      console.log('⚠️ Some tests passed, but there are issues to investigate.');
    } else {
      console.log('❌ All tests failed. Check backend configuration and yt-dlp installation.');
    }

    const avgFormats = successful.length > 0 
      ? successful.reduce((sum, r) => sum + r.formatCount, 0) / successful.length 
      : 0;

    if (avgFormats >= 3) {
      console.log('✅ Good format variety - users should see multiple quality options.');
    } else if (avgFormats >= 1) {
      console.log('⚠️ Limited format options - consider adjusting extraction parameters.');
    } else {
      console.log('❌ No formats available - check format filtering logic.');
    }
  }
}

// Main execution
async function main() {
  const tester = new BackendTester();
  
  try {
    // Check if we should try to start backend
    const skipBackendStart = process.argv.includes('--skip-backend');
    
    if (!skipBackendStart) {
      try {
        await tester.startBackend();
        // Wait a bit for server to fully initialize
        await new Promise(resolve => setTimeout(resolve, 5000));
      } catch (error) {
        console.log('⚠️ Could not start backend automatically:', error.message);
        console.log('💡 Make sure backend is running manually on port 5000');
        console.log('   Or use --skip-backend flag to test against running backend');
        process.exit(1);
      }
    }

    // Run tests
    console.log('\n🧪 Starting backend API tests...');
    const results = await tester.runTests();
    
    // Generate report
    tester.generateReport(results);
    
    // Cleanup
    tester.stopBackend();
    
    const allPassed = results.every(r => r.success);
    process.exit(allPassed ? 0 : 1);
    
  } catch (error) {
    console.error('❌ Test execution failed:', error);
    tester.stopBackend();
    process.exit(1);
  }
}

// Handle cleanup on exit
process.on('SIGINT', () => {
  console.log('\n🛑 Test interrupted');
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Test terminated');
  process.exit(1);
});

if (require.main === module) {
  main();
}
