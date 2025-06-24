import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface UserSubscriptionAttributes {
  id: string;
  user_id: string;
  plan_id: string;
  status: 'active' | 'expired' | 'cancelled' | 'pending';
  starts_at: Date;
  expires_at: Date;
  auto_renew: boolean;
  payment_method: string | null;
  stripe_subscription_id: string | null;
  created_at: Date;
  updated_at: Date;
}

interface UserSubscriptionCreationAttributes extends Optional<UserSubscriptionAttributes, 'id' | 'created_at' | 'updated_at' | 'auto_renew' | 'payment_method' | 'stripe_subscription_id'> {}

class UserSubscription extends Model<UserSubscriptionAttributes, UserSubscriptionCreationAttributes> implements UserSubscriptionAttributes {
  public id!: string;
  public user_id!: string;
  public plan_id!: string;
  public status!: 'active' | 'expired' | 'cancelled' | 'pending';
  public starts_at!: Date;
  public expires_at!: Date;
  public auto_renew!: boolean;
  public payment_method!: string | null;
  public stripe_subscription_id!: string | null;
  public created_at!: Date;
  public updated_at!: Date;

  // Association properties
  public plan?: any;
  public user?: any;

  // Helper methods
  public isActive(): boolean {
    const now = new Date();
    return this.status === 'active' && this.starts_at <= now && this.expires_at > now;
  }

  public isExpired(): boolean {
    return this.expires_at < new Date() || this.status === 'expired';
  }

  public daysRemaining(): number {
    const now = new Date();
    const diffTime = this.expires_at.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  public async cancel(): Promise<void> {
    this.status = 'cancelled';
    this.auto_renew = false;
    await this.save();
  }

  public async renew(newExpiresAt: Date): Promise<void> {
    this.expires_at = newExpiresAt;
    this.status = 'active';
    await this.save();
  }
}

UserSubscription.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    plan_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'subscription_plans',
        key: 'id',
      },
    },
    status: {
      type: DataTypes.ENUM('active', 'expired', 'cancelled', 'pending'),
      allowNull: false,
      defaultValue: 'pending',
    },
    starts_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    auto_renew: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    payment_method: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    stripe_subscription_id: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'user_subscriptions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['user_id'],
      },
      {
        fields: ['plan_id'],
      },
      {
        fields: ['status'],
      },
      {
        fields: ['expires_at'],
      },
    ],
  }
);

export default UserSubscription;
