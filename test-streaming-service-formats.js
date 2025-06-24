#!/usr/bin/env node

/**
 * Test StreamingService Formats Directly
 * Tests the StreamingService.getVideoInfo method directly to debug format issues
 */

// Mock the StreamingService for testing
const { spawn } = require('child_process');

// Simulate the enhanced StreamingService logic
class MockStreamingService {
  static get USER_AGENTS() {
    return [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    ];
  }

  static getRandomUserAgent() {
    const randomIndex = Math.floor(Math.random() * this.USER_AGENTS.length);
    return this.USER_AGENTS[randomIndex];
  }

  static async getVideoInfo(url, useCookieAuth = true) {
    return new Promise((resolve, reject) => {
      const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');
      const isTikTok = url.includes('tiktok.com');

      const ytdlpArgs = [
        '--dump-json',
        '--no-warnings',
        '--no-check-certificates',
        '--ignore-errors',
      ];

      // Platform-specific optimizations
      if (isYouTube) {
        ytdlpArgs.push(
          '--extractor-args', 'youtube:skip=hls', // Only skip HLS, keep DASH
          '--user-agent', this.getRandomUserAgent()
        );
      } else if (isTikTok) {
        ytdlpArgs.push(
          '--user-agent', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
        );
      }

      ytdlpArgs.push(url);

      console.log('yt-dlp args:', ytdlpArgs.join(' '));
      
      // For testing without yt-dlp, return mock data
      if (process.env.MOCK_MODE === 'true') {
        setTimeout(() => {
          resolve(this.getMockVideoInfo(isYouTube, isTikTok));
        }, 1000);
        return;
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
        if (code !== 0) {
          reject(new Error(`yt-dlp failed: ${errorData}`));
          return;
        }

        try {
          const info = JSON.parse(jsonData);
          resolve({
            title: info.title || 'Unknown Title',
            thumbnail: info.thumbnail || '',
            duration: info.duration,
            description: info.description,
            uploader: info.uploader,
            upload_date: info.upload_date,
            formats: info.formats?.map((f) => ({
              format_id: f.format_id,
              ext: f.ext,
              resolution: f.resolution,
              fps: f.fps,
              filesize: f.filesize,
              acodec: f.acodec,
              vcodec: f.vcodec,
              format_note: f.format_note,
              url: f.url,
            })) || [],
          });
        } catch (parseError) {
          reject(new Error('Failed to parse video info'));
        }
      });

      setTimeout(() => {
        ytdlp.kill('SIGTERM');
        reject(new Error('Video info extraction timeout'));
      }, 30000);
    });
  }

  // Mock data for testing when yt-dlp is not available
  static getMockVideoInfo(isYouTube, isTikTok) {
    if (isYouTube) {
      return {
        title: 'Test YouTube Video',
        thumbnail: 'https://example.com/thumb.jpg',
        duration: 180,
        uploader: 'Test Channel',
        formats: [
          // Combined formats (video + audio)
          {
            format_id: '18',
            ext: 'mp4',
            resolution: '640x360',
            vcodec: 'avc1.42001E',
            acodec: 'mp4a.40.2',
            format_note: '360p',
            filesize: 5000000
          },
          {
            format_id: '22',
            ext: 'mp4',
            resolution: '1280x720',
            vcodec: 'avc1.64001F',
            acodec: 'mp4a.40.2',
            format_note: '720p',
            filesize: 15000000
          },
          // Video-only formats (DASH)
          {
            format_id: '137',
            ext: 'mp4',
            resolution: '1920x1080',
            vcodec: 'avc1.640028',
            acodec: 'none',
            format_note: '1080p',
            filesize: 25000000
          },
          {
            format_id: '298',
            ext: 'mp4',
            resolution: '1280x720',
            vcodec: 'avc1.4d4020',
            acodec: 'none',
            format_note: '720p60',
            fps: 60,
            filesize: 20000000
          },
          // WebM formats
          {
            format_id: '247',
            ext: 'webm',
            resolution: '1280x720',
            vcodec: 'vp9',
            acodec: 'none',
            format_note: '720p',
            filesize: 12000000
          }
        ]
      };
    } else if (isTikTok) {
      return {
        title: 'Test TikTok Video',
        thumbnail: 'https://example.com/tiktok_thumb.jpg',
        duration: 15,
        uploader: 'TikTok User',
        formats: [
          {
            format_id: 'download',
            ext: 'mp4',
            resolution: '720x1280',
            vcodec: 'h264',
            acodec: 'aac',
            format_note: 'Download',
            filesize: 3000000
          }
        ]
      };
    }
  }
}

