const FirefoxManager = require('./firefoxManager');
const CookieExtractor = require('./cookieExtractor');

class PlatformManager {
  constructor() {
    this.firefoxManager = null;
    this.cookieExtractor = null;
    this.isInitialized = false;
    
    // Platform configurations optimized for Firefox
    this.platforms = {
      youtube: {
        name: 'YouTube',
        domains: ['.youtube.com', 'youtube.com', '.googlevideo.com'],
        loginUrl: 'https://accounts.google.com/signin',
        testUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        requiredCookies: ['VISITOR_INFO1_LIVE', 'YSC', 'CONSENT', 'PREF'],
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
        loginSelectors: {
          emailInput: 'input[type="email"]',
          passwordInput: 'input[type="password"]',
          nextButton: '#identifierNext',
          passwordNext: '#passwordNext'
        },
        loginSteps: [
          { action: 'type', selector: 'input[type="email"]', field: 'email' },
          { action: 'click', selector: '#identifierNext' },
          { action: 'wait', duration: 2000 },
          { action: 'type', selector: 'input[type="password"]', field: 'password' },
          { action: 'click', selector: '#passwordNext' },
          { action: 'wait', duration: 5000 }
        ]
      },
      
      facebook: {
        name: 'Facebook',
        domains: ['.facebook.com', 'facebook.com', '.fbcdn.net'],
        loginUrl: 'https://www.facebook.com/login',
        testUrl: 'https://www.facebook.com/watch/?v=123456789',
        requiredCookies: ['c_user', 'xs', 'datr', 'sb'],
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
        loginSelectors: {
          emailInput: '#email',
          passwordInput: '#pass',
          loginButton: '#loginbutton'
        },
        loginSteps: [
          { action: 'type', selector: '#email', field: 'email' },
          { action: 'type', selector: '#pass', field: 'password' },
          { action: 'click', selector: '#loginbutton' },
          { action: 'wait', duration: 5000 }
        ]
      },
      
      instagram: {
        name: 'Instagram',
        domains: ['.instagram.com', 'instagram.com', '.cdninstagram.com'],
        loginUrl: 'https://www.instagram.com/accounts/login/',
        testUrl: 'https://www.instagram.com/p/test/',
        requiredCookies: ['sessionid', 'csrftoken', 'ds_user_id', 'rur'],
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
        loginSelectors: {
          emailInput: 'input[name="username"]',
          passwordInput: 'input[name="password"]',
          loginButton: 'button[type="submit"]'
        },
        loginSteps: [
          { action: 'type', selector: 'input[name="username"]', field: 'email' },
          { action: 'type', selector: 'input[name="password"]', field: 'password' },
          { action: 'click', selector: 'button[type="submit"]' },
          { action: 'wait', duration: 5000 }
        ]
      },
      
      tiktok: {
        name: 'TikTok',
        domains: ['.tiktok.com', 'tiktok.com', '.tiktokcdn.com'],
        loginUrl: 'https://www.tiktok.com/login/phone-or-email/email',
        testUrl: 'https://www.tiktok.com/@test/video/123456789',
        requiredCookies: ['sessionid', 'tt_webid', 'ttwid', 'odin_tt'],
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
        loginSelectors: {
          emailInput: 'input[name="username"]',
          passwordInput: 'input[type="password"]',
          loginButton: 'button[data-e2e="login-button"]'
        },
        loginSteps: [
          { action: 'type', selector: 'input[name="username"]', field: 'email' },
          { action: 'type', selector: 'input[type="password"]', field: 'password' },
          { action: 'click', selector: 'button[data-e2e="login-button"]' },
          { action: 'wait', duration: 5000 }
        ]
      },
      
      twitter: {
        name: 'Twitter/X',
        domains: ['.twitter.com', 'twitter.com', '.x.com', 'x.com', '.twimg.com'],
        loginUrl: 'https://twitter.com/i/flow/login',
        testUrl: 'https://twitter.com/test/status/123456789',
        requiredCookies: ['auth_token', 'ct0', 'twid', 'personalization_id'],
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
        loginSelectors: {
          emailInput: 'input[name="text"]',
          passwordInput: 'input[name="password"]',
          nextButton: '[role="button"][data-testid="LoginForm_Login_Button"]'
        },
        loginSteps: [
          { action: 'type', selector: 'input[name="text"]', field: 'email' },
          { action: 'click', selector: '[data-testid="LoginForm_Login_Button"]' },
          { action: 'wait', duration: 2000 },
          { action: 'type', selector: 'input[name="password"]', field: 'password' },
          { action: 'click', selector: '[data-testid="LoginForm_Login_Button"]' },
          { action: 'wait', duration: 5000 }
        ]
      }
    };
  }

