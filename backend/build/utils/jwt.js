"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
class JWTService {
    /**
     * Generate access token
     */
    static generateAccessToken(user) {
        const payload = {
            userId: user.id,
            email: user.email,
            subscription_tier: user.subscription_tier,
        };
        return jsonwebtoken_1.default.sign(payload, this.ACCESS_TOKEN_SECRET, {
            expiresIn: this.ACCESS_TOKEN_EXPIRES_IN,
            issuer: 'taivideonhanh',
            audience: 'taivideonhanh-users',
        });
    }
    /**
     * Generate refresh token
     */
    static generateRefreshToken(user) {
        const payload = {
            userId: user.id,
            email: user.email,
            subscription_tier: user.subscription_tier,
        };
        return jsonwebtoken_1.default.sign(payload, this.REFRESH_TOKEN_SECRET, {
            expiresIn: this.REFRESH_TOKEN_EXPIRES_IN,
            issuer: 'taivideonhanh',
            audience: 'taivideonhanh-users',
        });
    }
    /**
     * Generate both access and refresh tokens
     */
    static generateTokenPair(user) {
        return {
            accessToken: this.generateAccessToken(user),
            refreshToken: this.generateRefreshToken(user),
        };
    }
    /**
     * Verify access token
     */
    static verifyAccessToken(token) {
        try {
            return jsonwebtoken_1.default.verify(token, this.ACCESS_TOKEN_SECRET, {
                issuer: 'taivideonhanh',
                audience: 'taivideonhanh-users',
            });
        }
        catch (error) {
            if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
                throw new Error('Access token expired');
            }
            else if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
                throw new Error('Invalid access token');
            }
            else {
                throw new Error('Token verification failed');
            }
        }
    }
    /**
     * Verify refresh token
     */
    static verifyRefreshToken(token) {
        try {
            return jsonwebtoken_1.default.verify(token, this.REFRESH_TOKEN_SECRET, {
                issuer: 'taivideonhanh',
                audience: 'taivideonhanh-users',
            });
        }
        catch (error) {
            if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
                throw new Error('Refresh token expired');
            }
            else if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
                throw new Error('Invalid refresh token');
            }
            else {
                throw new Error('Token verification failed');
            }
        }
    }
    /**
     * Extract token from Authorization header
     */
    static extractTokenFromHeader(authHeader) {
        if (!authHeader) {
            return null;
        }
        const parts = authHeader.split(' ');
        if (parts.length !== 2 || parts[0] !== 'Bearer') {
            return null;
        }
        return parts[1];
    }
    /**
     * Get token expiration time
     */
    static getTokenExpiration(token) {
        try {
            const decoded = jsonwebtoken_1.default.decode(token);
            if (decoded && decoded.exp) {
                return new Date(decoded.exp * 1000);
            }
            return null;
        }
        catch (error) {
            return null;
        }
    }
    /**
     * Check if token is expired
     */
    static isTokenExpired(token) {
        const expiration = this.getTokenExpiration(token);
        if (!expiration) {
            return true;
        }
        return Date.now() >= expiration.getTime();
    }
}
JWTService.ACCESS_TOKEN_SECRET = process.env.JWT_ACCESS_SECRET || 'your-access-token-secret';
JWTService.REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-token-secret';
JWTService.ACCESS_TOKEN_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
JWTService.REFRESH_TOKEN_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
exports.default = JWTService;
