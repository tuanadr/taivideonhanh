import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface SubscriptionPlanAttributes {
  id: string;
  name: string;
  price: number;
  currency: string;
  duration_days: number;
  billing_cycle: 'monthly' | 'annual';
  discount_percentage: number;
  stripe_price_id: string;
  features: string[];
  max_downloads_per_day: number;
  max_concurrent_streams: number;
  max_quality: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

interface SubscriptionPlanCreationAttributes extends Optional<SubscriptionPlanAttributes, 'id' | 'created_at' | 'updated_at' | 'is_active' | 'discount_percentage'> {}

class SubscriptionPlan extends Model<SubscriptionPlanAttributes, SubscriptionPlanCreationAttributes> implements SubscriptionPlanAttributes {
  public id!: string;
  public name!: string;
  public price!: number;
  public currency!: string;
  public duration_days!: number;
  public billing_cycle!: 'monthly' | 'annual';
  public discount_percentage!: number;
  public stripe_price_id!: string;
  public features!: string[];
  public max_downloads_per_day!: number;
  public max_concurrent_streams!: number;
  public max_quality!: string;
  public is_active!: boolean;
  public created_at!: Date;
  public updated_at!: Date;

  // Helper methods
  public isFeatureIncluded(feature: string): boolean {
    return this.features.includes(feature);
  }

  public getDisplayPrice(): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: this.currency,
    }).format(this.price);
  }

  public getMonthlyEquivalentPrice(): number {
    if (this.billing_cycle === 'monthly') {
      return this.price;
    }
    return this.price / 12;
  }

  public getAnnualSavings(monthlyPrice: number): number {
    if (this.billing_cycle === 'annual') {
      return (monthlyPrice * 12) - this.price;
    }
    return 0;
  }

  public getDiscountPercentage(monthlyPrice: number): number {
    if (this.billing_cycle === 'annual') {
      const annualAtMonthlyRate = monthlyPrice * 12;
      return Math.round(((annualAtMonthlyRate - this.price) / annualAtMonthlyRate) * 100);
    }
    return 0;
  }
}

SubscriptionPlan.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    price: {
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
    duration_days: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
      },
    },
    billing_cycle: {
      type: DataTypes.ENUM('monthly', 'annual'),
      allowNull: false,
      defaultValue: 'monthly',
    },
    discount_percentage: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 100,
      },
    },
    stripe_price_id: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
    },
    features: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
    },
    max_downloads_per_day: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
      },
    },
    max_concurrent_streams: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
      },
    },
    max_quality: {
      type: DataTypes.ENUM('720p', '1080p', '1440p', '2160p', 'best'),
      allowNull: false,
      defaultValue: '1080p',
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
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
    tableName: 'subscription_plans',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

export default SubscriptionPlan;
