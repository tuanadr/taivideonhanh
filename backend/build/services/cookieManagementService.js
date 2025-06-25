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
exports.CookieManagementService = void 0;
const axios_1 = __importDefault(require("axios"));
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const child_process_1 = require("child_process");
/**
 * Cookie Management Service for multi-platform video downloading
 * Integrates with Firefox service for automated cookie extraction
 */
class CookieManagementService {
    /**
     * Initialize cookie management service
     */
    static initialize() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Create directories
                yield promises_1.default.mkdir(this.COOKIES_DIR, { recursive: true });
                yield promises_1.default.mkdir(this.BACKUP_DIR, { recursive: true });
                console.log('🍪 Cookie Management Service initialized');
                console.log(`📁 Cookies directory: ${this.COOKIES_DIR}`);
                console.log(`🦊 Firefox service: ${this.firefoxConfig.baseUrl}`);
                // Test Firefox service connection
                yield this.testFirefoxConnection();
                // Load existing cookies and validate
                yield this.validateAllCookies();
            }
            catch (error) {
                console.error('❌ Failed to initialize Cookie Management Service:', error);
                throw error;
            }
        });
    }
    /**
     * Test connection to Firefox service
     */
    static testFirefoxConnection() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield axios_1.default.get(`${this.firefoxConfig.baseUrl}/health`, {
                    timeout: this.firefoxConfig.timeout
                });
                if (response.status === 200) {
                    console.log('✅ Firefox service connection successful');
                    return true;
                }
            }
            catch (error) {
                console.warn('⚠️ Firefox service not available:', error instanceof Error ? error.message : 'Unknown error');
                console.log('📝 Will fallback to manual cookie management');
            }
            return false;
        });
    }
    /**
     * Extract cookies from Firefox service for a specific platform
     */
    static extractCookiesFromFirefox(platform, credentials) {
        return __awaiter(this, void 0, void 0, function* () {
            const platformConfig = this.PLATFORMS[platform];
            if (!platformConfig) {
                throw new Error(`Unsupported platform: ${platform}`);
            }
            try {
                console.log(`🔄 Extracting cookies for ${platformConfig.name} from Firefox service...`);
                // Request cookie extraction from Firefox service
                const extractionRequest = {
                    platform: platform,
                    credentials: credentials,
                    headless: true,
                    testAfterExtraction: true
                };
                const response = yield axios_1.default.post(`${this.firefoxConfig.baseUrl}/extract-cookies`, extractionRequest, {
                    timeout: 120000, // 2 minutes for login process
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                if (response.data.success) {
                    const cookies = response.data.cookies;
                    console.log(`✅ Successfully extracted ${cookies.length} cookies for ${platformConfig.name}`);
                    // Save cookies to file
                    yield this.saveCookiesToFile(platform, cookies);
                    // Validate extracted cookies
                    const validation = yield this.validateCookies(platform);
                    if (validation.isValid) {
                        console.log(`✅ Cookies validated successfully for ${platformConfig.name}`);
                        return cookies;
                    }
                    else {
                        throw new Error(`Cookie validation failed: ${validation.error}`);
                    }
                }
                else {
                    throw new Error(response.data.error || 'Cookie extraction failed');
                }
            }
            catch (error) {
                console.error(`❌ Failed to extract cookies for ${platform}:`, error);
                throw error;
            }
        });
    }
    /**
     * Save cookies to Netscape format file
     */
    static saveCookiesToFile(platform, cookies) {
        return __awaiter(this, void 0, void 0, function* () {
            const filePath = path_1.default.join(this.COOKIES_DIR, `${platform}-cookies.txt`);
            const backupPath = path_1.default.join(this.BACKUP_DIR, `${platform}-cookies-${Date.now()}.txt`);
            // Create Netscape format content
            let content = '# Netscape HTTP Cookie File\n';
            content += '# This is a generated file! Do not edit.\n\n';
            for (const cookie of cookies) {
                const expires = cookie.expires || Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60); // 1 year default
                const line = [
                    cookie.domain,
                    cookie.domain.startsWith('.') ? 'TRUE' : 'FALSE',
                    cookie.path || '/',
                    cookie.secure ? 'TRUE' : 'FALSE',
                    expires.toString(),
                    cookie.name,
                    cookie.value
                ].join('\t');
                content += line + '\n';
            }
            try {
                // Backup existing file if it exists
                try {
                    yield promises_1.default.access(filePath);
                    yield promises_1.default.copyFile(filePath, backupPath);
                    console.log(`📦 Backed up existing cookies to ${backupPath}`);
                }
                catch (_b) {
                    // File doesn't exist, no backup needed
                }
                // Write new cookie file
                yield promises_1.default.writeFile(filePath, content, 'utf8');
                console.log(`💾 Saved ${cookies.length} cookies to ${filePath}`);
            }
            catch (error) {
                console.error(`❌ Failed to save cookies for ${platform}:`, error);
                throw error;
            }
        });
    }
    /**
     * Validate cookies by testing with yt-dlp
     */
    static validateCookies(platform) {
        return __awaiter(this, void 0, void 0, function* () {
            const platformConfig = this.PLATFORMS[platform];
            const cookieFile = path_1.default.join(this.COOKIES_DIR, `${platform}-cookies.txt`);
            try {
                // Check if cookie file exists
                yield promises_1.default.access(cookieFile);
                return new Promise((resolve) => {
                    const args = [
                        '--cookies', cookieFile,
                        '--dump-json',
                        '--quiet',
                        '--simulate',
                        '--no-warnings',
                        platformConfig.testUrl
                    ];
                    const ytdlp = (0, child_process_1.spawn)('yt-dlp', args);
                    let output = '';
                    let error = '';
                    ytdlp.stdout.on('data', (data) => {
                        output += data.toString();
                    });
                    ytdlp.stderr.on('data', (data) => {
                        error += data.toString();
                    });
                    ytdlp.on('close', (code) => {
                        var _b;
                        if (code === 0 && output) {
                            try {
                                const info = JSON.parse(output);
                                const formatCount = ((_b = info.formats) === null || _b === void 0 ? void 0 : _b.length) || 0;
                                resolve({
                                    isValid: true,
                                    platform: platformConfig.name,
                                    formatCount: formatCount,
                                    expiresAt: new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)) // Assume 30 days
                                });
                            }
                            catch (_c) {
                                resolve({
                                    isValid: false,
                                    platform: platformConfig.name,
                                    error: 'Invalid JSON response'
                                });
                            }
                        }
                        else {
                            resolve({
                                isValid: false,
                                platform: platformConfig.name,
                                error: error || `Exit code: ${code}`
                            });
                        }
                    });
                });
            }
            catch (error) {
                return {
                    isValid: false,
                    platform: platformConfig.name,
                    error: `Cookie file not found: ${cookieFile}`
                };
            }
        });
    }
    /**
     * Validate all platform cookies
     */
    static validateAllCookies() {
        return __awaiter(this, void 0, void 0, function* () {
            const results = {};
            for (const platform of Object.keys(this.PLATFORMS)) {
                try {
                    results[platform] = yield this.validateCookies(platform);
                    if (results[platform].isValid) {
                        console.log(`✅ ${this.PLATFORMS[platform].name}: ${results[platform].formatCount} formats available`);
                    }
                    else {
                        console.log(`❌ ${this.PLATFORMS[platform].name}: ${results[platform].error}`);
                    }
                }
                catch (error) {
                    results[platform] = {
                        isValid: false,
                        platform: this.PLATFORMS[platform].name,
                        error: error instanceof Error ? error.message : 'Unknown error'
                    };
                }
            }
            return results;
        });
    }
    /**
     * Get cookie file path for a platform
     */
    static getCookieFilePath(platform) {
        if (!this.PLATFORMS[platform]) {
            return null;
        }
        return path_1.default.join(this.COOKIES_DIR, `${platform}-cookies.txt`);
    }
    /**
     * Detect platform from URL
     */
    static detectPlatform(url) {
        for (const [platform, config] of Object.entries(this.PLATFORMS)) {
            for (const domain of config.domains) {
                if (url.includes(domain.replace('.', ''))) {
                    return platform;
                }
            }
        }
        return null;
    }
    /**
     * Auto-refresh expired cookies
     */
    static autoRefreshCookies() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('🔄 Starting auto-refresh for expired cookies...');
            const validationResults = yield this.validateAllCookies();
            for (const [platform, result] of Object.entries(validationResults)) {
                if (!result.isValid) {
                    console.log(`🔄 Attempting to refresh cookies for ${result.platform}...`);
                    try {
                        // Try to extract fresh cookies from Firefox service
                        yield this.extractCookiesFromFirefox(platform);
                        console.log(`✅ Successfully refreshed cookies for ${result.platform}`);
                    }
                    catch (error) {
                        console.error(`❌ Failed to refresh cookies for ${result.platform}:`, error);
                    }
                }
            }
        });
    }
    /**
     * Get supported platforms
     */
    static getSupportedPlatforms() {
        return Object.keys(this.PLATFORMS);
    }
    /**
     * Get platform configuration
     */
    static getPlatformConfig(platform) {
        return this.PLATFORMS[platform] || null;
    }
}
exports.CookieManagementService = CookieManagementService;
_a = CookieManagementService;
CookieManagementService.COOKIES_DIR = '/tmp/cookies';
CookieManagementService.BACKUP_DIR = '/tmp/cookies/backup';
CookieManagementService.FIREFOX_SERVICE_URL = process.env.FIREFOX_SERVICE_URL || 'http://firefox:3000';
CookieManagementService.PLATFORMS = {
    youtube: {
        name: 'YouTube',
        domains: ['.youtube.com', 'youtube.com'],
        loginUrl: 'https://accounts.google.com/signin',
        testUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        requiredCookies: ['VISITOR_INFO1_LIVE', 'YSC', 'CONSENT'],
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    },
    facebook: {
        name: 'Facebook',
        domains: ['.facebook.com', 'facebook.com'],
        loginUrl: 'https://www.facebook.com/login',
        testUrl: 'https://www.facebook.com/watch/?v=123456789',
        requiredCookies: ['c_user', 'xs', 'datr'],
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    },
    instagram: {
        name: 'Instagram',
        domains: ['.instagram.com', 'instagram.com'],
        loginUrl: 'https://www.instagram.com/accounts/login/',
        testUrl: 'https://www.instagram.com/p/test/',
        requiredCookies: ['sessionid', 'csrftoken', 'ds_user_id'],
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
    },
    tiktok: {
        name: 'TikTok',
        domains: ['.tiktok.com', 'tiktok.com'],
        loginUrl: 'https://www.tiktok.com/login',
        testUrl: 'https://www.tiktok.com/@test/video/123456789',
        requiredCookies: ['sessionid', 'tt_webid', 'ttwid'],
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
    },
    twitter: {
        name: 'Twitter/X',
        domains: ['.twitter.com', 'twitter.com', '.x.com', 'x.com'],
        loginUrl: 'https://twitter.com/i/flow/login',
        testUrl: 'https://twitter.com/test/status/123456789',
        requiredCookies: ['auth_token', 'ct0', 'twid'],
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
};
CookieManagementService.firefoxConfig = {
    baseUrl: _a.FIREFOX_SERVICE_URL,
    timeout: 30000,
    retryAttempts: 3
};
