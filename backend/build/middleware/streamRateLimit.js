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
exports.StreamRateLimitService = exports.validateStreamToken = exports.streamTokenRateLimit = void 0;
const streamTokenService_1 = require("../services/streamTokenService");
const models_1 = require("../models");
const sequelize_1 = require("sequelize");
class StreamRateLimitService {
    /**
     * Check rate limits for stream token creation
     */
    static checkRateLimit(userId_1) {
        return __awaiter(this, arguments, void 0, function* (userId, config = {}) {
            const finalConfig = Object.assign(Object.assign({}, this.DEFAULT_CONFIG), config);
            const now = new Date();
            const windowStart = new Date(now.getTime() - finalConfig.windowSizeHours * 60 * 60 * 1000);
            // Get user's recent token creation count
            const recentTokensCount = yield this.getUserRecentTokensCount(userId, windowStart);
            // Check hourly limit
            const tokensRemaining = Math.max(0, finalConfig.maxTokensPerHour - recentTokensCount);
            const resetTime = new Date(now.getTime() + finalConfig.windowSizeHours * 60 * 60 * 1000);
            const allowed = recentTokensCount < finalConfig.maxTokensPerHour;
            const retryAfter = allowed ? undefined : Math.ceil((resetTime.getTime() - now.getTime()) / 1000);
            return {
                allowed,
                info: {
                    tokensUsed: recentTokensCount,
                    tokensRemaining,
                    resetTime,
                    retryAfter,
                },
            };
        });
    }
    /**
     * Get user's recent token creation count
     */
    static getUserRecentTokensCount(userId, since) {
        return __awaiter(this, void 0, void 0, function* () {
            const { StreamToken } = require('../models');
            return StreamToken.count({
                where: {
                    user_id: userId,
                    created_at: {
                        [sequelize_1.Op.gte]: since,
                    },
                },
            });
        });
    }
    /**
     * Check subscription-based limits
     */
    static checkSubscriptionLimits(user) {
        return __awaiter(this, void 0, void 0, function* () {
            const now = new Date();
            const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            // Get daily token count
            const dailyTokensCount = yield this.getUserRecentTokensCount(user.id, dayStart);
            // Define limits based on subscription tier
            const limits = {
                free: { maxDaily: 10, maxConcurrent: 2 },
                pro: { maxDaily: 100, maxConcurrent: 5 },
            };
            const userLimits = limits[user.subscription_tier];
            // Check daily limit
            if (dailyTokensCount >= userLimits.maxDaily) {
                return {
                    allowed: false,
                    maxTokens: userLimits.maxDaily,
                    reason: `Daily limit of ${userLimits.maxDaily} stream tokens exceeded`,
                };
            }
            // Check concurrent limit
            const activeTokensCount = yield require('../models').StreamToken.getUserActiveTokensCount(user.id);
            if (activeTokensCount >= userLimits.maxConcurrent) {
                return {
                    allowed: false,
                    maxTokens: userLimits.maxConcurrent,
                    reason: `Concurrent limit of ${userLimits.maxConcurrent} active stream tokens exceeded`,
                };
            }
            return {
                allowed: true,
                maxTokens: userLimits.maxDaily,
            };
        });
    }
    /**
     * Clean up old rate limit entries
     */
    static cleanupRateLimitStore() {
        const now = new Date();
        for (const [key, value] of this.rateLimitStore.entries()) {
            if (value.resetTime < now) {
                this.rateLimitStore.delete(key);
            }
        }
    }
}
exports.StreamRateLimitService = StreamRateLimitService;
StreamRateLimitService.DEFAULT_CONFIG = {
    maxTokensPerUser: 5,
    maxTokensPerHour: 20,
    maxTokensPerDay: 100,
    windowSizeHours: 1,
};
StreamRateLimitService.rateLimitStore = new Map();
/**
 * Middleware to enforce rate limits on stream token creation
 */
const streamTokenRateLimit = (config = {}) => {
    return (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        try {
            // Ensure user is authenticated
            if (!req.user) {
                res.status(401).json({
                    error: 'Authentication required',
                    code: 'AUTH_REQUIRED'
                });
                return;
            }
            // Load user record if not already loaded
            let user = req.userRecord;
            if (!user) {
                const foundUser = yield models_1.User.findByPk(req.user.userId);
                if (!foundUser) {
                    res.status(401).json({
                        error: 'User not found',
                        code: 'USER_NOT_FOUND'
                    });
                    return;
                }
                user = foundUser;
            }
            // Check subscription-based limits
            const subscriptionCheck = yield StreamRateLimitService.checkSubscriptionLimits(user);
            if (!subscriptionCheck.allowed) {
                res.status(429).json({
                    error: subscriptionCheck.reason,
                    code: 'SUBSCRIPTION_LIMIT_EXCEEDED',
                    maxTokens: subscriptionCheck.maxTokens,
                });
                return;
            }
            // Check rate limits
            const rateLimitCheck = yield StreamRateLimitService.checkRateLimit(user.id, config);
            if (!rateLimitCheck.allowed) {
                res.status(429).json({
                    error: 'Rate limit exceeded',
                    code: 'RATE_LIMIT_EXCEEDED',
                    rateLimitInfo: rateLimitCheck.info,
                });
                return;
            }
            // Add rate limit info to response headers
            res.set({
                'X-RateLimit-Limit': ((_a = config.maxTokensPerHour) === null || _a === void 0 ? void 0 : _a.toString()) || '20',
                'X-RateLimit-Remaining': rateLimitCheck.info.tokensRemaining.toString(),
                'X-RateLimit-Reset': Math.ceil(rateLimitCheck.info.resetTime.getTime() / 1000).toString(),
            });
            next();
        }
        catch (error) {
            console.error('Stream rate limit middleware error:', error);
            res.status(500).json({
                error: 'Internal server error',
                code: 'RATE_LIMIT_ERROR'
            });
        }
    });
};
exports.streamTokenRateLimit = streamTokenRateLimit;
/**
 * Middleware to validate stream token for streaming access
 */
const validateStreamToken = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const token = req.params.token || req.query.token;
        if (!token) {
            res.status(400).json({
                error: 'Stream token required',
                code: 'TOKEN_MISSING'
            });
            return;
        }
        // Validate token format
        if (!streamTokenService_1.StreamTokenService.isValidTokenFormat(token)) {
            res.status(400).json({
                error: 'Invalid token format',
                code: 'INVALID_TOKEN_FORMAT'
            });
            return;
        }
        // Extract client info
        const clientInfo = streamTokenService_1.StreamTokenService.extractClientInfo(req);
        // Validate token
        const validation = yield streamTokenService_1.StreamTokenService.validateStreamToken({
            token,
            ipAddress: clientInfo.ipAddress,
            userAgent: clientInfo.userAgent,
        });
        if (!validation.isValid) {
            res.status(401).json({
                error: validation.error,
                code: 'TOKEN_VALIDATION_FAILED'
            });
            return;
        }
        // Add stream token to request
        req.streamToken = validation.streamToken;
        next();
    }
    catch (error) {
        console.error('Stream token validation error:', error);
        res.status(500).json({
            error: 'Token validation failed',
            code: 'TOKEN_VALIDATION_ERROR'
        });
    }
});
exports.validateStreamToken = validateStreamToken;
exports.default = { streamTokenRateLimit: exports.streamTokenRateLimit, validateStreamToken: exports.validateStreamToken, StreamRateLimitService };
