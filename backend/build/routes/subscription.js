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
const auth_1 = require("../middleware/auth");
const express_validator_1 = require("express-validator");
const subscriptionService_1 = __importDefault(require("../services/subscriptionService"));
const paymentService_1 = __importDefault(require("../services/paymentService"));
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
const createPaymentIntentValidation = [
    (0, express_validator_1.body)('planId').isUUID().withMessage('Plan ID must be a valid UUID'),
    (0, express_validator_1.body)('paymentMethod').isString().notEmpty().withMessage('Payment method is required'),
];
const cancelSubscriptionValidation = [
    (0, express_validator_1.param)('subscriptionId').isUUID().withMessage('Subscription ID must be a valid UUID'),
];
const switchBillingCycleValidation = [
    (0, express_validator_1.body)('newPlanId').isUUID().withMessage('New plan ID must be a valid UUID'),
    (0, express_validator_1.body)('prorationMode').optional().isIn(['immediate', 'next_cycle']).withMessage('Proration mode must be immediate or next_cycle'),
];
/**
 * GET /api/subscription/plans
 * Get all available subscription plans grouped by billing cycle
 */
router.get('/plans', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const groupedPlans = yield subscriptionService_1.default.getPlansGroupedByBilling();
        const allPlans = yield subscriptionService_1.default.getAvailablePlans();
        // Calculate savings for annual plans
        const monthlyProPlan = groupedPlans.monthly.find(p => p.name.includes('Pro'));
        const annualProPlan = groupedPlans.annual.find(p => p.name.includes('Pro'));
        let savings = null;
        if (monthlyProPlan && annualProPlan) {
            savings = subscriptionService_1.default.calculateAnnualSavings(monthlyProPlan, annualProPlan);
        }
        // Set proper cache headers to prevent 304 Not Modified issues
        res.set({
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            'ETag': `"plans-${Date.now()}"`,
            'Last-Modified': new Date().toUTCString()
        });
        res.json({
            message: 'Subscription plans retrieved successfully',
            plans: allPlans.map(plan => ({
                id: plan.id,
                name: plan.name,
                price: plan.price,
                currency: plan.currency,
                displayPrice: plan.getDisplayPrice(),
                durationDays: plan.duration_days,
                billingCycle: plan.billing_cycle,
                discountPercentage: plan.discount_percentage,
                features: plan.features,
                maxDownloadsPerDay: plan.max_downloads_per_day,
                maxConcurrentStreams: plan.max_concurrent_streams,
                maxQuality: plan.max_quality,
            })),
            grouped: {
                monthly: groupedPlans.monthly.map(plan => ({
                    id: plan.id,
                    name: plan.name,
                    price: plan.price,
                    currency: plan.currency,
                    displayPrice: plan.getDisplayPrice(),
                    durationDays: plan.duration_days,
                    billingCycle: plan.billing_cycle,
                    discountPercentage: plan.discount_percentage,
                    features: plan.features,
                    maxDownloadsPerDay: plan.max_downloads_per_day,
                    maxConcurrentStreams: plan.max_concurrent_streams,
                    maxQuality: plan.max_quality,
                })),
                annual: groupedPlans.annual.map(plan => ({
                    id: plan.id,
                    name: plan.name,
                    price: plan.price,
                    currency: plan.currency,
                    displayPrice: plan.getDisplayPrice(),
                    durationDays: plan.duration_days,
                    billingCycle: plan.billing_cycle,
                    discountPercentage: plan.discount_percentage,
                    features: plan.features,
                    maxDownloadsPerDay: plan.max_downloads_per_day,
                    maxConcurrentStreams: plan.max_concurrent_streams,
                    maxQuality: plan.max_quality,
                })),
            },
            savings
        });
    }
    catch (error) {
        console.error('Error fetching subscription plans:', error);
        res.status(500).json({
            error: 'Failed to fetch subscription plans',
            code: 'PLANS_FETCH_FAILED'
        });
    }
}));
/**
 * GET /api/subscription/current
 * Get user's current subscription
 */
