import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { authenticateAdmin } from '../middleware/adminAuth';
import CookieService from '../services/cookieService';

const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'cookies');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error as Error, uploadDir);
    }
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const originalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${timestamp}_${originalName}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    // Accept .txt and .json files
    const allowedTypes = ['.txt', '.json'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
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
router.post('/upload',
  authenticateAdmin,
  async (req: Request, res: Response) => {
    try {
      const { filename, platform, description } = req.body;

      if (!filename) {
        return res.status(400).json({
          error: 'No cookie filename provided',
          code: 'NO_FILENAME_PROVIDED'
        });
      }

      const adminId = req.admin!.adminId;

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
    } catch (error) {
      console.error('Cookie upload error:', error);
      res.status(500).json({
        error: 'Failed to upload cookie file',
        code: 'COOKIE_UPLOAD_FAILED',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * GET /api/admin/cookie/list
 * Get list of uploaded cookies
 */
router.get('/list',
  authenticateAdmin,
  async (req: Request, res: Response) => {
    try {
      const { page = 1, limit = 10, platform, status } = req.query;
      
      // Mock cookie list for now
      const cookies = {
        data: [],
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total: 0,
          totalPages: 0
        }
      };

      res.json({
        message: 'Cookie list retrieved successfully',
        cookies: cookies.data,
        pagination: cookies.pagination
      });
    } catch (error) {
      console.error('Cookie list error:', error);
      res.status(500).json({
        error: 'Failed to get cookie list',
        code: 'COOKIE_LIST_FAILED'
      });
    }
  }
);

/**
 * POST /api/admin/cookie/:cookieId/test
 * Test cookie validity
 */
router.post('/:cookieId/test',
  authenticateAdmin,
  async (req: Request, res: Response) => {
    try {
      const { cookieId } = req.params;
      const { testUrl } = req.body;

      const result = await CookieService.testCookieFileSimple(
        testUrl || 'https://www.youtube.com'
      );

      res.json({
        message: 'Cookie test completed',
        result
      });
    } catch (error) {
      console.error('Cookie test error:', error);
      res.status(500).json({
        error: 'Failed to test cookie',
        code: 'COOKIE_TEST_FAILED',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * DELETE /api/admin/cookie/:cookieId
 * Delete cookie
 */
router.delete('/:cookieId',
  authenticateAdmin,
  async (req: Request, res: Response) => {
    try {
      const { cookieId } = req.params;
      const adminId = req.admin!.adminId;

      // Mock delete for now
      // await CookieService.deleteCookieFile(cookieId);

      res.json({
        message: 'Cookie deleted successfully'
      });
    } catch (error) {
      console.error('Cookie delete error:', error);
      res.status(500).json({
        error: 'Failed to delete cookie',
        code: 'COOKIE_DELETE_FAILED',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * GET /api/admin/cookie/status
 * Get cookie system status
 */
router.get('/status',
  authenticateAdmin,
  async (req: Request, res: Response) => {
    try {
      const status = await CookieService.getCookieSystemStatus();

      res.json({
        message: 'Cookie system status retrieved',
        status
      });
    } catch (error) {
      console.error('Cookie status error:', error);
      res.status(500).json({
        error: 'Failed to get cookie status',
        code: 'COOKIE_STATUS_FAILED'
      });
    }
  }
);

/**
 * PUT /api/admin/cookie/:cookieId/activate
 * Activate/deactivate cookie
 */
router.put('/:cookieId/activate',
  authenticateAdmin,
  async (req: Request, res: Response) => {
    try {
      const { cookieId } = req.params;
      const { active } = req.body;
      const adminId = req.admin!.adminId;

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
    } catch (error) {
      console.error('Cookie activation error:', error);
      res.status(500).json({
        error: 'Failed to update cookie status',
        code: 'COOKIE_ACTIVATION_FAILED',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

export default router;
