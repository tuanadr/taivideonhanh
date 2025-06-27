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
const adminService_1 = __importDefault(require("../services/adminService"));
const cookieService_1 = __importDefault(require("../services/cookieService"));
const cookie_1 = __importDefault(require("./cookie"));
const router = (0, express_1.Router)();
/**
 * Validation middleware
 */
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
 * Validation rules
 */
const loginValidation = [
    (0, express_validator_1.body)('email').isEmail().withMessage('Valid email is required'),
    (0, express_validator_1.body)('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];
const getUsersValidation = [
    (0, express_validator_1.query)('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    (0, express_validator_1.query)('search').optional().isString().withMessage('Search must be a string'),
    (0, express_validator_1.query)('subscriptionTier').optional().isIn(['free', 'pro']).withMessage('Invalid subscription tier'),
];
/**
 * POST /api/admin/login
 * Admin login
 */
router.post('/login', loginValidation, validateRequest, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password } = req.body;
        const admin = yield adminService_1.default.authenticateAdmin(email, password);
        if (!admin) {
            return res.status(401).json({
                error: 'Invalid admin credentials',
                code: 'INVALID_ADMIN_CREDENTIALS'
            });
        }
        const token = (0, adminAuth_1.generateAdminToken)(admin);
        res.json({
            message: 'Admin login successful',
            admin: admin.toJSON(),
            token,
        });
    }
    catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({
            error: 'Admin login failed',
            code: 'ADMIN_LOGIN_FAILED'
        });
    }
}));
/**
 * GET /api/admin/verify
 * Verify admin token and return admin info
 */
router.get('/verify', adminAuth_1.authenticateAdmin, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // If we reach here, the token is valid (authenticateAdmin middleware passed)
        const adminId = req.admin.adminId;
        // Get fresh admin data from database
        const admin = yield adminService_1.default.getAdminById(adminId);
        if (!admin) {
            return res.status(401).json({
                error: 'Admin account not found',
                code: 'ADMIN_NOT_FOUND'
            });
        }
        res.json({
            message: 'Admin token verified',
            admin: admin.toJSON(),
            isValid: true,
        });
    }
    catch (error) {
        console.error('Admin token verification error:', error);
        res.status(500).json({
            error: 'Token verification failed',
            code: 'TOKEN_VERIFICATION_FAILED'
        });
    }
}));
/**
 * POST /api/admin/create-vn-admin
 * Create admin@taivideonhanh.vn user
 */
router.post('/create-vn-admin', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Security check - only allow if no .vn admin exists
        const existingVnAdmin = yield adminService_1.default.getAdminByEmail('admin@taivideonhanh.vn');
        if (existingVnAdmin) {
            return res.status(400).json({
                error: 'Admin user with .vn domain already exists',
                code: 'ADMIN_EXISTS'
            });
        }
        // Create admin user
        const admin = yield adminService_1.default.createAdmin('admin@taivideonhanh.vn', 'admin123456', 'super_admin', [
            'user_management',
            'subscription_management',
            'payment_management',
            'system_settings',
            'analytics_view'
        ]);
        res.json({
            message: 'Admin user created successfully',
            admin: {
                id: admin.id,
                email: admin.email,
                role: admin.role,
                permissions: admin.permissions,
                created_at: admin.created_at
            }
        });
    }
    catch (error) {
        console.error('Admin creation error:', error);
        res.status(500).json({
            error: 'Failed to create admin user',
            code: 'ADMIN_CREATION_FAILED',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}));
/**
 * GET /api/admin/status
 * Get admin system status and health
 */
router.get('/status', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const adminCount = yield adminService_1.default.getAdminCount();
        const activeAdmins = yield adminService_1.default.getActiveAdminCount();
        res.json({
            message: 'Admin system status',
            status: {
                totalAdmins: adminCount,
                activeAdmins: activeAdmins,
                hasVnAdmin: yield adminService_1.default.hasAdminWithEmail('admin@taivideonhanh.vn'),
                hasComAdmin: yield adminService_1.default.hasAdminWithEmail('admin@taivideonhanh.com'),
                systemHealthy: adminCount > 0,
                timestamp: new Date().toISOString()
            }
        });
    }
    catch (error) {
        console.error('Admin status error:', error);
        res.status(500).json({
            error: 'Failed to get admin status',
            code: 'ADMIN_STATUS_FAILED'
        });
    }
}));
/**
 * GET /api/admin/dashboard/stats
 * Get dashboard statistics
 */