router.get('/current', auth_1.authenticate, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.userId;
        const subscription = yield subscriptionService_1.default.getUserActiveSubscription(userId);
        if (!subscription) {
            return res.json({
                message: 'No active subscription found',
                subscription: null,
                limits: yield subscriptionService_1.default.getUserSubscriptionLimits(userId),
            });
        }
        res.json({
            message: 'Current subscription retrieved successfully',
            subscription: {
                id: subscription.id,
                status: subscription.status,
                startsAt: subscription.starts_at,
                expiresAt: subscription.expires_at,
                autoRenew: subscription.auto_renew,
                daysRemaining: subscription.daysRemaining(),
                plan: subscription.plan ? {
                    id: subscription.plan.id,
                    name: subscription.plan.name,
                    price: subscription.plan.price,
                    displayPrice: subscription.plan.getDisplayPrice(),
                    features: subscription.plan.features,
                } : null,
            },
            limits: yield subscriptionService_1.default.getUserSubscriptionLimits(userId),
        });
    }
    catch (error) {
        console.error('Error fetching current subscription:', error);
        res.status(500).json({
            error: 'Failed to fetch current subscription',
            code: 'SUBSCRIPTION_FETCH_FAILED'
        });
    }
}));
/**
 * GET /api/subscription/history
 * Get user's subscription history
 */
router.get('/history', auth_1.authenticate, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.userId;
        const subscriptions = yield subscriptionService_1.default.getUserSubscriptionHistory(userId);
        res.json({
            message: 'Subscription history retrieved successfully',
            subscriptions: subscriptions.map(sub => ({
                id: sub.id,
                status: sub.status,
                startsAt: sub.starts_at,
                expiresAt: sub.expires_at,
                autoRenew: sub.auto_renew,
                createdAt: sub.created_at,
                plan: sub.plan ? {
                    id: sub.plan.id,
                    name: sub.plan.name,
                    price: sub.plan.price,
                    displayPrice: sub.plan.getDisplayPrice(),
                } : null,
            })),
        });
    }
    catch (error) {
        console.error('Error fetching subscription history:', error);
        res.status(500).json({
            error: 'Failed to fetch subscription history',
            code: 'HISTORY_FETCH_FAILED'
        });
    }
}));
/**
 * POST /api/subscription/payment-intent
 * Create payment intent for subscription
 */
router.post('/payment-intent', auth_1.authenticate, createPaymentIntentValidation, validateRequest, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.userId;
        const { planId, paymentMethod } = req.body;
        // Check if user already has an active subscription
        const existingSubscription = yield subscriptionService_1.default.getUserActiveSubscription(userId);
        if (existingSubscription) {
            return res.status(400).json({
                error: 'User already has an active subscription',
                code: 'SUBSCRIPTION_EXISTS'
            });
        }
        const result = yield paymentService_1.default.createPaymentIntent({
            userId,
            planId,
            paymentMethod,
        });
        res.json({
            message: 'Payment intent created successfully',
            clientSecret: result.clientSecret,
            paymentId: result.paymentId,
        });
    }
    catch (error) {
        console.error('Error creating payment intent:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to create payment intent';
        res.status(400).json({
            error: errorMessage,
            code: 'PAYMENT_INTENT_FAILED'
        });
    }
}));
/**
 * POST /api/subscription/test-payment
 * Create test payment for development (only in development mode)
 */
