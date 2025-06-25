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
exports.generateAdminToken = exports.requireAdminPermission = exports.requireAdminRole = exports.authenticateAdmin = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const models_1 = require("../models");
/**
 * Middleware to authenticate admin users
 */
const authenticateAdmin = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                error: 'Admin authentication required',
                code: 'ADMIN_AUTH_REQUIRED'
            });
        }
        const token = authHeader.substring(7);
        const jwtSecret = process.env.JWT_SECRET || process.env.ADMIN_JWT_SECRET || process.env.JWT_ACCESS_SECRET;
        if (!jwtSecret) {
            console.error('JWT configuration missing. Please set JWT_SECRET, ADMIN_JWT_SECRET, or JWT_ACCESS_SECRET');
            return res.status(500).json({
                error: 'JWT secret not configured',
                code: 'JWT_SECRET_MISSING'
            });
        }
        const decoded = jsonwebtoken_1.default.verify(token, jwtSecret);
        // Verify admin still exists and is active
        const admin = yield models_1.Admin.findOne({
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
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
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
});
exports.authenticateAdmin = authenticateAdmin;
/**
 * Middleware to check admin role
 */
const requireAdminRole = (requiredRole) => {
    const roleHierarchy = {
        'super_admin': 3,
        'admin': 2,
        'moderator': 1,
    };
    return (req, res, next) => {
        if (!req.admin) {
            return res.status(401).json({
                error: 'Admin authentication required',
                code: 'ADMIN_AUTH_REQUIRED'
            });
        }
        const userRoleLevel = roleHierarchy[req.admin.role] || 0;
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
exports.requireAdminRole = requireAdminRole;
/**
 * Middleware to check admin permission
 */
const requireAdminPermission = (permission) => {
    return (req, res, next) => {
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
exports.requireAdminPermission = requireAdminPermission;
/**
 * Generate admin JWT token
 */
const generateAdminToken = (admin) => {
    const jwtSecret = process.env.JWT_SECRET || process.env.ADMIN_JWT_SECRET || process.env.JWT_ACCESS_SECRET;
    if (!jwtSecret) {
        throw new Error('JWT secret not configured');
    }
    return jsonwebtoken_1.default.sign({
        adminId: admin.id,
        email: admin.email,
        role: admin.role,
    }, jwtSecret, { expiresIn: '8h' });
};
exports.generateAdminToken = generateAdminToken;
