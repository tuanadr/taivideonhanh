import axios, { AxiosInstance } from 'axios';
import { EventEmitter } from 'events';

interface ChromiumSession {
  id: string;
  platform: string;
  status: 'idle' | 'logging_in' | 'extracting' | 'completed' | 'failed';
  createdAt: Date;
  lastActivity: Date;
}

interface LoginCredentials {
  email: string;
  password: string;
  twoFactorCode?: string;
}

interface ExtractionRequest {
  sessionId: string;
  platform: string;
  loginUrl: string;
  domains: string[];
  userAgent?: string;
  credentials?: LoginCredentials;
  testUrl?: string;
  requiredCookies?: string[];
  timeout?: number;
}

interface ExtractionResult {
  success: boolean;
  sessionId: string;
  platform: string;
  cookies?: any[];
  error?: string;
  screenshots?: string[];
  logs?: string[];
}

/**
 * Chromium Service Client for automated browser operations
 * Handles communication with the Chromium container service
 */
export class ChromiumService extends EventEmitter {
  private client: AxiosInstance;
  private baseUrl: string;
  private sessions: Map<string, ChromiumSession> = new Map();
  private healthCheckInterval?: NodeJS.Timeout;

  constructor(baseUrl: string = process.env.CHROMIUM_SERVICE_URL || 'http://chromium:3000') {
    super();
    this.baseUrl = baseUrl;
    
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'TaiVideoNhanh-Backend/1.0'
      }
    });

    this.setupInterceptors();
    this.startHealthCheck();
  }

  /**
   * Setup axios interceptors for logging and error handling
   */
  private setupInterceptors(): void {
    this.client.interceptors.request.use(
      (config) => {
        console.log(`🌐 Chromium API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('❌ Chromium API Request Error:', error);
        return Promise.reject(error);
      }
    );

    this.client.interceptors.response.use(
      (response) => {
        console.log(`✅ Chromium API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        console.error('❌ Chromium API Response Error:', error.response?.status, error.message);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Start health check monitoring
   */
  private startHealthCheck(): void {
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.healthCheck();
      } catch (error) {
        this.emit('health_check_failed', error);
      }
    }, 60000); // Check every minute
  }

  /**
   * Stop health check monitoring
   */
  public stopHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }
  }

  /**
   * Health check for Chromium service
   */
  public async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/health');
      const isHealthy = response.status === 200 && response.data.status === 'healthy';
      
      if (isHealthy) {
        this.emit('health_check_success');
      } else {
        this.emit('health_check_failed', new Error('Service unhealthy'));
      }
      
      return isHealthy;
    } catch (error) {
      this.emit('health_check_failed', error);
      return false;
    }
  }

  /**
   * Create a new browser session
   */
  public async createSession(platform: string): Promise<string> {
    try {
      const response = await this.client.post('/session/create', {
        platform,
        userAgent: this.getPlatformUserAgent(platform),
        viewport: { width: 1920, height: 1080 },
        headless: true
      });

      const sessionId = response.data.sessionId;
      
      this.sessions.set(sessionId, {
        id: sessionId,
        platform,
        status: 'idle',
        createdAt: new Date(),
        lastActivity: new Date()
      });

      console.log(`🆕 Created Chromium session: ${sessionId} for ${platform}`);
      this.emit('session_created', { sessionId, platform });
      
      return sessionId;
    } catch (error) {
      console.error('❌ Failed to create Chromium session:', error);
      throw error;
    }
  }

  /**
   * Close a browser session
   */
  public async closeSession(sessionId: string): Promise<void> {
    try {
      await this.client.post(`/session/${sessionId}/close`);
      
      const session = this.sessions.get(sessionId);
      if (session) {
        this.sessions.delete(sessionId);
        console.log(`🗑️ Closed Chromium session: ${sessionId}`);
        this.emit('session_closed', { sessionId, platform: session.platform });
      }
    } catch (error) {
      console.error(`❌ Failed to close session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Navigate to a URL in the session
   */
  public async navigate(sessionId: string, url: string): Promise<void> {
    try {
      await this.client.post(`/session/${sessionId}/navigate`, { url });
      this.updateSessionActivity(sessionId);
      console.log(`🧭 Navigated session ${sessionId} to ${url}`);
    } catch (error) {
      console.error(`❌ Failed to navigate session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Perform login on a platform
   */
  public async performLogin(sessionId: string, credentials: LoginCredentials, loginSelectors?: any): Promise<boolean> {
    try {
      this.updateSessionStatus(sessionId, 'logging_in');
      
      const response = await this.client.post(`/session/${sessionId}/login`, {
        credentials,
        selectors: loginSelectors,
        timeout: 60000
      });

      const success = response.data.success;
      
      if (success) {
        console.log(`✅ Login successful for session ${sessionId}`);
        this.emit('login_success', { sessionId });
      } else {
        console.log(`❌ Login failed for session ${sessionId}: ${response.data.error}`);
        this.emit('login_failed', { sessionId, error: response.data.error });
      }
      
      this.updateSessionActivity(sessionId);
      return success;
    } catch (error) {
      this.updateSessionStatus(sessionId, 'failed');
      console.error(`❌ Login error for session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Extract cookies from the current session
   */
  public async extractCookies(sessionId: string, domains: string[]): Promise<any[]> {
    try {
      this.updateSessionStatus(sessionId, 'extracting');
      
      const response = await this.client.post(`/session/${sessionId}/extract-cookies`, {
        domains,
        format: 'netscape'
      });

      const cookies = response.data.cookies || [];
      
      console.log(`🍪 Extracted ${cookies.length} cookies from session ${sessionId}`);
      this.updateSessionActivity(sessionId);
      this.updateSessionStatus(sessionId, 'completed');
      
      return cookies;
    } catch (error) {
      this.updateSessionStatus(sessionId, 'failed');
      console.error(`❌ Cookie extraction failed for session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Full cookie extraction workflow
   */
  public async extractCookiesWithLogin(request: ExtractionRequest): Promise<ExtractionResult> {
    let sessionId: string | null = null;
    
    try {
      // Create session
      sessionId = await this.createSession(request.platform);
      
      // Navigate to login page
      await this.navigate(sessionId, request.loginUrl);
      
      // Wait for page load
      await this.waitForPageLoad(sessionId);
      
      // Perform login if credentials provided
      if (request.credentials) {
        const loginSuccess = await this.performLogin(sessionId, request.credentials);
        if (!loginSuccess) {
          throw new Error('Login failed');
        }
        
        // Wait after login
        await this.delay(3000);
      }
      
      // Navigate to test page to establish session
      if (request.testUrl) {
        await this.navigate(sessionId, request.testUrl);
        await this.waitForPageLoad(sessionId);
      }
      
      // Extract cookies
      const cookies = await this.extractCookies(sessionId, request.domains);
      
      // Validate required cookies
      if (request.requiredCookies) {
        const cookieNames = cookies.map(c => c.name);
        const missingCookies = request.requiredCookies.filter(name => !cookieNames.includes(name));
        
        if (missingCookies.length > 0) {
          console.warn(`⚠️ Missing required cookies: ${missingCookies.join(', ')}`);
        }
      }
      
      return {
        success: true,
        sessionId,
        platform: request.platform,
        cookies
      };
      
    } catch (error) {
      console.error(`❌ Cookie extraction workflow failed:`, error);
      
      return {
        success: false,
        sessionId: sessionId || 'unknown',
        platform: request.platform,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    } finally {
      // Always cleanup session
      if (sessionId) {
        try {
          await this.closeSession(sessionId);
        } catch (cleanupError) {
          console.error('❌ Session cleanup failed:', cleanupError);
        }
      }
    }
  }

  /**
   * Wait for page to load
   */
  private async waitForPageLoad(sessionId: string, timeout: number = 10000): Promise<void> {
    try {
      await this.client.post(`/session/${sessionId}/wait-for-load`, { timeout });
    } catch (error) {
      console.warn(`⚠️ Page load wait failed for session ${sessionId}:`, error);
    }
  }

  /**
   * Take screenshot for debugging
   */
  public async takeScreenshot(sessionId: string): Promise<string> {
    try {
      const response = await this.client.post(`/session/${sessionId}/screenshot`);
      return response.data.screenshot; // Base64 encoded
    } catch (error) {
      console.error(`❌ Screenshot failed for session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Get platform-specific user agent
   */
  private getPlatformUserAgent(platform: string): string {
    const userAgents: Record<string, string> = {
      youtube: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      facebook: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      instagram: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      tiktok: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      twitter: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    };
    
    return userAgents[platform] || userAgents.youtube;
  }

  /**
   * Update session activity timestamp
   */
  private updateSessionActivity(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivity = new Date();
    }
  }

  /**
   * Update session status
   */
  private updateSessionStatus(sessionId: string, status: ChromiumSession['status']): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = status;
      session.lastActivity = new Date();
    }
  }

  /**
   * Get session info
   */
  public getSession(sessionId: string): ChromiumSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get all active sessions
   */
  public getAllSessions(): ChromiumSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Cleanup old sessions
   */
  public async cleanupOldSessions(maxAge: number = 3600000): Promise<void> { // 1 hour default
    const now = new Date();
    const sessionsToCleanup: string[] = [];
    
    for (const [sessionId, session] of this.sessions.entries()) {
      const age = now.getTime() - session.lastActivity.getTime();
      if (age > maxAge) {
        sessionsToCleanup.push(sessionId);
      }
    }
    
    for (const sessionId of sessionsToCleanup) {
      try {
        await this.closeSession(sessionId);
        console.log(`🧹 Cleaned up old session: ${sessionId}`);
      } catch (error) {
        console.error(`❌ Failed to cleanup session ${sessionId}:`, error);
      }
    }
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Destroy the service and cleanup resources
   */
  public destroy(): void {
    this.stopHealthCheck();
    this.removeAllListeners();
    
    // Close all active sessions
    for (const sessionId of this.sessions.keys()) {
      this.closeSession(sessionId).catch(console.error);
    }
    
    this.sessions.clear();
  }
}
