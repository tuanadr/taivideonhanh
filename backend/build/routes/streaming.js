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
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const auth_1 = require("../middleware/auth");
const streamRateLimit_1 = require("../middleware/streamRateLimit");
const streamTokenService_1 = require("../services/streamTokenService");
const streamingService_1 = require("../services/streamingService");
const queueService_1 = require("../services/queueService");
const performanceService_1 = require("../services/performanceService");
const uuid_1 = require("uuid");
const router = express_1.default.Router();
// Validation middleware
const validateRequest = (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Validation failed',
            details: errors.array(),
        });
    }
    next();
};
// Video analysis validation
const videoAnalysisValidation = [
    (0, express_validator_1.body)('url')
        .isURL({ protocols: ['http', 'https'] })
        .withMessage('Valid URL is required')
        .isLength({ max: 2000 })
        .withMessage('URL too long'),
];
// Stream token creation validation
const streamTokenValidation = [
    (0, express_validator_1.body)('videoUrl')
        .isURL({ protocols: ['http', 'https'] })
        .withMessage('Valid video URL is required'),
    (0, express_validator_1.body)('formatId')
        .isString()
        .isLength({ min: 1, max: 50 })
        .withMessage('Valid format ID is required'),
    (0, express_validator_1.body)('title')
        .optional()
        .isString()
        .isLength({ max: 200 })
        .withMessage('Title too long'),
];
/**
 * POST /api/streaming/analyze
 * Analyze video and get available formats
 */
router.post('/analyze', auth_1.authenticate, videoAnalysisValidation, validateRequest, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { url } = req.body;
        const userId = req.user.userId;
        const requestId = (0, uuid_1.v4)();
        // Add video analysis job to queue
        const job = yield queueService_1.QueueService.addVideoAnalysisJob({
            videoUrl: url,
            userId,
            requestId,
        });
        res.json({
            message: 'Video analysis started',
            requestId,
            jobId: job.id,
            estimatedTime: '10-30 seconds',
        });
    }
    catch (error) {
        console.error('Video analysis error:', error);
        res.status(500).json({
            error: 'Failed to start video analysis',
            code: 'ANALYSIS_FAILED'
        });
    }
}));
/**
 * GET /api/streaming/analyze/:requestId
 * Get video analysis result
 */
router.get('/analyze/:requestId', auth_1.authenticate, (0, express_validator_1.param)('requestId').isUUID().withMessage('Valid request ID required'), validateRequest, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { requestId } = req.params;
        const jobId = `analysis-${requestId}`;
        // Get job status
        const jobStatus = yield queueService_1.QueueService.getJobStatus('video-analysis', jobId);
        if (!jobStatus) {
            return res.status(404).json({
                error: 'Analysis request not found',
                code: 'REQUEST_NOT_FOUND'
            });
        }
        if (jobStatus.failedReason) {
            return res.status(400).json({
                error: 'Video analysis failed',
                reason: jobStatus.failedReason,
                code: 'ANALYSIS_FAILED'
            });
        }
        if (!jobStatus.finishedOn) {
            return res.json({
                status: 'processing',
                progress: jobStatus.progress || 0,
                message: 'Video analysis in progress',
            });
        }
        // Analysis completed
        res.json({
            status: 'completed',
            progress: 100,
            result: jobStatus.returnvalue,
        });
    }
    catch (error) {
        console.error('Get analysis result error:', error);
        res.status(500).json({
            error: 'Failed to get analysis result',
            code: 'GET_RESULT_FAILED'
        });
    }
}));
/**
 * POST /api/streaming/token
 * Create stream token for video download
 */
router.post('/token', auth_1.authenticateWithUser, (0, streamRateLimit_1.streamTokenRateLimit)(), streamTokenValidation, validateRequest, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { videoUrl, formatId, title } = req.body;
        const userId = req.user.userId;
        // Extract client info
        const clientInfo = streamTokenService_1.StreamTokenService.extractClientInfo(req);
        // Create stream token
        const { token, streamToken } = yield streamTokenService_1.StreamTokenService.createStreamToken({
            userId,
            videoUrl,
            formatId,
            expiresInMinutes: 30,
            ipAddress: clientInfo.ipAddress,
            userAgent: clientInfo.userAgent,
        });
        // Add streaming job to queue for tracking
        yield queueService_1.QueueService.addStreamingJob({
            streamToken: token,
            videoUrl,
            formatId,
            userId,
            title,
            userAgent: clientInfo.userAgent,
        });
        res.json({
            message: 'Stream token created successfully',
            token,
            expiresAt: streamToken.expires_at,
            streamUrl: `/api/streaming/stream/${token}`,
        });
    }
    catch (error) {
        console.error('Stream token creation error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to create stream token';
        res.status(400).json({
            error: errorMessage,
            code: 'TOKEN_CREATION_FAILED'
        });
    }
}));
/**
 * GET /api/streaming/stream/:token
 * Stream video using token
 */
