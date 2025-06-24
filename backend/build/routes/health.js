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
const express_1 = require("express");
const database_1 = __importDefault(require("../config/database"));
const redis_1 = require("../config/redis");
const router = (0, express_1.Router)();
/**
 * GET /api/health
 * Health check endpoint for monitoring
 */
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const healthCheck = {
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV,
        version: process.env.npm_package_version || '1.0.0',
        services: {
            database: 'unknown',
            redis: 'unknown',
        },
        memory: {
            used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
            total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
            external: Math.round(process.memoryUsage().external / 1024 / 1024),
        },
    };
    try {
        // Check database connection
        yield database_1.default.authenticate();
        healthCheck.services.database = 'connected';
    }
    catch (error) {
        healthCheck.services.database = 'disconnected';
        healthCheck.status = 'ERROR';
    }
    try {
        // Check Redis connection
        yield redis_1.redis.ping();
        healthCheck.services.redis = 'connected';
    }
    catch (error) {
        healthCheck.services.redis = 'disconnected';
        healthCheck.status = 'ERROR';
    }
    const statusCode = healthCheck.status === 'OK' ? 200 : 503;
    res.status(statusCode).json(healthCheck);
}));
/**
 * GET /api/health/detailed
 * Detailed health check with more information
 */
router.get('/detailed', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        yield database_1.default.authenticate();
        detailedHealth.services.database.status = 'connected';
        detailedHealth.services.database.responseTime = Date.now() - dbStart;
    }
    catch (error) {
        detailedHealth.services.database.status = 'disconnected';
        detailedHealth.status = 'ERROR';
    }
    // Check Redis with timing
    try {
        const redisStart = Date.now();
        yield redis_1.redis.ping();
        detailedHealth.services.redis.status = 'connected';
        detailedHealth.services.redis.responseTime = Date.now() - redisStart;
    }
    catch (error) {
        detailedHealth.services.redis.status = 'disconnected';
        detailedHealth.status = 'ERROR';
    }
    const statusCode = detailedHealth.status === 'OK' ? 200 : 503;
    res.status(statusCode).json(detailedHealth);
}));
/**
 * GET /api/health/ready
 * Readiness probe for Kubernetes/Docker
 */
router.get('/ready', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Check if all critical services are ready
        yield database_1.default.authenticate();
        yield redis_1.redis.ping();
        res.status(200).json({
            status: 'ready',
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        res.status(503).json({
            status: 'not ready',
            timestamp: new Date().toISOString(),
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
}));
/**
 * GET /api/health/live
 * Liveness probe for Kubernetes/Docker
 */
router.get('/live', (req, res) => {
    res.status(200).json({
        status: 'alive',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
});
exports.default = router;
