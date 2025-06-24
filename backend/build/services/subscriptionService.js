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
class SubscriptionService {
    /**
     * Get all available subscription plans
     */
    getAvailablePlans() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield models_1.SubscriptionPlan.findAll({
                where: {
                    is_active: true,
                },
                order: [['price', 'ASC']],
            });
        });
    }
    /**
     * Get subscription plan by ID
     */
    getPlanById(planId) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield models_1.SubscriptionPlan.findByPk(planId);
        });
    }
    /**
     * Get user's current active subscription
     */
    getUserActiveSubscription(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const now = new Date();
            return yield models_1.UserSubscription.findOne({
                where: {
                    user_id: userId,
                    status: 'active',
                    starts_at: {
                        [sequelize_1.Op.lte]: now,
                    },
                    expires_at: {
                        [sequelize_1.Op.gt]: now,
                    },
                },
                include: [
                    {
                        model: models_1.SubscriptionPlan,
                        as: 'plan',
                    },
                ],
                order: [['expires_at', 'DESC']],
            });
        });
    }
    /**
     * Get user's subscription history
     */
    getUserSubscriptionHistory(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield models_1.UserSubscription.findAll({
                where: {
                    user_id: userId,
                },
                include: [
                    {
                        model: models_1.SubscriptionPlan,
                        as: 'plan',
                    },
                ],
                order: [['created_at', 'DESC']],
            });
        });
    }
    /**
     * Create a new subscription
     */
    createSubscription(data) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const plan = yield this.getPlanById(data.planId);
            if (!plan) {
                throw new Error('Subscription plan not found');
            }
            // Check if user already has an active subscription
            const existingSubscription = yield this.getUserActiveSubscription(data.userId);
            if (existingSubscription) {
                throw new Error('User already has an active subscription');
            }
            const now = new Date();
            const expiresAt = new Date(now.getTime() + plan.duration_days * 24 * 60 * 60 * 1000);
            const subscription = yield models_1.UserSubscription.create({
                user_id: data.userId,
                plan_id: data.planId,
                status: 'pending',
                starts_at: now,
                expires_at: expiresAt,
                auto_renew: (_a = data.autoRenew) !== null && _a !== void 0 ? _a : true,
                payment_method: data.paymentMethod,
            });
            return subscription;
        });
    }
    /**
     * Activate a subscription after successful payment
     */
    activateSubscription(subscriptionId) {
        return __awaiter(this, void 0, void 0, function* () {
            const subscription = yield models_1.UserSubscription.findByPk(subscriptionId);
            if (!subscription) {
                throw new Error('Subscription not found');
            }
            subscription.status = 'active';
            yield subscription.save();
            return subscription;
        });
    }
    /**
     * Cancel a subscription
     */
    cancelSubscription(userId, subscriptionId) {
        return __awaiter(this, void 0, void 0, function* () {
            const subscription = yield models_1.UserSubscription.findOne({
                where: {
                    id: subscriptionId,
                    user_id: userId,
                },
            });
            if (!subscription) {
                throw new Error('Subscription not found');
            }
            yield subscription.cancel();
            return subscription;
        });
    }
    /**
     * Get subscription limits for a user
     */
    getUserSubscriptionLimits(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const activeSubscription = yield this.getUserActiveSubscription(userId);
            if (!activeSubscription || !activeSubscription.plan) {
                // Return free tier limits
                return {
                    maxDownloadsPerDay: 10,
                    maxConcurrentStreams: 1,
                    maxQuality: '720p',
                    features: ['basic_download'],
                };
            }
            const plan = activeSubscription.plan;
            return {
                maxDownloadsPerDay: plan.max_downloads_per_day,
                maxConcurrentStreams: plan.max_concurrent_streams,
                maxQuality: plan.max_quality,
                features: plan.features,
            };
        });
    }
    /**
     * Check if user can perform an action based on subscription
     */
    canUserPerformAction(userId, action) {
        return __awaiter(this, void 0, void 0, function* () {
            const limits = yield this.getUserSubscriptionLimits(userId);
            switch (action) {
                case 'download_hd':
                    return ['1080p', '1440p', '2160p', 'best'].includes(limits.maxQuality);
                case 'download_4k':
                    return ['2160p', 'best'].includes(limits.maxQuality);
                case 'concurrent_streams':
                    return limits.maxConcurrentStreams > 1;
                case 'ad_free':
                    return limits.features.includes('ad_free');
                default:
                    return true;
            }
        });
    }
    /**
     * Renew subscription
     */
    renewSubscription(subscriptionId, newExpiresAt) {
        return __awaiter(this, void 0, void 0, function* () {
            const subscription = yield models_1.UserSubscription.findByPk(subscriptionId);
            if (!subscription) {
                throw new Error('Subscription not found');
            }
            yield subscription.renew(newExpiresAt);
            return subscription;
        });
    }
    /**
     * Get subscription statistics
     */
    getSubscriptionStats() {
        return __awaiter(this, void 0, void 0, function* () {
            const now = new Date();
            // Get active subscriptions count
            const totalActiveSubscriptions = yield models_1.UserSubscription.count({
                where: {
                    status: 'active',
                    starts_at: {
                        [sequelize_1.Op.lte]: now,
                    },
                    expires_at: {
                        [sequelize_1.Op.gt]: now,
                    },
                },
            });
            // Get total revenue from completed payments
            const revenueResult = yield models_1.Payment.sum('amount', {
                where: {
                    status: 'completed',
                },
            });
            const totalRevenue = revenueResult || 0;
            // Get plan distribution
            const planDistribution = yield models_1.UserSubscription.findAll({
                attributes: [
                    [models_1.SubscriptionPlan.sequelize.col('plan.name'), 'planName'],
                    [models_1.SubscriptionPlan.sequelize.fn('COUNT', models_1.SubscriptionPlan.sequelize.col('UserSubscription.id')), 'count'],
                ],
                include: [
                    {
                        model: models_1.SubscriptionPlan,
                        as: 'plan',
                        attributes: [],
                    },
                ],
                where: {
                    status: 'active',
                    starts_at: {
                        [sequelize_1.Op.lte]: now,
                    },
                    expires_at: {
                        [sequelize_1.Op.gt]: now,
                    },
                },
                group: ['plan.id', 'plan.name'],
                raw: true,
            });
            return {
                totalActiveSubscriptions,
                totalRevenue: Number(totalRevenue),
                planDistribution: planDistribution.map(item => ({
                    planName: item.planName,
                    count: Number(item.count),
                })),
            };
        });
    }
    /**
     * Initialize default subscription plans
     */
    initializeDefaultPlans() {
        return __awaiter(this, void 0, void 0, function* () {
            const existingPlans = yield models_1.SubscriptionPlan.count();
            if (existingPlans > 0) {
                return; // Plans already exist
            }
            const defaultPlans = [
                {
                    name: 'Free',
                    price: 0,
                    currency: 'VND',
                    duration_days: 30,
                    features: ['basic_download'],
                    max_downloads_per_day: 10,
                    max_concurrent_streams: 1,
                    max_quality: '720p',
                },
                {
                    name: 'Pro',
                    price: 99000,
                    currency: 'VND',
                    duration_days: 30,
                    features: ['hd_download', 'ad_free', 'priority_support', 'concurrent_streams'],
                    max_downloads_per_day: 100,
                    max_concurrent_streams: 3,
                    max_quality: 'best',
                },
            ];
            for (const planData of defaultPlans) {
                yield models_1.SubscriptionPlan.create(planData);
            }
        });
    }
}
exports.default = new SubscriptionService();
