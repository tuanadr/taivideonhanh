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
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const auth_1 = require("../middleware/auth");
const performanceService_1 = require("../services/performanceService");
const queueService_1 = require("../services/queueService");
const streamTokenService_1 = require("../services/streamTokenService");
const redis_1 = require("../config/redis");
const router = express_1.default.Router();
// Validation middleware
const validateRequest = (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Validation failed',
            details: errors.array(),
        });
    }
    next();
};
// Admin check middleware
const requireAdmin = (req, res, next) => {
    var _a;
    if (((_a = req.user) === null || _a === void 0 ? void 0 : _a.subscription_tier) !== 'pro') { // Simplified admin check
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
router.get('/health', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const health = yield performanceService_1.PerformanceService.checkSystemHealth();
        const statusCode = health.status === 'critical' ? 503 :
            health.status === 'warning' ? 200 : 200;
        res.status(statusCode).json({
            status: health.status,
            timestamp: new Date().toISOString(),
            checks: health.checks,
            uptime: process.uptime(),
            version: process.env.npm_package_version || '1.0.0',
        });
    }
    catch (error) {
        console.error('Health check error:', error);
        res.status(503).json({
            status: 'critical',
            error: 'Health check failed',
            timestamp: new Date().toISOString(),
        });
    }
}));
/**
 * GET /api/monitoring/metrics
 * Current performance metrics
 */
router.get('/metrics', auth_1.authenticate, requireAdmin, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const metrics = yield performanceService_1.PerformanceService.getCurrentMetrics();
        const memoryUsage = performanceService_1.PerformanceService.getMemoryUsageSummary();
        res.json({
            current: metrics,
            memory: memoryUsage,
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        console.error('Get metrics error:', error);
        res.status(500).json({
            error: 'Failed to get metrics',
            code: 'METRICS_FAILED'
        });
    }
}));
/**
 * GET /api/monitoring/metrics/history
 * Historical performance metrics
 */
router.get('/metrics/history', auth_1.authenticate, requireAdmin, (0, express_validator_1.query)('hours').optional().isInt({ min: 1, max: 24 }).withMessage('Hours must be between 1 and 24'), validateRequest, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const hours = parseInt(req.query.hours) || 1;
        const metrics = yield performanceService_1.PerformanceService.getHistoricalMetrics(hours);
        res.json({
            metrics,
            period: `${hours} hours`,
            count: metrics.length,
        });
    }
    catch (error) {
        console.error('Get historical metrics error:', error);
        res.status(500).json({
            error: 'Failed to get historical metrics',
            code: 'HISTORICAL_METRICS_FAILED'
        });
    }
}));
/**
 * GET /api/monitoring/queues
 * Queue statistics and status
 */
router.get('/queues', auth_1.authenticate, requireAdmin, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const queueStats = yield queueService_1.QueueService.getQueueStats();
        res.json({
            queues: queueStats,
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        console.error('Get queue stats error:', error);
        res.status(500).json({
            error: 'Failed to get queue statistics',
            code: 'QUEUE_STATS_FAILED'
        });
    }
}));
/**
 * GET /api/monitoring/tokens
 * Stream token statistics
 */
router.get('/tokens', auth_1.authenticate, requireAdmin, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const tokenStats = yield streamTokenService_1.StreamTokenService.getTokenStatistics();
        res.json({
            statistics: tokenStats,
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        console.error('Get token stats error:', error);
        res.status(500).json({
            error: 'Failed to get token statistics',
            code: 'TOKEN_STATS_FAILED'
        });
    }
}));
/**
 * POST /api/monitoring/cleanup
 * Trigger cleanup of old data
 */
router.post('/cleanup', auth_1.authenticate, requireAdmin, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Cleanup expired tokens
        const expiredTokens = yield streamTokenService_1.StreamTokenService.cleanupExpiredTokens();
        // Cleanup old metrics
        yield performanceService_1.PerformanceService.cleanupOldMetrics();
        // Cleanup old queue jobs
        yield queueService_1.QueueService.cleanupJobs();
        res.json({
            message: 'Cleanup completed successfully',
            expiredTokensRemoved: expiredTokens,
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        console.error('Cleanup error:', error);
        res.status(500).json({
            error: 'Cleanup failed',
            code: 'CLEANUP_FAILED'
        });
    }
}));
/**
 * GET /api/monitoring/status
 * Overall system status summary
 */
router.get('/status', auth_1.authenticate, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const [health, queueStats, tokenStats] = yield Promise.all([
            performanceService_1.PerformanceService.checkSystemHealth(),
            queueService_1.QueueService.getQueueStats(),
            streamTokenService_1.StreamTokenService.getTokenStatistics(),
        ]);
        const redisHealthy = yield (0, redis_1.checkRedisHealth)();
        res.json({
            system: {
                status: health.status,
                uptime: process.uptime(),
                memory: performanceService_1.PerformanceService.getMemoryUsageSummary(),
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
    }
    catch (error) {
        console.error('Get status error:', error);
        res.status(500).json({
            error: 'Failed to get system status',
            code: 'STATUS_FAILED'
        });
    }
}));
/**
 * GET /api/monitoring/logs
 * Recent system logs (simplified)
 */
router.get('/logs', auth_1.authenticate, requireAdmin, (0, express_validator_1.query)('level').optional().isIn(['error', 'warn', 'info', 'debug']).withMessage('Invalid log level'), (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'), validateRequest, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const level = req.query.level || 'info';
        const limit = parseInt(req.query.limit) || 50;
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
    }
    catch (error) {
        console.error('Get logs error:', error);
        res.status(500).json({
            error: 'Failed to get logs',
            code: 'LOGS_FAILED'
        });
    }
}));
/**
 * POST /api/monitoring/alerts/test
 * Test alert system
 */
router.post('/alerts/test', auth_1.authenticate, requireAdmin, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // This would integrate with your alerting system
        // For now, just return a success response
        res.json({
            message: 'Test alert sent successfully',
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        console.error('Test alert error:', error);
        res.status(500).json({
            error: 'Failed to send test alert',
            code: 'ALERT_TEST_FAILED'
        });
    }
}));
exports.default = router;