  async initialize() {
    try {
      this.firefoxManager = new FirefoxManager();
      this.cookieExtractor = new CookieExtractor();
      
      await this.firefoxManager.initialize();
      await this.cookieExtractor.initialize();
      
      this.isInitialized = true;
      console.log('🎯 Platform Manager initialized');
    } catch (error) {
      console.error('❌ Platform Manager initialization failed:', error);
      throw error;
    }
  }

  /**
   * Perform login for a specific platform
   */
  async performLogin(sessionId, platform, credentials, customSelectors = null) {
    const platformConfig = this.platforms[platform];
    if (!platformConfig) {
      throw new Error(`Unsupported platform: ${platform}`);
    }

    try {
      console.log(`🔐 Performing login for ${platformConfig.name}...`);
      
      // Navigate to login page
      await this.firefoxManager.navigate(sessionId, platformConfig.loginUrl);
      await this.firefoxManager.delay(3000);
      
      // Use custom selectors if provided, otherwise use platform defaults
      const selectors = customSelectors || platformConfig.loginSelectors;
      const steps = platformConfig.loginSteps;
      
      // Execute login steps
      for (const step of steps) {
        try {
          switch (step.action) {
            case 'type':
              const value = credentials[step.field];
              if (value) {
                await this.firefoxManager.typeText(sessionId, step.selector, value);
              }
              break;
              
            case 'click':
              await this.firefoxManager.clickElement(sessionId, step.selector);
              break;
              
            case 'wait':
              await this.firefoxManager.delay(step.duration);
              break;
          }
        } catch (stepError) {
          console.warn(`⚠️ Login step failed: ${step.action} ${step.selector}:`, stepError.message);
          // Continue with next step
        }
      }
      
      // Wait for login to complete
      await this.firefoxManager.delay(5000);
      
      // Check if login was successful by looking for cookies
      const cookies = await this.firefoxManager.getCookies(sessionId);
      const requiredCookies = platformConfig.requiredCookies;
      const foundCookies = cookies.filter(cookie => 
        requiredCookies.includes(cookie.name)
      );
      
      const loginSuccess = foundCookies.length >= Math.ceil(requiredCookies.length / 2);
      
      if (loginSuccess) {
        console.log(`✅ Login successful for ${platformConfig.name}`);
        return {
          success: true,
          platform: platformConfig.name,
          cookiesFound: foundCookies.length,
          requiredCookies: requiredCookies.length
        };
      } else {
        console.log(`❌ Login failed for ${platformConfig.name} - insufficient cookies`);
        return {
          success: false,
          platform: platformConfig.name,
          error: 'Login verification failed - insufficient cookies found',
          cookiesFound: foundCookies.length,
          requiredCookies: requiredCookies.length
        };
      }
      
    } catch (error) {
      console.error(`❌ Login failed for ${platform}:`, error);
      return {
        success: false,
        platform: platformConfig.name,
        error: error.message
      };
    }
  }

