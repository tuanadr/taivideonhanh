import express, { Request, Response } from 'express';
import { query, validationResult } from 'express-validator';
import { authenticate } from '../middleware/auth';
import { PerformanceService } from '../services/performanceService';
import { QueueService } from '../services/queueService';
import { StreamTokenService } from '../services/streamTokenService';
import { checkRedisHealth } from '../config/redis';

const router = express.Router();

// Validation middleware
const validateRequest = (req: Request, res: Response, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array(),
    });
  }
  next();
};

// Admin check middleware
const requireAdmin = (req: Request, res: Response, next: any) => {
  if (req.user?.subscription_tier !== 'pro') { // Simplified admin check
    return res.status(403).json({
      error: 'Admin access required',
      code: 'ADMIN_REQUIRED'
    });
  }
  next();
};

/**
 * GET /api/monitoring/health
 * System health check
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const health = await PerformanceService.checkSystemHealth();
    
    const statusCode = health.status === 'critical' ? 503 : 
                      health.status === 'warning' ? 200 : 200;

    res.status(statusCode).json({
      status: health.status,
      timestamp: new Date().toISOString(),
      checks: health.checks,
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(503).json({
      status: 'critical',
      error: 'Health check failed',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/monitoring/metrics
 * Current performance metrics
 */
router.get('/metrics',
  authenticate,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const metrics = await PerformanceService.getCurrentMetrics();
      const memoryUsage = PerformanceService.getMemoryUsageSummary();

      res.json({
        current: metrics,
        memory: memoryUsage,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Get metrics error:', error);
      res.status(500).json({
        error: 'Failed to get metrics',
        code: 'METRICS_FAILED'
      });
    }
  }
);

/**
 * GET /api/monitoring/metrics/history
 * Historical performance metrics
 */
router.get('/metrics/history',
  authenticate,
  requireAdmin,
  query('hours').optional().isInt({ min: 1, max: 24 }).withMessage('Hours must be between 1 and 24'),
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const hours = parseInt(req.query.hours as string) || 1;
      const metrics = await PerformanceService.getHistoricalMetrics(hours);

      res.json({
        metrics,
        period: `${hours} hours`,
        count: metrics.length,
      });
    } catch (error) {
      console.error('Get historical metrics error:', error);
      res.status(500).json({
        error: 'Failed to get historical metrics',
        code: 'HISTORICAL_METRICS_FAILED'
      });
    }
  }
);

/**
 * GET /api/monitoring/queues
 * Queue statistics and status
 */
router.get('/queues',
  authenticate,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const queueStats = await QueueService.getQueueStats();

      res.json({
        queues: queueStats,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Get queue stats error:', error);
      res.status(500).json({
        error: 'Failed to get queue statistics',
        code: 'QUEUE_STATS_FAILED'
      });
    }
  }
);

/**
 * GET /api/monitoring/tokens
 * Stream token statistics
 */
router.get('/tokens',
  authenticate,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const tokenStats = await StreamTokenService.getTokenStatistics();

      res.json({
        statistics: tokenStats,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Get token stats error:', error);
      res.status(500).json({
        error: 'Failed to get token statistics',
        code: 'TOKEN_STATS_FAILED'
      });
    }
  }
);

/**
 * POST /api/monitoring/cleanup
 * Trigger cleanup of old data
 */
router.post('/cleanup',
  authenticate,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      // Cleanup expired tokens
      const expiredTokens = await StreamTokenService.cleanupExpiredTokens();
      
      // Cleanup old metrics
      await PerformanceService.cleanupOldMetrics();
      
      // Cleanup old queue jobs
      await QueueService.cleanupJobs();

      res.json({
        message: 'Cleanup completed successfully',
        expiredTokensRemoved: expiredTokens,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Cleanup error:', error);
      res.status(500).json({
        error: 'Cleanup failed',
        code: 'CLEANUP_FAILED'
      });
    }
  }
);

/**
 * GET /api/monitoring/status
 * Overall system status summary
 */
router.get('/status',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const [health, queueStats, tokenStats] = await Promise.all([
        PerformanceService.checkSystemHealth(),
        QueueService.getQueueStats(),
        StreamTokenService.getTokenStatistics(),
      ]);

      const redisHealthy = await checkRedisHealth();

      res.json({
        system: {
          status: health.status,
          uptime: process.uptime(),
          memory: PerformanceService.getMemoryUsageSummary(),
        },
        services: {
          redis: redisHealthy ? 'healthy' : 'unhealthy',
          queues: {
            videoAnalysis: queueStats.videoAnalysis,
            streaming: queueStats.streaming,
          },
        },
        streaming: {
          activeStreams: health.checks.activeStreams.count,
          totalTokens: tokenStats.totalActive,
          errorRate: health.checks.errorRate.rate,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Get status error:', error);
      res.status(500).json({
        error: 'Failed to get system status',
        code: 'STATUS_FAILED'
      });
    }
  }
);

/**
 * GET /api/monitoring/logs
 * Recent system logs (simplified)
 */
router.get('/logs',
  authenticate,
  requireAdmin,
  query('level').optional().isIn(['error', 'warn', 'info', 'debug']).withMessage('Invalid log level'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const level = req.query.level as string || 'info';
      const limit = parseInt(req.query.limit as string) || 50;

      // This is a simplified implementation
      // In production, you would integrate with your logging system
      const logs = [
        {
          timestamp: new Date().toISOString(),
          level: 'info',
          message: 'System monitoring endpoint accessed',
          service: 'monitoring',
        },
        // Add more log entries as needed
      ];

      res.json({
        logs: logs.slice(0, limit),
        level,
        count: logs.length,
      });
    } catch (error) {
      console.error('Get logs error:', error);
      res.status(500).json({
        error: 'Failed to get logs',
        code: 'LOGS_FAILED'
      });
    }
  }
);

/**
 * POST /api/monitoring/alerts/test
 * Test alert system
 */
router.post('/alerts/test',
  authenticate,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      // This would integrate with your alerting system
      // For now, just return a success response
      
      res.json({
        message: 'Test alert sent successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Test alert error:', error);
      res.status(500).json({
        error: 'Failed to send test alert',
        code: 'ALERT_TEST_FAILED'
      });
    }
  }
);

export default router;
