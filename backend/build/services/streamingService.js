"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StreamingService = void 0;
const child_process_1 = require("child_process");
const content_disposition_1 = __importDefault(require("content-disposition"));
class StreamingService {
    /**
     * Get video information using yt-dlp
     */
    static getVideoInfo(url) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                const ytdlp = (0, child_process_1.spawn)('yt-dlp', [
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
                    var _a;
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
                            formats: ((_a = info.formats) === null || _a === void 0 ? void 0 : _a.map((f) => ({
                                format_id: f.format_id,
                                ext: f.ext,
                                resolution: f.resolution,
                                fps: f.fps,
                                filesize: f.filesize,
                                acodec: f.acodec,
                                vcodec: f.vcodec,
                                format_note: f.format_note,
                                url: f.url,
                            }))) || [],
                        });
                    }
                    catch (parseError) {
                        reject(new Error('Failed to parse video info'));
                    }
                });
                // Set timeout
                setTimeout(() => {
                    ytdlp.kill('SIGTERM');
                    reject(new Error('Video info extraction timeout'));
                }, 30000);
            });
        });
    }
    /**
     * Stream video directly to client using yt-dlp
     */
    static streamVideo(req, res, options) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const startTime = Date.now();
            let bytesStreamed = 0;
            let ytdlpProcess = null;
            try {
                const { videoUrl, formatId, title, userAgent, referer, bufferSize = this.DEFAULT_BUFFER_SIZE, timeout = this.DEFAULT_TIMEOUT } = options;
                // Validate format
                const videoInfo = yield this.getVideoInfo(videoUrl);
                const selectedFormat = videoInfo.formats.find(f => f.format_id === formatId);
                if (!selectedFormat) {
                    throw new Error(`Format ${formatId} not found`);
                }
                if (!this.SUPPORTED_FORMATS.includes(selectedFormat.ext)) {
                    throw new Error(`Unsupported format: ${selectedFormat.ext}`);
                }
                // Prepare yt-dlp arguments
                const ytdlpArgs = [
                    '--format', formatId,
                    '--output', '-',
                    '--no-warnings',
                    '--no-playlist',
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
                res.setHeader('Content-Disposition', (0, content_disposition_1.default)(`${filename}.${selectedFormat.ext}`));
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
                ytdlpProcess = (0, child_process_1.spawn)('yt-dlp', ytdlpArgs);
                // Handle process errors
                ytdlpProcess.on('error', (error) => {
                    console.error('yt-dlp process error:', error);
                    if (!res.headersSent) {
                        res.status(500).json({ error: 'Streaming process failed' });
                    }
                });
                // Stream data to client
                (_a = ytdlpProcess.stdout) === null || _a === void 0 ? void 0 : _a.on('data', (chunk) => {
                    bytesStreamed += chunk.length;
                    // Write chunk to response
                    if (!res.destroyed) {
                        res.write(chunk);
                    }
                });
                // Handle stderr for errors
                let errorOutput = '';
                (_b = ytdlpProcess.stderr) === null || _b === void 0 ? void 0 : _b.on('data', (data) => {
                    errorOutput += data.toString();
                });
                // Handle process completion
                return new Promise((resolve, reject) => {
                    ytdlpProcess.on('close', (code) => {
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
                        }
                        else {
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
                    ytdlpProcess.on('close', () => {
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
            }
            catch (error) {
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
        });
    }
    /**
     * Get content type based on file extension
     */
    static getContentType(ext) {
        const contentTypes = {
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
    static sanitizeFilename(filename) {
        return filename
            .replace(/[^\w\s-]/g, '') // Remove special characters
            .replace(/\s+/g, '_') // Replace spaces with underscores
            .substring(0, 100); // Limit length
    }
    /**
     * Check if format is supported
     */
    static isSupportedFormat(ext) {
        return this.SUPPORTED_FORMATS.includes(ext.toLowerCase());
    }
    /**
     * Get available formats for a video
     */
    static getAvailableFormats(url) {
        return __awaiter(this, void 0, void 0, function* () {
            const videoInfo = yield this.getVideoInfo(url);
            return videoInfo.formats.filter(format => format.ext && this.isSupportedFormat(format.ext));
        });
    }
}
exports.StreamingService = StreamingService;
StreamingService.DEFAULT_BUFFER_SIZE = 64 * 1024; // 64KB
StreamingService.DEFAULT_TIMEOUT = 30 * 60 * 1000; // 30 minutes
StreamingService.SUPPORTED_FORMATS = ['mp4', 'webm', 'mkv', 'avi', 'mov', 'm4a', 'mp3', 'wav'];
exports.default = StreamingService;
