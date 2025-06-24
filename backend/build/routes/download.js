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
 * POST /api/download
 * Download video with selected format
 */
router.post('/', auth_1.authenticate, videoDownloadValidation, validateRequest, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { url, format_id, title, ext } = req.body;
        console.log('Download request:', { url, format_id, title, ext });
        // Stream the video directly to the client
        yield streamingService_1.StreamingService.streamVideo(req, res, {
            videoUrl: url,
            formatId: format_id,
            title: title
        });
    }
    catch (error) {
        console.error('Video download error:', error);
        if (!res.headersSent) {
            const errorMessage = error instanceof Error ? error.message : 'Download failed';
            res.status(500).json({
                error: errorMessage,
                code: 'DOWNLOAD_FAILED'
            });
        }
    }
}));
exports.default = router;
