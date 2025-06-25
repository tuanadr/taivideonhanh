console.log('🔄 Loading dependencies...');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const winston = require('winston');
const path = require('path');
const fs = require('fs').promises;

console.log('✅ Core dependencies loaded');

// Import our services with error handling
let FirefoxManager, CookieExtractor, PlatformManager;

try {
  FirefoxManager = require('./firefoxManager');
  console.log('✅ FirefoxManager loaded');
} catch (error) {
  console.warn('⚠️ FirefoxManager failed to load:', error.message);
}

try {
  CookieExtractor = require('./cookieExtractor');
  console.log('✅ CookieExtractor loaded');
} catch (error) {
  console.warn('⚠️ CookieExtractor failed to load:', error.message);
}

try {
  PlatformManager = require('./platformManager');
  console.log('✅ PlatformManager loaded');
} catch (error) {
  console.warn('⚠️ PlatformManager failed to load:', error.message);
}

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
    console.log('🔄 Initializing Firefox Cookie Service...');
    logger.info('🔄 Initializing Firefox Cookie Service...');

    // Initialize services with error handling
    if (FirefoxManager) {
      try {
        firefoxManager = new FirefoxManager();
        await firefoxManager.initialize();
        console.log('✅ Firefox Manager initialized');
        logger.info('✅ Firefox Manager initialized');
      } catch (error) {
        console.warn('⚠️ Firefox Manager initialization failed:', error.message);
        logger.warn('⚠️ Firefox Manager initialization failed:', error.message);
        firefoxManager = null;
      }
    } else {
      console.warn('⚠️ FirefoxManager class not available');
      firefoxManager = null;
    }

    if (CookieExtractor) {
      try {
        cookieExtractor = new CookieExtractor();
        await cookieExtractor.initialize();
        console.log('✅ Cookie Extractor initialized');
        logger.info('✅ Cookie Extractor initialized');
      } catch (error) {
        console.warn('⚠️ Cookie Extractor initialization failed:', error.message);
        logger.warn('⚠️ Cookie Extractor initialization failed:', error.message);
        cookieExtractor = null;
      }
    } else {
      console.warn('⚠️ CookieExtractor class not available');
      cookieExtractor = null;
    }

    if (PlatformManager) {
      try {
        platformManager = new PlatformManager();
        await platformManager.initialize();
        console.log('✅ Platform Manager initialized');
        logger.info('✅ Platform Manager initialized');
      } catch (error) {
        console.warn('⚠️ Platform Manager initialization failed:', error.message);
        logger.warn('⚠️ Platform Manager initialization failed:', error.message);
        platformManager = null;
      }
    } else {
      console.warn('⚠️ PlatformManager class not available');
      platformManager = null;
    }

    console.log('🦊 Firefox Cookie Service initialization completed');
    logger.info('🦊 Firefox Cookie Service initialization completed');
  } catch (error) {
    console.error('❌ Critical initialization error:', error);
    logger.error('❌ Critical initialization error:', error);
    // Don't exit, let the service run with limited functionality
  }
}

// Basic test endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Firefox Cookie Management Service',
    version: '1.0.0',
    status: 'running',
    endpoints: [
      'GET /health - Health check',
      'GET /status - Service status',
      'GET /platforms - Supported platforms',
      'POST /extract-cookies - Extract cookies',
      'GET /vnc - VNC information'
    ]
  });
});

