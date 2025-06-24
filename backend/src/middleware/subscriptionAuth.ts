import { Request, Response, NextFunction } from 'express';
import SubscriptionService from '../services/subscriptionService';

/**
 * Middleware to check if user has required subscription level
 */
export const requireSubscription = (requiredTier: 'free' | 'pro') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      const userId = req.user.userId;
      const limits = await SubscriptionService.getUserSubscriptionLimits(userId);
      
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
    } catch (error) {
      console.error('Subscription check error:', error);
      res.status(500).json({
        error: 'Failed to verify subscription',
        code: 'SUBSCRIPTION_CHECK_FAILED'
      });
    }
  };
};

/**
 * Middleware to check specific feature access
 */
export const requireFeature = (feature: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      const userId = req.user.userId;
      const canAccess = await SubscriptionService.canUserPerformAction(userId, feature);
      
      if (!canAccess) {
        return res.status(403).json({
          error: `Feature '${feature}' requires a higher subscription tier`,
          code: 'FEATURE_ACCESS_DENIED',
          feature,
          upgradeUrl: '/subscription/plans'
        });
      }

      next();
    } catch (error) {
      console.error('Feature access check error:', error);
      res.status(500).json({
        error: 'Failed to verify feature access',
        code: 'FEATURE_CHECK_FAILED'
      });
    }
  };
};

/**
 * Middleware to check quality access
 */
export const requireQuality = (minQuality: string) => {
  const qualityLevels = ['720p', '1080p', '1440p', '2160p', 'best'];
  
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      const userId = req.user.userId;
      const limits = await SubscriptionService.getUserSubscriptionLimits(userId);
      
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
    } catch (error) {
      console.error('Quality access check error:', error);
      res.status(500).json({
        error: 'Failed to verify quality access',
        code: 'QUALITY_CHECK_FAILED'
      });
    }
  };
};

/**
 * Middleware to add subscription info to request
 */
export const addSubscriptionInfo = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.user) {
      const userId = req.user.userId;
      const [limits, activeSubscription] = await Promise.all([
        SubscriptionService.getUserSubscriptionLimits(userId),
        SubscriptionService.getUserActiveSubscription(userId)
      ]);
      
      req.subscriptionLimits = limits;
      req.activeSubscription = activeSubscription;
    }
    
    next();
  } catch (error) {
    console.error('Error adding subscription info:', error);
    // Don't fail the request, just continue without subscription info
    next();
  }
};

// Extend Request interface to include subscription info
declare global {
  namespace Express {
    interface Request {
      subscriptionLimits?: {
        maxDownloadsPerDay: number;
        maxConcurrentStreams: number;
        maxQuality: string;
        features: string[];
      };
      activeSubscription?: any;
    }
  }
}
