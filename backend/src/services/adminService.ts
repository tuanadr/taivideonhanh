import { Admin, User, UserSubscription, Payment, SubscriptionPlan } from '../models';
import { Op } from 'sequelize';
import bcrypt from 'bcryptjs';

export interface AdminStats {
  totalUsers: number;
  activeSubscriptions: number;
  totalRevenue: number;
  newUsersToday: number;
  revenueToday: number;
  userGrowth: number;
  revenueGrowth: number;
}

export interface UserManagementData {
  users: any[];
  totalCount: number;
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
  };
}

class AdminService {
  /**
   * Get admin dashboard statistics
   */
  async getDashboardStats(): Promise<AdminStats> {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());

    const [
      totalUsers,
      activeSubscriptions,
      totalRevenue,
      newUsersToday,
      newUsersYesterday,
      revenueToday,
      revenueYesterday,
      usersLastMonth,
      revenueLastMonth,
    ] = await Promise.all([
      // Total users
      User.count(),
      
      // Active subscriptions
      UserSubscription.count({
        where: {
          status: 'active',
          starts_at: { [Op.lte]: now },
          expires_at: { [Op.gt]: now },
        },
      }),
      
      // Total revenue
      Payment.sum('amount', {
        where: { status: 'completed' },
      }),
      
      // New users today
      User.count({
        where: {
          created_at: { [Op.gte]: today },
        },
      }),
      
      // New users yesterday
      User.count({
        where: {
          created_at: {
            [Op.gte]: yesterday,
            [Op.lt]: today,
          },
        },
      }),
      
      // Revenue today
      Payment.sum('amount', {
        where: {
          status: 'completed',
          created_at: { [Op.gte]: today },
        },
      }),
      
      // Revenue yesterday
      Payment.sum('amount', {
        where: {
          status: 'completed',
          created_at: {
            [Op.gte]: yesterday,
            [Op.lt]: today,
          },
        },
      }),
      
      // Users last month
      User.count({
        where: {
          created_at: { [Op.gte]: lastMonth },
        },
      }),
      
      // Revenue last month
      Payment.sum('amount', {
        where: {
          status: 'completed',
          created_at: { [Op.gte]: lastMonth },
        },
      }),
    ]);

    // Calculate growth rates
    const userGrowth = newUsersYesterday > 0 
      ? ((newUsersToday - newUsersYesterday) / newUsersYesterday) * 100 
      : newUsersToday > 0 ? 100 : 0;

    const revenueGrowth = (revenueYesterday || 0) > 0 
      ? (((revenueToday || 0) - (revenueYesterday || 0)) / (revenueYesterday || 0)) * 100 
      : (revenueToday || 0) > 0 ? 100 : 0;

