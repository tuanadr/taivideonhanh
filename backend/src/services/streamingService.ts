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
   * Get video information using yt-dlp
   */
  public static async getVideoInfo(url: string): Promise<VideoInfo> {
    return new Promise((resolve, reject) => {
      const ytdlp = spawn('yt-dlp', [
        '--dump-json',
        '--no-warnings',
        url
      ]);

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
          reject(new Error(`Failed to fetch video info: ${errorData}`));
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
          reject(new Error('Failed to parse video info'));
        }
      });

      // Set timeout
      setTimeout(() => {
        ytdlp.kill('SIGTERM');
        reject(new Error('Video info extraction timeout'));
      }, 30000);
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
        '--merge-output-format', 'mp4',
        '--audio-format', 'mp3',
        '--embed-audio',
      ];

      // Add optional headers
      if (userAgent) {
        ytdlpArgs.push('--user-agent', userAgent);
      }
      if (referer) {
        ytdlpArgs.push('--referer', referer);
      }

      ytdlpArgs.push(videoUrl);

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

      // Handle stderr for errors
      let errorOutput = '';
      ytdlpProcess.stderr?.on('data', (data) => {
        errorOutput += data.toString();
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
            if (!res.headersSent) {
              res.status(500).json({ error: 'Video streaming failed' });
            }
            reject(new Error(`yt-dlp process failed with code ${code}: ${errorOutput}`));
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
}

export default StreamingService;
export { StreamingService, StreamingOptions, StreamingResult, VideoInfo, VideoFormat };