// Health check endpoint - Simple version for debugging
app.get('/health', (req, res) => {
  try {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '1.0.0',
      services: {
        firefox: firefoxManager?.isReady ? firefoxManager.isReady() : false,
        cookieExtractor: cookieExtractor?.isReady ? cookieExtractor.isReady() : false,
        platformManager: platformManager?.isReady ? platformManager.isReady() : false
      }
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get supported platforms
app.get('/platforms', (req, res) => {
  try {
    const platforms = ['youtube', 'facebook', 'instagram', 'tiktok', 'twitter'];
    res.json({
      platforms: platforms,
      count: platforms.length,
      status: 'available'
    });
  } catch (error) {
    logger.error('Platforms check failed:', error);
    res.status(500).json({ error: 'Failed to get platforms' });
  }
});

// Get service status
app.get('/status', async (req, res) => {
  try {
    const status = {
      service: 'Firefox Cookie Management Service',
      version: '1.0.0',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    };

    // Add service status if available
    if (firefoxManager) {
      try {
        status.firefox = await firefoxManager.getStatus();
      } catch (e) {
        status.firefox = 'error';
      }
    }

    if (platformManager) {
      try {
        status.platforms = platformManager.getSupportedPlatforms();
      } catch (e) {
        status.platforms = ['youtube', 'facebook', 'instagram', 'tiktok', 'twitter'];
      }
    }

    if (cookieExtractor) {
      try {
        status.cookies = await cookieExtractor.getCookieStatus();
      } catch (e) {
        status.cookies = 'error';
      }
    }

    res.json(status);
  } catch (error) {
    logger.error('Status check failed:', error);
    res.status(500).json({
      error: 'Failed to get status',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// VNC information endpoint
app.get('/vnc', (req, res) => {
  try {
    res.json({
      vnc: {
        url: 'https://firefox-vnc.taivideonhanh.vn',
        port: 6080,
        password: process.env.VNC_PASSWORD || 'firefox123',
        display: process.env.DISPLAY || ':99'
      },
      instructions: [
        '1. Access VNC URL in browser',
        '2. Enter VNC password',
        '3. Use Firefox to login to platforms',
        '4. Extract cookies via API'
      ],
      platforms: ['youtube', 'facebook', 'instagram', 'tiktok', 'twitter']
    });
  } catch (error) {
    logger.error('VNC info failed:', error);
    res.status(500).json({ error: 'Failed to get VNC info' });
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
app.get('/platform-configs', (req, res) => {
  try {
    if (platformManager) {
      res.json({
        platforms: platformManager.getSupportedPlatforms(),
        configurations: platformManager.getPlatformConfigurations()
      });
    } else {
      res.json({
        platforms: ['youtube', 'facebook', 'instagram', 'tiktok', 'twitter'],
        configurations: {}
      });
    }
  } catch (error) {
    logger.error('Platform configs failed:', error);
    res.status(500).json({ error: 'Failed to get platform configs' });
  }
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

// VNC access detailed info
app.get('/vnc-details', (req, res) => {
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

// Environment check
function checkEnvironment() {
  console.log('🔍 Environment Check:');
  console.log(`  NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
  console.log(`  PORT: ${process.env.PORT || 'not set'}`);
  console.log(`  DISPLAY: ${process.env.DISPLAY || 'not set'}`);
  console.log(`  FIREFOX_PROFILE_PATH: ${process.env.FIREFOX_PROFILE_PATH || 'not set'}`);
  console.log(`  COOKIES_PATH: ${process.env.COOKIES_PATH || 'not set'}`);
  console.log(`  VNC_PASSWORD: ${process.env.VNC_PASSWORD ? 'set' : 'not set'}`);

  // Check if Firefox is available
  const { execSync } = require('child_process');
  try {
    const firefoxVersion = execSync('firefox --version', { encoding: 'utf8' });
    console.log(`  Firefox: ${firefoxVersion.trim()}`);
  } catch (error) {
    console.warn('  Firefox: not found or not executable');
  }

  // Check if X11 is running
  try {
    execSync('xdpyinfo -display :99', { encoding: 'utf8' });
    console.log('  X11 Display :99: available');
  } catch (error) {
    console.warn('  X11 Display :99: not available');
  }
}

// Start server
async function startServer() {
  try {
    console.log('🔄 Starting Firefox Cookie Service...');

    // Check environment
    checkEnvironment();

    console.log(`📡 Port: ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🖥️ Display: ${process.env.DISPLAY || 'not set'}`);

    // Initialize services with error handling
    try {
      await initializeServices();
      console.log('✅ Services initialization completed');
    } catch (error) {
      console.warn('⚠️ Services initialization had issues:', error.message);
      // Continue anyway - service can run with limited functionality
    }

    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`🦊 Firefox Cookie Service running on port ${PORT}`);
      console.log(`📡 API endpoints available at http://0.0.0.0:${PORT}`);
      console.log(`🖥️ VNC interface available at http://localhost:6080`);

      logger.info(`🦊 Firefox Cookie Service running on port ${PORT}`);
      logger.info(`🌐 VNC access: http://localhost:6080/vnc.html`);
      logger.info(`📡 API docs: http://localhost:${PORT}/health`);

      // Test endpoints
      console.log('🧪 Available endpoints:');
      console.log('  GET / - Service info');
      console.log('  GET /health - Health check');
      console.log('  GET /platforms - Supported platforms');
      console.log('  GET /status - Service status');
      console.log('  GET /vnc - VNC information');
    });

    server.on('error', (error) => {
      console.error('❌ Server error:', error);
      logger.error('Server error:', error);

      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use`);
        process.exit(1);
      }
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('📴 Received SIGTERM, shutting down gracefully');
      server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer().catch(error => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});
