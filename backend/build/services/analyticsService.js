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
const models_1 = require("../models");
const sequelize_1 = require("sequelize");
const redis_1 = require("../config/redis");
class AnalyticsService {
    constructor() {
        this.redis = redis_1.redis;
    }
    /**
     * Get comprehensive analytics data
     */
    getAnalyticsData() {
        return __awaiter(this, void 0, void 0, function* () {
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
            const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            // User metrics
            const [totalUsers, activeUsers, newUsersToday, newUsersYesterday, usersThisMonth, usersLastMonth,] = yield Promise.all([
                models_1.User.count(),
                models_1.User.count({
                    where: {
                        last_login: {
                            [sequelize_1.Op.gte]: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
                        },
                    },
                }),
                models_1.User.count({
                    where: {
                        created_at: { [sequelize_1.Op.gte]: today },
                    },
                }),
                models_1.User.count({
                    where: {
                        created_at: {
                            [sequelize_1.Op.gte]: yesterday,
                            [sequelize_1.Op.lt]: today,
                        },
                    },
                }),
                models_1.User.count({
                    where: {
                        created_at: { [sequelize_1.Op.gte]: thisMonth },
                    },
                }),
                models_1.User.count({
                    where: {
                        created_at: {
                            [sequelize_1.Op.gte]: lastMonth,
                            [sequelize_1.Op.lt]: thisMonth,
                        },
                    },
                }),
            ]);
            // Subscription metrics
            const [totalSubscriptions, activeSubscriptions, cancelledThisMonth,] = yield Promise.all([
                models_1.UserSubscription.count(),
                models_1.UserSubscription.count({
                    where: {
                        status: 'active',
                        starts_at: { [sequelize_1.Op.lte]: now },
                        expires_at: { [sequelize_1.Op.gt]: now },
                    },
                }),
                models_1.UserSubscription.count({
                    where: {
                        status: 'cancelled',
                        updated_at: { [sequelize_1.Op.gte]: thisMonth },
                    },
                }),
            ]);
            // Revenue metrics
            const [totalRevenue, monthlyRevenue, lastMonthRevenue,] = yield Promise.all([
                models_1.Payment.sum('amount', {
                    where: { status: 'completed' },
                }),
                models_1.Payment.sum('amount', {
                    where: {
                        status: 'completed',
                        created_at: { [sequelize_1.Op.gte]: thisMonth },
                    },
                }),
                models_1.Payment.sum('amount', {
                    where: {
                        status: 'completed',
                        created_at: {
                            [sequelize_1.Op.gte]: lastMonth,
                            [sequelize_1.Op.lt]: thisMonth,
                        },
                    },
                }),
            ]);
            // Usage metrics
            const [totalStreams, streamsToday,] = yield Promise.all([
                models_1.StreamToken.count(),
                models_1.StreamToken.count({
                    where: {
                        created_at: { [sequelize_1.Op.gte]: today },
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
            const popularFormats = yield this.getPopularFormats();
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
        });
    }
    /**
     * Get user behavior analytics
     */
    getUserBehaviorData() {
        return __awaiter(this, void 0, void 0, function* () {
            // Download patterns by hour
            const downloadPatterns = yield this.getDownloadPatterns();
            // Popular qualities
            const popularQualities = yield this.getPopularQualities();
            // User retention (simplified)
            const userRetention = yield this.getUserRetention();
            // Feature usage
            const featureUsage = yield this.getFeatureUsage();
            return {
                downloadPatterns,
                popularQualities,
                userRetention,
                featureUsage,
            };
        });
    }
    /**
     * Track user action for analytics
     */
    trackUserAction(userId, action, metadata) {
        return __awaiter(this, void 0, void 0, function* () {
            const key = `analytics:user_actions:${new Date().toISOString().split('T')[0]}`;
            const actionData = {
                userId,
                action,
                metadata,
                timestamp: new Date().toISOString(),
            };
            yield this.redis.lpush(key, JSON.stringify(actionData));
            yield this.redis.expire(key, 30 * 24 * 60 * 60); // Keep for 30 days
        });
    }
    /**
     * Track download format usage
     */
    trackFormatUsage(format) {
        return __awaiter(this, void 0, void 0, function* () {
            const key = 'analytics:popular_formats';
            yield this.redis.zincrby(key, 1, format);
        });
    }
    /**
     * Track quality preference
     */
    trackQualityUsage(quality) {
        return __awaiter(this, void 0, void 0, function* () {
            const key = 'analytics:popular_qualities';
            yield this.redis.zincrby(key, 1, quality);
        });
    }
    /**
     * Get popular formats from Redis
     */
    getPopularFormats() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const results = yield this.redis.zrevrange('analytics:popular_formats', 0, 9, 'WITHSCORES');
                const formats = [];
                for (let i = 0; i < results.length; i += 2) {
                    formats.push({
                        format: results[i],
                        count: parseInt(results[i + 1]),
                    });
                }
                return formats;
            }
            catch (error) {
                console.error('Error getting popular formats:', error);
                return [];
            }
        });
    }
    /**
     * Get popular qualities from Redis
     */
    getPopularQualities() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const results = yield this.redis.zrevrange('analytics:popular_qualities', 0, 9, 'WITHSCORES');
                const qualities = [];
                for (let i = 0; i < results.length; i += 2) {
                    qualities.push({
                        quality: results[i],
                        count: parseInt(results[i + 1]),
                    });
                }
                return qualities;
            }
            catch (error) {
                console.error('Error getting popular qualities:', error);
                return [];
            }
        });
    }
    /**
     * Get download patterns by hour
     */
    getDownloadPatterns() {
        return __awaiter(this, void 0, void 0, function* () {
            // This would typically analyze StreamToken creation times
            // For now, return mock data
            const patterns = [];
            for (let hour = 0; hour < 24; hour++) {
                patterns.push({
                    hour,
                    count: Math.floor(Math.random() * 100), // Mock data
                });
            }
            return patterns;
        });
    }
    /**
     * Get user retention data
     */
    getUserRetention() {
        return __awaiter(this, void 0, void 0, function* () {
            // Simplified retention calculation
            const retention = [];
            for (let day = 1; day <= 30; day++) {
                retention.push({
                    day,
                    retentionRate: Math.max(0, 100 - day * 2), // Mock declining retention
                });
            }
            return retention;
        });
    }
    /**
     * Get feature usage statistics
     */
    getFeatureUsage() {
        return __awaiter(this, void 0, void 0, function* () {
            return [
                { feature: 'Video Download', usage: 85 },
                { feature: 'HD Quality', usage: 65 },
                { feature: 'Batch Download', usage: 45 },
                { feature: 'Audio Only', usage: 30 },
                { feature: 'Playlist Download', usage: 25 },
            ];
        });
    }
    /**
     * Generate analytics report
     */
    generateReport(startDate, endDate) {
        return __awaiter(this, void 0, void 0, function* () {
            // This would generate a comprehensive analytics report
            // For now, return basic data
            return {
                period: {
                    start: startDate,
                    end: endDate,
                },
                summary: yield this.getAnalyticsData(),
                behavior: yield this.getUserBehaviorData(),
                generatedAt: new Date(),
            };
        });
    }
}
exports.default = new AnalyticsService();
