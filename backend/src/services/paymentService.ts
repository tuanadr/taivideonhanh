import Stripe from 'stripe';
import { Payment, UserSubscription, SubscriptionPlan } from '../models';
import SubscriptionService from './subscriptionService';

export interface CreatePaymentIntentData {
  userId: string;
  planId: string;
  paymentMethod: string;
}

export interface PaymentWebhookData {
  type: string;
  data: any;
}

class PaymentService {
  private stripe: Stripe;

  constructor() {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      console.warn('⚠️  STRIPE_SECRET_KEY not found. Payment functionality will be limited.');
      console.warn('   To enable full payment functionality, please set STRIPE_SECRET_KEY in your environment variables.');
      console.warn('   Example: STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key_here');
      // Create a mock stripe instance for development
      this.stripe = {} as Stripe;
    } else {
      this.stripe = new Stripe(stripeSecretKey, {
        apiVersion: '2025-05-28.basil',
      });
      console.log('✅ Stripe payment service initialized successfully');
    }
  }

  /**
   * Create a payment intent for subscription
   */
  async createPaymentIntent(data: CreatePaymentIntentData): Promise<{
    clientSecret: string;
    paymentId: string;
  }> {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.');
    }

    const plan = await SubscriptionService.getPlanById(data.planId);
    if (!plan) {
      throw new Error('Subscription plan not found');
    }

    // Create payment record
    const payment = await Payment.create({
      user_id: data.userId,
      amount: plan.price,
      currency: plan.currency,
      status: 'pending',
      payment_method: data.paymentMethod,
      metadata: {
        plan_id: data.planId,
        plan_name: plan.name,
      },
    });

    // Create Stripe payment intent
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: Math.round(plan.price * 100), // Convert to cents
      currency: plan.currency.toLowerCase(),
      metadata: {
        payment_id: payment.id,
        user_id: data.userId,
        plan_id: data.planId,
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    // Update payment with Stripe payment intent ID
    payment.stripe_payment_intent_id = paymentIntent.id;
    await payment.save();

    return {
      clientSecret: paymentIntent.client_secret!,
      paymentId: payment.id,
    };
  }

  /**
   * Handle successful payment
   */
  async handleSuccessfulPayment(paymentIntentId: string): Promise<void> {
    const payment = await Payment.findOne({
      where: {
        stripe_payment_intent_id: paymentIntentId,
      },
    });

    if (!payment) {
      throw new Error('Payment not found');
    }

    // Mark payment as completed
    await payment.markAsCompleted();

    // Create or activate subscription
    const planId = payment.metadata.plan_id;
    if (planId) {
      try {
        // Create subscription
        const subscription = await SubscriptionService.createSubscription({
          userId: payment.user_id,
          planId: planId,
          paymentMethod: payment.payment_method,
        });

        // Link payment to subscription
        payment.subscription_id = subscription.id;
        await payment.save();

        // Activate subscription
        await SubscriptionService.activateSubscription(subscription.id);
      } catch (error) {
        console.error('Error creating subscription after payment:', error);
        // If subscription creation fails, we should still mark payment as completed
        // but log the error for manual review
      }
    }
  }

  /**
   * Handle failed payment
   */
  async handleFailedPayment(paymentIntentId: string, reason: string): Promise<void> {
    const payment = await Payment.findOne({
      where: {
        stripe_payment_intent_id: paymentIntentId,
      },
    });

    if (!payment) {
      throw new Error('Payment not found');
    }

    await payment.markAsFailed(reason);
  }

  /**
   * Process Stripe webhook
   */
  async processWebhook(payload: string, signature: string): Promise<void> {
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      throw new Error('Stripe webhook secret not configured');
    }

    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (error) {
      throw new Error(`Webhook signature verification failed: ${error}`);
    }

    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await this.handleSuccessfulPayment(paymentIntent.id);
        break;

      case 'payment_intent.payment_failed':
        const failedPaymentIntent = event.data.object as Stripe.PaymentIntent;
        const failureReason = failedPaymentIntent.last_payment_error?.message || 'Unknown error';
        await this.handleFailedPayment(failedPaymentIntent.id, failureReason);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  }

  /**
   * Get payment by ID
   */
  async getPaymentById(paymentId: string): Promise<Payment | null> {
    return await Payment.findByPk(paymentId, {
      include: [
        {
          model: UserSubscription,
          as: 'subscription',
          include: [
            {
              model: SubscriptionPlan,
              as: 'plan',
            },
          ],
        },
      ],
    });
  }

  /**
   * Get user's payment history
   */
  async getUserPaymentHistory(userId: string): Promise<Payment[]> {
    return await Payment.findAll({
      where: {
        user_id: userId,
      },
      include: [
        {
          model: UserSubscription,
          as: 'subscription',
          include: [
            {
              model: SubscriptionPlan,
              as: 'plan',
            },
          ],
        },
      ],
      order: [['created_at', 'DESC']],
    });
  }

  /**
   * Refund a payment
   */
  async refundPayment(paymentId: string, reason?: string): Promise<void> {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('Stripe is not configured');
    }

    const payment = await Payment.findByPk(paymentId);
    if (!payment) {
      throw new Error('Payment not found');
    }

    if (!payment.stripe_charge_id) {
      throw new Error('No Stripe charge ID found for this payment');
    }

    // Create refund in Stripe
    await this.stripe.refunds.create({
      charge: payment.stripe_charge_id,
      reason: 'requested_by_customer',
      metadata: {
        payment_id: paymentId,
        reason: reason || 'Customer request',
      },
    });

    // Update payment status
    payment.status = 'refunded';
    await payment.save();

    // Cancel associated subscription if exists
    if (payment.subscription_id) {
      const subscription = await UserSubscription.findByPk(payment.subscription_id);
      if (subscription) {
        await subscription.cancel();
      }
    }
  }

  /**
   * Get payment statistics
   */
  async getPaymentStats(): Promise<{
    totalRevenue: number;
    totalPayments: number;
    successfulPayments: number;
    failedPayments: number;
    refundedPayments: number;
  }> {
    const [
      totalRevenue,
      totalPayments,
      successfulPayments,
      failedPayments,
      refundedPayments,
    ] = await Promise.all([
      Payment.sum('amount', {
        where: { status: 'completed' },
      }),
      Payment.count(),
      Payment.count({ where: { status: 'completed' } }),
      Payment.count({ where: { status: 'failed' } }),
      Payment.count({ where: { status: 'refunded' } }),
    ]);

    return {
      totalRevenue: Number(totalRevenue) || 0,
      totalPayments,
      successfulPayments,
      failedPayments,
      refundedPayments,
    };
  }

  /**
   * Create a test payment for development
   */
  async createTestPayment(userId: string, planId: string): Promise<Payment> {
    const plan = await SubscriptionService.getPlanById(planId);
    if (!plan) {
      throw new Error('Subscription plan not found');
    }

    const payment = await Payment.create({
      user_id: userId,
      amount: plan.price,
      currency: plan.currency,
      status: 'completed',
      payment_method: 'test',
      metadata: {
        plan_id: planId,
        plan_name: plan.name,
        test: true,
      },
    });

    // Create and activate subscription
    const subscription = await SubscriptionService.createSubscription({
      userId: userId,
      planId: planId,
      paymentMethod: 'test',
    });

    payment.subscription_id = subscription.id;
    await payment.save();

    await SubscriptionService.activateSubscription(subscription.id);

    return payment;
  }
}

export default new PaymentService();
