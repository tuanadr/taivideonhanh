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
exports.StreamToken = void 0;
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("../config/database"));
const crypto_1 = __importDefault(require("crypto"));
class StreamToken extends sequelize_1.Model {
    // Instance methods
    isExpired() {
        return Date.now() >= this.expires_at.getTime();
    }
    isValid() {
        return !this.used && !this.isExpired();
    }
    markAsUsed() {
        return __awaiter(this, void 0, void 0, function* () {
            this.used = true;
            this.used_at = new Date();
            yield this.save();
        });
    }
    incrementRateLimit() {
        return __awaiter(this, void 0, void 0, function* () {
            this.rate_limit_count += 1;
            this.last_access = new Date();
            yield this.save();
        });
    }
    // Static methods
    static createStreamToken(userId_1, videoUrl_1, formatId_1) {
        return __awaiter(this, arguments, void 0, function* (userId, videoUrl, formatId, expiresInMinutes = 30) {
            // Generate a secure random token
            const token = crypto_1.default.randomBytes(32).toString('hex');
            const tokenHash = crypto_1.default.createHash('sha256').update(token).digest('hex');
            // Calculate expiration time
            const expiresAt = new Date();
            expiresAt.setMinutes(expiresAt.getMinutes() + expiresInMinutes);
            // Create stream token record
            const streamToken = yield StreamToken.create({
                user_id: userId,
                token_hash: tokenHash,
                video_url: videoUrl,
                format_id: formatId,
                expires_at: expiresAt,
            });
            return { token, streamToken };
        });
    }
    static findByToken(token) {
        return __awaiter(this, void 0, void 0, function* () {
            const tokenHash = crypto_1.default.createHash('sha256').update(token).digest('hex');
            return StreamToken.findOne({
                where: {
                    token_hash: tokenHash,
                },
            });
        });
    }
    static findValidToken(token) {
        return __awaiter(this, void 0, void 0, function* () {
            const tokenHash = crypto_1.default.createHash('sha256').update(token).digest('hex');
            return StreamToken.findOne({
                where: {
                    token_hash: tokenHash,
                    used: false,
                    expires_at: {
                        [sequelize_1.Op.gt]: new Date(),
                    },
                },
            });
        });
    }
    static cleanupExpiredTokens() {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield StreamToken.destroy({
                where: {
                    expires_at: {
                        [sequelize_1.Op.lt]: new Date(),
                    },
                },
            });
            return result;
        });
    }
    static revokeUserTokens(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield StreamToken.update({ used: true, used_at: new Date() }, {
                where: {
                    user_id: userId,
                    used: false,
                },
            });
            return result[0];
        });
    }
    static getUserActiveTokensCount(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            return StreamToken.count({
                where: {
                    user_id: userId,
                    used: false,
                    expires_at: {
                        [sequelize_1.Op.gt]: new Date(),
                    },
                },
            });
        });
    }
}
exports.StreamToken = StreamToken;
StreamToken.init({
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
    video_url: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: false,
    },
    format_id: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
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
    used: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },
    used_at: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
    },
    ip_address: {
        type: sequelize_1.DataTypes.INET,
        allowNull: true,
    },
    user_agent: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true,
    },
    rate_limit_count: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
    },
    last_access: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
    },
}, {
    sequelize: database_1.default,
    modelName: 'StreamToken',
    tableName: 'stream_tokens',
    timestamps: false,
    indexes: [
        {
            fields: ['user_id'],
        },
        {
            fields: ['token_hash'],
            unique: true,
        },
        {
            fields: ['expires_at'],
        },
        {
            fields: ['used'],
        },
    ],
});
exports.default = StreamToken;
