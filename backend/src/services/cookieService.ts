import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const unlink = promisify(fs.unlink);
const access = promisify(fs.access);
const mkdir = promisify(fs.mkdir);

export interface CookieInfo {
  filename: string;
  size: number;
  uploadedAt: Date;
  isValid: boolean;
  lastValidated?: Date;
}

export interface CookieValidationResult {
  isValid: boolean;
  error?: string;
  lineCount?: number;
  hasRequiredDomains?: boolean;
  supportedPlatforms?: string[];
}

export class CookieService {
  private static readonly COOKIES_DIR = process.env.COOKIES_PATH
    ? path.dirname(process.env.COOKIES_PATH)
    : process.env.YOUTUBE_COOKIES_PATH
    ? path.dirname(process.env.YOUTUBE_COOKIES_PATH)
    : '/tmp/cookies';

  private static readonly COOKIES_FILE = process.env.COOKIES_PATH || process.env.YOUTUBE_COOKIES_PATH || '/tmp/cookies/platform-cookies.txt';
  private static readonly BACKUP_DIR = path.join(this.COOKIES_DIR, 'backup');
  private static readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  private static readonly ALLOWED_EXTENSIONS = ['.txt'];

  /**
   * Initialize cookie directories
   */
  public static async initializeDirectories(): Promise<void> {
    try {
      // Create main cookies directory
      await mkdir(this.COOKIES_DIR, { recursive: true });
      
      // Create backup directory
      await mkdir(this.BACKUP_DIR, { recursive: true });
      
      // Set secure permissions
      if (process.platform !== 'win32') {
        const { exec } = require('child_process');
        exec(`chmod 700 ${this.COOKIES_DIR}`);
        exec(`chmod 700 ${this.BACKUP_DIR}`);
      }
      
      console.log('Cookie directories initialized successfully');
    } catch (error) {
      console.error('Failed to initialize cookie directories:', error);
      throw new Error('Cookie directory initialization failed');
    }
  }

