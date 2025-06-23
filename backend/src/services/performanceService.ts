import { redis } from '../config/redis';
import { performance } from 'perf_hooks';

interface PerformanceMetrics {
  timestamp: number;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: NodeJS.CpuUsage;
  activeStreams: number;
  totalStreams: number;
  averageStreamDuration: number;
  errorRate: number;
  cacheHitRate: number;
}

interface StreamMetrics {
  streamId: string;
  userId: string;
  startTime: number;
  endTime?: number;
  bytesStreamed: number;
  success: boolean;
  error?: string;
}

interface CacheMetrics {
  hits: number;
  misses: number;
  totalRequests: number;
  hitRate: number;
}

class PerformanceService {
  private static readonly METRICS_KEY = 'performance:metrics';
  private static readonly STREAM_METRICS_KEY = 'performance:streams';
  private static readonly CACHE_METRICS_KEY = 'performance:cache';
  private static readonly METRICS_RETENTION_HOURS = 24;

  private static activeStreams = new Map<string, StreamMetrics>();
  private static cacheMetrics: CacheMetrics = { hits: 0, misses: 0, totalRequests: 0, hitRate: 0 };

  /**
   * Start tracking a stream
   */
  public static startStreamTracking(streamId: string, userId: string): void {
    const metrics: StreamMetrics = {
      streamId,
      userId,
      startTime: performance.now(),
      bytesStreamed: 0,
      success: false,
    };

    this.activeStreams.set(streamId, metrics);
  }

  /**
   * Update stream progress
   */
  public static updateStreamProgress(streamId: string, bytesStreamed: number): void {
    const metrics = this.activeStreams.get(streamId);
    if (metrics) {
      metrics.bytesStreamed = bytesStreamed;
    }
  }

  /**
   * End stream tracking
   */
  public static async endStreamTracking(streamId: string, success: boolean, error?: string): Promise<void> {
    const metrics = this.activeStreams.get(streamId);
    if (!metrics) return;

    metrics.endTime = performance.now();
    metrics.success = success;
    metrics.error = error;

    // Store metrics in Redis
    await this.storeStreamMetrics(metrics);

    // Remove from active streams
    this.activeStreams.delete(streamId);
  }

  /**
   * Store stream metrics in Redis
   */
  private static async storeStreamMetrics(metrics: StreamMetrics): Promise<void> {
    try {
      const key = `${this.STREAM_METRICS_KEY}:${Date.now()}`;
      await redis.setex(key, this.METRICS_RETENTION_HOURS * 3600, JSON.stringify(metrics));
    } catch (error) {
      console.error('Failed to store stream metrics:', error);
    }
  }

  /**
   * Record cache hit
   */
  public static recordCacheHit(): void {
    this.cacheMetrics.hits++;
    this.cacheMetrics.totalRequests++;
    this.updateCacheHitRate();
  }

  /**
   * Record cache miss
   */
  public static recordCacheMiss(): void {
    this.cacheMetrics.misses++;
    this.cacheMetrics.totalRequests++;
    this.updateCacheHitRate();
  }

  /**
   * Update cache hit rate
   */
  private static updateCacheHitRate(): void {
    if (this.cacheMetrics.totalRequests > 0) {
      this.cacheMetrics.hitRate = this.cacheMetrics.hits / this.cacheMetrics.totalRequests;
    }
  }

  /**
   * Get current performance metrics
   */
  public static async getCurrentMetrics(): Promise<PerformanceMetrics> {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    // Get stream statistics
    const streamStats = await this.getStreamStatistics();

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
  }

