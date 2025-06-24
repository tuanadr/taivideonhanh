#!/usr/bin/env node

/**
 * YouTube Debug Monitor
 * Monitors YouTube download issues and provides debugging information
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const MONITOR_CONFIG = {
  checkInterval: 5 * 60 * 1000, // 5 minutes
  testVideos: [
    'https://www.youtube.com/watch?v=jNQXAC9IVRw', // Test video
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ', // Popular video
  ],
  logFile: '/tmp/youtube-monitor.log',
  alertThreshold: 3, // Alert after 3 consecutive failures
  maxLogSize: 10 * 1024 * 1024, // 10MB
};

class YouTubeMonitor {
  constructor() {
    this.consecutiveFailures = 0;
    this.lastSuccessTime = Date.now();
    this.stats = {
      totalTests: 0,
      successCount: 0,
      failureCount: 0,
      errorTypes: {},
      avgResponseTime: 0,
    };
  }

  /**
   * Log message with timestamp
   */
  log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      data
    };

    const logLine = `[${timestamp}] ${level.toUpperCase()}: ${message}${data ? ' ' + JSON.stringify(data) : ''}\n`;
    
    // Console output
    console.log(logLine.trim());
    
    // File output
    try {
      // Rotate log if too large
      if (fs.existsSync(MONITOR_CONFIG.logFile)) {
        const stats = fs.statSync(MONITOR_CONFIG.logFile);
        if (stats.size > MONITOR_CONFIG.maxLogSize) {
          fs.renameSync(MONITOR_CONFIG.logFile, MONITOR_CONFIG.logFile + '.old');
        }
      }
      
      fs.appendFileSync(MONITOR_CONFIG.logFile, logLine);
    } catch (error) {
      console.error('Failed to write to log file:', error.message);
    }
  }

  /**
   * Test YouTube video extraction
   */
  async testVideoExtraction(url) {
    return new Promise((resolve) => {
      const startTime = Date.now();
      
      const ytdlpArgs = [
        '--dump-json',
        '--no-warnings',
        '--no-check-certificates',
        '--ignore-errors',
        '--extractor-args', 'youtube:skip=dash,hls',
        '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        url
      ];

      // Add cookie authentication if available
      const cookiesPath = process.env.YOUTUBE_COOKIES_PATH || '/tmp/cookies/youtube-cookies.txt';
      if (fs.existsSync(cookiesPath)) {
        ytdlpArgs.splice(-1, 0, '--cookies', cookiesPath);
      }

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
        const responseTime = Date.now() - startTime;
        
        if (code === 0 && jsonData) {
          try {
            const info = JSON.parse(jsonData);
            resolve({
              success: true,
              title: info.title,
              duration: info.duration,
              formats: info.formats ? info.formats.length : 0,
              responseTime,
              url
            });
          } catch (parseError) {
            resolve({
              success: false,
              error: 'JSON_PARSE_ERROR',
              errorMessage: parseError.message,
              responseTime,
              url
            });
          }
        } else {
          // Analyze error type
          let errorType = 'UNKNOWN_ERROR';
          if (errorData.includes('Sign in to confirm')) {
            errorType = 'AUTHENTICATION_REQUIRED';
          } else if (errorData.includes('Video unavailable')) {
            errorType = 'VIDEO_UNAVAILABLE';
          } else if (errorData.includes('HTTP Error 403')) {
            errorType = 'ACCESS_FORBIDDEN';
          } else if (errorData.includes('HTTP Error 429')) {
            errorType = 'RATE_LIMITED';
          } else if (errorData.includes('network') || errorData.includes('timeout')) {
            errorType = 'NETWORK_ERROR';
          }

          resolve({
            success: false,
            error: errorType,
            errorMessage: errorData.substring(0, 500),
            responseTime,
            url
          });
        }
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        ytdlp.kill('SIGTERM');
        resolve({
          success: false,
          error: 'TIMEOUT',
          errorMessage: 'Request timed out after 30 seconds',
          responseTime: 30000,
          url
        });
      }, 30000);
    });
  }

  /**
   * Run health check
   */
  async runHealthCheck() {
    this.log('info', 'Starting health check');
    
    const results = [];
    
    for (const url of MONITOR_CONFIG.testVideos) {
      const result = await this.testVideoExtraction(url);
      results.push(result);
      
      // Wait between tests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Update statistics
    this.stats.totalTests += results.length;
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;
    
    this.stats.successCount += successCount;
    this.stats.failureCount += failureCount;
    
    // Update average response time
    const totalResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0);
    const avgResponseTime = totalResponseTime / results.length;
    this.stats.avgResponseTime = (this.stats.avgResponseTime + avgResponseTime) / 2;

    // Track error types
    results.filter(r => !r.success).forEach(result => {
      const errorType = result.error || 'UNKNOWN';
      this.stats.errorTypes[errorType] = (this.stats.errorTypes[errorType] || 0) + 1;
    });

    // Check if all tests failed
    if (failureCount === results.length) {
      this.consecutiveFailures++;
      this.log('error', `All tests failed (${this.consecutiveFailures} consecutive failures)`, {
        results: results.map(r => ({ url: r.url, error: r.error, message: r.errorMessage?.substring(0, 100) }))
      });
      
      if (this.consecutiveFailures >= MONITOR_CONFIG.alertThreshold) {
        this.sendAlert('CRITICAL: YouTube extraction completely failing');
      }
    } else {
      if (this.consecutiveFailures > 0) {
        this.log('info', `Recovery detected after ${this.consecutiveFailures} failures`);
      }
      this.consecutiveFailures = 0;
      this.lastSuccessTime = Date.now();
    }

    // Log summary
    const successRate = ((successCount / results.length) * 100).toFixed(1);
    this.log('info', `Health check completed: ${successCount}/${results.length} successful (${successRate}%)`, {
      avgResponseTime: Math.round(avgResponseTime),
      errors: results.filter(r => !r.success).map(r => r.error)
    });

    return {
      success: successCount > 0,
      successRate: parseFloat(successRate),
      results,
      stats: this.stats
    };
  }

  /**
   * Send alert (placeholder - implement with your alerting system)
   */
  sendAlert(message) {
    this.log('alert', message);
    
    // TODO: Implement actual alerting (email, Slack, etc.)
    console.error(`🚨 ALERT: ${message}`);
    
    // You could integrate with services like:
    // - Email notifications
    // - Slack webhooks
    // - Discord webhooks
    // - PagerDuty
    // - etc.
  }

  /**
   * Generate status report
   */
  generateStatusReport() {
    const uptime = Date.now() - this.lastSuccessTime;
    const uptimeHours = (uptime / (1000 * 60 * 60)).toFixed(1);
    
    const report = {
      timestamp: new Date().toISOString(),
      status: this.consecutiveFailures === 0 ? 'HEALTHY' : 'DEGRADED',
      consecutiveFailures: this.consecutiveFailures,
      lastSuccessTime: new Date(this.lastSuccessTime).toISOString(),
      uptimeHours: parseFloat(uptimeHours),
      statistics: {
        ...this.stats,
        successRate: this.stats.totalTests > 0 ? 
          ((this.stats.successCount / this.stats.totalTests) * 100).toFixed(1) : 0
      }
    };

    return report;
  }

  /**
   * Start monitoring
   */
  start() {
    this.log('info', 'YouTube Monitor started', {
      checkInterval: MONITOR_CONFIG.checkInterval,
      testVideos: MONITOR_CONFIG.testVideos.length,
      alertThreshold: MONITOR_CONFIG.alertThreshold
    });

    // Run initial check
    this.runHealthCheck();

    // Schedule periodic checks
    setInterval(() => {
      this.runHealthCheck();
    }, MONITOR_CONFIG.checkInterval);

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      this.log('info', 'Monitor shutting down');
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      this.log('info', 'Monitor shutting down');
      process.exit(0);
    });
  }

  /**
   * Run single check and exit
   */
  async runOnce() {
    const result = await this.runHealthCheck();
    const report = this.generateStatusReport();
    
    console.log('\n📊 STATUS REPORT:');
    console.log(JSON.stringify(report, null, 2));
    
    process.exit(result.success ? 0 : 1);
  }
}

// CLI interface
async function main() {
  const command = process.argv[2];
  const monitor = new YouTubeMonitor();

  switch (command) {
    case 'start':
    case 'monitor':
      monitor.start();
      break;
      
    case 'check':
    case 'test':
      await monitor.runOnce();
      break;
      
    case 'status':
      const report = monitor.generateStatusReport();
      console.log(JSON.stringify(report, null, 2));
      break;
      
    case 'help':
    case '--help':
    case '-h':
      console.log(`
YouTube Debug Monitor

Usage: node youtube-debug-monitor.js <command>

Commands:
  start, monitor    Start continuous monitoring
  check, test       Run single health check
  status           Show current status
  help             Show this help

Environment Variables:
  YOUTUBE_COOKIES_PATH    Path to YouTube cookies file
  
Examples:
  node youtube-debug-monitor.js start     # Start monitoring
  node youtube-debug-monitor.js check     # Run single check
  node youtube-debug-monitor.js status    # Show status
`);
      break;
      
    default:
      console.error('Unknown command. Use "help" for usage information.');
      process.exit(1);
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('Monitor failed:', error);
    process.exit(1);
  });
}

module.exports = YouTubeMonitor;
