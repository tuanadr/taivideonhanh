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
const models_1 = require("../models");
const jwt_1 = __importDefault(require("../utils/jwt"));
class AuthService {
    /**
     * Register a new user
     */
    static register(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const { email, password } = data;
            // Check if user already exists
            const existingUser = yield models_1.User.findByEmail(email);
            if (existingUser) {
                throw new Error('User with this email already exists');
            }
            // Validate password strength
            this.validatePassword(password);
            // Hash password
            const password_hash = yield models_1.User.hashPassword(password);
            // Create user
            const userData = {
                email,
                password_hash,
            };
            const user = yield models_1.User.create(userData);
            // Generate tokens
            const tokens = jwt_1.default.generateTokenPair(user);
            // Store refresh token in database
            const { token: refreshTokenString } = yield models_1.RefreshToken.createRefreshToken(user.id);
            return {
                user: user.toJSON(),
                tokens: {
                    accessToken: tokens.accessToken,
                    refreshToken: refreshTokenString,
                },
            };
        });
    }
    /**
     * Login user
     */
    static login(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const { email, password } = data;
            // Find user by email
            const user = yield models_1.User.findByEmail(email);
            if (!user) {
                throw new Error('Invalid email or password');
            }
            // Validate password
            const isValidPassword = yield user.validatePassword(password);
            if (!isValidPassword) {
                throw new Error('Invalid email or password');
            }
            // Update last login
            user.last_login = new Date();
            yield user.save();
            // Revoke existing refresh tokens (optional - for single session)
            // await RefreshToken.revokeAllUserTokens(user.id);
            // Generate tokens
            const tokens = jwt_1.default.generateTokenPair(user);
            // Store refresh token in database
            const { token: refreshTokenString } = yield models_1.RefreshToken.createRefreshToken(user.id);
            return {
                user: user.toJSON(),
                tokens: {
                    accessToken: tokens.accessToken,
                    refreshToken: refreshTokenString,
                },
            };
        });
    }
    /**
     * Refresh access token
     */
    static refreshToken(refreshTokenString) {
        return __awaiter(this, void 0, void 0, function* () {
            // Find refresh token in database
            const refreshToken = yield models_1.RefreshToken.findByToken(refreshTokenString);
            if (!refreshToken) {
                throw new Error('Invalid refresh token');
            }
            // Check if token is active
            if (!refreshToken.isActive()) {
                throw new Error('Refresh token expired or revoked');
            }
            // Get user
            const user = yield models_1.User.findByPk(refreshToken.user_id);
            if (!user) {
                throw new Error('User not found');
            }
            // Generate new access token
            const accessToken = jwt_1.default.generateAccessToken(user);
            // Optionally rotate refresh token (recommended for security)
            const shouldRotateRefreshToken = process.env.ROTATE_REFRESH_TOKENS === 'true';
            let newRefreshToken;
            if (shouldRotateRefreshToken) {
                // Create new refresh token
                const { token: newRefreshTokenString } = yield models_1.RefreshToken.createRefreshToken(user.id);
                newRefreshToken = newRefreshTokenString;
                // Revoke old refresh token
                yield refreshToken.revoke(newRefreshToken);
            }
            return {
                accessToken,
                refreshToken: newRefreshToken,
            };
        });
    }
    /**
     * Logout user (revoke refresh token)
     */
    static logout(refreshTokenString) {
        return __awaiter(this, void 0, void 0, function* () {
            const refreshToken = yield models_1.RefreshToken.findByToken(refreshTokenString);
            if (refreshToken) {
                yield refreshToken.revoke();
            }
        });
    }
    /**
     * Logout from all devices (revoke all refresh tokens)
     */
    static logoutAll(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            yield models_1.RefreshToken.revokeAllUserTokens(userId);
        });
    }
    /**
     * Get user profile
     */
    static getProfile(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield models_1.User.findByPk(userId);
            if (!user) {
                throw new Error('User not found');
            }
            return user.toJSON();
        });
    }
    /**
     * Update user profile
     */
    static updateProfile(userId, data) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield models_1.User.findByPk(userId);
            if (!user) {
                throw new Error('User not found');
            }
            // Only allow certain fields to be updated
            const allowedFields = ['email'];
            const updateData = {};
            for (const field of allowedFields) {
                if (data[field] !== undefined) {
                    updateData[field] = data[field];
                }
            }
            // If email is being updated, check for uniqueness
            if (updateData.email && updateData.email !== user.email) {
                const existingUser = yield models_1.User.findByEmail(updateData.email);
                if (existingUser) {
                    throw new Error('Email already in use');
                }
            }
            yield user.update(updateData);
            return user.toJSON();
        });
    }
    /**
     * Change password
     */
    static changePassword(userId, currentPassword, newPassword) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield models_1.User.findByPk(userId);
            if (!user) {
                throw new Error('User not found');
            }
            // Validate current password
            const isValidPassword = yield user.validatePassword(currentPassword);
            if (!isValidPassword) {
                throw new Error('Current password is incorrect');
            }
            // Validate new password
            this.validatePassword(newPassword);
            // Hash new password
            const password_hash = yield models_1.User.hashPassword(newPassword);
            // Update password
            yield user.update({ password_hash });
            // Revoke all refresh tokens to force re-login
            yield models_1.RefreshToken.revokeAllUserTokens(userId);
        });
    }
    /**
     * Validate password strength
     */
    static validatePassword(password) {
        if (password.length < 8) {
            throw new Error('Password must be at least 8 characters long');
        }
        if (!/(?=.*[a-z])/.test(password)) {
            throw new Error('Password must contain at least one lowercase letter');
        }
        if (!/(?=.*[A-Z])/.test(password)) {
            throw new Error('Password must contain at least one uppercase letter');
        }
        if (!/(?=.*\d)/.test(password)) {
            throw new Error('Password must contain at least one number');
        }
        if (!/(?=.*[@$!%*?&])/.test(password)) {
            throw new Error('Password must contain at least one special character (@$!%*?&)');
        }
    }
    /**
     * Cleanup expired tokens (should be run periodically)
     */
    static cleanupExpiredTokens() {
        return __awaiter(this, void 0, void 0, function* () {
            return models_1.RefreshToken.cleanupExpiredTokens();
        });
    }
}
exports.default = AuthService;
