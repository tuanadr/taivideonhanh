import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface PaymentAttributes {
  id: string;
  user_id: string;
  subscription_id: string | null;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  payment_method: string;
  stripe_payment_intent_id: string | null;
  stripe_charge_id: string | null;
  failure_reason: string | null;
  metadata: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

interface PaymentCreationAttributes extends Optional<PaymentAttributes, 'id' | 'created_at' | 'updated_at' | 'subscription_id' | 'stripe_payment_intent_id' | 'stripe_charge_id' | 'failure_reason' | 'metadata'> {}

class Payment extends Model<PaymentAttributes, PaymentCreationAttributes> implements PaymentAttributes {
  public id!: string;
  public user_id!: string;
  public subscription_id!: string | null;
  public amount!: number;
  public currency!: string;
  public status!: 'pending' | 'completed' | 'failed' | 'refunded';
  public payment_method!: string;
  public stripe_payment_intent_id!: string | null;
  public stripe_charge_id!: string | null;
  public failure_reason!: string | null;
  public metadata!: Record<string, any>;
  public created_at!: Date;
  public updated_at!: Date;

  // Association properties
  public subscription?: any;
  public user?: any;

  // Helper methods
  public isCompleted(): boolean {
    return this.status === 'completed';
  }

  public isFailed(): boolean {
    return this.status === 'failed';
  }

  public getDisplayAmount(): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: this.currency,
    }).format(this.amount);
  }

  public async markAsCompleted(stripeChargeId?: string): Promise<void> {
    this.status = 'completed';
    if (stripeChargeId) {
      this.stripe_charge_id = stripeChargeId;
    }
    await this.save();
  }

  public async markAsFailed(reason: string): Promise<void> {
    this.status = 'failed';
    this.failure_reason = reason;
    await this.save();
  }
}

Payment.init(
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
    subscription_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'user_subscriptions',
        key: 'id',
      },
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0,
      },
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: 'VND',
    },
    status: {
      type: DataTypes.ENUM('pending', 'completed', 'failed', 'refunded'),
      allowNull: false,
      defaultValue: 'pending',
    },
    payment_method: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    stripe_payment_intent_id: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
    },
    stripe_charge_id: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
    },
    failure_reason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {},
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
    tableName: 'payments',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['user_id'],
      },
      {
        fields: ['subscription_id'],
      },
      {
        fields: ['status'],
      },
      {
        fields: ['created_at'],
      },
    ],
  }
);

export default Payment;
