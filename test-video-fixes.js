#!/usr/bin/env node

/**
 * Test script để kiểm tra các cải tiến cho YouTube và TikTok
 */

const { spawn } = require('child_process');

// Test URLs - Using real, publicly available videos
const testUrls = {
  youtube: [
    'https://www.youtube.com/watch?v=jNQXAC9IVRw', // Me at the zoo - first YouTube video
    'https://youtu.be/jNQXAC9IVRw', // Short URL format
    'https://www.youtube.com/watch?v=9bZkp7q19f0', // PSY - Gangnam Style (popular video)
  ],
  tiktok: [
    // Note: TikTok URLs change frequently, these are examples
    'https://www.tiktok.com/@tiktok/video/6829267836783971589', // Official TikTok account
  ],
  other: [
    'https://vimeo.com/148751763', // Vimeo test video
  ]
};

/**
 * Test yt-dlp với các tham số mới
 */
async function testYtDlp(url, platform) {
  return new Promise((resolve, reject) => {
    console.log(`\n🧪 Testing ${platform} URL: ${url}`);
    
    let ytdlpArgs = [
      '--dump-json',
      '--no-warnings',
      '--no-check-certificates',
      '--ignore-errors',
    ];

    // Platform-specific optimizations
    if (platform === 'youtube') {
      ytdlpArgs.push(
        '--extractor-args', 'youtube:skip=dash,hls',
        '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );
    } else if (platform === 'tiktok') {
      ytdlpArgs.push(
        '--user-agent', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
      );
    }

    ytdlpArgs.push(url);

    console.log('📋 yt-dlp args:', ytdlpArgs.join(' '));

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
      if (code === 0) {
        try {
          const info = JSON.parse(jsonData);
          console.log(`✅ ${platform} SUCCESS:`);
          console.log(`   Title: ${info.title}`);
          console.log(`   Duration: ${info.duration}s`);
          console.log(`   Formats: ${info.formats?.length || 0}`);
          console.log(`   Uploader: ${info.uploader}`);
          resolve({ success: true, info });
        } catch (parseError) {
          console.log(`❌ ${platform} JSON PARSE ERROR:`, parseError.message);
          resolve({ success: false, error: 'JSON parse failed' });
        }
      } else {
        console.log(`❌ ${platform} FAILED (code ${code}):`);
        console.log(`   Error: ${errorData}`);
        
        // Analyze error types
        if (errorData.includes('Sign in to confirm')) {
          console.log('   🔍 Analysis: YouTube authentication required');
        } else if (errorData.includes('Unable to extract')) {
          console.log('   🔍 Analysis: Extraction failed');
        } else if (errorData.includes('Video unavailable')) {
          console.log('   🔍 Analysis: Video unavailable');
        }
        
        resolve({ success: false, error: errorData });
      }
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      ytdlp.kill('SIGTERM');
      console.log(`⏰ ${platform} TIMEOUT`);
      resolve({ success: false, error: 'Timeout' });
    }, 30000);
  });
}

/**
 * Test fallback method cho YouTube
 */
async function testYouTubeFallback(url) {
  return new Promise((resolve, reject) => {
    console.log(`\n🔄 Testing YouTube fallback for: ${url}`);
    
    const ytdlpArgs = [
      '--dump-json',
      '--no-warnings',
      '--no-check-certificates',
      '--ignore-errors',
      '--extractor-args', 'youtube:skip=dash',
      '--user-agent', 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      url
    ];

    console.log('📋 Fallback args:', ytdlpArgs.join(' '));

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
      if (code === 0) {
        try {
          const info = JSON.parse(jsonData);
          console.log(`✅ YouTube FALLBACK SUCCESS:`);
          console.log(`   Title: ${info.title}`);
          console.log(`   Formats: ${info.formats?.length || 0}`);
          resolve({ success: true, info });
        } catch (parseError) {
          console.log(`❌ YouTube FALLBACK JSON PARSE ERROR:`, parseError.message);
          resolve({ success: false, error: 'JSON parse failed' });
        }
      } else {
        console.log(`❌ YouTube FALLBACK FAILED (code ${code}):`);
        console.log(`   Error: ${errorData}`);
        resolve({ success: false, error: errorData });
      }
    });

    setTimeout(() => {
      ytdlp.kill('SIGTERM');
      console.log(`⏰ YouTube FALLBACK TIMEOUT`);
      resolve({ success: false, error: 'Timeout' });
    }, 30000);
  });
}

/**
 * Main test function
 */
async function runTests() {
  console.log('🚀 Starting video download fixes test...\n');
  
  const results = {
    youtube: [],
    tiktok: [],
    fallback: []
  };

  // Test YouTube URLs
  console.log('📺 Testing YouTube URLs...');
  for (const url of testUrls.youtube) {
    const result = await testYtDlp(url, 'youtube');
    results.youtube.push({ url, ...result });
    
    // If failed, test fallback
    if (!result.success) {
      const fallbackResult = await testYouTubeFallback(url);
      results.fallback.push({ url, ...fallbackResult });
    }
  }

  // Test TikTok URLs (if any)
  console.log('\n🎵 Testing TikTok URLs...');
  for (const url of testUrls.tiktok) {
    const result = await testYtDlp(url, 'tiktok');
    results.tiktok.push({ url, ...result });
  }

  // Summary
  console.log('\n📊 TEST SUMMARY:');
  console.log('================');
  
  const youtubeSuccess = results.youtube.filter(r => r.success).length;
  const youtubeTotal = results.youtube.length;
  console.log(`YouTube: ${youtubeSuccess}/${youtubeTotal} successful`);
  
  const tiktokSuccess = results.tiktok.filter(r => r.success).length;
  const tiktokTotal = results.tiktok.length;
  console.log(`TikTok: ${tiktokSuccess}/${tiktokTotal} successful`);
  
  const fallbackSuccess = results.fallback.filter(r => r.success).length;
  const fallbackTotal = results.fallback.length;
  console.log(`Fallback: ${fallbackSuccess}/${fallbackTotal} successful`);

  // Recommendations
  console.log('\n💡 RECOMMENDATIONS:');
  console.log('===================');
  
  if (youtubeSuccess < youtubeTotal) {
    console.log('🔧 YouTube issues detected:');
    console.log('   - Consider implementing cookie authentication');
    console.log('   - Update user agents regularly');
    console.log('   - Add more fallback strategies');
  }
  
  if (tiktokSuccess < tiktokTotal) {
    console.log('🔧 TikTok issues detected:');
    console.log('   - Try different user agents');
    console.log('   - Consider using mobile user agents');
    console.log('   - Check for API changes');
  }

  console.log('\n✨ Test completed!');
}

// Run tests
runTests().catch(console.error);