router.get('/dashboard/stats', adminAuth_1.authenticateAdmin, (0, adminAuth_1.requireAdminPermission)('analytics_view'), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const stats = yield adminService_1.default.getDashboardStats();
        res.json({
            message: 'Dashboard statistics retrieved successfully',
            stats,
        });
    }
    catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({
            error: 'Failed to fetch dashboard statistics',
            code: 'DASHBOARD_STATS_FAILED'
        });
    }
}));
/**
 * GET /api/admin/users
 * Get users with pagination and filters
 */
router.get('/users', adminAuth_1.authenticateAdmin, (0, adminAuth_1.requireAdminPermission)('user_management'), getUsersValidation, validateRequest, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const search = req.query.search;
        const subscriptionTier = req.query.subscriptionTier;
        const result = yield adminService_1.default.getUsers(page, limit, search, subscriptionTier);
        res.json(Object.assign({ message: 'Users retrieved successfully' }, result));
    }
    catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({
            error: 'Failed to fetch users',
            code: 'USERS_FETCH_FAILED'
        });
    }
}));
/**
 * PUT /api/admin/users/:userId/subscription-tier
 * Update user subscription tier
 */
router.put('/users/:userId/subscription-tier', adminAuth_1.authenticateAdmin, (0, adminAuth_1.requireAdminPermission)('user_management'), (0, express_validator_1.param)('userId').isUUID().withMessage('Valid user ID is required'), (0, express_validator_1.body)('tier').isIn(['free', 'pro']).withMessage('Invalid subscription tier'), validateRequest, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId } = req.params;
        const { tier } = req.body;
        const user = yield adminService_1.default.updateUserSubscriptionTier(userId, tier);
        res.json({
            message: 'User subscription tier updated successfully',
            user: user.toJSON(),
        });
    }
    catch (error) {
        console.error('Error updating user subscription tier:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to update user subscription tier';
        res.status(400).json({
            error: errorMessage,
            code: 'USER_TIER_UPDATE_FAILED'
        });
    }
}));
/**
 * DELETE /api/admin/users/:userId
 * Deactivate user account
 */
router.delete('/users/:userId', adminAuth_1.authenticateAdmin, (0, adminAuth_1.requireAdminRole)('admin'), (0, express_validator_1.param)('userId').isUUID().withMessage('Valid user ID is required'), validateRequest, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId } = req.params;
        const user = yield adminService_1.default.deactivateUser(userId);
        res.json({
            message: 'User account deactivated successfully',
            user: user.toJSON(),
        });
    }
    catch (error) {
        console.error('Error deactivating user:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to deactivate user';
        res.status(400).json({
            error: errorMessage,
            code: 'USER_DEACTIVATION_FAILED'
        });
    }
}));
/**
 * GET /api/admin/analytics/subscriptions
 * Get subscription analytics
 */
router.get('/analytics/subscriptions', adminAuth_1.authenticateAdmin, (0, adminAuth_1.requireAdminPermission)('analytics_view'), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const analytics = yield adminService_1.default.getSubscriptionAnalytics();
        res.json({
            message: 'Subscription analytics retrieved successfully',
            analytics,
        });
    }
    catch (error) {
        console.error('Error fetching subscription analytics:', error);
        res.status(500).json({
            error: 'Failed to fetch subscription analytics',
            code: 'SUBSCRIPTION_ANALYTICS_FAILED'
        });
    }
}));
/**
 * GET /api/admin/verify
 * Verify admin token
 */
router.get('/verify', adminAuth_1.authenticateAdmin, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        res.json({
            message: 'Admin token verified successfully',
            admin: req.admin,
            valid: true,
        });
    }
    catch (error) {
        console.error('Error verifying admin token:', error);
        res.status(500).json({
            error: 'Failed to verify admin token',
            code: 'ADMIN_VERIFY_FAILED'
        });
    }
}));
/**
 * GET /api/admin/profile
 * Get admin profile
 */
