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
const express_1 = require("express");
const authService_1 = __importDefault(require("../services/authService"));
const auth_1 = require("../middleware/auth");
const express_validator_1 = require("express-validator");
const router = (0, express_1.Router)();
/**
 * Validation middleware
 */
const validateRequest = (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
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
    (0, express_validator_1.body)('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Valid email is required'),
    (0, express_validator_1.body)('password')
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
    (0, express_validator_1.body)('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Valid email is required'),
    (0, express_validator_1.body)('password')
        .notEmpty()
        .withMessage('Password is required'),
];
/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', registerValidation, validateRequest, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const registerData = {
            email: req.body.email,
            password: req.body.password,
        };
        const result = yield authService_1.default.register(registerData);
        res.status(201).json({
            message: 'User registered successfully',
            user: result.user,
            tokens: result.tokens,
        });
    }
    catch (error) {
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
}));
/**
 * POST /api/auth/login
 * Login user
 */
router.post('/login', loginValidation, validateRequest, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const loginData = {
            email: req.body.email,
            password: req.body.password,
        };
        const result = yield authService_1.default.login(loginData);
        res.json({
            message: 'Login successful',
            user: result.user,
            tokens: result.tokens,
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Login failed';
        res.status(401).json({
            error: errorMessage,
            code: 'LOGIN_FAILED'
        });
    }
}));
/**
 * POST /api/auth/refresh
 * Refresh access token
 */
router.post('/refresh', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(400).json({
                error: 'Refresh token is required',
                code: 'REFRESH_TOKEN_MISSING'
            });
        }
        const result = yield authService_1.default.refreshToken(refreshToken);
        res.json({
            message: 'Token refreshed successfully',
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Token refresh failed';
        res.status(401).json({
            error: errorMessage,
            code: 'TOKEN_REFRESH_FAILED'
        });
    }
}));
/**
 * POST /api/auth/logout
 * Logout user (revoke refresh token)
 */
router.post('/logout', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { refreshToken } = req.body;
        if (refreshToken) {
            yield authService_1.default.logout(refreshToken);
        }
        res.json({
            message: 'Logout successful'
        });
    }
    catch (error) {
        // Even if logout fails, we return success to the client
        res.json({
            message: 'Logout successful'
        });
    }
}));
/**
 * POST /api/auth/logout-all
 * Logout from all devices
 */
router.post('/logout-all', auth_1.authenticate, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield authService_1.default.logoutAll(req.user.userId);
        res.json({
            message: 'Logged out from all devices'
        });
    }
    catch (error) {
        res.status(500).json({
            error: 'Logout from all devices failed',
            code: 'LOGOUT_ALL_FAILED'
        });
    }
}));
/**
 * GET /api/auth/profile
 * Get user profile
 */
router.get('/profile', auth_1.authenticateWithUser, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const profile = yield authService_1.default.getProfile(req.user.userId);
        res.json({
            user: profile
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to get profile';
        res.status(404).json({
            error: errorMessage,
            code: 'PROFILE_NOT_FOUND'
        });
    }
}));
/**
 * PUT /api/auth/profile
 * Update user profile
 */
router.put('/profile', auth_1.authenticateWithUser, [
    (0, express_validator_1.body)('email')
        .optional()
        .isEmail()
        .normalizeEmail()
        .withMessage('Valid email is required'),
], validateRequest, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const updateData = {
            email: req.body.email,
        };
        const updatedProfile = yield authService_1.default.updateProfile(req.user.userId, updateData);
        res.json({
            message: 'Profile updated successfully',
            user: updatedProfile
        });
    }
    catch (error) {
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
}));
/**
 * PUT /api/auth/change-password
 * Change user password
 */
router.put('/change-password', auth_1.authenticateWithUser, [
    (0, express_validator_1.body)('currentPassword')
        .notEmpty()
        .withMessage('Current password is required'),
    (0, express_validator_1.body)('newPassword')
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
], validateRequest, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { currentPassword, newPassword } = req.body;
        yield authService_1.default.changePassword(req.user.userId, currentPassword, newPassword);
        res.json({
            message: 'Password changed successfully'
        });
    }
    catch (error) {
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
}));
/**
 * GET /api/auth/verify
 * Verify token validity
 */
router.get('/verify', auth_1.authenticate, (req, res) => {
    res.json({
        valid: true,
        user: req.user
    });
});
exports.default = router;
