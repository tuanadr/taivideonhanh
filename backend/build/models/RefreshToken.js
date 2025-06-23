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
const crypto_1 = __importDefault(require("crypto"));
class RefreshToken extends sequelize_1.Model {
    // Instance methods
    isExpired() {
        return Date.now() >= this.expires_at.getTime();
    }
    isActive() {
        return !this.revoked && !this.isExpired();
    }
    revoke(replacedBy) {
        return __awaiter(this, void 0, void 0, function* () {
            this.revoked = true;
            this.revoked_at = new Date();
            if (replacedBy) {
                this.replaced_by = replacedBy;
            }
            yield this.save();
        });
    }
    // Static methods
    static generateToken() {
        return crypto_1.default.randomBytes(40).toString('hex');
    }
    static hashToken(token) {
        return crypto_1.default.createHash('sha256').update(token).digest('hex');
    }
    static createRefreshToken(userId_1) {
        return __awaiter(this, arguments, void 0, function* (userId, expiresInDays = 7) {
            const token = this.generateToken();
            const tokenHash = this.hashToken(token);
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + expiresInDays);
            const refreshToken = yield this.create({
                user_id: userId,
                token_hash: tokenHash,
                expires_at: expiresAt,
            });
            return { token, refreshToken };
        });
    }
    static findByToken(token) {
        return __awaiter(this, void 0, void 0, function* () {
            const tokenHash = this.hashToken(token);
            return this.findOne({
                where: {
                    token_hash: tokenHash,
                    revoked: false,
                },
            });
        });
    }
    static revokeAllUserTokens(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.update({
                revoked: true,
                revoked_at: new Date(),
            }, {
                where: {
                    user_id: userId,
                    revoked: false,
                },
            });
        });
    }
    static cleanupExpiredTokens() {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield this.destroy({
                where: {
                    expires_at: {
                        [sequelize_1.Op.lt]: new Date(),
                    },
                },
            });
            return result;
        });
    }
}
RefreshToken.init({
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
        onDelete: 'CASCADE',
    },
    token_hash: {
        type: sequelize_1.DataTypes.STRING(64),
        allowNull: false,
        unique: true,
    },
    expires_at: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
    },
    created_at: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize_1.DataTypes.NOW,
    },
    revoked: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },
    revoked_at: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
    },
    replaced_by: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: true,
    },
}, {
    sequelize: database_1.default,
    modelName: 'RefreshToken',
    tableName: 'refresh_tokens',
    timestamps: false,
    indexes: [
        {
            unique: true,
            fields: ['token_hash'],
        },
        {
            fields: ['user_id'],
        },
        {
            fields: ['expires_at'],
        },
    ],
});
exports.default = RefreshToken;
