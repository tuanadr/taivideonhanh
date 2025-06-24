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
     * Detect available cookie authentication methods for YouTube
     */
    static detectCookieAuth() {
        return __awaiter(this, void 0, void 0, function* () {
            // Try browser cookie extraction first (only on platforms that support it)
            const platform = process.platform;
            const supportedPlatforms = ['win32', 'darwin', 'linux'];
            if (supportedPlatforms.includes(platform)) {
                for (const browser of this.SUPPORTED_BROWSERS) {
                    try {
                        const testResult = yield this.testBrowserCookies(browser);
                        if (testResult.success) {
                            console.log(`✅ Cookie authentication available via ${browser}`);
                            return {
                                success: true,
                                method: 'browser',
                                error: undefined
                            };
                        }
                        else {
                            console.log(`❌ Browser ${browser} cookies not available: ${testResult.error}`);
                        }
                    }
                    catch (error) {
                        console.log(`❌ Browser ${browser} test failed:`, error instanceof Error ? error.message : 'Unknown error');
                    }
                }
            }
            else {
                console.log(`⚠️ Platform ${platform} not supported for browser cookie extraction`);
            }
            // Try cookies file if browser extraction fails
            try {
                const fs = require('fs');
                if (fs.existsSync(this.COOKIES_FILE_PATH)) {
                    console.log(`✅ Cookie file found at ${this.COOKIES_FILE_PATH}`);
                    return {
                        success: true,
                        method: 'file',
                        error: undefined
                    };
                }
                else {
                    console.log(`ℹ️ Cookie file not found at ${this.COOKIES_FILE_PATH}`);
                }
            }
            catch (error) {
                console.log(`❌ Cookie file not accessible:`, error instanceof Error ? error.message : 'Unknown error');
            }
            console.log(`ℹ️ No cookie authentication methods available, proceeding without cookies`);
            return {
                success: false,
                method: 'none',
                error: 'No cookie authentication methods available'
            };
        });
    }
    /**
     * Test if browser cookies are available and working
     */
    static testBrowserCookies(browser) {
        return __awaiter(this, void 0, void 0, function* () {
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
                const ytdlp = (0, child_process_1.spawn)('yt-dlp', testArgs);
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
                    }
                    else if (errorOutput.includes('unsupported platform')) {
                        resolve({
                            success: false,
                            method: 'browser',
                            error: `Browser ${browser} not supported on this platform`
                        });
                    }
                    else if (code === 0 || hasOutput) {
                        resolve({ success: true, method: 'browser' });
                    }
                    else {
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
        });
    }
    /**
     * Smart cookie authentication setup with production-ready fallback
     */
    static setupCookieAuth(ytdlpArgs) {
        return __awaiter(this, void 0, void 0, function* () {
            // Check if cookie authentication is enabled
            if (!this.ENABLE_COOKIE_AUTH) {
                console.log('ℹ️ Cookie authentication disabled via ENABLE_COOKIE_AUTH=false');
                return false;
            }
            // Skip cookie authentication in environments where it's not available
            const skipCookieAuth = process.env.SKIP_COOKIE_AUTH === 'true' ||
                process.env.NODE_ENV === 'test' ||
                !process.env.DISPLAY; // No display available (headless)
            if (skipCookieAuth) {
                console.log('ℹ️ Cookie authentication skipped (environment not suitable)');
                return false;
            }
            try {
                const cookieAuth = yield this.detectCookieAuth();
                if (cookieAuth.success) {
                    if (cookieAuth.method === 'browser') {
                        // Try each browser until one works
                        for (const browser of this.SUPPORTED_BROWSERS) {
                            try {
                                const testResult = yield this.testBrowserCookies(browser);
                                if (testResult.success) {
                                    ytdlpArgs.push('--cookies-from-browser', browser);
                                    console.log(`🍪 Using ${browser} cookies for authentication`);
                                    return true;
                                }
                            }
                            catch (browserError) {
                                console.log(`⚠️ Browser ${browser} test failed:`, browserError instanceof Error ? browserError.message : 'Unknown error');
                                continue; // Try next browser
                            }
                        }
                    }
                    else if (cookieAuth.method === 'file') {
                        ytdlpArgs.push('--cookies', this.COOKIES_FILE_PATH);
                        console.log(`🍪 Using cookie file for authentication`);
                        return true;
                    }
                }
                console.log('ℹ️ No cookie authentication available, proceeding without cookies (this is normal for most videos)');
                return false;
            }
            catch (error) {
                console.log('ℹ️ Cookie authentication setup failed, proceeding without cookies:', error instanceof Error ? error.message : 'Unknown error');
                return false;
            }
        });
    }
    /**
     * Get video information using yt-dlp with enhanced error handling and platform-specific optimizations
     */
    static getVideoInfo(url_1) {
        return __awaiter(this, arguments, void 0, function* (url, useCookieAuth = true) {
            return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
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
                    cookieAuthUsed = yield this.setupCookieAuth(ytdlpArgs);
                }
                // Platform-specific optimizations
                if (isYouTube) {
                    ytdlpArgs.push('--extractor-args', 'youtube:skip=dash,hls', '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
                }
                else if (isTikTok) {
                    ytdlpArgs.push('--user-agent', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1');
                }
                ytdlpArgs.push(url);
                console.log('yt-dlp getVideoInfo args:', ytdlpArgs);
                const ytdlp = (0, child_process_1.spawn)('yt-dlp', ytdlpArgs);
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
                    console.log(`yt-dlp getVideoInfo exit code: ${code}`);
                    if (errorData) {
                        console.log('yt-dlp getVideoInfo stderr:', errorData);
                    }
                    if (code !== 0) {
                        // Enhanced error handling for specific platforms
                        let errorMessage = `Failed to fetch video info: ${errorData}`;
                        if (isYouTube && errorData.includes('Sign in to confirm')) {
                            if (cookieAuthUsed) {
                                errorMessage = 'YouTube yêu cầu xác thực nâng cao. Cookies hiện tại không đủ quyền. Vui lòng đăng nhập YouTube trên trình duyệt và thử lại.';
                            }
                            else {
                                errorMessage = 'YouTube yêu cầu xác thực cookies. Video này có thể bị hạn chế. Vui lòng thử video khác hoặc liên hệ hỗ trợ để cài đặt cookie authentication.';
                            }
                        }
                        else if (isYouTube && errorData.includes('cookies')) {
                            errorMessage = 'Lỗi xác thực YouTube cookies. Hệ thống đang hoạt động bình thường cho hầu hết video. Nếu gặp lỗi liên tục, vui lòng liên hệ hỗ trợ.';
                        }
                        else if (isTikTok && errorData.includes('Unable to extract')) {
                            errorMessage = 'Không thể trích xuất video TikTok. Video có thể bị riêng tư hoặc đã bị xóa.';
                        }
                        else if (errorData.includes('Video unavailable')) {
                            errorMessage = 'Video không khả dụng hoặc đã bị xóa.';
                        }
                        else if (errorData.includes('Private video')) {
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
                        console.error('JSON parse error:', parseError);
                        reject(new Error('Failed to parse video info'));
                    }
                });
                // Set timeout
                setTimeout(() => {
                    ytdlp.kill('SIGTERM');
                    reject(new Error('Video info extraction timeout'));
                }, 45000); // Increased timeout for better reliability
            }));
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
                const { videoUrl, formatId, title, userAgent, referer, bufferSize = this.DEFAULT_BUFFER_SIZE, timeout = this.DEFAULT_TIMEOUT, useCookies = true } = options;
                // Validate format
                const videoInfo = yield this.getVideoInfo(videoUrl, useCookies);
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
                }
                else {
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
                    cookieAuthUsed = yield this.setupCookieAuth(ytdlpArgs);
                }
                // Platform-specific optimizations
                if (isYouTube) {
                    ytdlpArgs.push('--merge-output-format', 'mp4', '--audio-format', 'mp3', '--embed-audio', '--extractor-args', 'youtube:skip=dash,hls', '--user-agent', userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
                }
                else if (isTikTok) {
                    ytdlpArgs.push('--user-agent', userAgent || 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1');
                }
                else {
                    // Default for other platforms
                    ytdlpArgs.push('--merge-output-format', 'mp4', '--audio-format', 'mp3', '--embed-audio');
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
                // Handle stderr for errors with enhanced error detection
                let errorOutput = '';
                (_b = ytdlpProcess.stderr) === null || _b === void 0 ? void 0 : _b.on('data', (data) => {
                    const errorText = data.toString();
                    errorOutput += errorText;
                    console.error('yt-dlp stderr:', errorText);
                    // Real-time error detection for faster failure response
                    if (errorText.includes('Sign in to confirm') && isYouTube) {
                        console.error('YouTube authentication required');
                    }
                    else if (errorText.includes('Unable to extract') && isTikTok) {
                        console.error('TikTok extraction failed');
                    }
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
                            // Enhanced error messages based on platform and error type
                            let userFriendlyError = 'Video streaming failed';
                            if (isYouTube && errorOutput.includes('Sign in to confirm')) {
                                userFriendlyError = 'YouTube yêu cầu xác thực. Video có thể bị hạn chế hoặc cần đăng nhập. Vui lòng thử video khác.';
                            }
                            else if (isTikTok && errorOutput.includes('Unable to extract')) {
                                userFriendlyError = 'Không thể tải video TikTok. Video có thể bị riêng tư hoặc đã bị xóa.';
                            }
                            else if (errorOutput.includes('Video unavailable')) {
                                userFriendlyError = 'Video không khả dụng hoặc đã bị xóa.';
                            }
                            else if (errorOutput.includes('Private video')) {
                                userFriendlyError = 'Video này ở chế độ riêng tư.';
                            }
                            else if (errorOutput.includes('network')) {
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
    /**
     * Get video info with fallback strategies for different platforms
     */
    static getVideoInfoWithFallback(url) {
        return __awaiter(this, void 0, void 0, function* () {
            const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');
            const isTikTok = url.includes('tiktok.com');
            try {
                // First attempt with standard method
                return yield this.getVideoInfo(url);
            }
            catch (error) {
                console.log('First attempt failed, trying fallback methods...');
                if (isYouTube) {
                    // YouTube fallback: try with different extractor args
                    try {
                        return yield this.getVideoInfoYouTubeFallback(url);
                    }
                    catch (fallbackError) {
                        console.error('YouTube fallback also failed:', fallbackError);
                        throw error; // Throw original error
                    }
                }
                else if (isTikTok) {
                    // TikTok fallback: try with different user agent
                    try {
                        return yield this.getVideoInfoTikTokFallback(url);
                    }
                    catch (fallbackError) {
                        console.error('TikTok fallback also failed:', fallbackError);
                        throw error; // Throw original error
                    }
                }
                throw error;
            }
        });
    }
    /**
     * YouTube-specific fallback method with cookie authentication
     */
    static getVideoInfoYouTubeFallback(url) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                const ytdlpArgs = [
                    '--dump-json',
                    '--no-warnings',
                    '--no-check-certificates',
                    '--ignore-errors',
                ];
                // Try cookie authentication first in fallback
                const cookieAuthUsed = yield this.setupCookieAuth(ytdlpArgs);
                ytdlpArgs.push('--extractor-args', 'youtube:skip=dash', '--user-agent', 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)', url);
                console.log('YouTube fallback yt-dlp args:', ytdlpArgs);
                const ytdlp = (0, child_process_1.spawn)('yt-dlp', ytdlpArgs);
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
                        reject(new Error('Failed to parse YouTube fallback video info'));
                    }
                });
                setTimeout(() => {
                    ytdlp.kill('SIGTERM');
                    reject(new Error('YouTube fallback timeout'));
                }, 45000);
            }));
        });
    }
    /**
     * TikTok-specific fallback method
     */
    static getVideoInfoTikTokFallback(url) {
        return __awaiter(this, void 0, void 0, function* () {
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
                const ytdlp = (0, child_process_1.spawn)('yt-dlp', ytdlpArgs);
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
                        reject(new Error('Failed to parse TikTok fallback video info'));
                    }
                });
                setTimeout(() => {
                    ytdlp.kill('SIGTERM');
                    reject(new Error('TikTok fallback timeout'));
                }, 45000);
            });
        });
    }
}
exports.StreamingService = StreamingService;
StreamingService.DEFAULT_BUFFER_SIZE = 64 * 1024; // 64KB
StreamingService.DEFAULT_TIMEOUT = 30 * 60 * 1000; // 30 minutes
StreamingService.SUPPORTED_FORMATS = ['mp4', 'webm', 'mkv', 'avi', 'mov', 'm4a', 'mp3', 'wav'];
StreamingService.SUPPORTED_BROWSERS = ['chrome', 'firefox', 'safari', 'edge'];
StreamingService.COOKIES_FILE_PATH = process.env.YOUTUBE_COOKIES_PATH || '/tmp/youtube-cookies.txt';
StreamingService.ENABLE_COOKIE_AUTH = process.env.ENABLE_COOKIE_AUTH !== 'false'; // Default enabled
exports.default = StreamingService;
