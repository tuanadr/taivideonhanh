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
const User_1 = __importDefault(require("../models/User"));
// Note: Subscription model will be created later
const sequelize_1 = require("sequelize");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
class UserService {
    /**
     * Get users list with pagination and filters
     */
    static getUsersList(options) {
        return __awaiter(this, void 0, void 0, function* () {
            const { page, limit, search, status, subscription, sortBy, sortOrder } = options;
            const offset = (page - 1) * limit;
            // Build where clause
            const whereClause = {};
            if (search) {
                whereClause[sequelize_1.Op.or] = [
                    { email: { [sequelize_1.Op.iLike]: `%${search}%` } },
                    { first_name: { [sequelize_1.Op.iLike]: `%${search}%` } },
                    { last_name: { [sequelize_1.Op.iLike]: `%${search}%` } }
                ];
            }
            if (status) {
                if (status === 'active') {
                    whereClause.is_active = true;
                }
                else if (status === 'inactive') {
                    whereClause.is_active = false;
                }
                else if (status === 'suspended') {
                    whereClause.is_suspended = true;
                }
            }
            // Build include for subscription filter (commented out until Subscription model is created)
            const include = [
            // {
            //   model: Subscription,
            //   as: 'subscription',
            //   required: false
            // }
            ];
            // if (subscription) {
            //   include[0].where = { tier: subscription };
            //   include[0].required = true;
            // }
            // Build order clause
            const orderClause = [];
            if (sortBy === 'subscription_tier') {
                // orderClause.push([{ model: Subscription, as: 'subscription' }, 'tier', sortOrder.toUpperCase()]);
                orderClause.push(['created_at', sortOrder.toUpperCase()]); // Fallback to created_at
            }
            else {
                orderClause.push([sortBy, sortOrder.toUpperCase()]);
            }
            const { count, rows } = yield User_1.default.findAndCountAll({
                where: whereClause,
                include,
                limit,
                offset,
                order: orderClause,
                attributes: [
                    'id',
                    'email',
                    'first_name',
                    'last_name',
                    'is_active',
                    'is_suspended',
                    'last_login',
                    'created_at',
                    'updated_at'
                ]
            });
            return {
                data: rows,
                pagination: {
                    page,
                    limit,
                    total: count,
                    totalPages: Math.ceil(count / limit)
                }
            };
        });
    }
    /**
     * Get user details with subscription info
     */
    static getUserDetails(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield User_1.default.findByPk(userId, {
                // include: [
                //   {
                //     model: Subscription,
                //     as: 'subscription'
                //   }
                // ],
                attributes: [
                    'id',
                    'email',
                    'first_name',
                    'last_name',
                    'is_active',
                    'is_suspended',
                    'last_login',
                    'created_at',
                    'updated_at'
                ]
            });
            return user;
        });
    }
    /**
     * Update user status
     */
    static updateUserStatus(userId, status, adminId, reason) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield User_1.default.findByPk(userId);
            if (!user) {
                throw new Error('User not found');
            }
            const updateData = {};
            if (status === 'active') {
                updateData.is_active = true;
                updateData.is_suspended = false;
            }
            else if (status === 'inactive') {
                updateData.is_active = false;
                updateData.is_suspended = false;
            }
            else if (status === 'suspended') {
                updateData.is_active = false;
                updateData.is_suspended = true;
            }
            yield user.update(updateData);
            // Log the action (in a real implementation, you would have an audit log)
            console.log(`Admin ${adminId} updated user ${userId} status to ${status}. Reason: ${reason || 'No reason provided'}`);
            return user;
        });
    }
    /**
     * Reset user password
     */
    static resetUserPassword(userId, newPassword, adminId, reason) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield User_1.default.findByPk(userId);
            if (!user) {
                throw new Error('User not found');
            }
            const hashedPassword = yield bcryptjs_1.default.hash(newPassword, 12);
            yield user.update({ password_hash: hashedPassword });
            // Log the action
            console.log(`Admin ${adminId} reset password for user ${userId}. Reason: ${reason || 'No reason provided'}`);
        });
    }
    /**
     * Delete user (soft delete)
     */
    static deleteUser(userId, adminId, reason) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield User_1.default.findByPk(userId);
            if (!user) {
                throw new Error('User not found');
            }
            // Soft delete by marking as inactive and adding deletion info
            yield user.update({
                is_active: false,
                is_suspended: true,
                deleted_at: new Date(),
                deletion_reason: reason,
                deleted_by: adminId
            });
            // Log the action
            console.log(`Admin ${adminId} deleted user ${userId}. Reason: ${reason}`);
        });
    }
    /**
     * Get user statistics
     */
    static getUserStats() {
        return __awaiter(this, void 0, void 0, function* () {
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            // Basic user counts
            const totalUsers = yield User_1.default.count();
            const activeUsers = yield User_1.default.count({ where: { is_active: true } });
            const inactiveUsers = yield User_1.default.count({ where: { is_active: false } });
            const suspendedUsers = yield User_1.default.count({ where: { is_suspended: true } });
            // Subscription counts (mock data until Subscription model is implemented)
            const freeUsers = Math.floor(totalUsers * 0.6); // 60% free users
            const premiumUsers = Math.floor(totalUsers * 0.3); // 30% premium users
            const proUsers = Math.floor(totalUsers * 0.1); // 10% pro users
            // New users
            const newUsersToday = yield User_1.default.count({
                where: {
                    created_at: {
                        [sequelize_1.Op.gte]: today
                    }
                }
            });
            const newUsersThisWeek = yield User_1.default.count({
                where: {
                    created_at: {
                        [sequelize_1.Op.gte]: thisWeek
                    }
                }
            });
            const newUsersThisMonth = yield User_1.default.count({
                where: {
                    created_at: {
                        [sequelize_1.Op.gte]: thisMonth
                    }
                }
            });
            // Mock data for complex stats (in real implementation, you would calculate these)
            const averageSessionTime = 1800; // 30 minutes in seconds
            const topCountries = [
                { country: 'Vietnam', count: Math.floor(totalUsers * 0.6) },
                { country: 'United States', count: Math.floor(totalUsers * 0.2) },
                { country: 'Thailand', count: Math.floor(totalUsers * 0.1) },
                { country: 'Singapore', count: Math.floor(totalUsers * 0.05) },
                { country: 'Others', count: Math.floor(totalUsers * 0.05) }
            ];
            return {
                totalUsers,
                activeUsers,
                inactiveUsers,
                suspendedUsers,
                freeUsers,
                premiumUsers,
                proUsers,
                newUsersToday,
                newUsersThisWeek,
                newUsersThisMonth,
                averageSessionTime,
                topCountries
            };
        });
    }
    /**
     * Search users by email or name
     */
    static searchUsers(query_1) {
        return __awaiter(this, arguments, void 0, function* (query, limit = 10) {
            return yield User_1.default.findAll({
                where: {
                    [sequelize_1.Op.or]: [
                        { email: { [sequelize_1.Op.iLike]: `%${query}%` } },
                        { first_name: { [sequelize_1.Op.iLike]: `%${query}%` } },
                        { last_name: { [sequelize_1.Op.iLike]: `%${query}%` } }
                    ]
                },
                limit,
                attributes: ['id', 'email', 'first_name', 'last_name', 'is_active'],
                order: [['created_at', 'DESC']]
            });
        });
    }
}
exports.default = UserService;
