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
 * Validation for video info request
 */
const videoInfoValidation = [
  body('url')
    .isURL()
    .withMessage('Valid URL is required')
    .custom((value) => {
      // Basic validation for supported platforms
      const supportedDomains = [
        'youtube.com',
        'youtu.be',
        'vimeo.com',
        'dailymotion.com',
        'twitch.tv',
        'facebook.com',
        'instagram.com',
        'tiktok.com'
      ];
      
      const url = new URL(value);
      const isSupported = supportedDomains.some(domain => 
        url.hostname.includes(domain)
      );
      
      if (!isSupported) {
        throw new Error('URL from unsupported platform');
      }
      
      return true;
    }),
];

/**
 * POST /api/info
 * Get video information and available formats
 */
router.post('/', 
  authenticate,
  videoInfoValidation,
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { url } = req.body;
      
      // Get video information using StreamingService
      const videoInfo = await StreamingService.getVideoInfo(url);
      
      // Filter and format the response for frontend compatibility
      const response = {
        title: videoInfo.title,
        thumbnail: videoInfo.thumbnail,
        duration: videoInfo.duration,
        uploader: videoInfo.uploader,
        upload_date: videoInfo.upload_date,
        formats: videoInfo.formats
          .filter(format => {
            // Filter for video formats with reasonable quality
            if (format.vcodec === 'none' || format.ext !== 'mp4') return false;
            if (!format.resolution) return false;
            
            const height = parseInt(format.resolution.split('x')[1]);
            return height >= 360; // Minimum 360p
          })
          .map(format => ({
            format_id: format.format_id,
            format_note: format.format_note || `${format.resolution}`,
            ext: format.ext,
            resolution: format.resolution,
            vcodec: format.vcodec,
            acodec: format.acodec,
            filesize: format.filesize,
            fps: format.fps
          }))
          .sort((a, b) => {
            // Sort by resolution (height) descending
            const aHeight = parseInt(a.resolution?.split('x')[1] || '0');
            const bHeight = parseInt(b.resolution?.split('x')[1] || '0');
            return bHeight - aHeight;
          })
      };

      res.json(response);
    } catch (error) {
      console.error('Video info error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to get video information';
      
      // Handle specific error types
      let statusCode = 500;
      let errorCode = 'VIDEO_INFO_FAILED';
      
      if (errorMessage.includes('Unsupported URL') || errorMessage.includes('unsupported platform')) {
        statusCode = 400;
        errorCode = 'UNSUPPORTED_URL';
      } else if (errorMessage.includes('Video unavailable') || errorMessage.includes('not found')) {
        statusCode = 404;
        errorCode = 'VIDEO_NOT_FOUND';
      } else if (errorMessage.includes('timeout')) {
        statusCode = 408;
        errorCode = 'REQUEST_TIMEOUT';
      }
      
      res.status(statusCode).json({
        error: errorMessage,
        code: errorCode
      });
    }
  }
);

/**
 * POST /api/info/download
 * Download video with selected format
 */
router.post('/download',
  authenticate,
  [
    body('url').isURL().withMessage('Valid URL is required'),
    body('format_id').notEmpty().withMessage('Format ID is required'),
    body('title').optional().isString().withMessage('Title must be a string')
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { url, format_id, title } = req.body;
      
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
