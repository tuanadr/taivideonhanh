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
exports.rateLimitByTier = exports.requireAdmin = exports.requireSubscription = exports.optionalAuthenticate = exports.authenticateWithUser = exports.authenticate = void 0;
const jwt_1 = __importDefault(require("../utils/jwt"));
const models_1 = require("../models");
/**
 * Authentication middleware - verifies JWT token
 */
const authenticate = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Extract token from Authorization header
        const token = jwt_1.default.extractTokenFromHeader(req.headers.authorization);
        if (!token) {
            res.status(401).json({
                error: 'Access token required',
                code: 'TOKEN_MISSING'
            });
            return;
        }
        // Verify token
        const payload = jwt_1.default.verifyAccessToken(token);
        // Attach user payload to request
        req.user = payload;
        next();
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
        let statusCode = 401;
        let errorCode = 'AUTH_FAILED';
        if (errorMessage.includes('expired')) {
            errorCode = 'TOKEN_EXPIRED';
        }
        else if (errorMessage.includes('invalid')) {
            errorCode = 'TOKEN_INVALID';
        }
        res.status(statusCode).json({
            error: errorMessage,
            code: errorCode
        });
    }
});
exports.authenticate = authenticate;
/**
 * Authentication middleware with user record loading
 */
const authenticateWithUser = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // First run basic authentication
        const token = jwt_1.default.extractTokenFromHeader(req.headers.authorization);
        if (!token) {
            res.status(401).json({
                error: 'Access token required',
                code: 'TOKEN_MISSING'
            });
            return;
        }
        // Verify token
        const payload = jwt_1.default.verifyAccessToken(token);
        // Load user record from database
        const user = yield models_1.User.findByPk(payload.userId);
        if (!user) {
            res.status(401).json({
                error: 'User not found',
                code: 'USER_NOT_FOUND'
            });
            return;
        }
        // Attach both payload and user record to request
        req.user = payload;
        req.userRecord = user;
        next();
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
        let statusCode = 401;
        let errorCode = 'AUTH_FAILED';
        if (errorMessage.includes('expired')) {
            errorCode = 'TOKEN_EXPIRED';
        }
        else if (errorMessage.includes('invalid')) {
            errorCode = 'TOKEN_INVALID';
        }
        res.status(statusCode).json({
            error: errorMessage,
            code: errorCode
        });
    }
});
exports.authenticateWithUser = authenticateWithUser;
/**
 * Optional authentication middleware - doesn't fail if no token
 */
const optionalAuthenticate = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const token = jwt_1.default.extractTokenFromHeader(req.headers.authorization);
        if (token) {
            try {
                const payload = jwt_1.default.verifyAccessToken(token);
                req.user = payload;
            }
            catch (error) {
                // Ignore token errors for optional auth
                console.warn('Optional auth token verification failed:', error);
            }
        }
        next();
    }
    catch (error) {
        // For optional auth, we continue even if there's an error
        next();
    }
});
exports.optionalAuthenticate = optionalAuthenticate;
/**
 * Authorization middleware - checks subscription tier
 */
const requireSubscription = (requiredTier) => {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({
                error: 'Authentication required',
                code: 'AUTH_REQUIRED'
            });
            return;
        }
        const userTier = req.user.subscription_tier;
        // Define tier hierarchy
        const tierHierarchy = { free: 0, pro: 1 };
        if (tierHierarchy[userTier] < tierHierarchy[requiredTier]) {
            res.status(403).json({
                error: `${requiredTier} subscription required`,
                code: 'SUBSCRIPTION_REQUIRED',
                required_tier: requiredTier,
                current_tier: userTier
            });
            return;
        }
        next();
    };
};
exports.requireSubscription = requireSubscription;
/**
 * Admin authorization middleware
 */
const requireAdmin = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.user) {
            res.status(401).json({
                error: 'Authentication required',
                code: 'AUTH_REQUIRED'
            });
            return;
        }
        // Load user record to check admin status
        const user = yield models_1.User.findByPk(req.user.userId);
        if (!user) {
            res.status(401).json({
                error: 'User not found',
                code: 'USER_NOT_FOUND'
            });
            return;
        }
        // For now, we'll use email-based admin check
        // In production, you might want a separate admin role field
        const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(email => email.trim());
        if (!adminEmails.includes(user.email)) {
            res.status(403).json({
                error: 'Admin access required',
                code: 'ADMIN_REQUIRED'
            });
            return;
        }
        req.userRecord = user;
        next();
    }
    catch (error) {
        res.status(500).json({
            error: 'Authorization check failed',
            code: 'AUTH_CHECK_FAILED'
        });
    }
});
exports.requireAdmin = requireAdmin;
/**
 * Rate limiting middleware (basic implementation)
 */
const rateLimitByTier = () => {
    const requestCounts = new Map();
    return (req, res, next) => {
        if (!req.user) {
            next();
            return;
        }
        const userId = req.user.userId;
        const tier = req.user.subscription_tier;
        const now = Date.now();
        const windowMs = 60 * 1000; // 1 minute window
        // Define limits per tier
        const limits = {
            free: 10, // 10 requests per minute
            pro: 100 // 100 requests per minute
        };
        const limit = limits[tier];
        const userKey = `${userId}:${Math.floor(now / windowMs)}`;
        const current = requestCounts.get(userKey) || { count: 0, resetTime: now + windowMs };
        if (current.count >= limit) {
            res.status(429).json({
                error: 'Rate limit exceeded',
                code: 'RATE_LIMIT_EXCEEDED',
                limit,
                reset_time: current.resetTime
            });
            return;
        }
        current.count++;
        requestCounts.set(userKey, current);
        // Cleanup old entries
        if (Math.random() < 0.01) { // 1% chance to cleanup
            for (const [key, value] of requestCounts.entries()) {
                if (value.resetTime < now) {
                    requestCounts.delete(key);
                }
            }
        }
        next();
    };
};
exports.rateLimitByTier = rateLimitByTier;