router.get('/profile', adminAuth_1.authenticateAdmin, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        res.json({
            message: 'Admin profile retrieved successfully',
            admin: req.admin,
        });
    }
    catch (error) {
        console.error('Error fetching admin profile:', error);
        res.status(500).json({
            error: 'Failed to fetch admin profile',
            code: 'ADMIN_PROFILE_FAILED'
        });
    }
}));
/**
 * Cookie Management Routes
 */
/**
 * GET /api/admin/cookie/info
 * Get current cookie file information
 */
router.get('/cookie/info', adminAuth_1.authenticateAdmin, (0, adminAuth_1.requireAdminPermission)('system_settings'), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const cookieInfo = yield cookieService_1.default.getCurrentCookieInfo();
        res.json({
            message: 'Cookie information retrieved successfully',
            cookieInfo,
            hasActiveCookie: !!cookieInfo
        });
    }
    catch (error) {
        console.error('Error fetching cookie info:', error);
        res.status(500).json({
            error: 'Failed to fetch cookie information',
            code: 'COOKIE_INFO_FAILED'
        });
    }
}));
/**
 * POST /api/admin/cookie/upload
 * Upload new cookie file (expects base64 encoded content)
 */
router.post('/cookie/upload', adminAuth_1.authenticateAdmin, (0, adminAuth_1.requireAdminPermission)('system_settings'), (0, express_validator_1.body)('content').isString().withMessage('Cookie content is required'), (0, express_validator_1.body)('filename').isString().withMessage('Filename is required'), validateRequest, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { content, filename } = req.body;
        // Decode base64 content
        let fileBuffer;
        try {
            fileBuffer = Buffer.from(content, 'base64');
        }
        catch (error) {
            return res.status(400).json({
                error: 'Invalid file content encoding',
                code: 'INVALID_ENCODING'
            });
        }
        // Save the cookie file
        const cookieInfo = yield cookieService_1.default.saveCookieFile(fileBuffer, filename);
        // Test the cookie file
        const testResult = yield cookieService_1.default.testCookieFile();
        res.json({
            message: 'Cookie file uploaded successfully',
            cookieInfo,
            testResult,
            uploadedBy: (_a = req.admin) === null || _a === void 0 ? void 0 : _a.email
        });
    }
    catch (error) {
        console.error('Cookie upload error:', error);
        res.status(500).json({
            error: error instanceof Error ? error.message : 'Cookie upload failed',
            code: 'COOKIE_UPLOAD_FAILED'
        });
    }
}));
/**
 * POST /api/admin/cookie/test
 * Test current cookie file
 */
router.post('/cookie/test', adminAuth_1.authenticateAdmin, (0, adminAuth_1.requireAdminPermission)('system_settings'), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const testResult = yield cookieService_1.default.testCookieFile();
        res.json({
            message: 'Cookie test completed',
            testResult
        });
    }
    catch (error) {
        console.error('Cookie test error:', error);
        res.status(500).json({
            error: 'Cookie test failed',
            code: 'COOKIE_TEST_FAILED'
        });
    }
}));
/**
 * DELETE /api/admin/cookie
 * Delete current cookie file
 */
router.delete('/cookie', adminAuth_1.authenticateAdmin, (0, adminAuth_1.requireAdminPermission)('system_settings'), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        yield cookieService_1.default.deleteCookieFile();
        res.json({
            message: 'Cookie file deleted successfully',
            deletedBy: (_a = req.admin) === null || _a === void 0 ? void 0 : _a.email
        });
    }
    catch (error) {
        console.error('Cookie deletion error:', error);
        res.status(500).json({
            error: 'Cookie deletion failed',
            code: 'COOKIE_DELETE_FAILED'
        });
    }
}));
// Mount cookie routes
router.use('/cookie', cookie_1.default);
// Mount user management routes
const userManagement_1 = __importDefault(require("./userManagement"));
router.use('/users', userManagement_1.default);
exports.default = router;
