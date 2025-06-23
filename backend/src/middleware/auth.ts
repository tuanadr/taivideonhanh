import { Request, Response, NextFunction } from 'express';
import JWTService, { JWTPayload } from '../utils/jwt';
import { User } from '../models';

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
      userRecord?: User;
    }
  }
}

/**
 * Authentication middleware - verifies JWT token
 */
export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Extract token from Authorization header
    const token = JWTService.extractTokenFromHeader(req.headers.authorization);
    
    if (!token) {
      res.status(401).json({
        error: 'Access token required',
        code: 'TOKEN_MISSING'
      });
      return;
    }

    // Verify token
    const payload = JWTService.verifyAccessToken(token);
    
    // Attach user payload to request
    req.user = payload;
    
    next();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
    
    let statusCode = 401;
    let errorCode = 'AUTH_FAILED';
    
    if (errorMessage.includes('expired')) {
      errorCode = 'TOKEN_EXPIRED';
    } else if (errorMessage.includes('invalid')) {
      errorCode = 'TOKEN_INVALID';
    }
    
    res.status(statusCode).json({
      error: errorMessage,
      code: errorCode
    });
  }
};

/**
 * Authentication middleware with user record loading
 */
export const authenticateWithUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // First run basic authentication
    const token = JWTService.extractTokenFromHeader(req.headers.authorization);
    
    if (!token) {
      res.status(401).json({
        error: 'Access token required',
        code: 'TOKEN_MISSING'
      });
      return;
    }

    // Verify token
    const payload = JWTService.verifyAccessToken(token);
    
    // Load user record from database
    const user = await User.findByPk(payload.userId);
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
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
    
    let statusCode = 401;
    let errorCode = 'AUTH_FAILED';
    
    if (errorMessage.includes('expired')) {
      errorCode = 'TOKEN_EXPIRED';
    } else if (errorMessage.includes('invalid')) {
      errorCode = 'TOKEN_INVALID';
    }
    
    res.status(statusCode).json({
      error: errorMessage,
      code: errorCode
    });
  }
};

/**
 * Optional authentication middleware - doesn't fail if no token
 */
export const optionalAuthenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = JWTService.extractTokenFromHeader(req.headers.authorization);
    
    if (token) {
      try {
        const payload = JWTService.verifyAccessToken(token);
        req.user = payload;
      } catch (error) {
        // Ignore token errors for optional auth
        console.warn('Optional auth token verification failed:', error);
      }
    }
    
    next();
  } catch (error) {
    // For optional auth, we continue even if there's an error
    next();
  }
};

/**
 * Authorization middleware - checks subscription tier
 */
export const requireSubscription = (requiredTier: 'free' | 'pro') => {
  return (req: Request, res: Response, next: NextFunction): void => {
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

/**
 * Admin authorization middleware
 */
export const requireAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
      return;
    }

    // Load user record to check admin status
    const user = await User.findByPk(req.user.userId);
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
  } catch (error) {
    res.status(500).json({
      error: 'Authorization check failed',
      code: 'AUTH_CHECK_FAILED'
    });
  }
};

/**
 * Rate limiting middleware (basic implementation)
 */
export const rateLimitByTier = () => {
  const requestCounts = new Map<string, { count: number; resetTime: number }>();
  
  return (req: Request, res: Response, next: NextFunction): void => {
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
      free: 10,  // 10 requests per minute
      pro: 100   // 100 requests per minute
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