// Mock the info route filtering logic
function getQualityLabel(resolution, hasAudio) {
  if (!resolution) return 'Unknown quality';
  
  const height = parseInt(resolution.split('x')[1]);
  let qualityName = '';
  
  if (height >= 2160) qualityName = '4K';
  else if (height >= 1440) qualityName = '1440p';
  else if (height >= 1080) qualityName = '1080p';
  else if (height >= 720) qualityName = '720p';
  else if (height >= 480) qualityName = '480p';
  else if (height >= 360) qualityName = '360p';
  else if (height >= 240) qualityName = '240p';
  else qualityName = `${height}p`;
  
  const audioStatus = hasAudio ? 'có âm thanh' : 'không có âm thanh';
  return `${qualityName} (${audioStatus})`;
}

function processVideoInfo(videoInfo, url) {
  const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');
  const isTikTok = url.includes('tiktok.com');
  
  console.log(`Processing ${isYouTube ? 'YouTube' : isTikTok ? 'TikTok' : 'other'} video with ${videoInfo.formats?.length || 0} total formats`);
  
  let filteredFormats = videoInfo.formats || [];
  
  if (isYouTube) {
    // YouTube-specific filtering
    filteredFormats = filteredFormats.filter(format => {
      if (!format.vcodec || format.vcodec === 'none') return false;
      
      const supportedExts = ['mp4', 'webm', 'mkv'];
      if (!supportedExts.includes(format.ext)) return false;
      
      if (!format.resolution) return false;
      
      const height = parseInt(format.resolution.split('x')[1]);
      return height >= 240;
    });
  } else {
    // TikTok and other platforms
    filteredFormats = filteredFormats.filter(format => {
      if (format.vcodec === 'none' || format.ext !== 'mp4') return false;
      if (!format.resolution) return false;
      
      const height = parseInt(format.resolution.split('x')[1]);
      return height >= 360;
    });
  }
  
  console.log(`After filtering: ${filteredFormats.length} formats available`);
  
  // Sort formats
  const sortedFormats = filteredFormats.sort((a, b) => {
    const aHasAudio = a.acodec && a.acodec !== 'none';
    const bHasAudio = b.acodec && b.acodec !== 'none';
    
    if (aHasAudio && !bHasAudio) return -1;
    if (!aHasAudio && bHasAudio) return 1;
    
    const aHeight = parseInt(a.resolution?.split('x')[1] || '0');
    const bHeight = parseInt(b.resolution?.split('x')[1] || '0');
    return bHeight - aHeight;
  });
  
  return {
    title: videoInfo.title,
    thumbnail: videoInfo.thumbnail,
    duration: videoInfo.duration,
    uploader: videoInfo.uploader,
    upload_date: videoInfo.upload_date,
    platform: isYouTube ? 'youtube' : isTikTok ? 'tiktok' : 'other',
    total_formats: videoInfo.formats?.length || 0,
    available_formats: sortedFormats.length,
    formats: sortedFormats.map(format => {
      const hasAudio = format.acodec && format.acodec !== 'none';
      const quality = getQualityLabel(format.resolution, hasAudio);
      
      return {
        format_id: format.format_id,
        format_note: format.format_note || quality,
        ext: format.ext,
        resolution: format.resolution,
        vcodec: format.vcodec,
        acodec: format.acodec,
        filesize: format.filesize,
        fps: format.fps,
        has_audio: hasAudio,
        quality_label: quality
      };
    })
  };
}

// Test function
async function testVideoFormats() {
  console.log('🧪 Testing Video Formats Processing');
  console.log('='.repeat(50));

  const testUrls = [
    'https://www.youtube.com/watch?v=jNQXAC9IVRw',
    'https://www.tiktok.com/@username/video/1234567890123456789'
  ];

  // Enable mock mode if yt-dlp is not available
  process.env.MOCK_MODE = 'true';

  for (const url of testUrls) {
    try {
      console.log(`\n📹 Testing: ${url}`);
      console.log('-'.repeat(30));

      const videoInfo = await MockStreamingService.getVideoInfo(url);
      console.log(`Raw formats: ${videoInfo.formats.length}`);
      
      // Show raw formats
      console.log('\nRaw formats:');
      videoInfo.formats.forEach((format, index) => {
        const hasAudio = format.acodec && format.acodec !== 'none';
        console.log(`  ${index + 1}. ${format.format_id}: ${format.resolution} ${format.ext} (${hasAudio ? 'audio' : 'video-only'})`);
      });

      const processedInfo = processVideoInfo(videoInfo, url);
      
      console.log(`\n✅ Processed: ${processedInfo.available_formats} formats available`);
      console.log('Available quality options:');
      processedInfo.formats.forEach((format, index) => {
        console.log(`  ${index + 1}. ${format.quality_label} - ${format.ext}`);
      });

    } catch (error) {
      console.error(`❌ Error testing ${url}:`, error.message);
    }
  }
}

// Run test
if (require.main === module) {
  testVideoFormats().catch(console.error);
}
