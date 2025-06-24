#!/usr/bin/env node

/**
 * Debug YouTube Formats Issue
 * Compares YouTube vs TikTok format extraction to identify the problem
 */

const { spawn } = require('child_process');
const fs = require('fs');

// Test URLs
const TEST_URLS = {
  youtube: [
    'https://www.youtube.com/watch?v=jNQXAC9IVRw', // Test video
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ', // Popular video
    'https://youtu.be/kJQP7kiw5Fk', // Short URL format
  ],
  tiktok: [
    'https://www.tiktok.com/@username/video/1234567890123456789', // Example TikTok URL
  ]
};

class FormatDebugger {
  constructor() {
    this.results = {};
  }

  /**
   * Log with colors and timestamps
   */
  log(level, message, data = null) {
    const colors = {
      info: '\x1b[36m',    // Cyan
      success: '\x1b[32m', // Green
      warning: '\x1b[33m', // Yellow
      error: '\x1b[31m',   // Red
      debug: '\x1b[35m',   // Magenta
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
   * Extract video info using yt-dlp with different configurations
   */
  async extractVideoInfo(url, config = {}) {
    return new Promise((resolve) => {
      const {
        skipDash = false,
        skipHls = false,
        userAgent = null,
        cookies = false,
        verbose = false
      } = config;

      const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');
      const isTikTok = url.includes('tiktok.com');

      let ytdlpArgs = [
        '--dump-json',
        '--no-warnings',
        '--no-check-certificates',
        '--ignore-errors',
      ];

      if (verbose) {
        ytdlpArgs.push('--verbose');
      }

      // Platform-specific configurations
      if (isYouTube) {
        if (skipDash && skipHls) {
          ytdlpArgs.push('--extractor-args', 'youtube:skip=dash,hls');
        } else if (skipDash) {
          ytdlpArgs.push('--extractor-args', 'youtube:skip=dash');
        } else if (skipHls) {
          ytdlpArgs.push('--extractor-args', 'youtube:skip=hls');
        }

        if (userAgent) {
          ytdlpArgs.push('--user-agent', userAgent);
        }

        if (cookies) {
          const cookiesPath = process.env.YOUTUBE_COOKIES_PATH || '/tmp/cookies/youtube-cookies.txt';
          if (fs.existsSync(cookiesPath)) {
            ytdlpArgs.push('--cookies', cookiesPath);
          }
        }
      } else if (isTikTok) {
        ytdlpArgs.push('--user-agent', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1');
      }

      ytdlpArgs.push(url);

      this.log('debug', `Testing ${isYouTube ? 'YouTube' : isTikTok ? 'TikTok' : 'Unknown'} with config:`, {
        url: url.substring(0, 50) + '...',
        skipDash,
        skipHls,
        userAgent: userAgent ? userAgent.substring(0, 50) + '...' : null,
        cookies,
        command: `yt-dlp ${ytdlpArgs.join(' ')}`
      });

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
            
            // Analyze formats
            const formatAnalysis = this.analyzeFormats(info.formats || []);
            
            resolve({
              success: true,
              title: info.title,
              duration: info.duration,
              totalFormats: info.formats ? info.formats.length : 0,
              formatAnalysis,
              rawFormats: info.formats || [],
              responseTime: duration,
              config
            });
          } catch (parseError) {
            resolve({
              success: false,
              error: 'JSON_PARSE_ERROR',
              errorMessage: parseError.message,
              responseTime: duration,
              config
            });
          }
        } else {
          resolve({
            success: false,
            error: 'EXTRACTION_FAILED',
            errorMessage: errorData.substring(0, 500),
            responseTime: duration,
            config
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
          config
        });
      }, 30000);
    });
  }

  /**
   * Analyze format distribution
   */
  analyzeFormats(formats) {
    const analysis = {
      total: formats.length,
      byExtension: {},
      byResolution: {},
      videoOnly: 0,
      audioOnly: 0,
      combined: 0,
      mp4Formats: 0,
      webmFormats: 0,
      resolutions: new Set(),
      hasAudio: 0,
      hasVideo: 0
    };

    formats.forEach(format => {
      // By extension
      const ext = format.ext || 'unknown';
      analysis.byExtension[ext] = (analysis.byExtension[ext] || 0) + 1;

      // By resolution
      if (format.resolution) {
        analysis.byResolution[format.resolution] = (analysis.byResolution[format.resolution] || 0) + 1;
        analysis.resolutions.add(format.resolution);
      }

      // Audio/Video classification
      const hasVideo = format.vcodec && format.vcodec !== 'none';
      const hasAudio = format.acodec && format.acodec !== 'none';

      if (hasVideo && hasAudio) {
        analysis.combined++;
      } else if (hasVideo) {
        analysis.videoOnly++;
      } else if (hasAudio) {
        analysis.audioOnly++;
      }

      if (hasVideo) analysis.hasVideo++;
      if (hasAudio) analysis.hasAudio++;

      // Specific formats
      if (ext === 'mp4') analysis.mp4Formats++;
      if (ext === 'webm') analysis.webmFormats++;
    });

    analysis.resolutions = Array.from(analysis.resolutions).sort();

    return analysis;
  }

