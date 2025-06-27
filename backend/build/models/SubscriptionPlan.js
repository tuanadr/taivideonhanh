"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("../config/database"));
class SubscriptionPlan extends sequelize_1.Model {
    // Helper methods
    isFeatureIncluded(feature) {
        return this.features.includes(feature);
    }
    getDisplayPrice() {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: this.currency,
        }).format(this.price);
    }
    getMonthlyEquivalentPrice() {
        if (this.billing_cycle === 'monthly') {
            return this.price;
        }
        return this.price / 12;
    }
    getAnnualSavings(monthlyPrice) {
        if (this.billing_cycle === 'annual') {
            return (monthlyPrice * 12) - this.price;
        }
        return 0;
    }
    getDiscountPercentage(monthlyPrice) {
        if (this.billing_cycle === 'annual') {
            const annualAtMonthlyRate = monthlyPrice * 12;
            return Math.round(((annualAtMonthlyRate - this.price) / annualAtMonthlyRate) * 100);
        }
        return 0;
    }
}
SubscriptionPlan.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true,
    },
    name: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    price: {
        type: sequelize_1.DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
            min: 0,
        },
    },
    currency: {
        type: sequelize_1.DataTypes.STRING(3),
        allowNull: false,
        defaultValue: 'VND',
    },
    duration_days: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        validate: {
            min: 1,
        },
    },
    billing_cycle: {
        type: sequelize_1.DataTypes.ENUM('monthly', 'annual'),
        allowNull: false,
        defaultValue: 'monthly',
    },
    discount_percentage: {
        type: sequelize_1.DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0,
        validate: {
            min: 0,
            max: 100,
        },
    },
    stripe_price_id: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
        unique: true,
    },
    features: {
        type: sequelize_1.DataTypes.JSON,
        allowNull: false,
        defaultValue: [],
    },
    max_downloads_per_day: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        validate: {
            min: 1,
        },
    },
    max_concurrent_streams: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        validate: {
            min: 1,
        },
    },
    max_quality: {
        type: sequelize_1.DataTypes.ENUM('720p', '1080p', '1440p', '2160p', 'best'),
        allowNull: false,
        defaultValue: '1080p',
    },
    is_active: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    },
    created_at: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize_1.DataTypes.NOW,
    },
    updated_at: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize_1.DataTypes.NOW,
    },
}, {
    sequelize: database_1.default,
    tableName: 'subscription_plans',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
});
exports.default = SubscriptionPlan;
