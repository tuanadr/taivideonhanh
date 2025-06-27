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
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
const adminAuth_1 = require("../middleware/adminAuth");
const cookieService_1 = __importDefault(require("../services/cookieService"));
const router = (0, express_1.Router)();
// Configure multer for file uploads
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => __awaiter(void 0, void 0, void 0, function* () {
        const uploadDir = path_1.default.join(process.cwd(), 'uploads', 'cookies');
        try {
            yield promises_1.default.mkdir(uploadDir, { recursive: true });
            cb(null, uploadDir);
        }
        catch (error) {
            cb(error, uploadDir);
        }
    }),
    filename: (req, file, cb) => {
        const timestamp = Date.now();
        const originalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        cb(null, `${timestamp}_${originalName}`);
    }
});
const upload = (0, multer_1.default)({
    storage,
    fileFilter: (req, file, cb) => {
        // Accept .txt and .json files
        const allowedTypes = ['.txt', '.json'];
        const ext = path_1.default.extname(file.originalname).toLowerCase();
        if (allowedTypes.includes(ext)) {
            cb(null, true);
        }
        else {
            cb(new Error('Only .txt and .json cookie files are allowed'));
        }
    },
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    }
});
/**
 * POST /api/admin/cookie/upload
 * Upload cookie file (simplified for now)
 */
router.post('/upload', adminAuth_1.authenticateAdmin, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { filename, platform, description } = req.body;
        if (!filename) {
            return res.status(400).json({
                error: 'No cookie filename provided',
                code: 'NO_FILENAME_PROVIDED'
            });
        }
        const adminId = req.admin.adminId;
        // Mock upload for now (in real implementation, handle file upload)
        const result = {
            filename: filename,
            platform: platform || 'unknown',
            description: description || '',
            uploaded_by: adminId,
            created_at: new Date()
        };
        res.json({
            message: 'Cookie file upload endpoint ready',
            cookie: result,
            note: 'File upload implementation pending'
        });
    }
    catch (error) {
        console.error('Cookie upload error:', error);
        res.status(500).json({
            error: 'Failed to upload cookie file',
            code: 'COOKIE_UPLOAD_FAILED',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}));
/**
 * GET /api/admin/cookie/list
 * Get list of uploaded cookies
 */
router.get('/list', adminAuth_1.authenticateAdmin, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { page = 1, limit = 10, platform, status } = req.query;
        // Mock cookie list for now
        const cookies = {
            data: [],
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: 0,
                totalPages: 0
            }
        };
        res.json({
            message: 'Cookie list retrieved successfully',
            cookies: cookies.data,
            pagination: cookies.pagination
        });
    }
    catch (error) {
        console.error('Cookie list error:', error);
        res.status(500).json({
            error: 'Failed to get cookie list',
            code: 'COOKIE_LIST_FAILED'
        });
    }
}));
/**
 * POST /api/admin/cookie/:cookieId/test
 * Test cookie validity
 */
router.post('/:cookieId/test', adminAuth_1.authenticateAdmin, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { cookieId } = req.params;
        const { testUrl } = req.body;
        const result = yield cookieService_1.default.testCookieFileSimple(testUrl || 'https://www.youtube.com');
        res.json({
            message: 'Cookie test completed',
            result
        });
    }
    catch (error) {
        console.error('Cookie test error:', error);
        res.status(500).json({
            error: 'Failed to test cookie',
            code: 'COOKIE_TEST_FAILED',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}));
/**
 * DELETE /api/admin/cookie/:cookieId
 * Delete cookie
 */
router.delete('/:cookieId', adminAuth_1.authenticateAdmin, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { cookieId } = req.params;
        const adminId = req.admin.adminId;
        // Mock delete for now
        // await CookieService.deleteCookieFile(cookieId);
        res.json({
            message: 'Cookie deleted successfully'
        });
    }
    catch (error) {
        console.error('Cookie delete error:', error);
        res.status(500).json({
            error: 'Failed to delete cookie',
            code: 'COOKIE_DELETE_FAILED',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}));
/**
 * GET /api/admin/cookie/status
 * Get cookie system status
 */
router.get('/status', adminAuth_1.authenticateAdmin, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const status = yield cookieService_1.default.getCookieSystemStatus();
        res.json({
            message: 'Cookie system status retrieved',
            status
        });
    }
    catch (error) {
        console.error('Cookie status error:', error);
        res.status(500).json({
            error: 'Failed to get cookie status',
            code: 'COOKIE_STATUS_FAILED'
        });
    }
}));
/**
 * PUT /api/admin/cookie/:cookieId/activate
 * Activate/deactivate cookie
 */
router.put('/:cookieId/activate', adminAuth_1.authenticateAdmin, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { cookieId } = req.params;
        const { active } = req.body;
        const adminId = req.admin.adminId;
        // Mock update for now
        const result = {
            id: cookieId,
            active,
            updated_at: new Date()
        };
        res.json({
            message: `Cookie ${active ? 'activated' : 'deactivated'} successfully`,
            cookie: result
        });
    }
    catch (error) {
        console.error('Cookie activation error:', error);
        res.status(500).json({
            error: 'Failed to update cookie status',
            code: 'COOKIE_ACTIVATION_FAILED',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}));
exports.default = router;