router.get('/stream/:token', (0, express_validator_1.param)('token').isLength({ min: 64, max: 64 }).withMessage('Valid token required'), validateRequest, streamRateLimit_1.validateStreamToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const streamId = (0, uuid_1.v4)();
    try {
        const streamToken = req.streamToken;
        // Start performance tracking
        performanceService_1.PerformanceService.startStreamTracking(streamId, streamToken.user_id);
        // Extract client info for additional validation
        const clientInfo = streamTokenService_1.StreamTokenService.extractClientInfo(req);
        // Stream the video
        const result = yield streamingService_1.StreamingService.streamVideo(req, res, {
            videoUrl: streamToken.video_url,
            formatId: streamToken.format_id,
            userAgent: clientInfo.userAgent,
        });
        // End performance tracking
        yield performanceService_1.PerformanceService.endStreamTracking(streamId, result.success, result.error);
        // Mark token as used if streaming was successful
        if (result.success) {
            yield streamToken.markAsUsed();
        }
    }
    catch (error) {
        console.error('Streaming error:', error);
        // End performance tracking with error
        yield performanceService_1.PerformanceService.endStreamTracking(streamId, false, error instanceof Error ? error.message : 'Unknown error');
        if (!res.headersSent) {
            res.status(500).json({
                error: 'Streaming failed',
                code: 'STREAMING_FAILED'
            });
        }
    }
}));
/**
 * POST /api/streaming/token/:token/refresh
 * Refresh stream token expiration
 */
router.post('/token/:token/refresh', auth_1.authenticate, (0, express_validator_1.param)('token').isLength({ min: 64, max: 64 }).withMessage('Valid token required'), validateRequest, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { token } = req.params;
        const userId = req.user.userId;
        // Find and validate token ownership
        const streamToken = yield require('../models').StreamToken.findByToken(token);
        if (!streamToken || streamToken.user_id !== userId) {
            return res.status(404).json({
                error: 'Stream token not found',
                code: 'TOKEN_NOT_FOUND'
            });
        }
        if (!streamToken.isValid()) {
            return res.status(400).json({
                error: 'Token cannot be refreshed',
                code: 'TOKEN_NOT_REFRESHABLE'
            });
        }
        // Refresh token
        const refreshedToken = yield streamTokenService_1.StreamTokenService.refreshStreamToken(token, 30);
        res.json({
            message: 'Token refreshed successfully',
            expiresAt: refreshedToken.expires_at,
        });
    }
    catch (error) {
        console.error('Token refresh error:', error);
        res.status(500).json({
            error: 'Failed to refresh token',
            code: 'TOKEN_REFRESH_FAILED'
        });
    }
}));
/**
 * DELETE /api/streaming/token/:token
 * Revoke stream token
 */
router.delete('/token/:token', auth_1.authenticate, (0, express_validator_1.param)('token').isLength({ min: 64, max: 64 }).withMessage('Valid token required'), validateRequest, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { token } = req.params;
        const userId = req.user.userId;
        // Find and validate token ownership
        const streamToken = yield require('../models').StreamToken.findByToken(token);
        if (!streamToken || streamToken.user_id !== userId) {
            return res.status(404).json({
                error: 'Stream token not found',
                code: 'TOKEN_NOT_FOUND'
            });
        }
        // Revoke token
        yield streamTokenService_1.StreamTokenService.revokeStreamToken(token);
        res.json({
            message: 'Token revoked successfully',
        });
    }
    catch (error) {
        console.error('Token revocation error:', error);
        res.status(500).json({
            error: 'Failed to revoke token',
            code: 'TOKEN_REVOCATION_FAILED'
        });
    }
}));
/**
 * GET /api/streaming/tokens
 * Get user's active stream tokens
 */
router.get('/tokens', auth_1.authenticate, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.userId;
        const activeTokens = yield streamTokenService_1.StreamTokenService.getUserActiveTokens(userId);
        const tokens = activeTokens.map(token => ({
            id: token.id,
            videoUrl: token.video_url,
            formatId: token.format_id,
            createdAt: token.created_at,
            expiresAt: token.expires_at,
            rateLimit: token.rate_limit_count,
            lastAccess: token.last_access,
        }));
        res.json({
            tokens,
            count: tokens.length,
        });
    }
    catch (error) {
        console.error('Get tokens error:', error);
        res.status(500).json({
            error: 'Failed to get tokens',
            code: 'GET_TOKENS_FAILED'
        });
    }
}));
exports.default = router;
