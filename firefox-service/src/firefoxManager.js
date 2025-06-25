const { Builder, By, until, Key } = require('selenium-webdriver');
const firefox = require('selenium-webdriver/firefox');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');

class FirefoxManager {
  constructor() {
    this.sessions = new Map();
    this.profilePath = process.env.FIREFOX_PROFILE_PATH || '/app/firefox-profile';
    this.isInitialized = false;
  }

  async initialize() {
    try {
      // Create profile directory
      await fs.mkdir(this.profilePath, { recursive: true });
      
      // Set up Firefox options
      this.firefoxOptions = new firefox.Options();
      
      // Configure for headless operation by default
      this.firefoxOptions.addArguments('--headless');
      this.firefoxOptions.addArguments('--no-sandbox');
      this.firefoxOptions.addArguments('--disable-dev-shm-usage');
      this.firefoxOptions.addArguments('--disable-gpu');
      this.firefoxOptions.addArguments('--window-size=1920,1080');
      
      // Set profile path
      this.firefoxOptions.setProfile(this.profilePath);
      
      // Configure preferences for better compatibility
      const prefs = new Map();
      prefs.set('dom.webdriver.enabled', false);
      prefs.set('useAutomationExtension', false);
      prefs.set('general.useragent.override', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0');
      prefs.set('media.navigator.enabled', false);
      prefs.set('media.peerconnection.enabled', false);
      prefs.set('network.cookie.cookieBehavior', 0); // Accept all cookies
      prefs.set('privacy.trackingprotection.enabled', false);
      prefs.set('dom.ipc.plugins.enabled.libflashplayer.so', false);
      
      // Apply preferences
      for (const [key, value] of prefs) {
        this.firefoxOptions.setPreference(key, value);
      }
      
      this.isInitialized = true;
      console.log('🦊 Firefox Manager initialized');
    } catch (error) {
      console.error('❌ Firefox Manager initialization failed:', error);
      throw error;
    }
  }

  async createSession(options = {}) {
    if (!this.isInitialized) {
      throw new Error('Firefox Manager not initialized');
    }

    const sessionId = uuidv4();
    const { platform, userAgent, headless = true } = options;

    try {
      // Clone base options
      const sessionOptions = new firefox.Options();
      
      // Configure headless mode
      if (headless) {
        sessionOptions.addArguments('--headless');
      }
      
      sessionOptions.addArguments('--no-sandbox');
      sessionOptions.addArguments('--disable-dev-shm-usage');
      sessionOptions.addArguments('--disable-gpu');
      sessionOptions.addArguments('--window-size=1920,1080');
      
      // Create platform-specific profile
      const sessionProfilePath = path.join(this.profilePath, platform || 'default');
      await fs.mkdir(sessionProfilePath, { recursive: true });
      sessionOptions.setProfile(sessionProfilePath);
      
      // Set platform-specific user agent
      if (userAgent) {
        sessionOptions.setPreference('general.useragent.override', userAgent);
      }
      
      // Build driver
      const driver = await new Builder()
        .forBrowser('firefox')
        .setFirefoxOptions(sessionOptions)
        .build();

      // Configure timeouts
      await driver.manage().setTimeouts({
        implicit: 10000,
        pageLoad: 30000,
        script: 30000
      });

      // Store session
      this.sessions.set(sessionId, {
        id: sessionId,
        driver,
        platform: platform || 'default',
        userAgent,
        headless,
        createdAt: new Date(),
        lastActivity: new Date(),
        status: 'active'
      });

      console.log(`🆕 Created Firefox session: ${sessionId} for platform: ${platform}`);
      return sessionId;
    } catch (error) {
      console.error(`❌ Failed to create Firefox session:`, error);
      throw error;
    }
  }

  async closeSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    try {
      await session.driver.quit();
      this.sessions.delete(sessionId);
      console.log(`🗑️ Closed Firefox session: ${sessionId}`);
    } catch (error) {
      console.error(`❌ Failed to close session ${sessionId}:`, error);
      // Remove from sessions even if quit failed
      this.sessions.delete(sessionId);
      throw error;
    }
  }

  async navigate(sessionId, url) {
    const session = this.getSession(sessionId);
    
    try {
      await session.driver.get(url);
      this.updateSessionActivity(sessionId);
      console.log(`🧭 Session ${sessionId} navigated to: ${url}`);
    } catch (error) {
      console.error(`❌ Navigation failed for session ${sessionId}:`, error);
      throw error;
    }
  }

  async waitForElement(sessionId, selector, timeout = 10000) {
    const session = this.getSession(sessionId);
    
    try {
      const element = await session.driver.wait(
        until.elementLocated(By.css(selector)),
        timeout
      );
      this.updateSessionActivity(sessionId);
      return element;
    } catch (error) {
      console.error(`❌ Element wait failed for session ${sessionId}:`, error);
      throw error;
    }
  }

