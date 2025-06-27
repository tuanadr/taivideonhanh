import { Router, Request, Response } from 'express';
import { body, query, param, validationResult } from 'express-validator';
import { authenticateAdmin, requireAdminRole, requireAdminPermission, generateAdminToken } from '../middleware/adminAuth';
import AdminService from '../services/adminService';
import CookieService from '../services/cookieService';

const router = Router();

/**
 * Validation middleware
 */
const validateRequest = (req: Request, res: Response, next: Function) => {
  const errors = validationResult(req);
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
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

const getUsersValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('search').optional().isString().withMessage('Search must be a string'),
  query('subscriptionTier').optional().isIn(['free', 'pro']).withMessage('Invalid subscription tier'),
];

/**
 * POST /api/admin/login
 * Admin login
 */
router.post('/login',
  loginValidation,
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      const admin = await AdminService.authenticateAdmin(email, password);
      if (!admin) {
        return res.status(401).json({
          error: 'Invalid admin credentials',
          code: 'INVALID_ADMIN_CREDENTIALS'
        });
      }

      const token = generateAdminToken(admin);

      res.json({
        message: 'Admin login successful',
        admin: admin.toJSON(),
        token,
      });
    } catch (error) {
      console.error('Admin login error:', error);
      res.status(500).json({
        error: 'Admin login failed',
        code: 'ADMIN_LOGIN_FAILED'
      });
    }
  }
);

/**
 * GET /api/admin/verify
 * Verify admin token and return admin info
 */
router.get('/verify',
  authenticateAdmin,
  async (req: Request, res: Response) => {
    try {
      // If we reach here, the token is valid (authenticateAdmin middleware passed)
      const adminId = req.admin!.adminId;

      // Get fresh admin data from database
      const admin = await AdminService.getAdminById(adminId);
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
    } catch (error) {
      console.error('Admin token verification error:', error);
      res.status(500).json({
        error: 'Token verification failed',
        code: 'TOKEN_VERIFICATION_FAILED'
      });
    }
  }
);

/**
 * POST /api/admin/create-vn-admin
 * Temporary endpoint to create admin@taivideonhanh.vn user
 */
