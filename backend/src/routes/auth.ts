import { Router, Request, Response } from 'express';
import AuthService, { RegisterData, LoginData } from '../services/authService';
import { authenticate, authenticateWithUser } from '../middleware/auth';
import { body, validationResult } from 'express-validator';

const router = Router();

/**
 * Validation middleware
 */
const validateRequest = (req: Request, res: Response, next: Function) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

/**
 * Register validation rules
 */
const registerValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/(?=.*[a-z])/)
    .withMessage('Password must contain at least one lowercase letter')
    .matches(/(?=.*[A-Z])/)
    .withMessage('Password must contain at least one uppercase letter')
    .matches(/(?=.*\d)/)
    .withMessage('Password must contain at least one number')
    .matches(/(?=.*[@$!%*?&])/)
    .withMessage('Password must contain at least one special character'),
];

/**
 * Login validation rules
 */
const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', registerValidation, validateRequest, async (req: Request, res: Response) => {
  try {
    const registerData: RegisterData = {
      email: req.body.email,
      password: req.body.password,
    };

    const result = await AuthService.register(registerData);

    res.status(201).json({
      message: 'User registered successfully',
      user: result.user,
      tokens: result.tokens,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Registration failed';
    
    let statusCode = 400;
    if (errorMessage.includes('already exists')) {
      statusCode = 409; // Conflict
    }

    res.status(statusCode).json({
      error: errorMessage,
      code: 'REGISTRATION_FAILED'
    });
  }
});

/**
 * POST /api/auth/login
 * Login user
 */
router.post('/login', loginValidation, validateRequest, async (req: Request, res: Response) => {
  try {
    const loginData: LoginData = {
      email: req.body.email,
      password: req.body.password,
    };

    const result = await AuthService.login(loginData);

    res.json({
      message: 'Login successful',
      user: result.user,
      tokens: result.tokens,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Login failed';
    
    res.status(401).json({
      error: errorMessage,
      code: 'LOGIN_FAILED'
    });
  }
});

/**
 * POST /api/auth/refresh
 * Refresh access token
 */
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        error: 'Refresh token is required',
        code: 'REFRESH_TOKEN_MISSING'
      });
    }

    const result = await AuthService.refreshToken(refreshToken);

    res.json({
      message: 'Token refreshed successfully',
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Token refresh failed';
    
    res.status(401).json({
      error: errorMessage,
      code: 'TOKEN_REFRESH_FAILED'
    });
  }
});

/**
 * POST /api/auth/logout
 * Logout user (revoke refresh token)
 */
router.post('/logout', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      await AuthService.logout(refreshToken);
    }

    res.json({
      message: 'Logout successful'
    });
  } catch (error) {
    // Even if logout fails, we return success to the client
    res.json({
      message: 'Logout successful'
    });
  }
});

/**
 * POST /api/auth/logout-all
 * Logout from all devices
 */
router.post('/logout-all', authenticate, async (req: Request, res: Response) => {
  try {
    await AuthService.logoutAll(req.user!.userId);

    res.json({
      message: 'Logged out from all devices'
    });
  } catch (error) {
    res.status(500).json({
      error: 'Logout from all devices failed',
      code: 'LOGOUT_ALL_FAILED'
    });
  }
});

/**
 * GET /api/auth/profile
 * Get user profile
 */
router.get('/profile', authenticateWithUser, async (req: Request, res: Response) => {
  try {
    const profile = await AuthService.getProfile(req.user!.userId);

    res.json({
      user: profile
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to get profile';
    
    res.status(404).json({
      error: errorMessage,
      code: 'PROFILE_NOT_FOUND'
    });
  }
});

/**
 * PUT /api/auth/profile
 * Update user profile
 */
router.put('/profile', authenticateWithUser, [
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
], validateRequest, async (req: Request, res: Response) => {
  try {
    const updateData = {
      email: req.body.email,
    };

    const updatedProfile = await AuthService.updateProfile(req.user!.userId, updateData);

    res.json({
      message: 'Profile updated successfully',
      user: updatedProfile
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Profile update failed';
    
    let statusCode = 400;
    if (errorMessage.includes('already in use')) {
      statusCode = 409;
    }

    res.status(statusCode).json({
      error: errorMessage,
      code: 'PROFILE_UPDATE_FAILED'
    });
  }
});

/**
 * PUT /api/auth/change-password
 * Change user password
 */
router.put('/change-password', authenticateWithUser, [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long')
    .matches(/(?=.*[a-z])/)
    .withMessage('New password must contain at least one lowercase letter')
    .matches(/(?=.*[A-Z])/)
    .withMessage('New password must contain at least one uppercase letter')
    .matches(/(?=.*\d)/)
    .withMessage('New password must contain at least one number')
    .matches(/(?=.*[@$!%*?&])/)
    .withMessage('New password must contain at least one special character'),
], validateRequest, async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;

    await AuthService.changePassword(req.user!.userId, currentPassword, newPassword);

    res.json({
      message: 'Password changed successfully'
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Password change failed';
    
    let statusCode = 400;
    if (errorMessage.includes('incorrect')) {
      statusCode = 401;
    }

    res.status(statusCode).json({
      error: errorMessage,
      code: 'PASSWORD_CHANGE_FAILED'
    });
  }
});

/**
 * GET /api/auth/verify
 * Verify token validity
 */
router.get('/verify', authenticate, (req: Request, res: Response) => {
  res.json({
    valid: true,
    user: req.user
  });
});

export default router;
