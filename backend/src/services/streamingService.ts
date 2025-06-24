import { spawn, ChildProcess } from 'child_process';
import { Request, Response } from 'express';
import { PassThrough, Readable } from 'stream';
import { StreamToken } from '../models';
import contentDisposition from 'content-disposition';

interface StreamingOptions {
  videoUrl: string;
  formatId: string;
  title?: string;
  userAgent?: string;
  referer?: string;
  bufferSize?: number;
  timeout?: number;
  useCookies?: boolean;
  cookiesPath?: string;
}

interface CookieAuthResult {
  success: boolean;
  method?: 'browser' | 'file' | 'none';
  error?: string;
}

interface StreamingResult {
  success: boolean;
  error?: string;
  bytesStreamed?: number;
  duration?: number;
}

interface VideoFormat {
  format_id: string;
  ext: string;
  resolution?: string;
  fps?: number;
  filesize?: number;
  acodec?: string;
  vcodec?: string;
  format_note?: string;
  url?: string;
}

interface VideoInfo {
  title: string;
  thumbnail: string;
  duration?: number;
  formats: VideoFormat[];
  description?: string;
  uploader?: string;
  upload_date?: string;
}

class StreamingService {
  private static readonly DEFAULT_BUFFER_SIZE = 64 * 1024; // 64KB
  private static readonly DEFAULT_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  private static readonly SUPPORTED_FORMATS = ['mp4', 'webm', 'mkv', 'avi', 'mov', 'm4a', 'mp3', 'wav'];
  private static readonly SUPPORTED_BROWSERS = ['chrome', 'firefox', 'safari', 'edge'];
  private static readonly COOKIES_FILE_PATH = process.env.YOUTUBE_COOKIES_PATH || '/tmp/youtube-cookies.txt';

