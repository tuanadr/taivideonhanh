import multer from 'multer';
import path from 'path';
import { Request, Response, NextFunction } from 'express';

// Extend Express Request interface to include file
declare global {
  namespace Express {
    interface Request {
      file?: Express.Multer.File;
    }
  }
}

export interface FileUploadOptions {
  maxSize?: number;
  allowedExtensions?: string[];
  allowedMimeTypes?: string[];
}

export class FileUploadMiddleware {
  private static readonly DEFAULT_MAX_SIZE = 5 * 1024 * 1024; // 5MB
  private static readonly DEFAULT_ALLOWED_EXTENSIONS = ['.txt'];
  private static readonly DEFAULT_ALLOWED_MIME_TYPES = ['text/plain', 'application/octet-stream'];

  /**
   * Create cookie file upload middleware
   */
  public static createCookieUpload(options: FileUploadOptions = {}) {
    const {
      maxSize = this.DEFAULT_MAX_SIZE,
      allowedExtensions = this.DEFAULT_ALLOWED_EXTENSIONS,
      allowedMimeTypes = this.DEFAULT_ALLOWED_MIME_TYPES
    } = options;

    // Configure multer for memory storage (we'll handle file saving manually)
    const upload = multer({
      storage: multer.memoryStorage(),
      limits: {
        fileSize: maxSize,
        files: 1, // Only allow one file
      },
      fileFilter: (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
        try {
          // Check file extension
          const ext = path.extname(file.originalname).toLowerCase();
          if (!allowedExtensions.includes(ext)) {
            return cb(new Error(`Invalid file extension. Allowed: ${allowedExtensions.join(', ')}`));
          }

          // Check MIME type
          if (!allowedMimeTypes.includes(file.mimetype)) {
            return cb(new Error(`Invalid file type. Allowed: ${allowedMimeTypes.join(', ')}`));
          }

          // Additional security checks
          if (file.originalname.includes('..') || file.originalname.includes('/') || file.originalname.includes('\\')) {
            return cb(new Error('Invalid filename'));
          }

          cb(null, true);
        } catch (error) {
          cb(new Error('File validation failed'));
        }
      }
    });

    return upload.single('cookieFile');
  }

  /**
   * Error handling middleware for file uploads
   */
  public static handleUploadError(error: any, req: Request, res: Response, next: NextFunction) {
    if (error instanceof multer.MulterError) {
      switch (error.code) {
        case 'LIMIT_FILE_SIZE':
          return res.status(400).json({
            error: 'File size too large',
            code: 'FILE_TOO_LARGE',
            maxSize: '5MB'
          });
        case 'LIMIT_FILE_COUNT':
          return res.status(400).json({
            error: 'Too many files',
            code: 'TOO_MANY_FILES',
            maxFiles: 1
          });
        case 'LIMIT_UNEXPECTED_FILE':
          return res.status(400).json({
            error: 'Unexpected file field',
            code: 'UNEXPECTED_FILE',
            expectedField: 'cookieFile'
          });
        default:
          return res.status(400).json({
            error: 'File upload error',
            code: 'UPLOAD_ERROR',
            details: error.message
          });
      }
    }

    if (error.message) {
      return res.status(400).json({
        error: error.message,
        code: 'VALIDATION_ERROR'
      });
    }

    next(error);
  }

  /**
   * Validate uploaded file middleware
   */
  public static validateUploadedFile(req: Request, res: Response, next: NextFunction) {
    if (!req.file) {
      return res.status(400).json({
        error: 'No file uploaded',
        code: 'NO_FILE_UPLOADED'
      });
    }

    // Additional validation can be added here
    if (!req.file.buffer || req.file.buffer.length === 0) {
      return res.status(400).json({
        error: 'Uploaded file is empty',
        code: 'EMPTY_FILE'
      });
    }

    // Check for potential security issues
    const filename = req.file.originalname;
    if (filename.length > 255) {
      return res.status(400).json({
        error: 'Filename too long',
        code: 'FILENAME_TOO_LONG'
      });
    }

    // Check for suspicious patterns
    const suspiciousPatterns = [
      /\.(exe|bat|cmd|scr|pif|com)$/i,
      /\.(php|jsp|asp|aspx)$/i,
      /\.(sh|bash|zsh)$/i
    ];

    if (suspiciousPatterns.some(pattern => pattern.test(filename))) {
      return res.status(400).json({
        error: 'Suspicious file type detected',
        code: 'SUSPICIOUS_FILE_TYPE'
      });
    }

    next();
  }

  /**
   * Sanitize filename
   */
  public static sanitizeFilename(filename: string): string {
    // Remove or replace dangerous characters
    return filename
      .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace non-alphanumeric chars with underscore
      .replace(/\.+/g, '.') // Replace multiple dots with single dot
      .replace(/^\./, '') // Remove leading dot
      .substring(0, 100); // Limit length
  }

  /**
   * Log file upload activity
   */
  public static logUploadActivity(req: Request, res: Response, next: NextFunction) {
    if (req.file) {
      console.log(`File upload activity:`, {
        filename: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
        uploadedBy: req.admin?.email || 'unknown',
        timestamp: new Date().toISOString(),
        ip: req.ip || req.connection.remoteAddress
      });
    }
    next();
  }
}

/**
 * Pre-configured middleware for cookie file uploads
 */
export const cookieUploadMiddleware = [
  FileUploadMiddleware.createCookieUpload(),
  FileUploadMiddleware.handleUploadError,
  FileUploadMiddleware.validateUploadedFile,
  FileUploadMiddleware.logUploadActivity
];

export default FileUploadMiddleware;
