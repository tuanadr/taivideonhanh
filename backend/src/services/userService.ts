import User from '../models/User';
// Note: Subscription model will be created later
import { Op } from 'sequelize';
import bcrypt from 'bcryptjs';

interface UserListOptions {
  page: number;
  limit: number;
  search?: string;
  status?: string;
  subscription?: string;
  sortBy: string;
  sortOrder: string;
}

interface UserStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  suspendedUsers: number;
  freeUsers: number;
  premiumUsers: number;
  proUsers: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  averageSessionTime: number;
  topCountries: Array<{ country: string; count: number }>;
}

class UserService {
  /**
   * Get users list with pagination and filters
   */
  static async getUsersList(options: UserListOptions): Promise<{
    data: User[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const { page, limit, search, status, subscription, sortBy, sortOrder } = options;
    const offset = (page - 1) * limit;

    // Build where clause
    const whereClause: any = {};
    
    if (search) {
      whereClause[Op.or] = [
        { email: { [Op.iLike]: `%${search}%` } },
        { first_name: { [Op.iLike]: `%${search}%` } },
        { last_name: { [Op.iLike]: `%${search}%` } }
      ];
    }

    if (status) {
      if (status === 'active') {
        whereClause.is_active = true;
      } else if (status === 'inactive') {
        whereClause.is_active = false;
      } else if (status === 'suspended') {
        whereClause.is_suspended = true;
      }
    }

    // Build include for subscription filter (commented out until Subscription model is created)
    const include: any[] = [
      // {
      //   model: Subscription,
      //   as: 'subscription',
      //   required: false
      // }
    ];

    // if (subscription) {
    //   include[0].where = { tier: subscription };
    //   include[0].required = true;
    // }

    // Build order clause
    const orderClause: any[] = [];
    if (sortBy === 'subscription_tier') {
      // orderClause.push([{ model: Subscription, as: 'subscription' }, 'tier', sortOrder.toUpperCase()]);
      orderClause.push(['created_at', sortOrder.toUpperCase()]); // Fallback to created_at
    } else {
      orderClause.push([sortBy, sortOrder.toUpperCase()]);
    }

    const { count, rows } = await User.findAndCountAll({
      where: whereClause,
      include,
      limit,
      offset,
      order: orderClause,
      attributes: [
        'id',
        'email',
        'first_name',
        'last_name',
        'is_active',
        'is_suspended',
        'last_login',
        'created_at',
        'updated_at'
      ]
    });

    return {
      data: rows,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    };
  }

  /**
   * Get user details with subscription info
   */
  static async getUserDetails(userId: string): Promise<User | null> {
    const user = await User.findByPk(userId, {
      // include: [
      //   {
      //     model: Subscription,
      //     as: 'subscription'
      //   }
      // ],
      attributes: [
        'id',
        'email',
        'first_name',
        'last_name',
        'is_active',
        'is_suspended',
        'last_login',
        'created_at',
        'updated_at'
      ]
    });

    return user;
  }

  /**
   * Update user status
   */
  static async updateUserStatus(
    userId: string,
    status: string,
    adminId: string,
    reason?: string
  ): Promise<User> {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const updateData: any = {};
    
    if (status === 'active') {
      updateData.is_active = true;
      updateData.is_suspended = false;
    } else if (status === 'inactive') {
      updateData.is_active = false;
      updateData.is_suspended = false;
    } else if (status === 'suspended') {
      updateData.is_active = false;
      updateData.is_suspended = true;
    }

    await user.update(updateData);

    // Log the action (in a real implementation, you would have an audit log)
    console.log(`Admin ${adminId} updated user ${userId} status to ${status}. Reason: ${reason || 'No reason provided'}`);

    return user;
  }

  /**
   * Reset user password
   */
  static async resetUserPassword(
    userId: string,
    newPassword: string,
    adminId: string,
    reason?: string
  ): Promise<void> {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await user.update({ password_hash: hashedPassword });

    // Log the action
    console.log(`Admin ${adminId} reset password for user ${userId}. Reason: ${reason || 'No reason provided'}`);
  }

  /**
   * Delete user (soft delete)
   */
  static async deleteUser(
    userId: string,
    adminId: string,
    reason: string
  ): Promise<void> {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Soft delete by marking as inactive and adding deletion info
    await user.update({
      is_active: false,
      is_suspended: true,
      deleted_at: new Date(),
      deletion_reason: reason,
      deleted_by: adminId
    });

    // Log the action
    console.log(`Admin ${adminId} deleted user ${userId}. Reason: ${reason}`);
  }

  /**
   * Get user statistics
   */
  static async getUserStats(): Promise<UserStats> {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Basic user counts
    const totalUsers = await User.count();
    const activeUsers = await User.count({ where: { is_active: true } });
    const inactiveUsers = await User.count({ where: { is_active: false } });
    const suspendedUsers = await User.count({ where: { is_suspended: true } });

    // Subscription counts (mock data until Subscription model is implemented)
    const freeUsers = Math.floor(totalUsers * 0.6); // 60% free users
    const premiumUsers = Math.floor(totalUsers * 0.3); // 30% premium users
    const proUsers = Math.floor(totalUsers * 0.1); // 10% pro users

    // New users
    const newUsersToday = await User.count({
      where: {
        created_at: {
          [Op.gte]: today
        }
      }
    });

    const newUsersThisWeek = await User.count({
      where: {
        created_at: {
          [Op.gte]: thisWeek
        }
      }
    });

    const newUsersThisMonth = await User.count({
      where: {
        created_at: {
          [Op.gte]: thisMonth
        }
      }
    });

    // Mock data for complex stats (in real implementation, you would calculate these)
    const averageSessionTime = 1800; // 30 minutes in seconds
    const topCountries = [
      { country: 'Vietnam', count: Math.floor(totalUsers * 0.6) },
      { country: 'United States', count: Math.floor(totalUsers * 0.2) },
      { country: 'Thailand', count: Math.floor(totalUsers * 0.1) },
      { country: 'Singapore', count: Math.floor(totalUsers * 0.05) },
      { country: 'Others', count: Math.floor(totalUsers * 0.05) }
    ];

    return {
      totalUsers,
      activeUsers,
      inactiveUsers,
      suspendedUsers,
      freeUsers,
      premiumUsers,
      proUsers,
      newUsersToday,
      newUsersThisWeek,
      newUsersThisMonth,
      averageSessionTime,
      topCountries
    };
  }

  /**
   * Search users by email or name
   */
  static async searchUsers(query: string, limit: number = 10): Promise<User[]> {
    return await User.findAll({
      where: {
        [Op.or]: [
          { email: { [Op.iLike]: `%${query}%` } },
          { first_name: { [Op.iLike]: `%${query}%` } },
          { last_name: { [Op.iLike]: `%${query}%` } }
        ]
      },
      limit,
      attributes: ['id', 'email', 'first_name', 'last_name', 'is_active'],
      order: [['created_at', 'DESC']]
    });
  }
}

export default UserService;
