import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Admin } from '../models';

interface AdminJwtPayload {
  adminId: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

declare global {
  namespace Express {
    interface Request {
      admin?: {
        adminId: string;
        email: string;
        role: string;
        permissions: string[];
      };
    }
  }
}

/**
 * Middleware to authenticate admin users
 */
export const authenticateAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Admin authentication required',
        code: 'ADMIN_AUTH_REQUIRED'
      });
    }

    const token = authHeader.substring(7);
    const jwtSecret = process.env.JWT_SECRET;
    
    if (!jwtSecret) {
      return res.status(500).json({
        error: 'JWT secret not configured',
        code: 'JWT_SECRET_MISSING'
      });
    }

    const decoded = jwt.verify(token, jwtSecret) as AdminJwtPayload;
    
    // Verify admin still exists and is active
    const admin = await Admin.findOne({
      where: {
        id: decoded.adminId,
        is_active: true,
      },
    });

    if (!admin) {
      return res.status(401).json({
        error: 'Admin account not found or inactive',
        code: 'ADMIN_NOT_FOUND'
      });
    }

    // Add admin info to request
    req.admin = {
      adminId: admin.id,
      email: admin.email,
      role: admin.role,
      permissions: admin.permissions,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        error: 'Invalid admin token',
        code: 'INVALID_ADMIN_TOKEN'
      });
    }

    console.error('Admin authentication error:', error);
    res.status(500).json({
      error: 'Admin authentication failed',
      code: 'ADMIN_AUTH_FAILED'
    });
  }
};

/**
 * Middleware to check admin role
 */
export const requireAdminRole = (requiredRole: 'super_admin' | 'admin' | 'moderator') => {
  const roleHierarchy = {
    'super_admin': 3,
    'admin': 2,
    'moderator': 1,
  };

  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.admin) {
      return res.status(401).json({
        error: 'Admin authentication required',
        code: 'ADMIN_AUTH_REQUIRED'
      });
    }

    const userRoleLevel = roleHierarchy[req.admin.role as keyof typeof roleHierarchy] || 0;
    const requiredRoleLevel = roleHierarchy[requiredRole];

    if (userRoleLevel < requiredRoleLevel) {
      return res.status(403).json({
        error: `Admin role '${requiredRole}' required`,
        code: 'INSUFFICIENT_ADMIN_ROLE',
        currentRole: req.admin.role,
        requiredRole,
      });
    }

    next();
  };
};

/**
 * Middleware to check admin permission
 */
export const requireAdminPermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.admin) {
      return res.status(401).json({
        error: 'Admin authentication required',
        code: 'ADMIN_AUTH_REQUIRED'
      });
    }

    // Super admin has all permissions
    if (req.admin.role === 'super_admin') {
      return next();
    }

    if (!req.admin.permissions.includes(permission)) {
      return res.status(403).json({
        error: `Admin permission '${permission}' required`,
        code: 'INSUFFICIENT_ADMIN_PERMISSION',
        permission,
        userPermissions: req.admin.permissions,
      });
    }

    next();
  };
};

/**
 * Generate admin JWT token
 */
export const generateAdminToken = (admin: any): string => {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT secret not configured');
  }

  return jwt.sign(
    {
      adminId: admin.id,
      email: admin.email,
      role: admin.role,
    },
    jwtSecret,
    { expiresIn: '8h' }
  );
};
