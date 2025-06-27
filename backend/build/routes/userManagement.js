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
const express_validator_1 = require("express-validator");
const adminAuth_1 = require("../middleware/adminAuth");
const userService_1 = __importDefault(require("../services/userService"));
// import SubscriptionService from '../services/subscriptionService'; // Will be implemented later
const router = (0, express_1.Router)();
// Validation middleware
const validateRequest = (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Validation failed',
            details: errors.array()
        });
    }
    next();
};
/**
 * GET /api/admin/users
 * Get users list with pagination and filters
 */
router.get('/', adminAuth_1.authenticateAdmin, (0, adminAuth_1.requireAdminPermission)('user_management'), [
    (0, express_validator_1.query)('page').optional().isInt({ min: 1 }),
    (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 100 }),
    (0, express_validator_1.query)('search').optional().isString(),
    (0, express_validator_1.query)('status').optional().isIn(['active', 'inactive', 'suspended']),
    (0, express_validator_1.query)('subscription').optional().isIn(['free', 'premium', 'pro']),
    (0, express_validator_1.query)('sortBy').optional().isIn(['created_at', 'last_login', 'email', 'subscription_tier']),
    (0, express_validator_1.query)('sortOrder').optional().isIn(['asc', 'desc'])
], validateRequest, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { page = 1, limit = 20, search, status, subscription, sortBy = 'created_at', sortOrder = 'desc' } = req.query;
        const users = yield userService_1.default.getUsersList({
            page: parseInt(page),
            limit: parseInt(limit),
            search: search,
            status: status,
            subscription: subscription,
            sortBy: sortBy,
            sortOrder: sortOrder
        });
        res.json({
            message: 'Users list retrieved successfully',
            users: users.data,
            pagination: users.pagination,
            filters: {
                search,
                status,
                subscription,
                sortBy,
                sortOrder
            }
        });
    }
    catch (error) {
        console.error('Get users list error:', error);
        res.status(500).json({
            error: 'Failed to get users list',
            code: 'USERS_LIST_FAILED'
        });
    }
}));
/**
 * GET /api/admin/users/:userId
 * Get user details
 */
router.get('/:userId', adminAuth_1.authenticateAdmin, (0, adminAuth_1.requireAdminPermission)('user_management'), [
    (0, express_validator_1.param)('userId').isUUID()
], validateRequest, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId } = req.params;
        const user = yield userService_1.default.getUserDetails(userId);
        if (!user) {
            return res.status(404).json({
                error: 'User not found',
                code: 'USER_NOT_FOUND'
            });
        }
        res.json({
            message: 'User details retrieved successfully',
            user
        });
    }
    catch (error) {
        console.error('Get user details error:', error);
        res.status(500).json({
            error: 'Failed to get user details',
            code: 'USER_DETAILS_FAILED'
        });
    }
}));
/**
 * PUT /api/admin/users/:userId/subscription
 * Update user subscription tier
 */
router.put('/:userId/subscription', adminAuth_1.authenticateAdmin, (0, adminAuth_1.requireAdminPermission)('subscription_management'), [
    (0, express_validator_1.param)('userId').isUUID(),
    (0, express_validator_1.body)('tier').isIn(['free', 'premium', 'pro']),
    (0, express_validator_1.body)('expiresAt').optional().isISO8601(),
    (0, express_validator_1.body)('reason').optional().isString()
], validateRequest, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId } = req.params;
        const { tier, expiresAt, reason } = req.body;
        const adminId = req.admin.adminId;
        // Mock subscription update (will be implemented with SubscriptionService)
        const result = {
            userId,
            tier,
            expiresAt: expiresAt ? new Date(expiresAt) : null,
            updatedBy: adminId,
            reason,
            updatedAt: new Date()
        };
        res.json({
            message: 'User subscription updated successfully',
            subscription: result
        });
    }
    catch (error) {
        console.error('Update user subscription error:', error);
        res.status(500).json({
            error: 'Failed to update user subscription',
            code: 'SUBSCRIPTION_UPDATE_FAILED',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}));
/**
 * PUT /api/admin/users/:userId/status
 * Update user status (active/inactive/suspended)
 */
router.put('/:userId/status', adminAuth_1.authenticateAdmin, (0, adminAuth_1.requireAdminPermission)('user_management'), [
    (0, express_validator_1.param)('userId').isUUID(),
    (0, express_validator_1.body)('status').isIn(['active', 'inactive', 'suspended']),
    (0, express_validator_1.body)('reason').optional().isString()
], validateRequest, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId } = req.params;
        const { status, reason } = req.body;
        const adminId = req.admin.adminId;
        const result = yield userService_1.default.updateUserStatus(userId, status, adminId, reason);
        res.json({
            message: 'User status updated successfully',
            user: result
        });
    }
    catch (error) {
        console.error('Update user status error:', error);
        res.status(500).json({
            error: 'Failed to update user status',
            code: 'USER_STATUS_UPDATE_FAILED',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}));
/**
 * GET /api/admin/users/stats
 * Get user statistics
 */
router.get('/stats/overview', adminAuth_1.authenticateAdmin, (0, adminAuth_1.requireAdminPermission)('analytics_view'), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const stats = yield userService_1.default.getUserStats();
        res.json({
            message: 'User statistics retrieved successfully',
            stats
        });
    }
    catch (error) {
        console.error('Get user stats error:', error);
        res.status(500).json({
            error: 'Failed to get user statistics',
            code: 'USER_STATS_FAILED'
        });
    }
}));
/**
 * POST /api/admin/users/:userId/reset-password
 * Reset user password
 */
router.post('/:userId/reset-password', adminAuth_1.authenticateAdmin, (0, adminAuth_1.requireAdminPermission)('user_management'), [
    (0, express_validator_1.param)('userId').isUUID(),
    (0, express_validator_1.body)('newPassword').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
    (0, express_validator_1.body)('reason').optional().isString()
], validateRequest, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId } = req.params;
        const { newPassword, reason } = req.body;
        const adminId = req.admin.adminId;
        yield userService_1.default.resetUserPassword(userId, newPassword, adminId, reason);
        res.json({
            message: 'User password reset successfully'
        });
    }
    catch (error) {
        console.error('Reset user password error:', error);
        res.status(500).json({
            error: 'Failed to reset user password',
            code: 'PASSWORD_RESET_FAILED',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}));
/**
 * DELETE /api/admin/users/:userId
 * Delete user account (soft delete)
 */
router.delete('/:userId', adminAuth_1.authenticateAdmin, (0, adminAuth_1.requireAdminPermission)('user_management'), [
    (0, express_validator_1.param)('userId').isUUID(),
    (0, express_validator_1.body)('reason').isString().notEmpty()
], validateRequest, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId } = req.params;
        const { reason } = req.body;
        const adminId = req.admin.adminId;
        yield userService_1.default.deleteUser(userId, adminId, reason);
        res.json({
            message: 'User account deleted successfully'
        });
    }
    catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({
            error: 'Failed to delete user account',
            code: 'USER_DELETE_FAILED',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}));
exports.default = router;
