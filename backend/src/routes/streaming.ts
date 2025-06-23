import express, { Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { authenticate, authenticateWithUser } from '../middleware/auth';
import { streamTokenRateLimit, validateStreamToken } from '../middleware/streamRateLimit';
import { StreamTokenService } from '../services/streamTokenService';
import { StreamingService } from '../services/streamingService';
import { QueueService } from '../services/queueService';
import { PerformanceService } from '../services/performanceService';
import { v4 as uuidv4 } from 'uuid';
import { Op } from 'sequelize';

const router = express.Router();

// Validation middleware
const validateRequest = (req: Request, res: Response, next: any) => {
  const errors = validationResult(req);
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
  body('url')
    .isURL({ protocols: ['http', 'https'] })
    .withMessage('Valid URL is required')
    .isLength({ max: 2000 })
    .withMessage('URL too long'),
];

// Stream token creation validation
const streamTokenValidation = [
  body('videoUrl')
    .isURL({ protocols: ['http', 'https'] })
    .withMessage('Valid video URL is required'),
  body('formatId')
    .isString()
    .isLength({ min: 1, max: 50 })
    .withMessage('Valid format ID is required'),
  body('title')
    .optional()
    .isString()
    .isLength({ max: 200 })
    .withMessage('Title too long'),
];

/**
 * POST /api/streaming/analyze
 * Analyze video and get available formats
 */
router.post('/analyze', 
  authenticate,
  videoAnalysisValidation,
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { url } = req.body;
      const userId = req.user!.userId;
      const requestId = uuidv4();

      // Add video analysis job to queue
      const job = await QueueService.addVideoAnalysisJob({
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
    } catch (error) {
      console.error('Video analysis error:', error);
      res.status(500).json({
        error: 'Failed to start video analysis',
        code: 'ANALYSIS_FAILED'
      });
    }
  }
);

/**
 * GET /api/streaming/analyze/:requestId
 * Get video analysis result
 */
router.get('/analyze/:requestId',
  authenticate,
  param('requestId').isUUID().withMessage('Valid request ID required'),
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { requestId } = req.params;
      const jobId = `analysis-${requestId}`;

      // Get job status
      const jobStatus = await QueueService.getJobStatus('video-analysis', jobId);

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
    } catch (error) {
      console.error('Get analysis result error:', error);
      res.status(500).json({
        error: 'Failed to get analysis result',
        code: 'GET_RESULT_FAILED'
      });
    }
  }
);

/**
 * POST /api/streaming/token
 * Create stream token for video download
 */
router.post('/token',
  authenticateWithUser,
  streamTokenRateLimit(),
  streamTokenValidation,
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { videoUrl, formatId, title } = req.body;
      const userId = req.user!.userId;

      // Extract client info
      const clientInfo = StreamTokenService.extractClientInfo(req);

      // Create stream token
      const { token, streamToken } = await StreamTokenService.createStreamToken({
        userId,
        videoUrl,
        formatId,
        expiresInMinutes: 30,
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent,
      });

      // Add streaming job to queue for tracking
      await QueueService.addStreamingJob({
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
    } catch (error) {
      console.error('Stream token creation error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create stream token';
      res.status(400).json({
        error: errorMessage,
        code: 'TOKEN_CREATION_FAILED'
      });
    }
  }
);

/**
 * GET /api/streaming/stream/:token
 * Stream video using token
 */
router.get('/stream/:token',
  param('token').isLength({ min: 64, max: 64 }).withMessage('Valid token required'),
  validateRequest,
  validateStreamToken,
  async (req: Request, res: Response) => {
    const streamId = uuidv4();
    
    try {
      const streamToken = req.streamToken!;
      
      // Start performance tracking
      PerformanceService.startStreamTracking(streamId, streamToken.user_id);

      // Extract client info for additional validation
      const clientInfo = StreamTokenService.extractClientInfo(req);

      // Stream the video
      const result = await StreamingService.streamVideo(req, res, {
        videoUrl: streamToken.video_url,
        formatId: streamToken.format_id,
        userAgent: clientInfo.userAgent,
      });

      // End performance tracking
      await PerformanceService.endStreamTracking(streamId, result.success, result.error);

      // Mark token as used if streaming was successful
      if (result.success) {
        await streamToken.markAsUsed();
      }

    } catch (error) {
      console.error('Streaming error:', error);
      
      // End performance tracking with error
      await PerformanceService.endStreamTracking(streamId, false, error instanceof Error ? error.message : 'Unknown error');

      if (!res.headersSent) {
        res.status(500).json({
          error: 'Streaming failed',
          code: 'STREAMING_FAILED'
        });
      }
    }
  }
);

/**
 * POST /api/streaming/token/:token/refresh
 * Refresh stream token expiration
 */
router.post('/token/:token/refresh',
  authenticate,
  param('token').isLength({ min: 64, max: 64 }).withMessage('Valid token required'),
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      const userId = req.user!.userId;

      // Find and validate token ownership
      const streamToken = await require('../models').StreamToken.findByToken(token);
      
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
      const refreshedToken = await StreamTokenService.refreshStreamToken(token, 30);

      res.json({
        message: 'Token refreshed successfully',
        expiresAt: refreshedToken.expires_at,
      });
    } catch (error) {
      console.error('Token refresh error:', error);
      res.status(500).json({
        error: 'Failed to refresh token',
        code: 'TOKEN_REFRESH_FAILED'
      });
    }
  }
);

/**
 * DELETE /api/streaming/token/:token
 * Revoke stream token
 */
router.delete('/token/:token',
  authenticate,
  param('token').isLength({ min: 64, max: 64 }).withMessage('Valid token required'),
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      const userId = req.user!.userId;

      // Find and validate token ownership
      const streamToken = await require('../models').StreamToken.findByToken(token);
      
      if (!streamToken || streamToken.user_id !== userId) {
        return res.status(404).json({
          error: 'Stream token not found',
          code: 'TOKEN_NOT_FOUND'
        });
      }

      // Revoke token
      await StreamTokenService.revokeStreamToken(token);

      res.json({
        message: 'Token revoked successfully',
      });
    } catch (error) {
      console.error('Token revocation error:', error);
      res.status(500).json({
        error: 'Failed to revoke token',
        code: 'TOKEN_REVOCATION_FAILED'
      });
    }
  }
);

/**
 * GET /api/streaming/tokens
 * Get user's active stream tokens
 */
router.get('/tokens',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.userId;
      const activeTokens = await StreamTokenService.getUserActiveTokens(userId);

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
    } catch (error) {
      console.error('Get tokens error:', error);
      res.status(500).json({
        error: 'Failed to get tokens',
        code: 'GET_TOKENS_FAILED'
      });
    }
  }
);

export default router;
