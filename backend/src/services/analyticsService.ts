import { User, UserSubscription, Payment, StreamToken } from '../models';
import { Op } from 'sequelize';
import { redis } from '../config/redis';

export interface AnalyticsData {
  userMetrics: {
    totalUsers: number;
    activeUsers: number;
    newUsersToday: number;
    userGrowthRate: number;
  };
  subscriptionMetrics: {
    totalSubscriptions: number;
    activeSubscriptions: number;
    subscriptionRate: number;
    churnRate: number;
  };
  revenueMetrics: {
    totalRevenue: number;
    monthlyRevenue: number;
    averageRevenuePerUser: number;
    revenueGrowthRate: number;
  };
  usageMetrics: {
    totalStreams: number;
    streamsToday: number;
    averageStreamsPerUser: number;
    popularFormats: Array<{ format: string; count: number }>;
  };
}

export interface UserBehaviorData {
  downloadPatterns: Array<{ hour: number; count: number }>;
  popularQualities: Array<{ quality: string; count: number }>;
  userRetention: Array<{ day: number; retentionRate: number }>;
  featureUsage: Array<{ feature: string; usage: number }>;
}

class AnalyticsService {
  private redis = redis;

  /**
   * Get comprehensive analytics data
   */
  async getAnalyticsData(): Promise<AnalyticsData> {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    // User metrics
    const [
      totalUsers,
      activeUsers,
      newUsersToday,
      newUsersYesterday,
      usersThisMonth,
      usersLastMonth,
    ] = await Promise.all([
      User.count(),
      User.count({
        where: {
          last_login: {
            [Op.gte]: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          },
        },
      }),
      User.count({
        where: {
          created_at: { [Op.gte]: today },
        },
      }),
      User.count({
        where: {
          created_at: {
            [Op.gte]: yesterday,
            [Op.lt]: today,
          },
        },
      }),
      User.count({
        where: {
          created_at: { [Op.gte]: thisMonth },
        },
      }),
      User.count({
        where: {
          created_at: {
            [Op.gte]: lastMonth,
            [Op.lt]: thisMonth,
          },
        },
      }),
    ]);

    // Subscription metrics
    const [
      totalSubscriptions,
      activeSubscriptions,
      cancelledThisMonth,
    ] = await Promise.all([
      UserSubscription.count(),
      UserSubscription.count({
        where: {
          status: 'active',
          starts_at: { [Op.lte]: now },
          expires_at: { [Op.gt]: now },
        },
      }),
      UserSubscription.count({
        where: {
          status: 'cancelled',
          updated_at: { [Op.gte]: thisMonth },
        },
      }),
    ]);

    // Revenue metrics
    const [
      totalRevenue,
      monthlyRevenue,
      lastMonthRevenue,
    ] = await Promise.all([
      Payment.sum('amount', {
        where: { status: 'completed' },
      }),
      Payment.sum('amount', {
        where: {
          status: 'completed',
          created_at: { [Op.gte]: thisMonth },
        },
      }),
      Payment.sum('amount', {
        where: {
          status: 'completed',
          created_at: {
            [Op.gte]: lastMonth,
            [Op.lt]: thisMonth,
          },
        },
      }),
    ]);

    // Usage metrics
    const [
      totalStreams,
      streamsToday,
    ] = await Promise.all([
      StreamToken.count(),
      StreamToken.count({
        where: {
          created_at: { [Op.gte]: today },
        },
      }),
    ]);

    // Calculate rates
    const userGrowthRate = newUsersYesterday > 0 
      ? ((newUsersToday - newUsersYesterday) / newUsersYesterday) * 100 
      : newUsersToday > 0 ? 100 : 0;

    const subscriptionRate = totalUsers > 0 ? (activeSubscriptions / totalUsers) * 100 : 0;
    const churnRate = activeSubscriptions > 0 ? (cancelledThisMonth / activeSubscriptions) * 100 : 0;

    const averageRevenuePerUser = activeSubscriptions > 0 
      ? Number(monthlyRevenue || 0) / activeSubscriptions 
      : 0;

    const revenueGrowthRate = (lastMonthRevenue || 0) > 0 
      ? (((monthlyRevenue || 0) - (lastMonthRevenue || 0)) / (lastMonthRevenue || 0)) * 100 
      : (monthlyRevenue || 0) > 0 ? 100 : 0;

    const averageStreamsPerUser = totalUsers > 0 ? totalStreams / totalUsers : 0;

    // Get popular formats from Redis cache
    const popularFormats = await this.getPopularFormats();

    return {
      userMetrics: {
        totalUsers,
        activeUsers,
        newUsersToday,
        userGrowthRate: Math.round(userGrowthRate * 100) / 100,
      },
      subscriptionMetrics: {
        totalSubscriptions,
        activeSubscriptions,
        subscriptionRate: Math.round(subscriptionRate * 100) / 100,
        churnRate: Math.round(churnRate * 100) / 100,
      },
      revenueMetrics: {
        totalRevenue: Number(totalRevenue || 0),
        monthlyRevenue: Number(monthlyRevenue || 0),
        averageRevenuePerUser: Math.round(averageRevenuePerUser * 100) / 100,
        revenueGrowthRate: Math.round(revenueGrowthRate * 100) / 100,
      },
      usageMetrics: {
        totalStreams,
        streamsToday,
        averageStreamsPerUser: Math.round(averageStreamsPerUser * 100) / 100,
        popularFormats,
      },
    };
  }

