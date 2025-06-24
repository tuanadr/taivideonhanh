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

  /**
   * Get video information using yt-dlp with enhanced error handling and platform-specific optimizations
   */
  public static async getVideoInfo(url: string): Promise<VideoInfo> {
    return new Promise((resolve, reject) => {
      // Detect platform for optimized arguments
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
          '--extractor-args', 'youtube:skip=dash,hls',
          '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        );
      } else if (isTikTok) {
        ytdlpArgs.push(
          '--user-agent', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
        );
      }

      ytdlpArgs.push(url);

      console.log('yt-dlp getVideoInfo args:', ytdlpArgs);
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
        console.log(`yt-dlp getVideoInfo exit code: ${code}`);
        if (errorData) {
          console.log('yt-dlp getVideoInfo stderr:', errorData);
        }

        if (code !== 0) {
          // Enhanced error handling for specific platforms
          let errorMessage = `Failed to fetch video info: ${errorData}`;

          if (isYouTube && errorData.includes('Sign in to confirm')) {
            errorMessage = 'YouTube yêu cầu xác thực. Video có thể bị hạn chế hoặc cần đăng nhập. Vui lòng thử video khác hoặc kiểm tra URL.';
          } else if (isTikTok && errorData.includes('Unable to extract')) {
            errorMessage = 'Không thể trích xuất video TikTok. Video có thể bị riêng tư hoặc đã bị xóa.';
          } else if (errorData.includes('Video unavailable')) {
            errorMessage = 'Video không khả dụng hoặc đã bị xóa.';
          } else if (errorData.includes('Private video')) {
            errorMessage = 'Video này ở chế độ riêng tư.';
          }

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
    });
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
      const { videoUrl, formatId, title, userAgent, referer, bufferSize = this.DEFAULT_BUFFER_SIZE, timeout = this.DEFAULT_TIMEOUT } = options;

      // Validate format
      const videoInfo = await this.getVideoInfo(videoUrl);
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

      // Platform-specific optimizations
      if (isYouTube) {
        ytdlpArgs.push(
          '--merge-output-format', 'mp4',
          '--audio-format', 'mp3',
          '--embed-audio',
          '--extractor-args', 'youtube:skip=dash,hls',
          '--user-agent', userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
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
          '--embed-audio'
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

            // Enhanced error messages based on platform and error type
            let userFriendlyError = 'Video streaming failed';

            if (isYouTube && errorOutput.includes('Sign in to confirm')) {
              userFriendlyError = 'YouTube yêu cầu xác thực. Video có thể bị hạn chế hoặc cần đăng nhập. Vui lòng thử video khác.';
            } else if (isTikTok && errorOutput.includes('Unable to extract')) {
              userFriendlyError = 'Không thể tải video TikTok. Video có thể bị riêng tư hoặc đã bị xóa.';
            } else if (errorOutput.includes('Video unavailable')) {
              userFriendlyError = 'Video không khả dụng hoặc đã bị xóa.';
            } else if (errorOutput.includes('Private video')) {
              userFriendlyError = 'Video này ở chế độ riêng tư.';
            } else if (errorOutput.includes('network')) {
              userFriendlyError = 'Lỗi kết nối mạng. Vui lòng thử lại sau.';
            }

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
   * YouTube-specific fallback method
   */
  private static async getVideoInfoYouTubeFallback(url: string): Promise<VideoInfo> {
    return new Promise((resolve, reject) => {
      const ytdlpArgs = [
        '--dump-json',
        '--no-warnings',
        '--no-check-certificates',
        '--ignore-errors',
        '--extractor-args', 'youtube:skip=dash',
        '--user-agent', 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        url
      ];

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