  // Enhanced User-Agent rotation for better YouTube compatibility
  private static readonly USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  ];

  // Rate limiting and retry configuration
  private static readonly MAX_RETRIES = 3;
  private static readonly RETRY_DELAYS = [1000, 3000, 5000]; // milliseconds
  private static lastRequestTime = 0;
  private static readonly MIN_REQUEST_INTERVAL = 2000; // 2 seconds between requests

  /**
   * Get a random User-Agent for better compatibility
   */
  private static getRandomUserAgent(): string {
    const randomIndex = Math.floor(Math.random() * this.USER_AGENTS.length);
    return this.USER_AGENTS[randomIndex];
  }

  /**
   * Implement rate limiting to avoid being blocked
   */
  private static async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
      const waitTime = this.MIN_REQUEST_INTERVAL - timeSinceLastRequest;
      console.log(`⏱️ Rate limiting: waiting ${waitTime}ms before next request`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Enhanced cookie detection with better fallback support
   */
  private static async detectCookieAuth(): Promise<CookieAuthResult> {
    // First priority: Check for manual cookie file
    try {
      const fs = require('fs');
      if (fs.existsSync(this.COOKIES_FILE_PATH)) {
        // Validate cookie file format
        const cookieContent = fs.readFileSync(this.COOKIES_FILE_PATH, 'utf8');
        if (cookieContent.includes('# HTTP Cookie File') || cookieContent.includes('# Netscape HTTP Cookie File')) {
          console.log(`✅ Valid cookie file found at ${this.COOKIES_FILE_PATH}`);
          return {
            success: true,
            method: 'file',
            error: undefined
          };
        } else {
          console.log(`⚠️ Cookie file exists but format is invalid at ${this.COOKIES_FILE_PATH}`);
        }
      } else {
        console.log(`ℹ️ Cookie file not found at ${this.COOKIES_FILE_PATH}`);
      }
    } catch (error) {
      console.log(`❌ Cookie file check failed:`, error instanceof Error ? error.message : 'Unknown error');
    }

    // Second priority: Try browser cookie extraction (only on supported platforms)
    const platform = process.platform;
    const supportedPlatforms = ['win32', 'darwin', 'linux'];

    if (supportedPlatforms.includes(platform)) {
      for (const browser of this.SUPPORTED_BROWSERS) {
        try {
          const testResult = await this.testBrowserCookies(browser);
          if (testResult.success) {
            console.log(`✅ Cookie authentication available via ${browser}`);
            return {
              success: true,
              method: 'browser',
              error: undefined
            };
          } else {
            console.log(`❌ Browser ${browser} cookies not available: ${testResult.error}`);
          }
        } catch (error) {
          console.log(`❌ Browser ${browser} test failed:`, error instanceof Error ? error.message : 'Unknown error');
        }
      }
    } else {
      console.log(`⚠️ Platform ${platform} not supported for browser cookie extraction`);
    }

    console.log(`ℹ️ No cookie authentication methods available, proceeding without cookies`);
    return {
      success: false,
      method: 'none',
      error: 'No cookie authentication methods available'
    };
  }

  /**
   * Test if browser cookies are available and working
   */
  private static async testBrowserCookies(browser: string): Promise<CookieAuthResult> {
    return new Promise((resolve) => {
      // Quick check for browser availability first
      const testArgs = [
        '--cookies-from-browser', browser,
        '--dump-json',
        '--no-warnings',
        '--quiet',
        '--simulate',
        'https://www.youtube.com/watch?v=jNQXAC9IVRw' // Test with a known working video
      ];

      const ytdlp = spawn('yt-dlp', testArgs);
      let hasOutput = false;
      let errorOutput = '';

      ytdlp.stdout.on('data', () => {
        hasOutput = true;
      });

      ytdlp.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      ytdlp.on('close', (code) => {
        // Analyze the error to provide better feedback
        if (errorOutput.includes('could not find') && errorOutput.includes('cookies database')) {
          resolve({
            success: false,
            method: 'browser',
            error: `Browser ${browser} not installed or no cookies available`
          });
        } else if (errorOutput.includes('unsupported platform')) {
          resolve({
            success: false,
            method: 'browser',
            error: `Browser ${browser} not supported on this platform`
          });
        } else if (code === 0 || hasOutput) {
          resolve({ success: true, method: 'browser' });
        } else {
          resolve({
            success: false,
            method: 'browser',
            error: errorOutput || `Browser ${browser} test failed`
          });
        }
      });

      // Quick timeout for testing
      setTimeout(() => {
        ytdlp.kill('SIGTERM');
        resolve({
          success: false,
          method: 'browser',
          error: `Browser ${browser} test timeout`
        });
      }, 5000); // Reduced timeout for faster testing
    });
  }

  /**
   * Smart cookie authentication setup
   */
  private static async setupCookieAuth(ytdlpArgs: string[]): Promise<boolean> {
    try {
      const cookieAuth = await this.detectCookieAuth();

      if (cookieAuth.success) {
        if (cookieAuth.method === 'browser') {
          // Try each browser until one works
          for (const browser of this.SUPPORTED_BROWSERS) {
            const testResult = await this.testBrowserCookies(browser);
            if (testResult.success) {
              ytdlpArgs.push('--cookies-from-browser', browser);
              console.log(`🍪 Using ${browser} cookies for authentication`);
              return true;
            }
          }
        } else if (cookieAuth.method === 'file') {
          ytdlpArgs.push('--cookies', this.COOKIES_FILE_PATH);
          console.log(`🍪 Using cookie file for authentication`);
          return true;
        }
      }

      return false;
    } catch (error) {
      console.log('⚠️ Cookie authentication setup failed:', error instanceof Error ? error.message : 'Unknown error');
      return false;
    }
  }

  /**
   * Enhanced video info extraction with retry logic and better error handling
   */
  public static async getVideoInfo(url: string, useCookieAuth: boolean = true): Promise<VideoInfo> {
    // Enforce rate limiting
    await this.enforceRateLimit();

    return this.getVideoInfoWithRetry(url, useCookieAuth, 0);
  }

  /**
   * Internal method with retry logic
   */
  private static async getVideoInfoWithRetry(url: string, useCookieAuth: boolean, retryCount: number): Promise<VideoInfo> {
    return new Promise(async (resolve, reject) => {
      try {
        // Detect platform for optimized arguments
        const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');
        const isTikTok = url.includes('tiktok.com');

        const ytdlpArgs = [
          '--dump-json',
          '--no-warnings',
          '--no-check-certificates',
          '--ignore-errors',
        ];

        // Cookie authentication for YouTube
        let cookieAuthUsed = false;
        if (isYouTube && useCookieAuth) {
          cookieAuthUsed = await this.setupCookieAuth(ytdlpArgs);
        }

        // Platform-specific optimizations with random user-agent
        if (isYouTube) {
          ytdlpArgs.push(
            '--extractor-args', 'youtube:skip=dash,hls',
            '--user-agent', this.getRandomUserAgent()
          );
        } else if (isTikTok) {
          ytdlpArgs.push(
            '--user-agent', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
          );
        } else {
          ytdlpArgs.push(
            '--user-agent', this.getRandomUserAgent()
          );
        }

        ytdlpArgs.push(url);

        console.log(`yt-dlp getVideoInfo args (attempt ${retryCount + 1}):`, ytdlpArgs);
        const ytdlp = spawn('yt-dlp', ytdlpArgs);

        let jsonData = '';
        let errorData = '';

        ytdlp.stdout.on('data', (data) => {
          jsonData += data.toString();
        });

        ytdlp.stderr.on('data', (data) => {
          errorData += data.toString();
        });

        ytdlp.on('close', async (code) => {
          console.log(`yt-dlp getVideoInfo exit code: ${code} (attempt ${retryCount + 1})`);
          if (errorData) {
            console.log('yt-dlp getVideoInfo stderr:', errorData);
          }

          if (code !== 0) {
            // Check if we should retry
            const shouldRetry = this.shouldRetryError(errorData, isYouTube, isTikTok);

            if (shouldRetry && retryCount < this.MAX_RETRIES - 1) {
              console.log(`🔄 Retrying request (${retryCount + 1}/${this.MAX_RETRIES}) after ${this.RETRY_DELAYS[retryCount]}ms`);

              // Wait before retry
              setTimeout(async () => {
                try {
                  const result = await this.getVideoInfoWithRetry(url, useCookieAuth, retryCount + 1);
                  resolve(result);
                } catch (retryError) {
                  reject(retryError);
                }
              }, this.RETRY_DELAYS[retryCount]);
              return;
            }

            // Enhanced error handling for specific platforms
            let errorMessage = this.getEnhancedErrorMessage(errorData, isYouTube, isTikTok, cookieAuthUsed);
            reject(new Error(errorMessage));
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
              formats: info.formats?.map((f: any) => ({
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
            console.error('JSON parse error:', parseError);
            reject(new Error('Failed to parse video info'));
          }
        });

        // Set timeout
        setTimeout(() => {
          ytdlp.kill('SIGTERM');
          reject(new Error('Video info extraction timeout'));
        }, 45000); // Increased timeout for better reliability

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Determine if an error should trigger a retry
   */
  private static shouldRetryError(errorData: string, isYouTube: boolean, isTikTok: boolean): boolean {
    // Retry on network errors
    if (errorData.includes('network') || errorData.includes('timeout') || errorData.includes('connection')) {
      return true;
    }

    // Retry on rate limiting
    if (errorData.includes('429') || errorData.includes('Too Many Requests')) {
      return true;
    }

    // Retry on temporary YouTube issues
    if (isYouTube && (
      errorData.includes('Sign in to confirm') ||
      errorData.includes('HTTP Error 403') ||
      errorData.includes('Playback on other websites has been disabled')
    )) {
      return true;
    }

    // Don't retry on permanent errors
    if (errorData.includes('Video unavailable') ||
        errorData.includes('Private video') ||
        errorData.includes('This video is not available')) {
      return false;
    }

    return false;
  }

  /**
   * Get enhanced error message based on error type and platform
   */
  private static getEnhancedErrorMessage(errorData: string, isYouTube: boolean, isTikTok: boolean, cookieAuthUsed: boolean): string {
    if (isYouTube && errorData.includes('Sign in to confirm')) {
      if (cookieAuthUsed) {
        return 'YouTube yêu cầu xác thực nâng cao. Cookies hiện tại không đủ quyền hoặc đã hết hạn. Vui lòng thử lại sau hoặc liên hệ hỗ trợ.';
      } else {
        return 'YouTube yêu cầu xác thực. Vui lòng thử video khác hoặc kiểm tra URL.';
      }
    } else if (isYouTube && errorData.includes('cookies')) {
      return 'Lỗi xác thực YouTube. Hệ thống đang cố gắng khắc phục, vui lòng thử lại sau.';
    } else if (isYouTube && errorData.includes('HTTP Error 403')) {
      return 'Video YouTube bị hạn chế truy cập. Vui lòng thử video khác.';
    } else if (isTikTok && errorData.includes('Unable to extract')) {
      return 'Không thể trích xuất video TikTok. Video có thể bị riêng tư hoặc đã bị xóa.';
    } else if (errorData.includes('Video unavailable')) {
      return 'Video không khả dụng hoặc đã bị xóa.';
    } else if (errorData.includes('Private video')) {
      return 'Video này ở chế độ riêng tư.';
    } else if (errorData.includes('429') || errorData.includes('Too Many Requests')) {
      return 'Quá nhiều yêu cầu. Vui lòng thử lại sau vài phút.';
    } else if (errorData.includes('network') || errorData.includes('timeout')) {
      return 'Lỗi kết nối mạng. Vui lòng kiểm tra kết nối internet và thử lại.';
    }

    return `Không thể lấy thông tin video. Vui lòng thử lại sau hoặc kiểm tra URL.`;
  }

  /**
   * Stream video directly to client using yt-dlp
   */
  public static async streamVideo(
    req: Request,
    res: Response,
    options: StreamingOptions
  ): Promise<StreamingResult> {
    const startTime = Date.now();
    let bytesStreamed = 0;
    let ytdlpProcess: ChildProcess | null = null;

    try {
      const { videoUrl, formatId, title, userAgent, referer, bufferSize = this.DEFAULT_BUFFER_SIZE, timeout = this.DEFAULT_TIMEOUT, useCookies = true } = options;

      // Validate format
      const videoInfo = await this.getVideoInfo(videoUrl, useCookies);
      const selectedFormat = videoInfo.formats.find(f => f.format_id === formatId);
      
      if (!selectedFormat) {
        throw new Error(`Format ${formatId} not found`);
      }

      if (!this.SUPPORTED_FORMATS.includes(selectedFormat.ext)) {
        throw new Error(`Unsupported format: ${selectedFormat.ext}`);
      }

      // Check if selected format has audio
      const hasAudio = selectedFormat.acodec && selectedFormat.acodec !== 'none';

      // Detect platform for optimized arguments
      const isYouTube = videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be');
      const isTikTok = videoUrl.includes('tiktok.com');

      // Prepare yt-dlp arguments with smart format selection
      let formatString;
      if (hasAudio) {
        // Format already has audio, use it directly
        formatString = formatId;
      } else {
        // Format doesn't have audio, try to merge with best audio
        formatString = `${formatId}+bestaudio/best[ext=mp4]/best`;
      }

      const ytdlpArgs = [
        '--format', formatString,
        '--output', '-',
        '--no-warnings',
        '--no-playlist',
        '--no-check-certificates',
        '--ignore-errors',
      ];

      // Cookie authentication for YouTube
      let cookieAuthUsed = false;
      if (isYouTube && useCookies) {
        cookieAuthUsed = await this.setupCookieAuth(ytdlpArgs);
      }

      // Platform-specific optimizations with enhanced user-agent handling
      if (isYouTube) {
        ytdlpArgs.push(
          '--merge-output-format', 'mp4',
          '--audio-format', 'mp3',
          '--embed-audio',
          '--extractor-args', 'youtube:skip=dash,hls',
          '--user-agent', userAgent || this.getRandomUserAgent()
        );
      } else if (isTikTok) {
        ytdlpArgs.push(
          '--user-agent', userAgent || 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
        );
      } else {
        // Default for other platforms
        ytdlpArgs.push(
          '--merge-output-format', 'mp4',
          '--audio-format', 'mp3',
          '--embed-audio',
          '--user-agent', userAgent || this.getRandomUserAgent()
        );
      }

      // Add optional headers
      if (userAgent && !isYouTube && !isTikTok) {
        ytdlpArgs.push('--user-agent', userAgent);
      }
      if (referer) {
        ytdlpArgs.push('--referer', referer);
      }

      ytdlpArgs.push(videoUrl);
      console.log('yt-dlp streamVideo args:', ytdlpArgs);

      // Set response headers
      const filename = this.sanitizeFilename(title || videoInfo.title);
      const contentType = this.getContentType(selectedFormat.ext);
      
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', contentDisposition(`${filename}.${selectedFormat.ext}`));
      res.setHeader('Transfer-Encoding', 'chunked');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

      // Add CORS headers if needed
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Range');

      // Handle range requests for seeking
      const range = req.headers.range;
      if (range && selectedFormat.filesize) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : selectedFormat.filesize - 1;
        
        res.status(206);
        res.setHeader('Content-Range', `bytes ${start}-${end}/${selectedFormat.filesize}`);
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Content-Length', (end - start + 1).toString());
      }

      // Start yt-dlp process
      ytdlpProcess = spawn('yt-dlp', ytdlpArgs);

      // Handle process errors
      ytdlpProcess.on('error', (error) => {
        console.error('yt-dlp process error:', error);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Streaming process failed' });
        }
      });

      // Stream data to client
      ytdlpProcess.stdout?.on('data', (chunk) => {
        bytesStreamed += chunk.length;
        
        // Write chunk to response
        if (!res.destroyed) {
          res.write(chunk);
        }
      });

      // Handle stderr for errors with enhanced error detection
      let errorOutput = '';
      ytdlpProcess.stderr?.on('data', (data) => {
        const errorText = data.toString();
        errorOutput += errorText;
        console.error('yt-dlp stderr:', errorText);

        // Real-time error detection for faster failure response
        if (errorText.includes('Sign in to confirm') && isYouTube) {
          console.error('YouTube authentication required');
        } else if (errorText.includes('Unable to extract') && isTikTok) {
          console.error('TikTok extraction failed');
        }
      });

      // Handle process completion
      return new Promise((resolve, reject) => {
        ytdlpProcess!.on('close', (code) => {
          const duration = Date.now() - startTime;

          if (code === 0) {
            if (!res.destroyed) {
              res.end();
            }
            resolve({
              success: true,
              bytesStreamed,
              duration,
            });
          } else {
            console.error('yt-dlp process failed:', errorOutput);

            // Enhanced error messages using the same logic as getVideoInfo
            let userFriendlyError = this.getEnhancedErrorMessage(errorOutput, isYouTube, isTikTok, cookieAuthUsed);

            if (!res.headersSent) {
              res.status(500).json({ error: userFriendlyError });
            }
            reject(new Error(`yt-dlp process failed with code ${code}: ${userFriendlyError}`));
          }
        });

        // Set timeout
        const timeoutId = setTimeout(() => {
          if (ytdlpProcess && !ytdlpProcess.killed) {
            ytdlpProcess.kill('SIGTERM');
            reject(new Error('Streaming timeout'));
          }
        }, timeout);

        // Clear timeout on completion
        ytdlpProcess!.on('close', () => {
          clearTimeout(timeoutId);
        });

        // Handle client disconnect
        req.on('close', () => {
          if (ytdlpProcess && !ytdlpProcess.killed) {
            ytdlpProcess.kill('SIGTERM');
          }
        });

        res.on('close', () => {
          if (ytdlpProcess && !ytdlpProcess.killed) {
            ytdlpProcess.kill('SIGTERM');
          }
        });
      });

    } catch (error) {
      // Cleanup process if still running
      if (ytdlpProcess && !ytdlpProcess.killed) {
        ytdlpProcess.kill('SIGTERM');
      }

      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown streaming error';
      
      if (!res.headersSent) {
        res.status(500).json({ error: errorMessage });
      }

      return {
        success: false,
        error: errorMessage,
        bytesStreamed,
        duration,
      };
    }
  }

  /**
   * Get content type based on file extension
   */
  private static getContentType(ext: string): string {
    const contentTypes: Record<string, string> = {
      'mp4': 'video/mp4',
      'webm': 'video/webm',
      'mkv': 'video/x-matroska',
      'avi': 'video/x-msvideo',
      'mov': 'video/quicktime',
      'm4a': 'audio/mp4',
      'mp3': 'audio/mpeg',
      'wav': 'audio/wav',
    };

    return contentTypes[ext] || 'application/octet-stream';
  }

  /**
   * Sanitize filename for safe download
   */
  private static sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .substring(0, 100); // Limit length
  }

  /**
   * Check if format is supported
   */
  public static isSupportedFormat(ext: string): boolean {
    return this.SUPPORTED_FORMATS.includes(ext.toLowerCase());
  }

  /**
   * Get available formats for a video
   */
  public static async getAvailableFormats(url: string): Promise<VideoFormat[]> {
    const videoInfo = await this.getVideoInfo(url);
    return videoInfo.formats.filter(format =>
      format.ext && this.isSupportedFormat(format.ext)
    );
  }

  /**
   * Get video info with fallback strategies for different platforms
   */
  public static async getVideoInfoWithFallback(url: string): Promise<VideoInfo> {
    const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');
    const isTikTok = url.includes('tiktok.com');

    try {
      // First attempt with standard method
      return await this.getVideoInfo(url);
    } catch (error) {
      console.log('First attempt failed, trying fallback methods...');

      if (isYouTube) {
        // YouTube fallback: try with different extractor args
        try {
          return await this.getVideoInfoYouTubeFallback(url);
        } catch (fallbackError) {
          console.error('YouTube fallback also failed:', fallbackError);
          throw error; // Throw original error
        }
      } else if (isTikTok) {
        // TikTok fallback: try with different user agent
        try {
          return await this.getVideoInfoTikTokFallback(url);
        } catch (fallbackError) {
          console.error('TikTok fallback also failed:', fallbackError);
          throw error; // Throw original error
        }
      }

      throw error;
    }
  }

  /**
   * YouTube-specific fallback method with cookie authentication
   */
  private static async getVideoInfoYouTubeFallback(url: string): Promise<VideoInfo> {
    return new Promise(async (resolve, reject) => {
      const ytdlpArgs = [
        '--dump-json',
        '--no-warnings',
        '--no-check-certificates',
        '--ignore-errors',
      ];

      // Try cookie authentication first in fallback
      const cookieAuthUsed = await this.setupCookieAuth(ytdlpArgs);

      ytdlpArgs.push(
        '--extractor-args', 'youtube:skip=dash',
        '--user-agent', this.getRandomUserAgent(),
        url
      );

      console.log('YouTube fallback yt-dlp args:', ytdlpArgs);
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
          reject(new Error(`YouTube fallback failed: ${errorData}`));
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
            formats: info.formats?.map((f: any) => ({
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
          reject(new Error('Failed to parse YouTube fallback video info'));
        }
      });

      setTimeout(() => {
        ytdlp.kill('SIGTERM');
        reject(new Error('YouTube fallback timeout'));
      }, 45000);
    });
  }

  /**
   * TikTok-specific fallback method
   */
  private static async getVideoInfoTikTokFallback(url: string): Promise<VideoInfo> {
    return new Promise((resolve, reject) => {
      const ytdlpArgs = [
        '--dump-json',
        '--no-warnings',
        '--no-check-certificates',
        '--ignore-errors',
        '--user-agent', 'TikTok 26.2.0 rv:262018 (iPhone; iOS 14.4.2; en_US) Cronet',
        url
      ];

      console.log('TikTok fallback yt-dlp args:', ytdlpArgs);
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
          reject(new Error(`TikTok fallback failed: ${errorData}`));
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
            formats: info.formats?.map((f: any) => ({
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
          reject(new Error('Failed to parse TikTok fallback video info'));
        }
      });

      setTimeout(() => {
        ytdlp.kill('SIGTERM');
        reject(new Error('TikTok fallback timeout'));
      }, 45000);
    });
  }
}

export default StreamingService;
export { StreamingService, StreamingOptions, StreamingResult, VideoInfo, VideoFormat };
