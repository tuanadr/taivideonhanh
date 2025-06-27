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
const bcryptjs_1 = __importDefault(require("bcryptjs"));
class User extends sequelize_1.Model {
    // Instance methods
    validatePassword(password) {
        return __awaiter(this, void 0, void 0, function* () {
            return bcryptjs_1.default.compare(password, this.password_hash);
        });
    }
    toJSON() {
        const values = Object.assign({}, this.get());
        delete values.password_hash;
        return values;
    }
    updateLastLogin() {
        return __awaiter(this, void 0, void 0, function* () {
            this.last_login = new Date();
            yield this.save();
        });
    }
    isPro() {
        return this.subscription_tier === 'pro';
    }
    isFree() {
        return this.subscription_tier === 'free';
    }
    upgradeToPro() {
        return __awaiter(this, void 0, void 0, function* () {
            this.subscription_tier = 'pro';
            yield this.save();
        });
    }
    downgradeToFree() {
        return __awaiter(this, void 0, void 0, function* () {
            this.subscription_tier = 'free';
            yield this.save();
        });
    }
    // Static methods
    static hashPassword(password) {
        return __awaiter(this, void 0, void 0, function* () {
            const saltRounds = 12;
            return bcryptjs_1.default.hash(password, saltRounds);
        });
    }
    static findByEmail(email) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.findOne({ where: { email: email.toLowerCase() } });
        });
    }
}
User.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true,
    },
    email: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true,
        },
        set(value) {
            this.setDataValue('email', value.toLowerCase());
        },
    },
    password_hash: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
        validate: {
            len: [60, 60], // bcrypt hash length
        },
    },
    first_name: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
        validate: {
            len: [1, 50],
        },
    },
    last_name: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
        validate: {
            len: [1, 50],
        },
    },
    subscription_tier: {
        type: sequelize_1.DataTypes.ENUM('free', 'pro'),
        allowNull: false,
        defaultValue: 'free',
    },
    email_verified: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },
    last_login: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
    },
    is_active: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    },
    is_suspended: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
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
    deleted_at: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
    },
    deletion_reason: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true,
    },
    deleted_by: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: true,
    },
}, {
    sequelize: database_1.default,
    modelName: 'User',
    tableName: 'users',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        {
            unique: true,
            fields: ['email'],
        },
    ],
});
exports.default = User;
