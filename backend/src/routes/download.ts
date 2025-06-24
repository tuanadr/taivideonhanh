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
 * POST /api/download
 * Download video with selected format
 */
router.post('/',
  authenticate,
  videoDownloadValidation,
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { url, format_id, title, ext } = req.body;
      
      console.log('Download request:', { url, format_id, title, ext });
      
      // Stream the video directly to the client
      await StreamingService.streamVideo(req, res, {
        videoUrl: url,
        formatId: format_id,
        title: title
      });
      
    } catch (error) {
      console.error('Video download error:', error);
      
      if (!res.headersSent) {
        const errorMessage = error instanceof Error ? error.message : 'Download failed';
        res.status(500).json({
          error: errorMessage,
          code: 'DOWNLOAD_FAILED'
        });
      }
    }
  }
);

export default router;