    return {
      totalUsers,
      activeSubscriptions,
      totalRevenue: Number(totalRevenue) || 0,
      newUsersToday,
      revenueToday: Number(revenueToday) || 0,
      userGrowth: Math.round(userGrowth * 100) / 100,
      revenueGrowth: Math.round(revenueGrowth * 100) / 100,
    };
  }

  /**
   * Get users with pagination and filters
   */
  async getUsers(
    page: number = 1,
    limit: number = 20,
    search?: string,
    subscriptionTier?: string
  ): Promise<UserManagementData> {
    const offset = (page - 1) * limit;
    
    const whereClause: any = {};
    
    if (search) {
      whereClause.email = {
        [Op.iLike]: `%${search}%`,
      };
    }
    
    if (subscriptionTier) {
      whereClause.subscription_tier = subscriptionTier;
    }

    const { count, rows } = await User.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: UserSubscription,
          as: 'subscriptions',
          include: [
            {
              model: SubscriptionPlan,
              as: 'plan',
            },
          ],
          where: {
            status: 'active',
            starts_at: { [Op.lte]: new Date() },
            expires_at: { [Op.gt]: new Date() },
          },
          required: false,
        },
      ],
      limit,
      offset,
      order: [['created_at', 'DESC']],
    });

    return {
      users: rows.map(user => ({
        ...user.toJSON(),
        activeSubscription: (user as any).subscriptions?.[0] || null,
      })),
      totalCount: count,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(count / limit),
      },
    };
  }

  /**
   * Update user subscription tier
   */
  async updateUserSubscriptionTier(userId: string, tier: 'free' | 'pro'): Promise<User> {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error('User not found');
    }

    user.subscription_tier = tier;
    await user.save();

    return user;
  }

  /**
   * Deactivate user account
   */
  async deactivateUser(userId: string): Promise<User> {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Cancel active subscriptions
    await UserSubscription.update(
      { status: 'cancelled' },
      {
        where: {
          user_id: userId,
          status: 'active',
        },
      }
    );

    // You might want to add an is_active field to User model
    // For now, we'll just update the subscription tier
    user.subscription_tier = 'free';
    await user.save();

    return user;
  }

  /**
   * Get subscription analytics
   */
  async getSubscriptionAnalytics(): Promise<{
    planDistribution: Array<{ planName: string; count: number; revenue: number }>;
    monthlyRevenue: Array<{ month: string; revenue: number; subscriptions: number }>;
    churnRate: number;
  }> {
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);

    // Plan distribution
    const planDistribution = await UserSubscription.findAll({
      attributes: [
        [SubscriptionPlan.sequelize!.col('plan.name'), 'planName'],
        [SubscriptionPlan.sequelize!.fn('COUNT', SubscriptionPlan.sequelize!.col('UserSubscription.id')), 'count'],
        [SubscriptionPlan.sequelize!.fn('SUM', SubscriptionPlan.sequelize!.col('plan.price')), 'revenue'],
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
        starts_at: { [Op.lte]: now },
        expires_at: { [Op.gt]: now },
      },
      group: ['plan.id', 'plan.name'],
      raw: true,
    }) as any[];

    // Monthly revenue (simplified - you might want to use a more sophisticated query)
    const monthlyRevenue = await Payment.findAll({
      attributes: [
        [Payment.sequelize!.fn('DATE_TRUNC', 'month', Payment.sequelize!.col('created_at')), 'month'],
        [Payment.sequelize!.fn('SUM', Payment.sequelize!.col('amount')), 'revenue'],
        [Payment.sequelize!.fn('COUNT', Payment.sequelize!.col('id')), 'subscriptions'],
      ],
      where: {
        status: 'completed',
        created_at: { [Op.gte]: sixMonthsAgo },
      },
      group: [Payment.sequelize!.fn('DATE_TRUNC', 'month', Payment.sequelize!.col('created_at'))],
      order: [[Payment.sequelize!.fn('DATE_TRUNC', 'month', Payment.sequelize!.col('created_at')), 'ASC']],
      raw: true,
    }) as any[];

    // Calculate churn rate (simplified)
    const totalActiveSubscriptions = await UserSubscription.count({
      where: {
        status: 'active',
        starts_at: { [Op.lte]: now },
        expires_at: { [Op.gt]: now },
      },
    });

    const cancelledThisMonth = await UserSubscription.count({
      where: {
        status: 'cancelled',
        updated_at: {
          [Op.gte]: new Date(now.getFullYear(), now.getMonth(), 1),
        },
      },
    });

    const churnRate = totalActiveSubscriptions > 0 
      ? (cancelledThisMonth / totalActiveSubscriptions) * 100 
      : 0;

    return {
      planDistribution: planDistribution.map(item => ({
        planName: item.planName,
        count: Number(item.count),
        revenue: Number(item.revenue) || 0,
      })),
      monthlyRevenue: monthlyRevenue.map(item => ({
        month: item.month,
        revenue: Number(item.revenue) || 0,
        subscriptions: Number(item.subscriptions),
      })),
      churnRate: Math.round(churnRate * 100) / 100,
    };
  }

  /**
   * Create admin user
   */
  async createAdmin(
    email: string,
    password: string,
    role: 'super_admin' | 'admin' | 'moderator' = 'moderator',
    permissions: string[] = []
  ): Promise<Admin> {
    const existingAdmin = await Admin.findOne({ where: { email } });
    if (existingAdmin) {
      throw new Error('Admin with this email already exists');
    }

    const admin = await Admin.create({
      email,
      password_hash: password, // Will be hashed by the model hook
      role,
      permissions,
    });

    return admin;
  }

  /**
   * Authenticate admin
   */
  async authenticateAdmin(email: string, password: string): Promise<Admin | null> {
    const admin = await Admin.findOne({
      where: {
        email,
        is_active: true,
      },
    });

    if (!admin) {
      return null;
    }

    const isValidPassword = await admin.validatePassword(password);
    if (!isValidPassword) {
      return null;
    }

    await admin.updateLastLogin();
    return admin;
  }

  /**
   * Initialize default admin user
   */
  async initializeDefaultAdmin(): Promise<void> {
    const existingAdmin = await Admin.count();
    if (existingAdmin > 0) {
      return; // Admin already exists
    }

    const defaultEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@taivideonhanh.com';
    const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123456';

    await this.createAdmin(defaultEmail, defaultPassword, 'super_admin', [
      'user_management',
      'subscription_management',
      'payment_management',
      'system_settings',
      'analytics_view',
    ]);

    console.log(`Default admin created: ${defaultEmail}`);
  }
}

export default new AdminService();
