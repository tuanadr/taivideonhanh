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
const analyticsService_1 = __importDefault(require("../services/analyticsService"));
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
 * GET /api/analytics/overview
 * Get analytics overview data
 */
router.get('/overview', adminAuth_1.authenticateAdmin, (0, adminAuth_1.requireAdminPermission)('analytics_view'), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const analytics = yield analyticsService_1.default.getAnalyticsData();
        res.json({
            message: 'Analytics data retrieved successfully',
            analytics,
        });
    }
    catch (error) {
        console.error('Error fetching analytics data:', error);
        res.status(500).json({
            error: 'Failed to fetch analytics data',
            code: 'ANALYTICS_FETCH_FAILED'
        });
    }
}));
/**
 * GET /api/analytics/user-behavior
 * Get user behavior analytics
 */
router.get('/user-behavior', adminAuth_1.authenticateAdmin, (0, adminAuth_1.requireAdminPermission)('analytics_view'), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const behaviorData = yield analyticsService_1.default.getUserBehaviorData();
        res.json({
            message: 'User behavior data retrieved successfully',
            data: behaviorData,
        });
    }
    catch (error) {
        console.error('Error fetching user behavior data:', error);
        res.status(500).json({
            error: 'Failed to fetch user behavior data',
            code: 'USER_BEHAVIOR_FETCH_FAILED'
        });
    }
}));
/**
 * GET /api/analytics/report
 * Generate analytics report
 */
router.get('/report', adminAuth_1.authenticateAdmin, (0, adminAuth_1.requireAdminPermission)('analytics_view'), (0, express_validator_1.query)('startDate').optional().isISO8601().withMessage('Start date must be valid ISO8601 date'), (0, express_validator_1.query)('endDate').optional().isISO8601().withMessage('End date must be valid ISO8601 date'), validateRequest, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const startDate = req.query.startDate
            ? new Date(req.query.startDate)
            : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
        const endDate = req.query.endDate
            ? new Date(req.query.endDate)
            : new Date(); // Now
        const report = yield analyticsService_1.default.generateReport(startDate, endDate);
        res.json({
            message: 'Analytics report generated successfully',
            report,
        });
    }
    catch (error) {
        console.error('Error generating analytics report:', error);
        res.status(500).json({
            error: 'Failed to generate analytics report',
            code: 'REPORT_GENERATION_FAILED'
        });
    }
}));
/**
 * POST /api/analytics/track
 * Track user action (for internal use)
 */
router.post('/track', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId, action, metadata } = req.body;
        if (!userId || !action) {
            return res.status(400).json({
                error: 'User ID and action are required',
                code: 'MISSING_REQUIRED_FIELDS'
            });
        }
        yield analyticsService_1.default.trackUserAction(userId, action, metadata);
        res.json({
            message: 'User action tracked successfully',
        });
    }
    catch (error) {
        console.error('Error tracking user action:', error);
        res.status(500).json({
            error: 'Failed to track user action',
            code: 'TRACKING_FAILED'
        });
    }
}));
exports.default = router;
