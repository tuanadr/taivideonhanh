import { Router, Request, Response } from 'express';
import sequelize from '../config/database';
import { redis } from '../config/redis';

const router = Router();

/**
 * GET /api/health
 * Health check endpoint for monitoring
 */
router.get('/', async (req: Request, res: Response) => {
  const healthCheck = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0',
    services: {
      database: 'unknown',
      redis: 'unknown',
      stripe: process.env.STRIPE_SECRET_KEY ? 'configured' : 'not_configured',
    },
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      external: Math.round(process.memoryUsage().external / 1024 / 1024),
    },
    config: {
      cookieAuth: process.env.ENABLE_COOKIE_AUTH === 'true',
      jwtConfigured: !!process.env.JWT_SECRET,
      adminConfigured: !!process.env.DEFAULT_ADMIN_EMAIL,
    },
  };

  try {
    // Check database connection
    await sequelize.authenticate();
    healthCheck.services.database = 'connected';
  } catch (error) {
    healthCheck.services.database = 'disconnected';
    healthCheck.status = 'ERROR';
  }

  try {
    // Check Redis connection
    await redis.ping();
    healthCheck.services.redis = 'connected';
  } catch (error) {
    healthCheck.services.redis = 'disconnected';
    healthCheck.status = 'ERROR';
  }

  const statusCode = healthCheck.status === 'OK' ? 200 : 503;
  res.status(statusCode).json(healthCheck);
});

/**
 * GET /api/health/detailed
 * Detailed health check with more information
 */
router.get('/detailed', async (req: Request, res: Response) => {
  const detailedHealth = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0',
    services: {
      database: {
        status: 'unknown',
        responseTime: 0,
      },
      redis: {
        status: 'unknown',
        responseTime: 0,
      },
    },
    system: {
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        external: Math.round(process.memoryUsage().external / 1024 / 1024),
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
      },
      cpu: {
        usage: process.cpuUsage(),
      },
      platform: process.platform,
      nodeVersion: process.version,
    },
  };

  // Check database with timing
  try {
    const dbStart = Date.now();
    await sequelize.authenticate();
    detailedHealth.services.database.status = 'connected';
    detailedHealth.services.database.responseTime = Date.now() - dbStart;
  } catch (error) {
    detailedHealth.services.database.status = 'disconnected';
    detailedHealth.status = 'ERROR';
  }

  // Check Redis with timing
  try {
    const redisStart = Date.now();
    await redis.ping();
    detailedHealth.services.redis.status = 'connected';
    detailedHealth.services.redis.responseTime = Date.now() - redisStart;
  } catch (error) {
    detailedHealth.services.redis.status = 'disconnected';
    detailedHealth.status = 'ERROR';
  }

  const statusCode = detailedHealth.status === 'OK' ? 200 : 503;
  res.status(statusCode).json(detailedHealth);
});

/**
 * GET /api/health/ready
 * Readiness probe for Kubernetes/Docker
 */
router.get('/ready', async (req: Request, res: Response) => {
  try {
    // Check if all critical services are ready
    await sequelize.authenticate();
    await redis.ping();

    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/health/live
 * Liveness probe for Kubernetes/Docker
 */
router.get('/live', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

export default router;
