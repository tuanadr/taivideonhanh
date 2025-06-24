import { Router, Request, Response } from 'express';
import { query, validationResult } from 'express-validator';
import { authenticateAdmin, requireAdminPermission } from '../middleware/adminAuth';
import AnalyticsService from '../services/analyticsService';

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
 * GET /api/analytics/overview
 * Get analytics overview data
 */
router.get('/overview',
  authenticateAdmin,
  requireAdminPermission('analytics_view'),
  async (req: Request, res: Response) => {
    try {
      const analytics = await AnalyticsService.getAnalyticsData();

      res.json({
        message: 'Analytics data retrieved successfully',
        analytics,
      });
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      res.status(500).json({
        error: 'Failed to fetch analytics data',
        code: 'ANALYTICS_FETCH_FAILED'
      });
    }
  }
);

/**
 * GET /api/analytics/user-behavior
 * Get user behavior analytics
 */
router.get('/user-behavior',
  authenticateAdmin,
  requireAdminPermission('analytics_view'),
  async (req: Request, res: Response) => {
    try {
      const behaviorData = await AnalyticsService.getUserBehaviorData();

      res.json({
        message: 'User behavior data retrieved successfully',
        data: behaviorData,
      });
    } catch (error) {
      console.error('Error fetching user behavior data:', error);
      res.status(500).json({
        error: 'Failed to fetch user behavior data',
        code: 'USER_BEHAVIOR_FETCH_FAILED'
      });
    }
  }
);

/**
 * GET /api/analytics/report
 * Generate analytics report
 */
router.get('/report',
  authenticateAdmin,
  requireAdminPermission('analytics_view'),
  query('startDate').optional().isISO8601().withMessage('Start date must be valid ISO8601 date'),
  query('endDate').optional().isISO8601().withMessage('End date must be valid ISO8601 date'),
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const startDate = req.query.startDate 
        ? new Date(req.query.startDate as string)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
      
      const endDate = req.query.endDate 
        ? new Date(req.query.endDate as string)
        : new Date(); // Now

      const report = await AnalyticsService.generateReport(startDate, endDate);

      res.json({
        message: 'Analytics report generated successfully',
        report,
      });
    } catch (error) {
      console.error('Error generating analytics report:', error);
      res.status(500).json({
        error: 'Failed to generate analytics report',
        code: 'REPORT_GENERATION_FAILED'
      });
    }
  }
);

/**
 * POST /api/analytics/track
 * Track user action (for internal use)
 */
router.post('/track',
  async (req: Request, res: Response) => {
    try {
      const { userId, action, metadata } = req.body;

      if (!userId || !action) {
        return res.status(400).json({
          error: 'User ID and action are required',
          code: 'MISSING_REQUIRED_FIELDS'
        });
      }

      await AnalyticsService.trackUserAction(userId, action, metadata);

      res.json({
        message: 'User action tracked successfully',
      });
    } catch (error) {
      console.error('Error tracking user action:', error);
      res.status(500).json({
        error: 'Failed to track user action',
        code: 'TRACKING_FAILED'
      });
    }
  }
);

export default router;