  /**
   * Get user behavior analytics
   */
  async getUserBehaviorData(): Promise<UserBehaviorData> {
    // Download patterns by hour
    const downloadPatterns = await this.getDownloadPatterns();
    
    // Popular qualities
    const popularQualities = await this.getPopularQualities();
    
    // User retention (simplified)
    const userRetention = await this.getUserRetention();
    
    // Feature usage
    const featureUsage = await this.getFeatureUsage();

    return {
      downloadPatterns,
      popularQualities,
      userRetention,
      featureUsage,
    };
  }

  /**
   * Track user action for analytics
   */
  async trackUserAction(userId: string, action: string, metadata?: any): Promise<void> {
    const key = `analytics:user_actions:${new Date().toISOString().split('T')[0]}`;
    const actionData = {
      userId,
      action,
      metadata,
      timestamp: new Date().toISOString(),
    };

    await this.redis.lpush(key, JSON.stringify(actionData));
    await this.redis.expire(key, 30 * 24 * 60 * 60); // Keep for 30 days
  }

  /**
   * Track download format usage
   */
  async trackFormatUsage(format: string): Promise<void> {
    const key = 'analytics:popular_formats';
    await this.redis.zincrby(key, 1, format);
  }

  /**
   * Track quality preference
   */
  async trackQualityUsage(quality: string): Promise<void> {
    const key = 'analytics:popular_qualities';
    await this.redis.zincrby(key, 1, quality);
  }

  /**
   * Get popular formats from Redis
   */
  private async getPopularFormats(): Promise<Array<{ format: string; count: number }>> {
    try {
      const results = await this.redis.zrevrange('analytics:popular_formats', 0, 9, 'WITHSCORES');
      const formats: Array<{ format: string; count: number }> = [];
      
      for (let i = 0; i < results.length; i += 2) {
        formats.push({
          format: results[i],
          count: parseInt(results[i + 1]),
        });
      }
      
      return formats;
    } catch (error) {
      console.error('Error getting popular formats:', error);
      return [];
    }
  }

  /**
   * Get popular qualities from Redis
   */
  private async getPopularQualities(): Promise<Array<{ quality: string; count: number }>> {
    try {
      const results = await this.redis.zrevrange('analytics:popular_qualities', 0, 9, 'WITHSCORES');
      const qualities: Array<{ quality: string; count: number }> = [];
      
      for (let i = 0; i < results.length; i += 2) {
        qualities.push({
          quality: results[i],
          count: parseInt(results[i + 1]),
        });
      }
      
      return qualities;
    } catch (error) {
      console.error('Error getting popular qualities:', error);
      return [];
    }
  }

  /**
   * Get download patterns by hour
   */
  private async getDownloadPatterns(): Promise<Array<{ hour: number; count: number }>> {
    // This would typically analyze StreamToken creation times
    // For now, return mock data
    const patterns: Array<{ hour: number; count: number }> = [];
    for (let hour = 0; hour < 24; hour++) {
      patterns.push({
        hour,
        count: Math.floor(Math.random() * 100), // Mock data
      });
    }
    return patterns;
  }

  /**
   * Get user retention data
   */
  private async getUserRetention(): Promise<Array<{ day: number; retentionRate: number }>> {
    // Simplified retention calculation
    const retention: Array<{ day: number; retentionRate: number }> = [];
    for (let day = 1; day <= 30; day++) {
      retention.push({
        day,
        retentionRate: Math.max(0, 100 - day * 2), // Mock declining retention
      });
    }
    return retention;
  }

  /**
   * Get feature usage statistics
   */
  private async getFeatureUsage(): Promise<Array<{ feature: string; usage: number }>> {
    return [
      { feature: 'Video Download', usage: 85 },
      { feature: 'HD Quality', usage: 65 },
      { feature: 'Batch Download', usage: 45 },
      { feature: 'Audio Only', usage: 30 },
      { feature: 'Playlist Download', usage: 25 },
    ];
  }

  /**
   * Generate analytics report
   */
  async generateReport(startDate: Date, endDate: Date): Promise<any> {
    // This would generate a comprehensive analytics report
    // For now, return basic data
    return {
      period: {
        start: startDate,
        end: endDate,
      },
      summary: await this.getAnalyticsData(),
      behavior: await this.getUserBehaviorData(),
      generatedAt: new Date(),
    };
  }
}

export default new AnalyticsService();
