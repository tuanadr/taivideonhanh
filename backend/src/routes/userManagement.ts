import { Router, Request, Response } from 'express';
import { body, query, param, validationResult } from 'express-validator';
import { authenticateAdmin, requireAdminPermission } from '../middleware/adminAuth';
import UserService from '../services/userService';
// import SubscriptionService from '../services/subscriptionService'; // Will be implemented later

const router = Router();

// Validation middleware
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
 * GET /api/admin/users
 * Get users list with pagination and filters
 */
router.get('/',
  authenticateAdmin,
  requireAdminPermission('user_management'),
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('search').optional().isString(),
    query('status').optional().isIn(['active', 'inactive', 'suspended']),
    query('subscription').optional().isIn(['free', 'premium', 'pro']),
    query('sortBy').optional().isIn(['created_at', 'last_login', 'email', 'subscription_tier']),
    query('sortOrder').optional().isIn(['asc', 'desc'])
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        status,
        subscription,
        sortBy = 'created_at',
        sortOrder = 'desc'
      } = req.query;

      const users = await UserService.getUsersList({
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        search: search as string,
        status: status as string,
        subscription: subscription as string,
        sortBy: sortBy as string,
        sortOrder: sortOrder as string
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
    } catch (error) {
      console.error('Get users list error:', error);
      res.status(500).json({
        error: 'Failed to get users list',
        code: 'USERS_LIST_FAILED'
      });
    }
  }
);

/**
 * GET /api/admin/users/:userId
 * Get user details
 */
router.get('/:userId',
  authenticateAdmin,
  requireAdminPermission('user_management'),
  [
    param('userId').isUUID()
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;

      const user = await UserService.getUserDetails(userId);
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
    } catch (error) {
      console.error('Get user details error:', error);
      res.status(500).json({
        error: 'Failed to get user details',
        code: 'USER_DETAILS_FAILED'
      });
    }
  }
);

/**
 * PUT /api/admin/users/:userId/subscription
 * Update user subscription tier
 */
router.put('/:userId/subscription',
  authenticateAdmin,
  requireAdminPermission('subscription_management'),
  [
    param('userId').isUUID(),
    body('tier').isIn(['free', 'premium', 'pro']),
    body('expiresAt').optional().isISO8601(),
    body('reason').optional().isString()
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const { tier, expiresAt, reason } = req.body;
      const adminId = req.admin!.adminId;

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
    } catch (error) {
      console.error('Update user subscription error:', error);
      res.status(500).json({
        error: 'Failed to update user subscription',
        code: 'SUBSCRIPTION_UPDATE_FAILED',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * PUT /api/admin/users/:userId/status
 * Update user status (active/inactive/suspended)
 */
router.put('/:userId/status',
  authenticateAdmin,
  requireAdminPermission('user_management'),
  [
    param('userId').isUUID(),
    body('status').isIn(['active', 'inactive', 'suspended']),
    body('reason').optional().isString()
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const { status, reason } = req.body;
      const adminId = req.admin!.adminId;

      const result = await UserService.updateUserStatus(
        userId,
        status,
        adminId,
        reason
      );

      res.json({
        message: 'User status updated successfully',
        user: result
      });
    } catch (error) {
      console.error('Update user status error:', error);
      res.status(500).json({
        error: 'Failed to update user status',
        code: 'USER_STATUS_UPDATE_FAILED',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * GET /api/admin/users/stats
 * Get user statistics
 */
router.get('/stats/overview',
  authenticateAdmin,
  requireAdminPermission('analytics_view'),
  async (req: Request, res: Response) => {
    try {
      const stats = await UserService.getUserStats();

      res.json({
        message: 'User statistics retrieved successfully',
        stats
      });
    } catch (error) {
      console.error('Get user stats error:', error);
      res.status(500).json({
        error: 'Failed to get user statistics',
        code: 'USER_STATS_FAILED'
      });
    }
  }
);

/**
 * POST /api/admin/users/:userId/reset-password
 * Reset user password
 */
router.post('/:userId/reset-password',
  authenticateAdmin,
  requireAdminPermission('user_management'),
  [
    param('userId').isUUID(),
    body('newPassword').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
    body('reason').optional().isString()
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const { newPassword, reason } = req.body;
      const adminId = req.admin!.adminId;

      await UserService.resetUserPassword(
        userId,
        newPassword,
        adminId,
        reason
      );

      res.json({
        message: 'User password reset successfully'
      });
    } catch (error) {
      console.error('Reset user password error:', error);
      res.status(500).json({
        error: 'Failed to reset user password',
        code: 'PASSWORD_RESET_FAILED',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * DELETE /api/admin/users/:userId
 * Delete user account (soft delete)
 */
router.delete('/:userId',
  authenticateAdmin,
  requireAdminPermission('user_management'),
  [
    param('userId').isUUID(),
    body('reason').isString().notEmpty()
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const { reason } = req.body;
      const adminId = req.admin!.adminId;

      await UserService.deleteUser(userId, adminId, reason);

      res.json({
        message: 'User account deleted successfully'
      });
    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({
        error: 'Failed to delete user account',
        code: 'USER_DELETE_FAILED',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

export default router;