router.post('/create-vn-admin',
  async (req: Request, res: Response) => {
    try {
      // Security check - only allow if no .vn admin exists
      const existingVnAdmin = await AdminService.getAdminByEmail('admin@taivideonhanh.vn');
      if (existingVnAdmin) {
        return res.status(400).json({
          error: 'Admin user with .vn domain already exists',
          code: 'ADMIN_EXISTS'
        });
      }

      // Create admin user
      const admin = await AdminService.createAdmin(
        'admin@taivideonhanh.vn',
        'admin123456',
        'super_admin',
        [
          'user_management',
          'subscription_management',
          'payment_management',
          'system_settings',
          'analytics_view'
        ]
      );

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
    } catch (error) {
      console.error('Admin creation error:', error);
      res.status(500).json({
        error: 'Failed to create admin user',
        code: 'ADMIN_CREATION_FAILED',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * GET /api/admin/dashboard/stats
 * Get dashboard statistics
 */
router.get('/dashboard/stats',
  authenticateAdmin,
  requireAdminPermission('analytics_view'),
  async (req: Request, res: Response) => {
    try {
      const stats = await AdminService.getDashboardStats();

      res.json({
        message: 'Dashboard statistics retrieved successfully',
        stats,
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      res.status(500).json({
        error: 'Failed to fetch dashboard statistics',
        code: 'DASHBOARD_STATS_FAILED'
      });
    }
  }
);

/**
 * GET /api/admin/users
 * Get users with pagination and filters
 */
router.get('/users',
  authenticateAdmin,
  requireAdminPermission('user_management'),
  getUsersValidation,
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = req.query.search as string;
      const subscriptionTier = req.query.subscriptionTier as string;

      const result = await AdminService.getUsers(page, limit, search, subscriptionTier);

      res.json({
        message: 'Users retrieved successfully',
        ...result,
      });
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({
        error: 'Failed to fetch users',
        code: 'USERS_FETCH_FAILED'
      });
    }
  }
);

/**
 * PUT /api/admin/users/:userId/subscription-tier
 * Update user subscription tier
 */
router.put('/users/:userId/subscription-tier',
  authenticateAdmin,
  requireAdminPermission('user_management'),
  param('userId').isUUID().withMessage('Valid user ID is required'),
  body('tier').isIn(['free', 'pro']).withMessage('Invalid subscription tier'),
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const { tier } = req.body;

      const user = await AdminService.updateUserSubscriptionTier(userId, tier);

      res.json({
        message: 'User subscription tier updated successfully',
        user: user.toJSON(),
      });
    } catch (error) {
      console.error('Error updating user subscription tier:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update user subscription tier';
      res.status(400).json({
        error: errorMessage,
        code: 'USER_TIER_UPDATE_FAILED'
      });
    }
  }
);

/**
 * DELETE /api/admin/users/:userId
 * Deactivate user account
 */
router.delete('/users/:userId',
  authenticateAdmin,
  requireAdminRole('admin'),
  param('userId').isUUID().withMessage('Valid user ID is required'),
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;

      const user = await AdminService.deactivateUser(userId);

      res.json({
        message: 'User account deactivated successfully',
        user: user.toJSON(),
      });
    } catch (error) {
      console.error('Error deactivating user:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to deactivate user';
      res.status(400).json({
        error: errorMessage,
        code: 'USER_DEACTIVATION_FAILED'
      });
    }
  }
);

/**
 * GET /api/admin/analytics/subscriptions
 * Get subscription analytics
 */
router.get('/analytics/subscriptions',
  authenticateAdmin,
  requireAdminPermission('analytics_view'),
  async (req: Request, res: Response) => {
    try {
      const analytics = await AdminService.getSubscriptionAnalytics();

      res.json({
        message: 'Subscription analytics retrieved successfully',
        analytics,
      });
    } catch (error) {
      console.error('Error fetching subscription analytics:', error);
      res.status(500).json({
        error: 'Failed to fetch subscription analytics',
        code: 'SUBSCRIPTION_ANALYTICS_FAILED'
      });
    }
  }
);

/**
 * GET /api/admin/verify
 * Verify admin token
 */
router.get('/verify',
  authenticateAdmin,
  async (req: Request, res: Response) => {
    try {
      res.json({
        message: 'Admin token verified successfully',
        admin: req.admin,
        valid: true,
      });
    } catch (error) {
      console.error('Error verifying admin token:', error);
      res.status(500).json({
        error: 'Failed to verify admin token',
        code: 'ADMIN_VERIFY_FAILED'
      });
    }
  }
);

/**
 * GET /api/admin/profile
 * Get admin profile
 */
router.get('/profile',
  authenticateAdmin,
  async (req: Request, res: Response) => {
    try {
      res.json({
        message: 'Admin profile retrieved successfully',
        admin: req.admin,
      });
    } catch (error) {
      console.error('Error fetching admin profile:', error);
      res.status(500).json({
        error: 'Failed to fetch admin profile',
        code: 'ADMIN_PROFILE_FAILED'
      });
    }
  }
);

/**
 * Cookie Management Routes
 */

/**
 * GET /api/admin/cookie/info
 * Get current cookie file information
 */
router.get('/cookie/info',
  authenticateAdmin,
  requireAdminPermission('system_settings'),
  async (req: Request, res: Response) => {
    try {
      const cookieInfo = await CookieService.getCurrentCookieInfo();

      res.json({
        message: 'Cookie information retrieved successfully',
        cookieInfo,
        hasActiveCookie: !!cookieInfo
      });
    } catch (error) {
      console.error('Error fetching cookie info:', error);
      res.status(500).json({
        error: 'Failed to fetch cookie information',
        code: 'COOKIE_INFO_FAILED'
      });
    }
  }
);

/**
 * POST /api/admin/cookie/upload
 * Upload new cookie file (expects base64 encoded content)
 */
router.post('/cookie/upload',
  authenticateAdmin,
  requireAdminPermission('system_settings'),
  body('content').isString().withMessage('Cookie content is required'),
  body('filename').isString().withMessage('Filename is required'),
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { content, filename } = req.body;

      // Decode base64 content
      let fileBuffer: Buffer;
      try {
        fileBuffer = Buffer.from(content, 'base64');
      } catch (error) {
        return res.status(400).json({
          error: 'Invalid file content encoding',
          code: 'INVALID_ENCODING'
        });
      }

      // Save the cookie file
      const cookieInfo = await CookieService.saveCookieFile(fileBuffer, filename);

      // Test the cookie file
      const testResult = await CookieService.testCookieFile();

      res.json({
        message: 'Cookie file uploaded successfully',
        cookieInfo,
        testResult,
        uploadedBy: req.admin?.email
      });

    } catch (error) {
      console.error('Cookie upload error:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Cookie upload failed',
        code: 'COOKIE_UPLOAD_FAILED'
      });
    }
  }
);

/**
 * POST /api/admin/cookie/test
 * Test current cookie file
 */
router.post('/cookie/test',
  authenticateAdmin,
  requireAdminPermission('system_settings'),
  async (req: Request, res: Response) => {
    try {
      const testResult = await CookieService.testCookieFile();

      res.json({
        message: 'Cookie test completed',
        testResult
      });
    } catch (error) {
      console.error('Cookie test error:', error);
      res.status(500).json({
        error: 'Cookie test failed',
        code: 'COOKIE_TEST_FAILED'
      });
    }
  }
);

/**
 * DELETE /api/admin/cookie
 * Delete current cookie file
 */
router.delete('/cookie',
  authenticateAdmin,
  requireAdminPermission('system_settings'),
  async (req: Request, res: Response) => {
    try {
      await CookieService.deleteCookieFile();

      res.json({
        message: 'Cookie file deleted successfully',
        deletedBy: req.admin?.email
      });
    } catch (error) {
      console.error('Cookie deletion error:', error);
      res.status(500).json({
        error: 'Cookie deletion failed',
        code: 'COOKIE_DELETE_FAILED'
      });
    }
  }
);

export default router;