  /**
   * Test current API filter logic
   */
  testApiFilter(formats) {
    const filtered = formats.filter(format => {
      // Current API filter logic
      if (format.vcodec === 'none' || format.ext !== 'mp4') return false;
      if (!format.resolution) return false;

      const height = parseInt(format.resolution.split('x')[1]);
      return height >= 360; // Minimum 360p
    });

    return {
      original: formats.length,
      filtered: filtered.length,
      filteredFormats: filtered.map(f => ({
        format_id: f.format_id,
        resolution: f.resolution,
        ext: f.ext,
        vcodec: f.vcodec,
        acodec: f.acodec,
        format_note: f.format_note
      }))
    };
  }

  /**
   * Test improved filter logic
   */
  testImprovedFilter(formats) {
    const filtered = formats.filter(format => {
      // Improved filter logic
      const hasVideo = format.vcodec && format.vcodec !== 'none';
      const hasAudio = format.acodec && format.acodec !== 'none';
      
      // Accept mp4, webm, and mkv
      const supportedExts = ['mp4', 'webm', 'mkv'];
      if (!supportedExts.includes(format.ext)) return false;
      
      // Must have video
      if (!hasVideo) return false;
      
      // Must have resolution
      if (!format.resolution) return false;

      const height = parseInt(format.resolution.split('x')[1]);
      return height >= 240; // Lower minimum for more options
    });

    return {
      original: formats.length,
      filtered: filtered.length,
      filteredFormats: filtered.map(f => ({
        format_id: f.format_id,
        resolution: f.resolution,
        ext: f.ext,
        vcodec: f.vcodec,
        acodec: f.acodec,
        format_note: f.format_note,
        hasAudio: f.acodec && f.acodec !== 'none'
      }))
    };
  }

  /**
   * Run comprehensive tests
   */
  async runTests() {
    this.log('info', 'Starting YouTube formats debugging...');
    console.log('='.repeat(80));

    // Test configurations
    const configs = [
      { name: 'Current (skip dash,hls)', skipDash: true, skipHls: true },
      { name: 'Skip DASH only', skipDash: true, skipHls: false },
      { name: 'Skip HLS only', skipDash: false, skipHls: true },
      { name: 'No skipping', skipDash: false, skipHls: false },
      { name: 'With cookies', skipDash: true, skipHls: true, cookies: true }
    ];

    // Test YouTube URLs
    for (const url of TEST_URLS.youtube) {
      this.log('info', `\nTesting YouTube URL: ${url}`);
      console.log('-'.repeat(60));

      for (const config of configs) {
        this.log('debug', `Configuration: ${config.name}`);
        
        const result = await this.extractVideoInfo(url, config);
        
        if (result.success) {
          this.log('success', `✅ ${config.name}: ${result.totalFormats} formats found`);
          
          // Test current API filter
          const currentFilter = this.testApiFilter(result.rawFormats);
          this.log('info', `Current API filter: ${currentFilter.filtered}/${currentFilter.original} formats`);
          
          // Test improved filter
          const improvedFilter = this.testImprovedFilter(result.rawFormats);
          this.log('info', `Improved filter: ${improvedFilter.filtered}/${improvedFilter.original} formats`);
          
          // Show format analysis
          console.log('Format Analysis:', result.formatAnalysis);
          
          // Show sample formats that pass improved filter
          if (improvedFilter.filteredFormats.length > 0) {
            console.log('\nSample formats (improved filter):');
            improvedFilter.filteredFormats.slice(0, 5).forEach(f => {
              console.log(`  ${f.format_id}: ${f.resolution} ${f.ext} (${f.hasAudio ? 'with audio' : 'video only'})`);
            });
          }
          
        } else {
          this.log('error', `❌ ${config.name}: ${result.error}`);
          if (result.errorMessage) {
            console.log(`Error: ${result.errorMessage.substring(0, 200)}...`);
          }
        }
        
        // Wait between tests
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // Generate recommendations
    this.generateRecommendations();
  }

  /**
   * Generate recommendations based on test results
   */
  generateRecommendations() {
    console.log('\n' + '='.repeat(80));
    this.log('info', 'RECOMMENDATIONS');
    console.log('='.repeat(80));

    console.log(`
🔍 ANALYSIS RESULTS:

1. **Current Filter Issue**: The API filter is too restrictive
   - Only accepts mp4 formats
   - Requires both video and audio in same format
   - YouTube often separates video and audio streams

2. **Recommended Fixes**:
   - Accept multiple extensions: mp4, webm, mkv
   - Allow video-only formats (audio can be merged later)
   - Lower minimum resolution to 240p for more options
   - Implement format merging logic

3. **YouTube vs TikTok Difference**:
   - TikTok: Usually provides combined video+audio formats
   - YouTube: Often separates video and audio streams (DASH)
   - Current filter works for TikTok but fails for YouTube

4. **Immediate Actions**:
   - Update format filter in routes/info.ts
   - Implement format merging in streamingService.ts
   - Add fallback for video-only formats
   - Test with various YouTube video types

📋 NEXT STEPS:
1. Fix the format filter logic
2. Test with the improved filter
3. Implement format merging for video-only streams
4. Update frontend to handle different format types
`);
  }
}

// Main execution
async function main() {
  const formatDebugger = new FormatDebugger();

  try {
    await formatDebugger.runTests();
  } catch (error) {
    console.error('❌ Debug failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = FormatDebugger;
