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
exports.addSubscriptionInfo = exports.requireQuality = exports.requireFeature = exports.requireSubscription = void 0;
const subscriptionService_1 = __importDefault(require("../services/subscriptionService"));
/**
 * Middleware to check if user has required subscription level
 */
const requireSubscription = (requiredTier) => {
    return (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            if (!req.user) {
                return res.status(401).json({
                    error: 'Authentication required',
                    code: 'AUTH_REQUIRED'
                });
            }
            const userId = req.user.userId;
            const limits = yield subscriptionService_1.default.getUserSubscriptionLimits(userId);
            // Check if user meets the required tier
            if (requiredTier === 'pro') {
                const canAccessPro = limits.features.includes('hd_download') ||
                    limits.features.includes('ad_free') ||
                    limits.maxQuality === 'best';
                if (!canAccessPro) {
                    return res.status(403).json({
                        error: 'Pro subscription required for this feature',
                        code: 'PRO_SUBSCRIPTION_REQUIRED',
                        upgradeUrl: '/subscription/plans'
                    });
                }
            }
            // Add limits to request for use in route handlers
            req.subscriptionLimits = limits;
            next();
        }
        catch (error) {
            console.error('Subscription check error:', error);
            res.status(500).json({
                error: 'Failed to verify subscription',
                code: 'SUBSCRIPTION_CHECK_FAILED'
            });
        }
    });
};
exports.requireSubscription = requireSubscription;
/**
 * Middleware to check specific feature access
 */
const requireFeature = (feature) => {
    return (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            if (!req.user) {
                return res.status(401).json({
                    error: 'Authentication required',
                    code: 'AUTH_REQUIRED'
                });
            }
            const userId = req.user.userId;
            const canAccess = yield subscriptionService_1.default.canUserPerformAction(userId, feature);
            if (!canAccess) {
                return res.status(403).json({
                    error: `Feature '${feature}' requires a higher subscription tier`,
                    code: 'FEATURE_ACCESS_DENIED',
                    feature,
                    upgradeUrl: '/subscription/plans'
                });
            }
            next();
        }
        catch (error) {
            console.error('Feature access check error:', error);
            res.status(500).json({
                error: 'Failed to verify feature access',
                code: 'FEATURE_CHECK_FAILED'
            });
        }
    });
};
exports.requireFeature = requireFeature;
/**
 * Middleware to check quality access
 */
const requireQuality = (minQuality) => {
    const qualityLevels = ['720p', '1080p', '1440p', '2160p', 'best'];
    return (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            if (!req.user) {
                return res.status(401).json({
                    error: 'Authentication required',
                    code: 'AUTH_REQUIRED'
                });
            }
            const userId = req.user.userId;
            const limits = yield subscriptionService_1.default.getUserSubscriptionLimits(userId);
            const userQualityIndex = qualityLevels.indexOf(limits.maxQuality);
            const requiredQualityIndex = qualityLevels.indexOf(minQuality);
            if (userQualityIndex < requiredQualityIndex) {
                return res.status(403).json({
                    error: `Quality '${minQuality}' requires a higher subscription tier`,
                    code: 'QUALITY_ACCESS_DENIED',
                    currentMaxQuality: limits.maxQuality,
                    requiredQuality: minQuality,
                    upgradeUrl: '/subscription/plans'
                });
            }
            next();
        }
        catch (error) {
            console.error('Quality access check error:', error);
            res.status(500).json({
                error: 'Failed to verify quality access',
                code: 'QUALITY_CHECK_FAILED'
            });
        }
    });
};
exports.requireQuality = requireQuality;
/**
 * Middleware to add subscription info to request
 */
const addSubscriptionInfo = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (req.user) {
            const userId = req.user.userId;
            const [limits, activeSubscription] = yield Promise.all([
                subscriptionService_1.default.getUserSubscriptionLimits(userId),
                subscriptionService_1.default.getUserActiveSubscription(userId)
            ]);
            req.subscriptionLimits = limits;
            req.activeSubscription = activeSubscription;
        }
        next();
    }
    catch (error) {
        console.error('Error adding subscription info:', error);
        // Don't fail the request, just continue without subscription info
        next();
    }
});
exports.addSubscriptionInfo = addSubscriptionInfo;