  /**
   * Get stream statistics from Redis
   */
  private static async getStreamStatistics(): Promise<{
    totalStreams: number;
    averageStreamDuration: number;
    errorRate: number;
  }> {
    try {
      const keys = await redis.keys(`${this.STREAM_METRICS_KEY}:*`);
      
      if (keys.length === 0) {
        return { totalStreams: 0, averageStreamDuration: 0, errorRate: 0 };
      }

      const metricsData = await redis.mget(keys);
      const metrics = metricsData
        .filter(data => data !== null)
        .map(data => JSON.parse(data!) as StreamMetrics);

      const totalStreams = metrics.length;
      const completedStreams = metrics.filter(m => m.endTime);
      const failedStreams = metrics.filter(m => !m.success);

      const averageStreamDuration = completedStreams.length > 0
        ? completedStreams.reduce((sum, m) => sum + (m.endTime! - m.startTime), 0) / completedStreams.length
        : 0;

      const errorRate = totalStreams > 0 ? failedStreams.length / totalStreams : 0;

      return {
        totalStreams,
        averageStreamDuration,
        errorRate,
      };
    } catch (error) {
      console.error('Failed to get stream statistics:', error);
      return { totalStreams: 0, averageStreamDuration: 0, errorRate: 0 };
    }
  }

  /**
   * Store performance metrics in Redis
   */
  public static async storeMetrics(): Promise<void> {
    try {
      const metrics = await this.getCurrentMetrics();
      const key = `${this.METRICS_KEY}:${Date.now()}`;
      await redis.setex(key, this.METRICS_RETENTION_HOURS * 3600, JSON.stringify(metrics));
    } catch (error) {
      console.error('Failed to store performance metrics:', error);
    }
  }

  /**
   * Get historical metrics
   */
  public static async getHistoricalMetrics(hours: number = 1): Promise<PerformanceMetrics[]> {
    try {
      const since = Date.now() - (hours * 60 * 60 * 1000);
      const keys = await redis.keys(`${this.METRICS_KEY}:*`);
      
      const filteredKeys = keys.filter(key => {
        const timestamp = parseInt(key.split(':')[2]);
        return timestamp >= since;
      });

      if (filteredKeys.length === 0) {
        return [];
      }

      const metricsData = await redis.mget(filteredKeys);
      return metricsData
        .filter(data => data !== null)
        .map(data => JSON.parse(data!) as PerformanceMetrics)
        .sort((a, b) => a.timestamp - b.timestamp);
    } catch (error) {
      console.error('Failed to get historical metrics:', error);
      return [];
    }
  }

  /**
   * Get memory usage summary
   */
  public static getMemoryUsageSummary(): {
    used: string;
    total: string;
    percentage: number;
    heapUsed: string;
    heapTotal: string;
    external: string;
  } {
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
  private static formatBytes(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Check system health
   */
  public static async checkSystemHealth(): Promise<{
    status: 'healthy' | 'warning' | 'critical';
    checks: {
      memory: { status: string; usage: number };
      redis: { status: string; connected: boolean };
      activeStreams: { status: string; count: number };
      errorRate: { status: string; rate: number };
    };
  }> {
    const memUsage = this.getMemoryUsageSummary();
    const redisConnected = await this.checkRedisHealth();
    const streamStats = await this.getStreamStatistics();

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
  }

  /**
   * Check Redis health
   */
  private static async checkRedisHealth(): Promise<boolean> {
    try {
      await redis.ping();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Cleanup old metrics
   */
  public static async cleanupOldMetrics(): Promise<void> {
    try {
      const cutoff = Date.now() - (this.METRICS_RETENTION_HOURS * 60 * 60 * 1000);
      
      const [metricsKeys, streamKeys] = await Promise.all([
        redis.keys(`${this.METRICS_KEY}:*`),
        redis.keys(`${this.STREAM_METRICS_KEY}:*`),
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
        await redis.del(...oldMetricsKeys);
      }

      if (oldStreamKeys.length > 0) {
        await redis.del(...oldStreamKeys);
      }

      console.log(`Cleaned up ${oldMetricsKeys.length + oldStreamKeys.length} old metric entries`);
    } catch (error) {
      console.error('Failed to cleanup old metrics:', error);
    }
  }
}

export default PerformanceService;
export { PerformanceService, PerformanceMetrics, StreamMetrics, CacheMetrics };
