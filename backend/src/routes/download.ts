import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate } from '../middleware/auth';
import { StreamingService } from '../services/streamingService';

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
 * Validation for video download request
 */
const videoDownloadValidation = [
  body('url')
    .isURL()
    .withMessage('Valid URL is required'),
  body('format_id')
    .notEmpty()
    .withMessage('Format ID is required'),
  body('title')
    .optional()
    .isString()
    .withMessage('Title must be a string'),
  body('ext')
    .optional()
    .isString()
    .withMessage('Extension must be a string')
];

/**
 * GET /api/download/test
 * Test endpoint to check if download route is accessible
 */
router.get('/test', (req: Request, res: Response) => {
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
router.post('/',
  authenticate,
  videoDownloadValidation,
  validateRequest,
  async (req: Request, res: Response) => {
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
      const result = await StreamingService.streamVideo(req, res, {
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

    } catch (error) {
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
  }
);

export default router;
