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
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("../config/database"));
class UserSubscription extends sequelize_1.Model {
    // Helper methods
    isActive() {
        const now = new Date();
        return this.status === 'active' && this.starts_at <= now && this.expires_at > now;
    }
    isExpired() {
        return this.expires_at < new Date() || this.status === 'expired';
    }
    daysRemaining() {
        const now = new Date();
        const diffTime = this.expires_at.getTime() - now.getTime();
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
    cancel() {
        return __awaiter(this, void 0, void 0, function* () {
            this.status = 'cancelled';
            this.auto_renew = false;
            yield this.save();
        });
    }
    renew(newExpiresAt) {
        return __awaiter(this, void 0, void 0, function* () {
            this.expires_at = newExpiresAt;
            this.status = 'active';
            yield this.save();
        });
    }
}
UserSubscription.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true,
    },
    user_id: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id',
        },
    },
    plan_id: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'subscription_plans',
            key: 'id',
        },
    },
    status: {
        type: sequelize_1.DataTypes.ENUM('active', 'expired', 'cancelled', 'pending'),
        allowNull: false,
        defaultValue: 'pending',
    },
    starts_at: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
    },
    expires_at: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
    },
    auto_renew: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    },
    payment_method: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
    },
    stripe_subscription_id: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
        unique: true,
    },
    cancelled_at: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
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
});
exports.default = UserSubscription;