router.post('/test-payment', auth_1.authenticate, createPaymentIntentValidation, validateRequest, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({
            error: 'Test payments are not allowed in production',
            code: 'TEST_PAYMENT_FORBIDDEN'
        });
    }
    try {
        const userId = req.user.userId;
        const { planId } = req.body;
        const payment = yield paymentService_1.default.createTestPayment(userId, planId);
        res.json({
            message: 'Test payment created successfully',
            payment: {
                id: payment.id,
                amount: payment.amount,
                currency: payment.currency,
                status: payment.status,
            },
        });
    }
    catch (error) {
        console.error('Error creating test payment:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to create test payment';
        res.status(400).json({
            error: errorMessage,
            code: 'TEST_PAYMENT_FAILED'
        });
    }
}));
/**
 * DELETE /api/subscription/:subscriptionId
 * Cancel subscription
 */
router.delete('/:subscriptionId', auth_1.authenticate, cancelSubscriptionValidation, validateRequest, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.userId;
        const { subscriptionId } = req.params;
        const subscription = yield subscriptionService_1.default.cancelSubscription(userId, subscriptionId);
        res.json({
            message: 'Subscription cancelled successfully',
            subscription: {
                id: subscription.id,
                status: subscription.status,
                expiresAt: subscription.expires_at,
            },
        });
    }
    catch (error) {
        console.error('Error cancelling subscription:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to cancel subscription';
        res.status(400).json({
            error: errorMessage,
            code: 'SUBSCRIPTION_CANCEL_FAILED'
        });
    }
}));
/**
 * GET /api/subscription/limits
 * Get user's subscription limits
 */
router.get('/limits', auth_1.authenticate, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.userId;
        const limits = yield subscriptionService_1.default.getUserSubscriptionLimits(userId);
        res.json({
            message: 'Subscription limits retrieved successfully',
            limits,
        });
    }
    catch (error) {
        console.error('Error fetching subscription limits:', error);
        res.status(500).json({
            error: 'Failed to fetch subscription limits',
            code: 'LIMITS_FETCH_FAILED'
        });
    }
}));
/**
 * GET /api/subscription/payments
 * Get user's payment history
 */
router.get('/payments', auth_1.authenticate, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.userId;
        const payments = yield paymentService_1.default.getUserPaymentHistory(userId);
        res.json({
            message: 'Payment history retrieved successfully',
            payments: payments.map(payment => ({
                id: payment.id,
                amount: payment.amount,
                currency: payment.currency,
                displayAmount: payment.getDisplayAmount(),
                status: payment.status,
                paymentMethod: payment.payment_method,
                createdAt: payment.created_at,
                subscription: payment.subscription ? {
                    id: payment.subscription.id,
                    plan: payment.subscription.plan ? {
                        name: payment.subscription.plan.name,
                    } : null,
                } : null,
            })),
        });
    }
    catch (error) {
        console.error('Error fetching payment history:', error);
        res.status(500).json({
            error: 'Failed to fetch payment history',
            code: 'PAYMENT_HISTORY_FETCH_FAILED'
        });
    }
}));
/**
 * POST /api/subscription/switch-billing-cycle
 * Switch between monthly and annual billing
 */
router.post('/switch-billing-cycle', auth_1.authenticate, switchBillingCycleValidation, validateRequest, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        if (!userId) {
            return res.status(401).json({
                error: 'User not authenticated'
            });
        }
        const { newPlanId, prorationMode = 'immediate' } = req.body;
        const result = yield subscriptionService_1.default.switchBillingCycle(userId, newPlanId, prorationMode);
        res.json({
            message: 'Billing cycle switched successfully',
            subscription: {
                id: result.subscription.id,
                planId: result.subscription.plan_id,
                status: result.subscription.status,
                startsAt: result.subscription.starts_at,
                expiresAt: result.subscription.expires_at,
                autoRenew: result.subscription.auto_renew,
            },
            prorationAmount: result.prorationAmount,
            effectiveDate: result.effectiveDate,
        });
    }
    catch (error) {
        console.error('Error switching billing cycle:', error);
        res.status(500).json({
            error: error instanceof Error ? error.message : 'Failed to switch billing cycle',
            code: 'BILLING_CYCLE_SWITCH_FAILED'
        });
    }
}));
exports.default = router;
