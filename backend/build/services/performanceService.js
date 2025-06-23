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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PerformanceService = void 0;
const redis_1 = require("../config/redis");
const perf_hooks_1 = require("perf_hooks");
class PerformanceService {
    /**
     * Start tracking a stream
     */
    static startStreamTracking(streamId, userId) {
        const metrics = {
            streamId,
            userId,
            startTime: perf_hooks_1.performance.now(),
            bytesStreamed: 0,
            success: false,
        };
        this.activeStreams.set(streamId, metrics);
    }
    /**
     * Update stream progress
     */
    static updateStreamProgress(streamId, bytesStreamed) {
        const metrics = this.activeStreams.get(streamId);
        if (metrics) {
            metrics.bytesStreamed = bytesStreamed;
        }
    }
    /**
     * End stream tracking
     */
    static endStreamTracking(streamId, success, error) {
        return __awaiter(this, void 0, void 0, function* () {
            const metrics = this.activeStreams.get(streamId);
            if (!metrics)
                return;
            metrics.endTime = perf_hooks_1.performance.now();
            metrics.success = success;
            metrics.error = error;
            // Store metrics in Redis
            yield this.storeStreamMetrics(metrics);
            // Remove from active streams
            this.activeStreams.delete(streamId);
        });
    }
    /**
     * Store stream metrics in Redis
     */
    static storeStreamMetrics(metrics) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const key = `${this.STREAM_METRICS_KEY}:${Date.now()}`;
                yield redis_1.redis.setex(key, this.METRICS_RETENTION_HOURS * 3600, JSON.stringify(metrics));
            }
            catch (error) {
                console.error('Failed to store stream metrics:', error);
            }
        });
    }
    /**
     * Record cache hit
     */
    static recordCacheHit() {
        this.cacheMetrics.hits++;
        this.cacheMetrics.totalRequests++;
        this.updateCacheHitRate();
    }
    /**
     * Record cache miss
     */
    static recordCacheMiss() {
        this.cacheMetrics.misses++;
        this.cacheMetrics.totalRequests++;
        this.updateCacheHitRate();
    }
    /**
     * Update cache hit rate
     */
    static updateCacheHitRate() {
        if (this.cacheMetrics.totalRequests > 0) {
            this.cacheMetrics.hitRate = this.cacheMetrics.hits / this.cacheMetrics.totalRequests;
        }
    }
    /**
     * Get current performance metrics
     */
    static getCurrentMetrics() {
        return __awaiter(this, void 0, void 0, function* () {
            const memoryUsage = process.memoryUsage();
            const cpuUsage = process.cpuUsage();
            // Get stream statistics
            const streamStats = yield this.getStreamStatistics();
            return {
                timestamp: Date.now(),
                memoryUsage,
                cpuUsage,
                activeStreams: this.activeStreams.size,
                totalStreams: streamStats.totalStreams,
                averageStreamDuration: streamStats.averageStreamDuration,
                errorRate: streamStats.errorRate,
                cacheHitRate: this.cacheMetrics.hitRate,
            };
        });
    }
    /**
     * Get stream statistics from Redis
     */
    static getStreamStatistics() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const keys = yield redis_1.redis.keys(`${this.STREAM_METRICS_KEY}:*`);
                if (keys.length === 0) {
                    return { totalStreams: 0, averageStreamDuration: 0, errorRate: 0 };
                }
                const metricsData = yield redis_1.redis.mget(keys);
                const metrics = metricsData
                    .filter(data => data !== null)
                    .map(data => JSON.parse(data));
                const totalStreams = metrics.length;
                const completedStreams = metrics.filter(m => m.endTime);
                const failedStreams = metrics.filter(m => !m.success);
                const averageStreamDuration = completedStreams.length > 0
                    ? completedStreams.reduce((sum, m) => sum + (m.endTime - m.startTime), 0) / completedStreams.length
                    : 0;
                const errorRate = totalStreams > 0 ? failedStreams.length / totalStreams : 0;
                return {
                    totalStreams,
                    averageStreamDuration,
                    errorRate,
                };
            }
            catch (error) {
                console.error('Failed to get stream statistics:', error);
                return { totalStreams: 0, averageStreamDuration: 0, errorRate: 0 };
            }
        });
    }
    /**
     * Store performance metrics in Redis
     */
    static storeMetrics() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const metrics = yield this.getCurrentMetrics();
                const key = `${this.METRICS_KEY}:${Date.now()}`;
                yield redis_1.redis.setex(key, this.METRICS_RETENTION_HOURS * 3600, JSON.stringify(metrics));
            }
            catch (error) {
                console.error('Failed to store performance metrics:', error);
            }
        });
    }
    /**
     * Get historical metrics
     */
    static getHistoricalMetrics() {
        return __awaiter(this, arguments, void 0, function* (hours = 1) {
            try {
                const since = Date.now() - (hours * 60 * 60 * 1000);
                const keys = yield redis_1.redis.keys(`${this.METRICS_KEY}:*`);
                const filteredKeys = keys.filter(key => {
                    const timestamp = parseInt(key.split(':')[2]);
                    return timestamp >= since;
                });
                if (filteredKeys.length === 0) {
                    return [];
                }
                const metricsData = yield redis_1.redis.mget(filteredKeys);
                return metricsData
                    .filter(data => data !== null)
                    .map(data => JSON.parse(data))
                    .sort((a, b) => a.timestamp - b.timestamp);
            }
            catch (error) {
                console.error('Failed to get historical metrics:', error);
                return [];
            }
        });
    }
    /**
     * Get memory usage summary
     */
    static getMemoryUsageSummary() {
        const memUsage = process.memoryUsage();
        const totalMemory = require('os').totalmem();
        const usedMemory = totalMemory - require('os').freemem();
        return {
            used: this.formatBytes(usedMemory),
            total: this.formatBytes(totalMemory),
            percentage: Math.round((usedMemory / totalMemory) * 100),
            heapUsed: this.formatBytes(memUsage.heapUsed),
            heapTotal: this.formatBytes(memUsage.heapTotal),
            external: this.formatBytes(memUsage.external),
        };
    }
    /**
     * Format bytes to human readable format
     */
    static formatBytes(bytes) {
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        if (bytes === 0)
            return '0 Bytes';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }
    /**
     * Check system health
     */
    static checkSystemHealth() {
        return __awaiter(this, void 0, void 0, function* () {
            const memUsage = this.getMemoryUsageSummary();
            const redisConnected = yield this.checkRedisHealth();
            const streamStats = yield this.getStreamStatistics();
            const checks = {
                memory: {
                    status: memUsage.percentage > 90 ? 'critical' : memUsage.percentage > 75 ? 'warning' : 'healthy',
                    usage: memUsage.percentage,
                },
                redis: {
                    status: redisConnected ? 'healthy' : 'critical',
                    connected: redisConnected,
                },
                activeStreams: {
                    status: this.activeStreams.size > 10 ? 'warning' : 'healthy',
                    count: this.activeStreams.size,
                },
                errorRate: {
                    status: streamStats.errorRate > 0.1 ? 'critical' : streamStats.errorRate > 0.05 ? 'warning' : 'healthy',
                    rate: streamStats.errorRate,
                },
            };
            const criticalIssues = Object.values(checks).filter(check => check.status === 'critical').length;
            const warningIssues = Object.values(checks).filter(check => check.status === 'warning').length;
            const status = criticalIssues > 0 ? 'critical' : warningIssues > 0 ? 'warning' : 'healthy';
            return { status, checks };
        });
    }
    /**
     * Check Redis health
     */
    static checkRedisHealth() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield redis_1.redis.ping();
                return true;
            }
            catch (error) {
                return false;
            }
        });
    }
    /**
     * Cleanup old metrics
     */
    static cleanupOldMetrics() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const cutoff = Date.now() - (this.METRICS_RETENTION_HOURS * 60 * 60 * 1000);
                const [metricsKeys, streamKeys] = yield Promise.all([
                    redis_1.redis.keys(`${this.METRICS_KEY}:*`),
                    redis_1.redis.keys(`${this.STREAM_METRICS_KEY}:*`),
                ]);
                const oldMetricsKeys = metricsKeys.filter(key => {
                    const timestamp = parseInt(key.split(':')[2]);
                    return timestamp < cutoff;
                });
                const oldStreamKeys = streamKeys.filter(key => {
                    const timestamp = parseInt(key.split(':')[2]);
                    return timestamp < cutoff;
                });
                if (oldMetricsKeys.length > 0) {
                    yield redis_1.redis.del(...oldMetricsKeys);
                }
                if (oldStreamKeys.length > 0) {
                    yield redis_1.redis.del(...oldStreamKeys);
                }
                console.log(`Cleaned up ${oldMetricsKeys.length + oldStreamKeys.length} old metric entries`);
            }
            catch (error) {
                console.error('Failed to cleanup old metrics:', error);
            }
        });
    }
}
exports.PerformanceService = PerformanceService;
PerformanceService.METRICS_KEY = 'performance:metrics';
PerformanceService.STREAM_METRICS_KEY = 'performance:streams';
PerformanceService.CACHE_METRICS_KEY = 'performance:cache';
PerformanceService.METRICS_RETENTION_HOURS = 24;
PerformanceService.activeStreams = new Map();
PerformanceService.cacheMetrics = { hits: 0, misses: 0, totalRequests: 0, hitRate: 0 };
exports.default = PerformanceService;
