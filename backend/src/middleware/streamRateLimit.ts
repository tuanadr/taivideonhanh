import { Request, Response, NextFunction } from 'express';
import { StreamTokenService } from '../services/streamTokenService';
import { User } from '../models';

interface RateLimitConfig {
  maxTokensPerUser: number;
  maxTokensPerHour: number;
  maxTokensPerDay: number;
  windowSizeHours: number;
}

interface RateLimitInfo {
  tokensUsed: number;
  tokensRemaining: number;
  resetTime: Date;
  retryAfter?: number;
}

class StreamRateLimitService {
  private static readonly DEFAULT_CONFIG: RateLimitConfig = {
    maxTokensPerUser: 5,
    maxTokensPerHour: 20,
    maxTokensPerDay: 100,
    windowSizeHours: 1,
  };

  private static rateLimitStore = new Map<string, { count: number; resetTime: Date }>();

  /**
   * Check rate limits for stream token creation
   */
  public static async checkRateLimit(userId: string, config: Partial<RateLimitConfig> = {}): Promise<{
    allowed: boolean;
    info: RateLimitInfo;
  }> {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };
    const now = new Date();
    const windowStart = new Date(now.getTime() - finalConfig.windowSizeHours * 60 * 60 * 1000);

    // Get user's recent token creation count
    const recentTokensCount = await this.getUserRecentTokensCount(userId, windowStart);
    
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
  }

  /**
   * Get user's recent token creation count
   */
  private static async getUserRecentTokensCount(userId: string, since: Date): Promise<number> {
    const { StreamToken } = require('../models');
    return StreamToken.count({
      where: {
        user_id: userId,
        created_at: {
          [require('sequelize').Op.gte]: since,
        },
      },
    });
  }

  /**
   * Check subscription-based limits
   */
  public static async checkSubscriptionLimits(user: User): Promise<{
    allowed: boolean;
    maxTokens: number;
    reason?: string;
  }> {
    const now = new Date();
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Get daily token count
    const dailyTokensCount = await this.getUserRecentTokensCount(user.id, dayStart);

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
    const activeTokensCount = await require('../models').StreamToken.getUserActiveTokensCount(user.id);
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
  }

  /**
   * Clean up old rate limit entries
   */
  public static cleanupRateLimitStore(): void {
    const now = new Date();
    for (const [key, value] of this.rateLimitStore.entries()) {
      if (value.resetTime < now) {
        this.rateLimitStore.delete(key);
      }
    }
  }
}

/**
 * Middleware to enforce rate limits on stream token creation
 */
export const streamTokenRateLimit = (config: Partial<RateLimitConfig> = {}) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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
        const foundUser = await User.findByPk(req.user.userId);
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
      const subscriptionCheck = await StreamRateLimitService.checkSubscriptionLimits(user);
      if (!subscriptionCheck.allowed) {
        res.status(429).json({
          error: subscriptionCheck.reason,
          code: 'SUBSCRIPTION_LIMIT_EXCEEDED',
          maxTokens: subscriptionCheck.maxTokens,
        });
        return;
      }

      // Check rate limits
      const rateLimitCheck = await StreamRateLimitService.checkRateLimit(user.id, config);
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
        'X-RateLimit-Limit': config.maxTokensPerHour?.toString() || '20',
        'X-RateLimit-Remaining': rateLimitCheck.info.tokensRemaining.toString(),
        'X-RateLimit-Reset': Math.ceil(rateLimitCheck.info.resetTime.getTime() / 1000).toString(),
      });

      next();
    } catch (error) {
      console.error('Stream rate limit middleware error:', error);
      res.status(500).json({
        error: 'Internal server error',
        code: 'RATE_LIMIT_ERROR'
      });
    }
  };
};

/**
 * Middleware to validate stream token for streaming access
 */
export const validateStreamToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = req.params.token || req.query.token as string;

    if (!token) {
      res.status(400).json({
        error: 'Stream token required',
        code: 'TOKEN_MISSING'
      });
      return;
    }

    // Validate token format
    if (!StreamTokenService.isValidTokenFormat(token)) {
      res.status(400).json({
        error: 'Invalid token format',
        code: 'INVALID_TOKEN_FORMAT'
      });
      return;
    }

    // Extract client info
    const clientInfo = StreamTokenService.extractClientInfo(req);

    // Validate token
    const validation = await StreamTokenService.validateStreamToken({
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
  } catch (error) {
    console.error('Stream token validation error:', error);
    res.status(500).json({
      error: 'Token validation failed',
      code: 'TOKEN_VALIDATION_ERROR'
    });
  }
};

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      streamToken?: import('../models/StreamToken').StreamToken;
    }
  }
}

export { StreamRateLimitService };
export default { streamTokenRateLimit, validateStreamToken, StreamRateLimitService };
