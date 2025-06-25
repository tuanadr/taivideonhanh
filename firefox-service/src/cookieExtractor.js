const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs').promises;
const { spawn } = require('child_process');

class CookieExtractor {
  constructor() {
    this.cookiesPath = process.env.COOKIES_PATH || '/app/cookies';
    this.firefoxProfilePath = process.env.FIREFOX_PROFILE_PATH || '/app/firefox-profile';
    this.isInitialized = false;
  }

  async initialize() {
    try {
      // Create cookies directory
      await fs.mkdir(this.cookiesPath, { recursive: true });
      
      this.isInitialized = true;
      console.log('🍪 Cookie Extractor initialized');
    } catch (error) {
      console.error('❌ Cookie Extractor initialization failed:', error);
      throw error;
    }
  }

  /**
   * Extract cookies from Firefox session using Selenium
   */
  async extractCookies(sessionId, domains, format = 'netscape') {
    try {
      const firefoxManager = require('./firefoxManager');
      const session = firefoxManager.getSession(sessionId);
      
      let allCookies = [];
      
      // Extract cookies for each domain
      for (const domain of domains) {
        try {
          // Navigate to domain to ensure cookies are loaded
          await session.driver.get(`https://${domain.replace('.', '')}`);
          await this.delay(2000);
          
          // Get cookies from Selenium
          const domainCookies = await session.driver.manage().getCookies();
          
          // Filter cookies for this domain
          const filteredCookies = domainCookies.filter(cookie => 
            cookie.domain === domain || cookie.domain === domain.replace('.', '') ||
            cookie.domain.endsWith(domain) || domain.endsWith(cookie.domain)
          );
          
          allCookies.push(...filteredCookies);
          console.log(`🍪 Extracted ${filteredCookies.length} cookies for domain: ${domain}`);
        } catch (error) {
          console.warn(`⚠️ Failed to extract cookies for domain ${domain}:`, error.message);
        }
      }
      
      // Remove duplicates
      const uniqueCookies = this.removeDuplicateCookies(allCookies);
      
      // Convert to requested format
      if (format === 'netscape') {
        return this.convertToNetscapeFormat(uniqueCookies);
      } else if (format === 'json') {
        return uniqueCookies;
      } else {
        throw new Error(`Unsupported format: ${format}`);
      }
    } catch (error) {
      console.error(`❌ Cookie extraction failed for session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Extract cookies directly from Firefox profile database
   */
  async extractCookiesFromProfile(platform, domains) {
    try {
      const profilePath = path.join(this.firefoxProfilePath, platform);
      const cookiesDbPath = path.join(profilePath, 'cookies.sqlite');
      
      // Check if cookies database exists
      try {
        await fs.access(cookiesDbPath);
      } catch {
        throw new Error(`Firefox cookies database not found: ${cookiesDbPath}`);
      }
      
      // Copy database to temporary location (Firefox locks the original)
      const tempDbPath = path.join(this.cookiesPath, `temp-cookies-${Date.now()}.sqlite`);
      await fs.copyFile(cookiesDbPath, tempDbPath);
      
      try {
        const cookies = await this.readCookiesFromDatabase(tempDbPath, domains);
        return this.convertToNetscapeFormat(cookies);
      } finally {
        // Cleanup temporary database
        try {
          await fs.unlink(tempDbPath);
        } catch (error) {
          console.warn('⚠️ Failed to cleanup temporary database:', error);
        }
      }
    } catch (error) {
      console.error(`❌ Profile cookie extraction failed for platform ${platform}:`, error);
      throw error;
    }
  }

  /**
   * Read cookies from Firefox SQLite database
   */
  async readCookiesFromDatabase(dbPath, domains) {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY);
      const cookies = [];
      
      // Build domain filter
      const domainFilter = domains.map(domain => 
        `host LIKE '%${domain.replace('.', '')}%' OR host = '${domain}'`
      ).join(' OR ');
      
      const query = `
        SELECT name, value, host, path, expiry, isSecure, isHttpOnly, sameSite
        FROM moz_cookies 
        WHERE (${domainFilter})
        ORDER BY creationTime DESC
      `;
      
      db.all(query, [], (err, rows) => {
        if (err) {
          db.close();
          reject(err);
          return;
        }
        
        for (const row of rows) {
          cookies.push({
            name: row.name,
            value: row.value,
            domain: row.host,
            path: row.path || '/',
            expires: row.expiry || Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60),
            secure: Boolean(row.isSecure),
            httpOnly: Boolean(row.isHttpOnly),
            sameSite: this.mapSameSite(row.sameSite)
          });
        }
        
        db.close();
        resolve(cookies);
      });
    });
  }

  /**
   * Convert cookies to Netscape format
   */
  convertToNetscapeFormat(cookies) {
    const netscapeCookies = [];
    
    for (const cookie of cookies) {
      const netscapeCookie = {
        domain: cookie.domain,
        flag: cookie.domain.startsWith('.') ? 'TRUE' : 'FALSE',
        path: cookie.path || '/',
        secure: cookie.secure ? 'TRUE' : 'FALSE',
        expiration: cookie.expires || cookie.expiry || Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60),
        name: cookie.name,
        value: cookie.value
      };
      
      netscapeCookies.push(netscapeCookie);
    }
    
    return netscapeCookies;
  }

  /**
   * Save cookies to file
   */
  async saveCookiesToFile(platform, cookies, format = 'netscape') {
    try {
      const fileName = `${platform}-cookies.txt`;
      const filePath = path.join(this.cookiesPath, fileName);
      
      let content;
      
      if (format === 'netscape') {
        content = '# Netscape HTTP Cookie File\n';
        content += '# This is a generated file! Do not edit.\n\n';
        
        for (const cookie of cookies) {
          const line = [
            cookie.domain,
            cookie.flag || 'TRUE',
            cookie.path || '/',
            cookie.secure || 'FALSE',
            cookie.expiration || Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60),
            cookie.name,
            cookie.value
          ].join('\t');
          
          content += line + '\n';
        }
      } else if (format === 'json') {
        content = JSON.stringify(cookies, null, 2);
      } else {
        throw new Error(`Unsupported format: ${format}`);
      }
      
      await fs.writeFile(filePath, content, 'utf8');
      console.log(`💾 Saved ${cookies.length} cookies to ${filePath}`);
      
      return filePath;
    } catch (error) {
      console.error(`❌ Failed to save cookies for platform ${platform}:`, error);
      throw error;
    }
  }

  /**
   * Validate cookies using yt-dlp
   */
  async validateCookies(platform) {
    try {
      const cookieFile = path.join(this.cookiesPath, `${platform}-cookies.txt`);
      
      // Check if file exists
      try {
        await fs.access(cookieFile);
      } catch {
        return {
          isValid: false,
          platform,
          error: 'Cookie file not found'
        };
      }
      
      // Test URLs for different platforms
      const testUrls = {
        youtube: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        facebook: 'https://www.facebook.com/watch/?v=123456789',
        instagram: 'https://www.instagram.com/p/test/',
        tiktok: 'https://www.tiktok.com/@test/video/123456789',
        twitter: 'https://twitter.com/test/status/123456789'
      };
      
      const testUrl = testUrls[platform] || testUrls.youtube;
      
      return new Promise((resolve) => {
        const args = [
          '--cookies', cookieFile,
          '--dump-json',
          '--quiet',
          '--simulate',
          '--no-warnings',
          testUrl
        ];
        
        const ytdlp = spawn('yt-dlp', args);
        let output = '';
        let error = '';
        
        ytdlp.stdout.on('data', (data) => {
          output += data.toString();
        });
        
        ytdlp.stderr.on('data', (data) => {
          error += data.toString();
        });
        
        ytdlp.on('close', (code) => {
          if (code === 0 && output) {
            try {
              const info = JSON.parse(output);
              const formatCount = info.formats?.length || 0;
              
              resolve({
                isValid: true,
                platform,
                formatCount,
                title: info.title,
                duration: info.duration
              });
            } catch {
              resolve({
                isValid: false,
                platform,
                error: 'Invalid JSON response from yt-dlp'
              });
            }
          } else {
            resolve({
              isValid: false,
              platform,
              error: error || `yt-dlp exit code: ${code}`
            });
          }
        });
      });
    } catch (error) {
      return {
        isValid: false,
        platform,
        error: error.message
      };
    }
  }

  /**
   * Get cookie file path
   */
  async getCookieFilePath(platform, format = 'netscape') {
    const extension = format === 'json' ? 'json' : 'txt';
    const fileName = `${platform}-cookies.${extension}`;
    const filePath = path.join(this.cookiesPath, fileName);
    
    try {
      await fs.access(filePath);
      return filePath;
    } catch {
      return null;
    }
  }

  /**
   * Get cookie status for all platforms
   */
  async getCookieStatus() {
    try {
      const files = await fs.readdir(this.cookiesPath);
      const cookieFiles = files.filter(file => file.endsWith('-cookies.txt'));
      
      const status = {};
      
      for (const file of cookieFiles) {
        const platform = file.replace('-cookies.txt', '');
        const filePath = path.join(this.cookiesPath, file);
        const stats = await fs.stat(filePath);
        
        status[platform] = {
          exists: true,
          size: stats.size,
          modified: stats.mtime,
          path: filePath
        };
      }
      
      return status;
    } catch (error) {
      console.error('❌ Failed to get cookie status:', error);
      return {};
    }
  }

  /**
   * Remove duplicate cookies
   */
  removeDuplicateCookies(cookies) {
    const seen = new Set();
    const unique = [];
    
    for (const cookie of cookies) {
      const key = `${cookie.domain}:${cookie.name}:${cookie.path}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(cookie);
      }
    }
    
    return unique;
  }

  /**
   * Map Firefox sameSite values
   */
  mapSameSite(sameSite) {
    switch (sameSite) {
      case 0: return 'None';
      case 1: return 'Lax';
      case 2: return 'Strict';
      default: return 'Lax';
    }
  }

  isReady() {
    return this.isInitialized;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = CookieExtractor;
