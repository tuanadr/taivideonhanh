import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { body, param, validationResult } from 'express-validator';
import SubscriptionService from '../services/subscriptionService';
import PaymentService from '../services/paymentService';

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
const createPaymentIntentValidation = [
  body('planId').isUUID().withMessage('Plan ID must be a valid UUID'),
  body('paymentMethod').isString().notEmpty().withMessage('Payment method is required'),
];

const cancelSubscriptionValidation = [
  param('subscriptionId').isUUID().withMessage('Subscription ID must be a valid UUID'),
];

const switchBillingCycleValidation = [
  body('newPlanId').isUUID().withMessage('New plan ID must be a valid UUID'),
  body('prorationMode').optional().isIn(['immediate', 'next_cycle']).withMessage('Proration mode must be immediate or next_cycle'),
];

/**
 * GET /api/subscription/plans
 * Get all available subscription plans grouped by billing cycle
 */
router.get('/plans', async (req: Request, res: Response) => {
  try {
    const groupedPlans = await SubscriptionService.getPlansGroupedByBilling();
    const allPlans = await SubscriptionService.getAvailablePlans();

    // Calculate savings for annual plans
    const monthlyProPlan = groupedPlans.monthly.find(p => p.name.includes('Pro'));
    const annualProPlan = groupedPlans.annual.find(p => p.name.includes('Pro'));

    let savings = null;
    if (monthlyProPlan && annualProPlan) {
      savings = SubscriptionService.calculateAnnualSavings(monthlyProPlan, annualProPlan);
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
  } catch (error) {
    console.error('Error fetching subscription plans:', error);
    res.status(500).json({
      error: 'Failed to fetch subscription plans',
      code: 'PLANS_FETCH_FAILED'
    });
  }
});

/**
 * GET /api/subscription/current
 * Get user's current subscription
 */
router.get('/current', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const subscription = await SubscriptionService.getUserActiveSubscription(userId);
    
    if (!subscription) {
      return res.json({
        message: 'No active subscription found',
        subscription: null,
        limits: await SubscriptionService.getUserSubscriptionLimits(userId),
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
      limits: await SubscriptionService.getUserSubscriptionLimits(userId),
    });
  } catch (error) {
    console.error('Error fetching current subscription:', error);
    res.status(500).json({
      error: 'Failed to fetch current subscription',
      code: 'SUBSCRIPTION_FETCH_FAILED'
    });
  }
});

/**
 * GET /api/subscription/history
 * Get user's subscription history
 */
router.get('/history', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const subscriptions = await SubscriptionService.getUserSubscriptionHistory(userId);
    
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
  } catch (error) {
    console.error('Error fetching subscription history:', error);
    res.status(500).json({
      error: 'Failed to fetch subscription history',
      code: 'HISTORY_FETCH_FAILED'
    });
  }
});

/**
 * POST /api/subscription/payment-intent
 * Create payment intent for subscription
 */
router.post('/payment-intent',
  authenticate,
  createPaymentIntentValidation,
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.userId;
      const { planId, paymentMethod } = req.body;

      // Check if user already has an active subscription
      const existingSubscription = await SubscriptionService.getUserActiveSubscription(userId);
      if (existingSubscription) {
        return res.status(400).json({
          error: 'User already has an active subscription',
          code: 'SUBSCRIPTION_EXISTS'
        });
      }

      const result = await PaymentService.createPaymentIntent({
        userId,
        planId,
        paymentMethod,
      });

      res.json({
        message: 'Payment intent created successfully',
        clientSecret: result.clientSecret,
        paymentId: result.paymentId,
      });
    } catch (error) {
      console.error('Error creating payment intent:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create payment intent';
      res.status(400).json({
        error: errorMessage,
        code: 'PAYMENT_INTENT_FAILED'
      });
    }
  }
);

/**
 * POST /api/subscription/test-payment
 * Create test payment for development (only in development mode)
 */
router.post('/test-payment',
  authenticate,
  createPaymentIntentValidation,
  validateRequest,
  async (req: Request, res: Response) => {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        error: 'Test payments are not allowed in production',
        code: 'TEST_PAYMENT_FORBIDDEN'
      });
    }

    try {
      const userId = req.user!.userId;
      const { planId } = req.body;

      const payment = await PaymentService.createTestPayment(userId, planId);

      res.json({
        message: 'Test payment created successfully',
        payment: {
          id: payment.id,
          amount: payment.amount,
          currency: payment.currency,
          status: payment.status,
        },
      });
    } catch (error) {
      console.error('Error creating test payment:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create test payment';
      res.status(400).json({
        error: errorMessage,
        code: 'TEST_PAYMENT_FAILED'
      });
    }
  }
);

/**
 * DELETE /api/subscription/:subscriptionId
 * Cancel subscription
 */
router.delete('/:subscriptionId',
  authenticate,
  cancelSubscriptionValidation,
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.userId;
      const { subscriptionId } = req.params;

      const subscription = await SubscriptionService.cancelSubscription(userId, subscriptionId);

      res.json({
        message: 'Subscription cancelled successfully',
        subscription: {
          id: subscription.id,
          status: subscription.status,
          expiresAt: subscription.expires_at,
        },
      });
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to cancel subscription';
      res.status(400).json({
        error: errorMessage,
        code: 'SUBSCRIPTION_CANCEL_FAILED'
      });
    }
  }
);

/**
 * GET /api/subscription/limits
 * Get user's subscription limits
 */
router.get('/limits', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const limits = await SubscriptionService.getUserSubscriptionLimits(userId);
    
    res.json({
      message: 'Subscription limits retrieved successfully',
      limits,
    });
  } catch (error) {
    console.error('Error fetching subscription limits:', error);
    res.status(500).json({
      error: 'Failed to fetch subscription limits',
      code: 'LIMITS_FETCH_FAILED'
    });
  }
});

/**
 * GET /api/subscription/payments
 * Get user's payment history
 */
router.get('/payments', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const payments = await PaymentService.getUserPaymentHistory(userId);
    
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
  } catch (error) {
    console.error('Error fetching payment history:', error);
    res.status(500).json({
      error: 'Failed to fetch payment history',
      code: 'PAYMENT_HISTORY_FETCH_FAILED'
    });
  }
});

/**
 * POST /api/subscription/switch-billing-cycle
 * Switch between monthly and annual billing
 */
router.post('/switch-billing-cycle',
  authenticate,
  switchBillingCycleValidation,
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          error: 'User not authenticated'
        });
      }

      const { newPlanId, prorationMode = 'immediate' } = req.body;

      const result = await SubscriptionService.switchBillingCycle(
        userId,
        newPlanId,
        prorationMode
      );

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
    } catch (error) {
      console.error('Error switching billing cycle:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to switch billing cycle',
        code: 'BILLING_CYCLE_SWITCH_FAILED'
      });
    }
  }
);

export default router;
