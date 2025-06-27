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
class AdminService {
    /**
     * Get admin dashboard statistics
     */
    getDashboardStats() {
        return __awaiter(this, void 0, void 0, function* () {
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
            const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
            const [totalUsers, activeSubscriptions, totalRevenue, newUsersToday, newUsersYesterday, revenueToday, revenueYesterday, usersLastMonth, revenueLastMonth,] = yield Promise.all([
                // Total users
                models_1.User.count(),
                // Active subscriptions
                models_1.UserSubscription.count({
                    where: {
                        status: 'active',
                        starts_at: { [sequelize_1.Op.lte]: now },
                        expires_at: { [sequelize_1.Op.gt]: now },
                    },
                }),
                // Total revenue
                models_1.Payment.sum('amount', {
                    where: { status: 'completed' },
                }),
                // New users today
                models_1.User.count({
                    where: {
                        created_at: { [sequelize_1.Op.gte]: today },
                    },
                }),
                // New users yesterday
                models_1.User.count({
                    where: {
                        created_at: {
                            [sequelize_1.Op.gte]: yesterday,
                            [sequelize_1.Op.lt]: today,
                        },
                    },
                }),
                // Revenue today
                models_1.Payment.sum('amount', {
                    where: {
                        status: 'completed',
                        created_at: { [sequelize_1.Op.gte]: today },
                    },
                }),
                // Revenue yesterday
                models_1.Payment.sum('amount', {
                    where: {
                        status: 'completed',
                        created_at: {
                            [sequelize_1.Op.gte]: yesterday,
                            [sequelize_1.Op.lt]: today,
                        },
                    },
                }),
                // Users last month
                models_1.User.count({
                    where: {
                        created_at: { [sequelize_1.Op.gte]: lastMonth },
                    },
                }),
                // Revenue last month
                models_1.Payment.sum('amount', {
                    where: {
                        status: 'completed',
                        created_at: { [sequelize_1.Op.gte]: lastMonth },
                    },
                }),
            ]);
            // Calculate growth rates
            const userGrowth = newUsersYesterday > 0
                ? ((newUsersToday - newUsersYesterday) / newUsersYesterday) * 100
                : newUsersToday > 0 ? 100 : 0;
            const revenueGrowth = (revenueYesterday || 0) > 0
                ? (((revenueToday || 0) - (revenueYesterday || 0)) / (revenueYesterday || 0)) * 100
                : (revenueToday || 0) > 0 ? 100 : 0;
            return {
                totalUsers,
                activeSubscriptions,
                totalRevenue: Number(totalRevenue) || 0,
                newUsersToday,
                revenueToday: Number(revenueToday) || 0,
                userGrowth: Math.round(userGrowth * 100) / 100,
                revenueGrowth: Math.round(revenueGrowth * 100) / 100,
            };
        });
    }
    /**
     * Get users with pagination and filters
     */
    getUsers() {
        return __awaiter(this, arguments, void 0, function* (page = 1, limit = 20, search, subscriptionTier) {
            const offset = (page - 1) * limit;
            const whereClause = {};
            if (search) {
                whereClause.email = {
                    [sequelize_1.Op.iLike]: `%${search}%`,
                };
            }
            if (subscriptionTier) {
                whereClause.subscription_tier = subscriptionTier;
            }
            const { count, rows } = yield models_1.User.findAndCountAll({
                where: whereClause,
                include: [
                    {
                        model: models_1.UserSubscription,
                        as: 'subscriptions',
                        include: [
                            {
                                model: models_1.SubscriptionPlan,
                                as: 'plan',
                            },
                        ],
                        where: {
                            status: 'active',
                            starts_at: { [sequelize_1.Op.lte]: new Date() },
                            expires_at: { [sequelize_1.Op.gt]: new Date() },
                        },
                        required: false,
                    },
                ],
                limit,
                offset,
                order: [['created_at', 'DESC']],
            });
            return {
                users: rows.map(user => {
                    var _a;
                    return (Object.assign(Object.assign({}, user.toJSON()), { activeSubscription: ((_a = user.subscriptions) === null || _a === void 0 ? void 0 : _a[0]) || null }));
                }),
                totalCount: count,
                pagination: {
                    page,
                    limit,
                    totalPages: Math.ceil(count / limit),
                },
            };
        });
    }
    /**
     * Update user subscription tier
     */
    updateUserSubscriptionTier(userId, tier) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield models_1.User.findByPk(userId);
            if (!user) {
                throw new Error('User not found');
            }
            user.subscription_tier = tier;
            yield user.save();
            return user;
        });
    }
    /**
     * Deactivate user account
     */
    deactivateUser(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield models_1.User.findByPk(userId);
            if (!user) {
                throw new Error('User not found');
            }
            // Cancel active subscriptions
            yield models_1.UserSubscription.update({ status: 'cancelled' }, {
                where: {
                    user_id: userId,
                    status: 'active',
                },
            });
            // You might want to add an is_active field to User model
            // For now, we'll just update the subscription tier
            user.subscription_tier = 'free';
            yield user.save();
            return user;
        });
    }
    /**
     * Get subscription analytics
     */
    getSubscriptionAnalytics() {
        return __awaiter(this, void 0, void 0, function* () {
            const now = new Date();
            const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
            // Plan distribution
            const planDistribution = yield models_1.UserSubscription.findAll({
                attributes: [
                    [models_1.SubscriptionPlan.sequelize.col('plan.name'), 'planName'],
                    [models_1.SubscriptionPlan.sequelize.fn('COUNT', models_1.SubscriptionPlan.sequelize.col('UserSubscription.id')), 'count'],
                    [models_1.SubscriptionPlan.sequelize.fn('SUM', models_1.SubscriptionPlan.sequelize.col('plan.price')), 'revenue'],
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
                    starts_at: { [sequelize_1.Op.lte]: now },
                    expires_at: { [sequelize_1.Op.gt]: now },
                },
                group: ['plan.id', 'plan.name'],
                raw: true,
            });
            // Monthly revenue (simplified - you might want to use a more sophisticated query)
            const monthlyRevenue = yield models_1.Payment.findAll({
                attributes: [
                    [models_1.Payment.sequelize.fn('DATE_TRUNC', 'month', models_1.Payment.sequelize.col('created_at')), 'month'],
                    [models_1.Payment.sequelize.fn('SUM', models_1.Payment.sequelize.col('amount')), 'revenue'],
                    [models_1.Payment.sequelize.fn('COUNT', models_1.Payment.sequelize.col('id')), 'subscriptions'],
                ],
                where: {
                    status: 'completed',
                    created_at: { [sequelize_1.Op.gte]: sixMonthsAgo },
                },
                group: [models_1.Payment.sequelize.fn('DATE_TRUNC', 'month', models_1.Payment.sequelize.col('created_at'))],
                order: [[models_1.Payment.sequelize.fn('DATE_TRUNC', 'month', models_1.Payment.sequelize.col('created_at')), 'ASC']],
                raw: true,
            });
            // Calculate churn rate (simplified)
            const totalActiveSubscriptions = yield models_1.UserSubscription.count({
                where: {
                    status: 'active',
                    starts_at: { [sequelize_1.Op.lte]: now },
                    expires_at: { [sequelize_1.Op.gt]: now },
                },
            });
            const cancelledThisMonth = yield models_1.UserSubscription.count({
                where: {
                    status: 'cancelled',
                    updated_at: {
                        [sequelize_1.Op.gte]: new Date(now.getFullYear(), now.getMonth(), 1),
                    },
                },
            });
            const churnRate = totalActiveSubscriptions > 0
                ? (cancelledThisMonth / totalActiveSubscriptions) * 100
                : 0;
            return {
                planDistribution: planDistribution.map(item => ({
                    planName: item.planName,
                    count: Number(item.count),
                    revenue: Number(item.revenue) || 0,
                })),
                monthlyRevenue: monthlyRevenue.map(item => ({
                    month: item.month,
                    revenue: Number(item.revenue) || 0,
                    subscriptions: Number(item.subscriptions),
                })),
                churnRate: Math.round(churnRate * 100) / 100,
            };
        });
    }
    /**
     * Create admin user
     */
    createAdmin(email_1, password_1) {
        return __awaiter(this, arguments, void 0, function* (email, password, role = 'moderator', permissions = []) {
            const existingAdmin = yield models_1.Admin.findOne({ where: { email } });
            if (existingAdmin) {
                throw new Error('Admin with this email already exists');
            }
            const admin = yield models_1.Admin.create({
                email,
                password_hash: password, // Will be hashed by the model hook
                role,
                permissions,
            });
            return admin;
        });
    }
    /**
     * Authenticate admin
     */
    authenticateAdmin(email, password) {
        return __awaiter(this, void 0, void 0, function* () {
            const admin = yield models_1.Admin.findOne({
                where: {
                    email,
                    is_active: true,
                },
            });
            if (!admin) {
                return null;
            }
            const isValidPassword = yield admin.validatePassword(password);
            if (!isValidPassword) {
                return null;
            }
            yield admin.updateLastLogin();
            return admin;
        });
    }
    /**
     * Get admin by ID
     */
    getAdminById(adminId) {
        return __awaiter(this, void 0, void 0, function* () {
            const admin = yield models_1.Admin.findOne({
                where: {
                    id: adminId,
                    is_active: true,
                },
            });
            return admin;
        });
    }
    /**
     * Get admin by email
     */
    getAdminByEmail(email) {
        return __awaiter(this, void 0, void 0, function* () {
            const admin = yield models_1.Admin.findOne({
                where: {
                    email,
                    is_active: true,
                },
            });
            return admin;
        });
    }
    /**
     * Get total admin count
     */
    getAdminCount() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield models_1.Admin.count();
        });
    }
    /**
     * Get active admin count
     */
    getActiveAdminCount() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield models_1.Admin.count({
                where: {
                    is_active: true,
                },
            });
        });
    }
    /**
     * Check if admin with specific email exists
     */
    hasAdminWithEmail(email) {
        return __awaiter(this, void 0, void 0, function* () {
            const count = yield models_1.Admin.count({
                where: {
                    email,
                    is_active: true,
                },
            });
            return count > 0;
        });
    }
    /**
     * Initialize default admin user
     */
    initializeDefaultAdmin() {
        return __awaiter(this, void 0, void 0, function* () {
            const existingAdmin = yield models_1.Admin.count();
            if (existingAdmin > 0) {
                return; // Admin already exists
            }
            const defaultEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@taivideonhanh.com';
            const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123456';
            yield this.createAdmin(defaultEmail, defaultPassword, 'super_admin', [
                'user_management',
                'subscription_management',
                'payment_management',
                'system_settings',
                'analytics_view',
            ]);
            console.log(`Default admin created: ${defaultEmail}`);
        });
    }
}
exports.default = new AdminService();
