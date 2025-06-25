const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const winston = require('winston');
const path = require('path');
const fs = require('fs').promises;

const FirefoxManager = require('./firefoxManager');
const CookieExtractor = require('./cookieExtractor');
const PlatformManager = require('./platformManager');

// Initialize logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: '/app/logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: '/app/logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:5000'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Body parsing middleware
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
app.use(morgan('combined', {
  stream: { write: message => logger.info(message.trim()) }
}));

// Initialize services
let firefoxManager;
let cookieExtractor;
let platformManager;

async function initializeServices() {
  try {
    firefoxManager = new FirefoxManager();
    cookieExtractor = new CookieExtractor();
    platformManager = new PlatformManager();
    
    await firefoxManager.initialize();
    await cookieExtractor.initialize();
    await platformManager.initialize();
    
    logger.info('🦊 Firefox Cookie Service initialized successfully');
  } catch (error) {
    logger.error('❌ Failed to initialize services:', error);
    process.exit(1);
  }
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      firefox: firefoxManager?.isReady() || false,
      cookieExtractor: cookieExtractor?.isReady() || false,
      platformManager: platformManager?.isReady() || false
    }
  });
});

// Get service status
app.get('/status', async (req, res) => {
  try {
    const status = {
      firefox: await firefoxManager.getStatus(),
      sessions: await firefoxManager.getActiveSessions(),
      platforms: platformManager.getSupportedPlatforms(),
      cookies: await cookieExtractor.getCookieStatus()
    };
    
    res.json(status);
  } catch (error) {
    logger.error('Status check failed:', error);
    res.status(500).json({ error: 'Failed to get status' });
  }
});

// Create Firefox session
app.post('/session/create', async (req, res) => {
  try {
    const { platform, userAgent, headless = true } = req.body;
    
    const sessionId = await firefoxManager.createSession({
      platform,
      userAgent,
      headless
    });
    
    logger.info(`Created Firefox session: ${sessionId} for platform: ${platform}`);
    
    res.json({
      success: true,
      sessionId,
      vncUrl: headless ? null : `http://localhost:6080/vnc.html?host=localhost&port=6080`
    });
  } catch (error) {
    logger.error('Session creation failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Close Firefox session
app.post('/session/:sessionId/close', async (req, res) => {
  try {
    const { sessionId } = req.params;
    await firefoxManager.closeSession(sessionId);
    
    logger.info(`Closed Firefox session: ${sessionId}`);
    
    res.json({ success: true });
  } catch (error) {
    logger.error('Session close failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Navigate to URL
app.post('/session/:sessionId/navigate', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { url } = req.body;
    
    await firefoxManager.navigate(sessionId, url);
    
    res.json({ success: true });
  } catch (error) {
    logger.error('Navigation failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Perform login
app.post('/session/:sessionId/login', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { platform, credentials, selectors } = req.body;
    
    const result = await platformManager.performLogin(sessionId, platform, credentials, selectors);
    
    res.json(result);
  } catch (error) {
    logger.error('Login failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Extract cookies
app.post('/session/:sessionId/extract-cookies', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { domains, format = 'netscape' } = req.body;
    
    const cookies = await cookieExtractor.extractCookies(sessionId, domains, format);
    
    res.json({
      success: true,
      cookies,
      count: cookies.length
    });
  } catch (error) {
    logger.error('Cookie extraction failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Full cookie extraction workflow
app.post('/extract-cookies', async (req, res) => {
  try {
    const {
      platform,
      credentials,
      headless = true,
      testAfterExtraction = true
    } = req.body;
    
    logger.info(`Starting cookie extraction workflow for platform: ${platform}`);
    
    const result = await platformManager.extractCookiesWorkflow({
      platform,
      credentials,
      headless,
      testAfterExtraction
    });
    
    res.json(result);
  } catch (error) {
    logger.error('Cookie extraction workflow failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get platform configurations
app.get('/platforms', (req, res) => {
  res.json({
    platforms: platformManager.getSupportedPlatforms(),
    configurations: platformManager.getPlatformConfigurations()
  });
});

// Validate cookies for a platform
app.post('/validate-cookies/:platform', async (req, res) => {
  try {
    const { platform } = req.params;
    const result = await cookieExtractor.validateCookies(platform);
    
    res.json(result);
  } catch (error) {
    logger.error('Cookie validation failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get cookies file for download
app.get('/cookies/:platform/download', async (req, res) => {
  try {
    const { platform } = req.params;
    const { format = 'netscape' } = req.query;
    
    const filePath = await cookieExtractor.getCookieFilePath(platform, format);
    
    if (!filePath) {
      return res.status(404).json({
        success: false,
        error: 'Cookie file not found'
      });
    }
    
    res.download(filePath, `${platform}-cookies.txt`);
  } catch (error) {
    logger.error('Cookie download failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Auto-refresh cookies
app.post('/auto-refresh', async (req, res) => {
  try {
    const result = await platformManager.autoRefreshCookies();
    
    res.json({
      success: true,
      results: result
    });
  } catch (error) {
    logger.error('Auto-refresh failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// VNC access info
app.get('/vnc', (req, res) => {
  res.json({
    vncUrl: 'http://localhost:6080/vnc.html?host=localhost&port=6080',
    instructions: [
      '1. Open the VNC URL in your browser',
      '2. You will see the Firefox desktop',
      '3. Navigate to the platform you want to login to',
      '4. Login manually with your credentials',
      '5. Use the API to extract cookies after login'
    ]
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  logger.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  
  if (firefoxManager) {
    await firefoxManager.cleanup();
  }
  
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  
  if (firefoxManager) {
    await firefoxManager.cleanup();
  }
  
  process.exit(0);
});

// Start server
async function startServer() {
  await initializeServices();
  
  app.listen(PORT, '0.0.0.0', () => {
    logger.info(`🦊 Firefox Cookie Service running on port ${PORT}`);
    logger.info(`🌐 VNC access: http://localhost:6080/vnc.html`);
    logger.info(`📡 API docs: http://localhost:${PORT}/health`);
  });
}

startServer().catch(error => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});