  async clickElement(sessionId, selector) {
    const session = this.getSession(sessionId);
    
    try {
      const element = await this.waitForElement(sessionId, selector);
      await element.click();
      this.updateSessionActivity(sessionId);
      console.log(`👆 Clicked element ${selector} in session ${sessionId}`);
    } catch (error) {
      console.error(`❌ Click failed for session ${sessionId}:`, error);
      throw error;
    }
  }

  async typeText(sessionId, selector, text, clear = true) {
    const session = this.getSession(sessionId);
    
    try {
      const element = await this.waitForElement(sessionId, selector);
      
      if (clear) {
        await element.clear();
      }
      
      await element.sendKeys(text);
      this.updateSessionActivity(sessionId);
      console.log(`⌨️ Typed text into ${selector} in session ${sessionId}`);
    } catch (error) {
      console.error(`❌ Type text failed for session ${sessionId}:`, error);
      throw error;
    }
  }

  async executeScript(sessionId, script, ...args) {
    const session = this.getSession(sessionId);
    
    try {
      const result = await session.driver.executeScript(script, ...args);
      this.updateSessionActivity(sessionId);
      return result;
    } catch (error) {
      console.error(`❌ Script execution failed for session ${sessionId}:`, error);
      throw error;
    }
  }

  async takeScreenshot(sessionId) {
    const session = this.getSession(sessionId);
    
    try {
      const screenshot = await session.driver.takeScreenshot();
      this.updateSessionActivity(sessionId);
      return screenshot; // Base64 encoded
    } catch (error) {
      console.error(`❌ Screenshot failed for session ${sessionId}:`, error);
      throw error;
    }
  }

  async getCookies(sessionId, domain = null) {
    const session = this.getSession(sessionId);
    
    try {
      let cookies;
      if (domain) {
        // Navigate to domain first to get cookies
        await session.driver.get(`https://${domain}`);
        await this.delay(2000);
      }
      
      cookies = await session.driver.manage().getCookies();
      this.updateSessionActivity(sessionId);
      
      console.log(`🍪 Retrieved ${cookies.length} cookies from session ${sessionId}`);
      return cookies;
    } catch (error) {
      console.error(`❌ Get cookies failed for session ${sessionId}:`, error);
      throw error;
    }
  }

  async addCookie(sessionId, cookie) {
    const session = this.getSession(sessionId);
    
    try {
      await session.driver.manage().addCookie(cookie);
      this.updateSessionActivity(sessionId);
      console.log(`🍪 Added cookie to session ${sessionId}`);
    } catch (error) {
      console.error(`❌ Add cookie failed for session ${sessionId}:`, error);
      throw error;
    }
  }

  async deleteCookies(sessionId) {
    const session = this.getSession(sessionId);
    
    try {
      await session.driver.manage().deleteAllCookies();
      this.updateSessionActivity(sessionId);
      console.log(`🗑️ Deleted all cookies from session ${sessionId}`);
    } catch (error) {
      console.error(`❌ Delete cookies failed for session ${sessionId}:`, error);
      throw error;
    }
  }

  async getCurrentUrl(sessionId) {
    const session = this.getSession(sessionId);
    
    try {
      const url = await session.driver.getCurrentUrl();
      this.updateSessionActivity(sessionId);
      return url;
    } catch (error) {
      console.error(`❌ Get current URL failed for session ${sessionId}:`, error);
      throw error;
    }
  }

  async getPageTitle(sessionId) {
    const session = this.getSession(sessionId);
    
    try {
      const title = await session.driver.getTitle();
      this.updateSessionActivity(sessionId);
      return title;
    } catch (error) {
      console.error(`❌ Get page title failed for session ${sessionId}:`, error);
      throw error;
    }
  }

  getSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }
    return session;
  }

  updateSessionActivity(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivity = new Date();
    }
  }

  async getActiveSessions() {
    const sessions = [];
    for (const [id, session] of this.sessions.entries()) {
      sessions.push({
        id,
        platform: session.platform,
        createdAt: session.createdAt,
        lastActivity: session.lastActivity,
        status: session.status,
        headless: session.headless
      });
    }
    return sessions;
  }

  async getStatus() {
    return {
      initialized: this.isInitialized,
      activeSessions: this.sessions.size,
      profilePath: this.profilePath
    };
  }

  isReady() {
    return this.isInitialized;
  }

  async cleanup() {
    console.log('🧹 Cleaning up Firefox Manager...');
    
    // Close all active sessions
    const sessionIds = Array.from(this.sessions.keys());
    for (const sessionId of sessionIds) {
      try {
        await this.closeSession(sessionId);
      } catch (error) {
        console.error(`❌ Failed to close session ${sessionId} during cleanup:`, error);
      }
    }
    
    this.sessions.clear();
    console.log('✅ Firefox Manager cleanup completed');
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = FirefoxManager;
