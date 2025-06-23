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
Object.defineProperty(exports, "__esModule", { value: true });
exports.StreamTokenService = void 0;
const models_1 = require("../models");
const sequelize_1 = require("sequelize");
class StreamTokenService {
    /**
     * Create a new stream token for video streaming
     */
    static createStreamToken(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const { userId, videoUrl, formatId, expiresInMinutes = this.DEFAULT_EXPIRES_MINUTES, ipAddress, userAgent } = data;
            // Check if user has too many active tokens
            const activeTokensCount = yield models_1.StreamToken.getUserActiveTokensCount(userId);
            if (activeTokensCount >= this.MAX_TOKENS_PER_USER) {
                throw new Error(`Maximum number of active stream tokens (${this.MAX_TOKENS_PER_USER}) exceeded`);
            }
            // Create the stream token
            const { token, streamToken } = yield models_1.StreamToken.createStreamToken(userId, videoUrl, formatId, expiresInMinutes);
            // Update additional metadata if provided
            if (ipAddress || userAgent) {
                streamToken.ip_address = ipAddress || null;
                streamToken.user_agent = userAgent || null;
                yield streamToken.save();
            }
            return { token, streamToken };
        });
    }
    /**
     * Validate a stream token for streaming access
     */
    static validateStreamToken(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const { token, ipAddress, userAgent } = data;
            try {
                // Find the token
                const streamToken = yield models_1.StreamToken.findValidToken(token);
                if (!streamToken) {
                    return {
                        isValid: false,
                        error: 'Invalid or expired stream token'
                    };
                }
                // Check rate limiting
                if (streamToken.rate_limit_count >= this.MAX_RATE_LIMIT_COUNT) {
                    return {
                        isValid: false,
                        error: 'Rate limit exceeded for this stream token'
                    };
                }
                // Optional: Check IP address consistency (if originally set)
                if (streamToken.ip_address && ipAddress && streamToken.ip_address !== ipAddress) {
                    return {
                        isValid: false,
                        error: 'IP address mismatch'
                    };
                }
                // Update access tracking
                yield streamToken.incrementRateLimit();
                return {
                    isValid: true,
                    streamToken
                };
            }
            catch (error) {
                return {
                    isValid: false,
                    error: error instanceof Error ? error.message : 'Token validation failed'
                };
            }
        });
    }
    /**
     * Refresh a stream token (extend expiration)
     */
    static refreshStreamToken(token_1) {
        return __awaiter(this, arguments, void 0, function* (token, expiresInMinutes = this.DEFAULT_EXPIRES_MINUTES) {
            const streamToken = yield models_1.StreamToken.findValidToken(token);
            if (!streamToken) {
                throw new Error('Invalid or expired stream token');
            }
            // Extend expiration time
            const newExpiresAt = new Date();
            newExpiresAt.setMinutes(newExpiresAt.getMinutes() + expiresInMinutes);
            streamToken.expires_at = newExpiresAt;
            yield streamToken.save();
            return streamToken;
        });
    }
    /**
     * Revoke a specific stream token
     */
    static revokeStreamToken(token) {
        return __awaiter(this, void 0, void 0, function* () {
            const streamToken = yield models_1.StreamToken.findByToken(token);
            if (!streamToken) {
                throw new Error('Stream token not found');
            }
            yield streamToken.markAsUsed();
        });
    }
    /**
     * Revoke all stream tokens for a user
     */
    static revokeUserStreamTokens(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            return models_1.StreamToken.revokeUserTokens(userId);
        });
    }
    /**
     * Get user's active stream tokens
     */
    static getUserActiveTokens(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            return models_1.StreamToken.findAll({
                where: {
                    user_id: userId,
                    used: false,
                    expires_at: {
                        [sequelize_1.Op.gt]: new Date(),
                    },
                },
                order: [['created_at', 'DESC']],
            });
        });
    }
    /**
     * Cleanup expired tokens (should be run periodically)
     */
    static cleanupExpiredTokens() {
        return __awaiter(this, void 0, void 0, function* () {
            return models_1.StreamToken.cleanupExpiredTokens();
        });
    }
    /**
     * Extract client information from request
     */
    static extractClientInfo(req) {
        const ipAddress = req.headers['x-forwarded-for'] ||
            req.headers['x-real-ip'] ||
            req.connection.remoteAddress ||
            req.socket.remoteAddress ||
            'unknown';
        const userAgent = req.headers['user-agent'] || 'unknown';
        return {
            ipAddress: Array.isArray(ipAddress) ? ipAddress[0] : ipAddress,
            userAgent: Array.isArray(userAgent) ? userAgent[0] : userAgent,
        };
    }
    /**
     * Get stream token statistics for monitoring
     */
    static getTokenStatistics() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const [totalActive, totalExpired, totalUsed, rateLimitStats] = yield Promise.all([
                models_1.StreamToken.count({
                    where: {
                        used: false,
                        expires_at: {
                            [sequelize_1.Op.gt]: new Date(),
                        },
                    },
                }),
                models_1.StreamToken.count({
                    where: {
                        expires_at: {
                            [sequelize_1.Op.lt]: new Date(),
                        },
                    },
                }),
                models_1.StreamToken.count({
                    where: {
                        used: true,
                    },
                }),
                models_1.StreamToken.findAll({
                    attributes: [
                        [require('sequelize').fn('AVG', require('sequelize').col('rate_limit_count')), 'avgRateLimit'],
                    ],
                    raw: true,
                }),
            ]);
            return {
                totalActive,
                totalExpired,
                totalUsed,
                averageRateLimit: parseFloat(((_a = rateLimitStats[0]) === null || _a === void 0 ? void 0 : _a.avgRateLimit) || '0'),
            };
        });
    }
    /**
     * Validate token format
     */
    static isValidTokenFormat(token) {
        // Stream tokens should be 64 character hex strings
        return /^[a-f0-9]{64}$/i.test(token);
    }
}
exports.StreamTokenService = StreamTokenService;
// Rate limiting constants
StreamTokenService.MAX_TOKENS_PER_USER = 5;
StreamTokenService.MAX_RATE_LIMIT_COUNT = 100;
StreamTokenService.DEFAULT_EXPIRES_MINUTES = 30;
exports.default = StreamTokenService;
