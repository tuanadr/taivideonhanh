import { SubscriptionPlan, UserSubscription, Payment, User } from '../models';
import { Op } from 'sequelize';

export interface CreateSubscriptionData {
  userId: string;
  planId: string;
  paymentMethod: string;
  autoRenew?: boolean;
}

export interface SubscriptionLimits {
  maxDownloadsPerDay: number;
  maxConcurrentStreams: number;
  maxQuality: string;
  features: string[];
}

class SubscriptionService {
  /**
   * Get all available subscription plans
   */
  async getAvailablePlans(): Promise<SubscriptionPlan[]> {
    return await SubscriptionPlan.findAll({
      where: {
        is_active: true,
      },
      order: [['price', 'ASC']],
    });
  }

  /**
   * Get subscription plan by ID
   */
  async getPlanById(planId: string): Promise<SubscriptionPlan | null> {
    return await SubscriptionPlan.findByPk(planId);
  }

  /**
   * Get user's current active subscription
   */
  async getUserActiveSubscription(userId: string): Promise<UserSubscription | null> {
    const now = new Date();
    
    return await UserSubscription.findOne({
      where: {
        user_id: userId,
        status: 'active',
        starts_at: {
          [Op.lte]: now,
        },
        expires_at: {
          [Op.gt]: now,
        },
      },
      include: [
        {
          model: SubscriptionPlan,
          as: 'plan',
        },
      ],
      order: [['expires_at', 'DESC']],
    });
  }

  /**
   * Get user's subscription history
   */
  async getUserSubscriptionHistory(userId: string): Promise<UserSubscription[]> {
    return await UserSubscription.findAll({
      where: {
        user_id: userId,
      },
      include: [
        {
          model: SubscriptionPlan,
          as: 'plan',
        },
      ],
      order: [['created_at', 'DESC']],
    });
  }

  /**
   * Create a new subscription
   */
  async createSubscription(data: CreateSubscriptionData): Promise<UserSubscription> {
    const plan = await this.getPlanById(data.planId);
    if (!plan) {
      throw new Error('Subscription plan not found');
    }

    // Check if user already has an active subscription
    const existingSubscription = await this.getUserActiveSubscription(data.userId);
    if (existingSubscription) {
      throw new Error('User already has an active subscription');
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + plan.duration_days * 24 * 60 * 60 * 1000);

    const subscription = await UserSubscription.create({
      user_id: data.userId,
      plan_id: data.planId,
      status: 'pending',
      starts_at: now,
      expires_at: expiresAt,
      auto_renew: data.autoRenew ?? true,
      payment_method: data.paymentMethod,
    });

    return subscription;
  }

  /**
   * Activate a subscription after successful payment
   */
  async activateSubscription(subscriptionId: string): Promise<UserSubscription> {
    const subscription = await UserSubscription.findByPk(subscriptionId);
    if (!subscription) {
      throw new Error('Subscription not found');
    }

    subscription.status = 'active';
    await subscription.save();

    return subscription;
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(userId: string, subscriptionId: string): Promise<UserSubscription> {
    const subscription = await UserSubscription.findOne({
      where: {
        id: subscriptionId,
        user_id: userId,
      },
    });

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    await subscription.cancel();
    return subscription;
  }

  /**
   * Get subscription limits for a user
   */
  async getUserSubscriptionLimits(userId: string): Promise<SubscriptionLimits> {
    const activeSubscription = await this.getUserActiveSubscription(userId);
    
    if (!activeSubscription || !activeSubscription.plan) {
      // Return free tier limits
      return {
        maxDownloadsPerDay: 10,
        maxConcurrentStreams: 1,
        maxQuality: '720p',
        features: ['basic_download'],
      };
    }

    const plan = activeSubscription.plan as SubscriptionPlan;
    return {
      maxDownloadsPerDay: plan.max_downloads_per_day,
      maxConcurrentStreams: plan.max_concurrent_streams,
      maxQuality: plan.max_quality,
      features: plan.features,
    };
  }

  /**
   * Check if user can perform an action based on subscription
   */
  async canUserPerformAction(userId: string, action: string): Promise<boolean> {
    const limits = await this.getUserSubscriptionLimits(userId);
    
    switch (action) {
      case 'download_hd':
        return ['1080p', '1440p', '2160p', 'best'].includes(limits.maxQuality);
      case 'download_4k':
        return ['2160p', 'best'].includes(limits.maxQuality);
      case 'concurrent_streams':
        return limits.maxConcurrentStreams > 1;
      case 'ad_free':
        return limits.features.includes('ad_free');
      default:
        return true;
    }
  }

  /**
   * Renew subscription
   */
  async renewSubscription(subscriptionId: string, newExpiresAt: Date): Promise<UserSubscription> {
    const subscription = await UserSubscription.findByPk(subscriptionId);
    if (!subscription) {
      throw new Error('Subscription not found');
    }

    await subscription.renew(newExpiresAt);
    return subscription;
  }

  /**
   * Get subscription statistics
   */
  async getSubscriptionStats(): Promise<{
    totalActiveSubscriptions: number;
    totalRevenue: number;
    planDistribution: Array<{ planName: string; count: number }>;
  }> {
    const now = new Date();
    
    // Get active subscriptions count
    const totalActiveSubscriptions = await UserSubscription.count({
      where: {
        status: 'active',
        starts_at: {
          [Op.lte]: now,
        },
        expires_at: {
          [Op.gt]: now,
        },
      },
    });

    // Get total revenue from completed payments
    const revenueResult = await Payment.sum('amount', {
      where: {
        status: 'completed',
      },
    });
    const totalRevenue = revenueResult || 0;

    // Get plan distribution
    const planDistribution = await UserSubscription.findAll({
      attributes: [
        [SubscriptionPlan.sequelize!.col('plan.name'), 'planName'],
        [SubscriptionPlan.sequelize!.fn('COUNT', SubscriptionPlan.sequelize!.col('UserSubscription.id')), 'count'],
      ],
      include: [
        {
          model: SubscriptionPlan,
          as: 'plan',
          attributes: [],
        },
      ],
      where: {
        status: 'active',
        starts_at: {
          [Op.lte]: now,
        },
        expires_at: {
          [Op.gt]: now,
        },
      },
      group: ['plan.id', 'plan.name'],
      raw: true,
    }) as any[];

    return {
      totalActiveSubscriptions,
      totalRevenue: Number(totalRevenue),
      planDistribution: planDistribution.map(item => ({
        planName: item.planName,
        count: Number(item.count),
      })),
    };
  }

  /**
   * Initialize default subscription plans
   */
  async initializeDefaultPlans(): Promise<void> {
    const existingPlans = await SubscriptionPlan.count();
    if (existingPlans > 0) {
      return; // Plans already exist
    }

    const defaultPlans = [
      {
        name: 'Free',
        price: 0,
        currency: 'VND',
        duration_days: 30,
        features: ['basic_download'],
        max_downloads_per_day: 10,
        max_concurrent_streams: 1,
        max_quality: '720p',
      },
      {
        name: 'Pro',
        price: 99000,
        currency: 'VND',
        duration_days: 30,
        features: ['hd_download', 'ad_free', 'priority_support', 'concurrent_streams'],
        max_downloads_per_day: 100,
        max_concurrent_streams: 3,
        max_quality: 'best',
      },
    ];

    for (const planData of defaultPlans) {
      await SubscriptionPlan.create(planData);
    }
  }
}

export default new SubscriptionService();
