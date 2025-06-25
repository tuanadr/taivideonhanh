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
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CookieService = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const util_1 = require("util");
const writeFile = (0, util_1.promisify)(fs_1.default.writeFile);
const readFile = (0, util_1.promisify)(fs_1.default.readFile);
const unlink = (0, util_1.promisify)(fs_1.default.unlink);
const access = (0, util_1.promisify)(fs_1.default.access);
const mkdir = (0, util_1.promisify)(fs_1.default.mkdir);
class CookieService {
    /**
     * Initialize cookie directories
     */
    static initializeDirectories() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Create main cookies directory
                yield mkdir(this.COOKIES_DIR, { recursive: true });
                // Create backup directory
                yield mkdir(this.BACKUP_DIR, { recursive: true });
                // Set secure permissions
                if (process.platform !== 'win32') {
                    const { exec } = require('child_process');
                    exec(`chmod 700 ${this.COOKIES_DIR}`);
                    exec(`chmod 700 ${this.BACKUP_DIR}`);
                }
                console.log('Cookie directories initialized successfully');
            }
            catch (error) {
                console.error('Failed to initialize cookie directories:', error);
                throw new Error('Cookie directory initialization failed');
            }
        });
    }
    /**
     * Validate uploaded cookie file
     */
    static validateCookieFile(fileBuffer, filename) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Check file size
                if (fileBuffer.length > this.MAX_FILE_SIZE) {
                    return {
                        isValid: false,
                        error: `File size exceeds maximum allowed size of ${this.MAX_FILE_SIZE / 1024 / 1024}MB`
                    };
                }
                // Check file extension
                const ext = path_1.default.extname(filename).toLowerCase();
                if (!this.ALLOWED_EXTENSIONS.includes(ext)) {
                    return {
                        isValid: false,
                        error: `Invalid file extension. Allowed extensions: ${this.ALLOWED_EXTENSIONS.join(', ')}`
                    };
                }
                // Convert buffer to string and validate content
                const content = fileBuffer.toString('utf8');
                // Basic cookie file format validation
                const lines = content.split('\n').filter(line => line.trim() && !line.startsWith('#'));
                if (lines.length === 0) {
                    return {
                        isValid: false,
                        error: 'Cookie file appears to be empty or contains no valid cookies'
                    };
                }
                // Check for popular platform cookies
                const supportedDomains = [
                    'youtube.com', '.youtube.com',
                    'tiktok.com', '.tiktok.com',
                    'facebook.com', '.facebook.com',
                    'instagram.com', '.instagram.com',
                    'twitter.com', '.twitter.com', 'x.com', '.x.com',
                    'twitch.tv', '.twitch.tv',
                    'vimeo.com', '.vimeo.com',
                    'dailymotion.com', '.dailymotion.com'
                ];
                const foundDomains = supportedDomains.filter(domain => lines.some(line => line.includes(domain)));
                const hasRequiredDomains = foundDomains.length > 0;
                // Validate cookie format (basic check for tab-separated values)
                const invalidLines = lines.filter(line => {
                    const parts = line.split('\t');
                    return parts.length < 6; // Basic cookie format should have at least 6 fields
                });
                if (invalidLines.length > 0) {
                    return {
                        isValid: false,
                        error: `Invalid cookie format detected in ${invalidLines.length} lines`
                    };
                }
                return {
                    isValid: true,
                    lineCount: lines.length,
                    hasRequiredDomains,
                    supportedPlatforms: foundDomains.map(domain => domain.replace(/^\./, ''))
                };
            }
            catch (error) {
                return {
                    isValid: false,
                    error: `Cookie validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
                };
            }
        });
    }
    /**
     * Save cookie file
     */
    static saveCookieFile(fileBuffer, filename) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Validate file first
                const validation = yield this.validateCookieFile(fileBuffer, filename);
                if (!validation.isValid) {
                    throw new Error(validation.error);
                }
                // Initialize directories if they don't exist
                yield this.initializeDirectories();
                // Backup existing cookie file if it exists
                yield this.backupExistingCookie();
                // Save new cookie file
                yield writeFile(this.COOKIES_FILE, fileBuffer);
                // Set secure permissions
                if (process.platform !== 'win32') {
                    const { exec } = require('child_process');
                    exec(`chmod 600 ${this.COOKIES_FILE}`);
                }
                const stats = fs_1.default.statSync(this.COOKIES_FILE);
                console.log(`Cookie file saved successfully: ${this.COOKIES_FILE}`);
                return {
                    filename: path_1.default.basename(this.COOKIES_FILE),
                    size: stats.size,
                    uploadedAt: new Date(),
                    isValid: true,
                    lastValidated: new Date()
                };
            }
            catch (error) {
                console.error('Failed to save cookie file:', error);
                throw new Error(`Cookie file save failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        });
    }
    /**
     * Get current cookie file info
     */
    static getCurrentCookieInfo() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield access(this.COOKIES_FILE);
                const stats = fs_1.default.statSync(this.COOKIES_FILE);
                // Quick validation
                const content = yield readFile(this.COOKIES_FILE, 'utf8');
                const validation = yield this.validateCookieFile(Buffer.from(content), path_1.default.basename(this.COOKIES_FILE));
                return {
                    filename: path_1.default.basename(this.COOKIES_FILE),
                    size: stats.size,
                    uploadedAt: stats.mtime,
                    isValid: validation.isValid,
                    lastValidated: new Date()
                };
            }
            catch (error) {
                return null;
            }
        });
    }
    /**
     * Delete current cookie file
     */
    static deleteCookieFile() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield access(this.COOKIES_FILE);
                // Backup before deletion
                yield this.backupExistingCookie();
                // Delete the file
                yield unlink(this.COOKIES_FILE);
                console.log('Cookie file deleted successfully');
            }
            catch (error) {
                if (error.code !== 'ENOENT') {
                    throw new Error(`Failed to delete cookie file: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
            }
        });
    }
    /**
     * Backup existing cookie file
     */
    static backupExistingCookie() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield access(this.COOKIES_FILE);
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const backupPath = path_1.default.join(this.BACKUP_DIR, `youtube-cookies-${timestamp}.txt`);
                const content = yield readFile(this.COOKIES_FILE);
                yield writeFile(backupPath, content);
                console.log(`Cookie file backed up to: ${backupPath}`);
            }
            catch (error) {
                // If file doesn't exist, no need to backup
                if (error.code !== 'ENOENT') {
                    console.warn('Failed to backup existing cookie file:', error);
                }
            }
        });
    }
    /**
     * Test cookie file with yt-dlp using multiple platforms
     */
    static testCookieFile() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { spawn } = require('child_process');
                // Test URLs for different platforms
                const testUrls = [
                    { platform: 'YouTube', url: 'https://www.youtube.com/watch?v=jNQXAC9IVRw' },
                    { platform: 'TikTok', url: 'https://www.tiktok.com/@test/video/1234567890' },
                ];
                // Test with YouTube first (most common)
                const primaryTest = testUrls[0];
                return new Promise((resolve) => {
                    const ytdlp = spawn('yt-dlp', [
                        '--cookies', this.COOKIES_FILE,
                        '--dump-json',
                        '--no-warnings',
                        '--no-check-certificates',
                        '--simulate', // Don't actually download, just test access
                        primaryTest.url
                    ]);
                    let output = '';
                    let errorOutput = '';
                    ytdlp.stdout.on('data', (data) => {
                        output += data.toString();
                    });
                    ytdlp.stderr.on('data', (data) => {
                        errorOutput += data.toString();
                    });
                    ytdlp.on('close', (code) => {
                        if (code === 0 && output.trim()) {
                            resolve({
                                success: true,
                                testedPlatforms: [primaryTest.platform]
                            });
                        }
                        else {
                            resolve({
                                success: false,
                                error: errorOutput || `Cookie test failed for ${primaryTest.platform}`,
                                testedPlatforms: []
                            });
                        }
                    });
                    // Timeout after 30 seconds
                    setTimeout(() => {
                        ytdlp.kill();
                        resolve({
                            success: false,
                            error: 'Cookie test timeout'
                        });
                    }, 30000);
                });
            }
            catch (error) {
                return {
                    success: false,
                    error: `Cookie test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                    testedPlatforms: []
                };
            }
        });
    }
    /**
     * Get cookie file path for yt-dlp
     */
    static getCookieFilePath() {
        return this.COOKIES_FILE;
    }
    /**
     * Check if cookie file exists
     */
    static cookieFileExists() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield access(this.COOKIES_FILE);
                return true;
            }
            catch (_b) {
                return false;
            }
        });
    }
}
exports.CookieService = CookieService;
_a = CookieService;
CookieService.COOKIES_DIR = process.env.COOKIES_PATH
    ? path_1.default.dirname(process.env.COOKIES_PATH)
    : process.env.YOUTUBE_COOKIES_PATH
        ? path_1.default.dirname(process.env.YOUTUBE_COOKIES_PATH)
        : '/tmp/cookies';
CookieService.COOKIES_FILE = process.env.COOKIES_PATH || process.env.YOUTUBE_COOKIES_PATH || '/tmp/cookies/platform-cookies.txt';
CookieService.BACKUP_DIR = path_1.default.join(_a.COOKIES_DIR, 'backup');
CookieService.MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
CookieService.ALLOWED_EXTENSIONS = ['.txt'];
exports.default = CookieService;