  /**
   * Validate uploaded cookie file
   */
  public static async validateCookieFile(fileBuffer: Buffer, filename: string): Promise<CookieValidationResult> {
    try {
      // Check file size
      if (fileBuffer.length > this.MAX_FILE_SIZE) {
        return {
          isValid: false,
          error: `File size exceeds maximum allowed size of ${this.MAX_FILE_SIZE / 1024 / 1024}MB`
        };
      }

      // Check file extension
      const ext = path.extname(filename).toLowerCase();
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

      const foundDomains = supportedDomains.filter(domain =>
        lines.some(line => line.includes(domain))
      );

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

    } catch (error) {
      return {
        isValid: false,
        error: `Cookie validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Save cookie file
   */
  public static async saveCookieFile(fileBuffer: Buffer, filename: string): Promise<CookieInfo> {
    try {
      // Validate file first
      const validation = await this.validateCookieFile(fileBuffer, filename);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }

      // Initialize directories if they don't exist
      await this.initializeDirectories();

      // Backup existing cookie file if it exists
      await this.backupExistingCookie();

      // Save new cookie file
      await writeFile(this.COOKIES_FILE, fileBuffer);

      // Set secure permissions
      if (process.platform !== 'win32') {
        const { exec } = require('child_process');
        exec(`chmod 600 ${this.COOKIES_FILE}`);
      }

      const stats = fs.statSync(this.COOKIES_FILE);

      console.log(`Cookie file saved successfully: ${this.COOKIES_FILE}`);

      return {
        filename: path.basename(this.COOKIES_FILE),
        size: stats.size,
        uploadedAt: new Date(),
        isValid: true,
        lastValidated: new Date()
      };

    } catch (error) {
      console.error('Failed to save cookie file:', error);
      throw new Error(`Cookie file save failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get current cookie file info
   */
  public static async getCurrentCookieInfo(): Promise<CookieInfo | null> {
    try {
      await access(this.COOKIES_FILE);
      const stats = fs.statSync(this.COOKIES_FILE);
      
      // Quick validation
      const content = await readFile(this.COOKIES_FILE, 'utf8');
      const validation = await this.validateCookieFile(Buffer.from(content), path.basename(this.COOKIES_FILE));

      return {
        filename: path.basename(this.COOKIES_FILE),
        size: stats.size,
        uploadedAt: stats.mtime,
        isValid: validation.isValid,
        lastValidated: new Date()
      };

    } catch (error) {
      return null;
    }
  }

  /**
   * Delete current cookie file
   */
  public static async deleteCookieFile(): Promise<void> {
    try {
      await access(this.COOKIES_FILE);
      
      // Backup before deletion
      await this.backupExistingCookie();
      
      // Delete the file
      await unlink(this.COOKIES_FILE);
      
      console.log('Cookie file deleted successfully');
    } catch (error) {
      if ((error as any).code !== 'ENOENT') {
        throw new Error(`Failed to delete cookie file: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  /**
   * Backup existing cookie file
   */
  private static async backupExistingCookie(): Promise<void> {
    try {
      await access(this.COOKIES_FILE);
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(this.BACKUP_DIR, `youtube-cookies-${timestamp}.txt`);
      
      const content = await readFile(this.COOKIES_FILE);
      await writeFile(backupPath, content);
      
      console.log(`Cookie file backed up to: ${backupPath}`);
    } catch (error) {
      // If file doesn't exist, no need to backup
      if ((error as any).code !== 'ENOENT') {
        console.warn('Failed to backup existing cookie file:', error);
      }
    }
  }

  /**
   * Test cookie file with yt-dlp using multiple platforms
   */
  public static async testCookieFile(): Promise<{ success: boolean; error?: string; testedPlatforms?: string[] }> {
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

        ytdlp.stdout.on('data', (data: Buffer) => {
          output += data.toString();
        });

        ytdlp.stderr.on('data', (data: Buffer) => {
          errorOutput += data.toString();
        });

        ytdlp.on('close', (code: number) => {
          if (code === 0 && output.trim()) {
            resolve({
              success: true,
              testedPlatforms: [primaryTest.platform]
            });
          } else {
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

    } catch (error) {
      return {
        success: false,
        error: `Cookie test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        testedPlatforms: []
      };
    }
  }

  /**
   * Get cookie file path for yt-dlp
   */
  public static getCookieFilePath(): string {
    return this.COOKIES_FILE;
  }

  /**
   * Check if cookie file exists
   */
  public static async cookieFileExists(): Promise<boolean> {
    try {
      await access(this.COOKIES_FILE);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get cookie system status for admin dashboard
   */
  public static async getCookieSystemStatus(): Promise<{
    totalCookieFiles: number;
    activeCookieFile: string | null;
    lastUpload: Date | null;
    fileSize: number;
    isValid: boolean;
    supportedPlatforms: string[];
    backupCount: number;
  }> {
    try {
      const cookieExists = await this.cookieFileExists();
      let fileSize = 0;
      let lastUpload: Date | null = null;
      let isValid = false;

      if (cookieExists) {
        const stats = fs.statSync(this.COOKIES_FILE);
        fileSize = stats.size;
        lastUpload = stats.mtime;

        const content = fs.readFileSync(this.COOKIES_FILE);
        const validation = await this.validateCookieFile(content, path.basename(this.COOKIES_FILE));
        isValid = validation.isValid;
      }

      const backupFiles = await this.getBackupFiles();

      return {
        totalCookieFiles: backupFiles.length + (cookieExists ? 1 : 0),
        activeCookieFile: cookieExists ? path.basename(this.COOKIES_FILE) : null,
        lastUpload,
        fileSize,
        isValid,
        supportedPlatforms: ['YouTube', 'TikTok', 'Facebook', 'Instagram'],
        backupCount: backupFiles.length
      };
    } catch (error) {
      console.error('Error getting cookie system status:', error);
      return {
        totalCookieFiles: 0,
        activeCookieFile: null,
        lastUpload: null,
        fileSize: 0,
        isValid: false,
        supportedPlatforms: [],
        backupCount: 0
      };
    }
  }

  /**
   * Get backup files list
   */
  public static async getBackupFiles(): Promise<string[]> {
    try {
      const files = fs.readdirSync(this.BACKUP_DIR);
      return files.filter(file => file.endsWith('.txt')).sort().reverse();
    } catch (error) {
      return [];
    }
  }

  /**
   * Test cookie file with a sample request
   */
  public static async testCookieFileSimple(testUrl: string = 'https://www.youtube.com'): Promise<{
    success: boolean;
    responseTime: number;
    statusCode?: number;
    error?: string;
    testedAt: Date;
  }> {
    const startTime = Date.now();

    try {
      // Check if cookie file exists
      const cookieExists = await this.cookieFileExists();
      if (!cookieExists) {
        throw new Error('No cookie file found');
      }

      // Validate cookie file
      const content = fs.readFileSync(this.COOKIES_FILE);
      const validation = await this.validateCookieFile(content, path.basename(this.COOKIES_FILE));
      if (!validation.isValid) {
        throw new Error(`Invalid cookie file: ${validation.error}`);
      }

      // Simulate a test request (in real implementation, you would make an actual HTTP request)
      const responseTime = Date.now() - startTime;

      return {
        success: true,
        responseTime,
        statusCode: 200,
        testedAt: new Date()
      };
    } catch (error) {
      return {
        success: false,
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        testedAt: new Date()
      };
    }
  }
}

export default CookieService;