  /**
   * Full cookie extraction workflow
   */
  async extractCookiesWorkflow(options) {
    const { platform, credentials, headless = true, testAfterExtraction = true } = options;
    
    const platformConfig = this.platforms[platform];
    if (!platformConfig) {
      throw new Error(`Unsupported platform: ${platform}`);
    }

    let sessionId = null;
    
    try {
      console.log(`🚀 Starting cookie extraction workflow for ${platformConfig.name}`);
      
      // Create Firefox session
      sessionId = await this.firefoxManager.createSession({
        platform,
        userAgent: platformConfig.userAgent,
        headless
      });
      
      // Perform login if credentials provided
      if (credentials) {
        const loginResult = await this.performLogin(sessionId, platform, credentials);
        if (!loginResult.success) {
          throw new Error(`Login failed: ${loginResult.error}`);
        }
      }
      
      // Navigate to test URL to establish session
      if (platformConfig.testUrl) {
        await this.firefoxManager.navigate(sessionId, platformConfig.testUrl);
        await this.firefoxManager.delay(3000);
      }
      
      // Extract cookies
      const cookies = await this.cookieExtractor.extractCookies(
        sessionId, 
        platformConfig.domains, 
        'netscape'
      );
      
      // Save cookies to file
      const filePath = await this.cookieExtractor.saveCookiesToFile(
        platform, 
        cookies, 
        'netscape'
      );
      
      // Test cookies if requested
      let validationResult = null;
      if (testAfterExtraction) {
        validationResult = await this.cookieExtractor.validateCookies(platform);
      }
      
      console.log(`✅ Cookie extraction completed for ${platformConfig.name}`);
      
      return {
        success: true,
        platform: platformConfig.name,
        cookiesExtracted: cookies.length,
        filePath,
        validation: validationResult
      };
      
    } catch (error) {
      console.error(`❌ Cookie extraction workflow failed for ${platform}:`, error);
      return {
        success: false,
        platform: platformConfig.name,
        error: error.message
      };
    } finally {
      // Cleanup session
      if (sessionId) {
        try {
          await this.firefoxManager.closeSession(sessionId);
        } catch (cleanupError) {
          console.error('❌ Session cleanup failed:', cleanupError);
        }
      }
    }
  }

  /**
   * Auto-refresh expired cookies
   */
  async autoRefreshCookies() {
    console.log('🔄 Starting auto-refresh for all platforms...');
    
    const results = {};
    
    for (const platform of Object.keys(this.platforms)) {
      try {
        console.log(`🔄 Checking cookies for ${this.platforms[platform].name}...`);
        
        const validation = await this.cookieExtractor.validateCookies(platform);
        
        if (!validation.isValid) {
          console.log(`🔄 Refreshing cookies for ${this.platforms[platform].name}...`);
          
          // Try to extract fresh cookies (without credentials - manual login required)
          const extractionResult = await this.extractCookiesWorkflow({
            platform,
            headless: false, // Use GUI for manual login
            testAfterExtraction: true
          });
          
          results[platform] = extractionResult;
        } else {
          console.log(`✅ Cookies for ${this.platforms[platform].name} are still valid`);
          results[platform] = {
            success: true,
            platform: this.platforms[platform].name,
            status: 'already_valid',
            validation
          };
        }
      } catch (error) {
        console.error(`❌ Auto-refresh failed for ${platform}:`, error);
        results[platform] = {
          success: false,
          platform: this.platforms[platform].name,
          error: error.message
        };
      }
    }
    
    return results;
  }

  /**
   * Get supported platforms
   */
  getSupportedPlatforms() {
    return Object.keys(this.platforms);
  }

  /**
   * Get platform configurations
   */
  getPlatformConfigurations() {
    const configs = {};
    for (const [key, config] of Object.entries(this.platforms)) {
      configs[key] = {
        name: config.name,
        domains: config.domains,
        loginUrl: config.loginUrl,
        testUrl: config.testUrl,
        requiredCookies: config.requiredCookies
      };
    }
    return configs;
  }

  /**
   * Get platform configuration
   */
  getPlatformConfig(platform) {
    return this.platforms[platform] || null;
  }

  isReady() {
    return this.isInitialized;
  }
}

module.exports = PlatformManager;
