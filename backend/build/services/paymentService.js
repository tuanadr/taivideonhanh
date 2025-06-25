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
const stripe_1 = __importDefault(require("stripe"));
const models_1 = require("../models");
const subscriptionService_1 = __importDefault(require("./subscriptionService"));
class PaymentService {
    constructor() {
        const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
        if (!stripeSecretKey) {
            console.warn('⚠️  STRIPE_SECRET_KEY not found. Payment functionality will be limited.');
            console.warn('   To enable full payment functionality, please set STRIPE_SECRET_KEY in your environment variables.');
            console.warn('   Example: STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key_here');
            // Create a mock stripe instance for development
            this.stripe = {};
        }
        else {
            this.stripe = new stripe_1.default(stripeSecretKey, {
                apiVersion: '2025-05-28.basil',
            });
            console.log('✅ Stripe payment service initialized successfully');
        }
    }
    /**
     * Create a payment intent for subscription
     */
    createPaymentIntent(data) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!process.env.STRIPE_SECRET_KEY) {
                throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.');
            }
            const plan = yield subscriptionService_1.default.getPlanById(data.planId);
            if (!plan) {
                throw new Error('Subscription plan not found');
            }
            // Create payment record
            const payment = yield models_1.Payment.create({
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
            const paymentIntent = yield this.stripe.paymentIntents.create({
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
            yield payment.save();
            return {
                clientSecret: paymentIntent.client_secret,
                paymentId: payment.id,
            };
        });
    }
    /**
     * Handle successful payment
     */
    handleSuccessfulPayment(paymentIntentId) {
        return __awaiter(this, void 0, void 0, function* () {
            const payment = yield models_1.Payment.findOne({
                where: {
                    stripe_payment_intent_id: paymentIntentId,
                },
            });
            if (!payment) {
                throw new Error('Payment not found');
            }
            // Mark payment as completed
            yield payment.markAsCompleted();
            // Create or activate subscription
            const planId = payment.metadata.plan_id;
            if (planId) {
                try {
                    // Create subscription
                    const subscription = yield subscriptionService_1.default.createSubscription({
                        userId: payment.user_id,
                        planId: planId,
                        paymentMethod: payment.payment_method,
                    });
                    // Link payment to subscription
                    payment.subscription_id = subscription.id;
                    yield payment.save();
                    // Activate subscription
                    yield subscriptionService_1.default.activateSubscription(subscription.id);
                }
                catch (error) {
                    console.error('Error creating subscription after payment:', error);
                    // If subscription creation fails, we should still mark payment as completed
                    // but log the error for manual review
                }
            }
        });
    }
    /**
     * Handle failed payment
     */
    handleFailedPayment(paymentIntentId, reason) {
        return __awaiter(this, void 0, void 0, function* () {
            const payment = yield models_1.Payment.findOne({
                where: {
                    stripe_payment_intent_id: paymentIntentId,
                },
            });
            if (!payment) {
                throw new Error('Payment not found');
            }
            yield payment.markAsFailed(reason);
        });
    }
    /**
     * Process Stripe webhook
     */
    processWebhook(payload, signature) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            if (!process.env.STRIPE_WEBHOOK_SECRET) {
                throw new Error('Stripe webhook secret not configured');
            }
            let event;
            try {
                event = this.stripe.webhooks.constructEvent(payload, signature, process.env.STRIPE_WEBHOOK_SECRET);
            }
            catch (error) {
                throw new Error(`Webhook signature verification failed: ${error}`);
            }
            switch (event.type) {
                case 'payment_intent.succeeded':
                    const paymentIntent = event.data.object;
                    yield this.handleSuccessfulPayment(paymentIntent.id);
                    break;
                case 'payment_intent.payment_failed':
                    const failedPaymentIntent = event.data.object;
                    const failureReason = ((_a = failedPaymentIntent.last_payment_error) === null || _a === void 0 ? void 0 : _a.message) || 'Unknown error';
                    yield this.handleFailedPayment(failedPaymentIntent.id, failureReason);
                    break;
                default:
                    console.log(`Unhandled event type: ${event.type}`);
            }
        });
    }
    /**
     * Get payment by ID
     */
    getPaymentById(paymentId) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield models_1.Payment.findByPk(paymentId, {
                include: [
                    {
                        model: models_1.UserSubscription,
                        as: 'subscription',
                        include: [
                            {
                                model: models_1.SubscriptionPlan,
                                as: 'plan',
                            },
                        ],
                    },
                ],
            });
        });
    }
    /**
     * Get user's payment history
     */
    getUserPaymentHistory(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield models_1.Payment.findAll({
                where: {
                    user_id: userId,
                },
                include: [
                    {
                        model: models_1.UserSubscription,
                        as: 'subscription',
                        include: [
                            {
                                model: models_1.SubscriptionPlan,
                                as: 'plan',
                            },
                        ],
                    },
                ],
                order: [['created_at', 'DESC']],
            });
        });
    }
    /**
     * Refund a payment
     */
    refundPayment(paymentId, reason) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!process.env.STRIPE_SECRET_KEY) {
                throw new Error('Stripe is not configured');
            }
            const payment = yield models_1.Payment.findByPk(paymentId);
            if (!payment) {
                throw new Error('Payment not found');
            }
            if (!payment.stripe_charge_id) {
                throw new Error('No Stripe charge ID found for this payment');
            }
            // Create refund in Stripe
            yield this.stripe.refunds.create({
                charge: payment.stripe_charge_id,
                reason: 'requested_by_customer',
                metadata: {
                    payment_id: paymentId,
                    reason: reason || 'Customer request',
                },
            });
            // Update payment status
            payment.status = 'refunded';
            yield payment.save();
            // Cancel associated subscription if exists
            if (payment.subscription_id) {
                const subscription = yield models_1.UserSubscription.findByPk(payment.subscription_id);
                if (subscription) {
                    yield subscription.cancel();
                }
            }
        });
    }
    /**
     * Get payment statistics
     */
    getPaymentStats() {
        return __awaiter(this, void 0, void 0, function* () {
            const [totalRevenue, totalPayments, successfulPayments, failedPayments, refundedPayments,] = yield Promise.all([
                models_1.Payment.sum('amount', {
                    where: { status: 'completed' },
                }),
                models_1.Payment.count(),
                models_1.Payment.count({ where: { status: 'completed' } }),
                models_1.Payment.count({ where: { status: 'failed' } }),
                models_1.Payment.count({ where: { status: 'refunded' } }),
            ]);
            return {
                totalRevenue: Number(totalRevenue) || 0,
                totalPayments,
                successfulPayments,
                failedPayments,
                refundedPayments,
            };
        });
    }
    /**
     * Create a test payment for development
     */
    createTestPayment(userId, planId) {
        return __awaiter(this, void 0, void 0, function* () {
            const plan = yield subscriptionService_1.default.getPlanById(planId);
            if (!plan) {
                throw new Error('Subscription plan not found');
            }
            const payment = yield models_1.Payment.create({
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
            const subscription = yield subscriptionService_1.default.createSubscription({
                userId: userId,
                planId: planId,
                paymentMethod: 'test',
            });
            payment.subscription_id = subscription.id;
            yield payment.save();
            yield subscriptionService_1.default.activateSubscription(subscription.id);
            return payment;
        });
    }
}
exports.default = new PaymentService();
