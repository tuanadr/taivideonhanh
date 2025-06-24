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
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const auth_1 = require("../middleware/auth");
const streamingService_1 = require("../services/streamingService");
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
 * Validation for video download request
 */
const videoDownloadValidation = [
    (0, express_validator_1.body)('url')
        .isURL()
        .withMessage('Valid URL is required'),
    (0, express_validator_1.body)('format_id')
        .notEmpty()
        .withMessage('Format ID is required'),
    (0, express_validator_1.body)('title')
        .optional()
        .isString()
        .withMessage('Title must be a string'),
    (0, express_validator_1.body)('ext')
        .optional()
        .isString()
        .withMessage('Extension must be a string')
];
/**
 * GET /api/download/test
 * Test endpoint to check if download route is accessible
 */
router.get('/test', (req, res) => {
    res.json({
        message: 'Download route is working',
        timestamp: new Date().toISOString(),
        method: 'GET'
    });
});
/**
 * POST /api/download
 * Download video with selected format
 */
router.post('/', auth_1.authenticate, videoDownloadValidation, validateRequest, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const startTime = Date.now();
    try {
        const { url, format_id, title, ext } = req.body;
        console.log('Download request received:', {
            url,
            format_id,
            title,
            ext,
            timestamp: new Date().toISOString(),
            userAgent: req.headers['user-agent']
        });
        // Validate required parameters
        if (!url) {
            return res.status(400).json({
                error: 'URL is required',
                code: 'MISSING_URL'
            });
        }
        if (!format_id) {
            return res.status(400).json({
                error: 'Format ID is required',
                code: 'MISSING_FORMAT_ID'
            });
        }
        // If no specific format provided, use best format with audio+video
        const finalFormatId = format_id || 'best[ext=mp4]';
        console.log('Starting video stream with format:', finalFormatId);
        // Stream the video directly to the client
        const result = yield streamingService_1.StreamingService.streamVideo(req, res, {
            videoUrl: url,
            formatId: finalFormatId,
            title: title
        });
        const duration = Date.now() - startTime;
        console.log('Download completed:', {
            success: result.success,
            duration: `${duration}ms`,
            bytesStreamed: result.bytesStreamed
        });
    }
    catch (error) {
        const duration = Date.now() - startTime;
        console.error('Video download error:', {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            duration: `${duration}ms`,
            timestamp: new Date().toISOString()
        });
        if (!res.headersSent) {
            const errorMessage = error instanceof Error ? error.message : 'Download failed';
            const statusCode = errorMessage.includes('not found') ? 404 :
                errorMessage.includes('timeout') ? 408 : 500;
            res.status(statusCode).json({
                error: errorMessage,
                code: 'DOWNLOAD_FAILED',
                timestamp: new Date().toISOString()
            });
        }
    }
}));
exports.default = router;
