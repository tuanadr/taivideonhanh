import { Router, Request, Response } from 'express';
import { body, query, param, validationResult } from 'express-validator';
import LegalService from '../services/legalService';
import { authenticateAdmin, requireAdminPermission } from '../middleware/adminAuth';

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
 * Validation rules
 */
const dmcaReportValidation = [
  body('reporterName').notEmpty().withMessage('Reporter name is required'),
  body('reporterEmail').isEmail().withMessage('Valid reporter email is required'),
  body('reporterAddress').notEmpty().withMessage('Reporter address is required'),
  body('copyrightOwner').notEmpty().withMessage('Copyright owner is required'),
  body('copyrightedWorkDescription').notEmpty().withMessage('Copyrighted work description is required'),
  body('infringingUrl').isURL().withMessage('Valid infringing URL is required'),
  body('infringingContentDescription').notEmpty().withMessage('Infringing content description is required'),
  body('goodFaithStatement').isBoolean().withMessage('Good faith statement must be boolean'),
  body('accuracyStatement').isBoolean().withMessage('Accuracy statement must be boolean'),
  body('signature').notEmpty().withMessage('Signature is required'),
];

/**
 * GET /api/legal/documents/:type
 * Get legal document by type
 */
router.get('/documents/:type',
  param('type').isIn(['terms_of_service', 'privacy_policy', 'dmca_policy', 'user_agreement']).withMessage('Invalid document type'),
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { type } = req.params;
      const document = await LegalService.getLegalDocument(type as any);

      if (!document) {
        return res.status(404).json({
          error: 'Legal document not found',
          code: 'DOCUMENT_NOT_FOUND'
        });
      }

      res.json({
        message: 'Legal document retrieved successfully',
        document: {
          id: document.id,
          type: document.type,
          title: document.title,
          content: document.content,
          version: document.version,
          effectiveDate: document.effective_date,
        },
      });
    } catch (error) {
      console.error('Error fetching legal document:', error);
      res.status(500).json({
        error: 'Failed to fetch legal document',
        code: 'DOCUMENT_FETCH_FAILED'
      });
    }
  }
);

/**
 * GET /api/legal/documents
 * Get all active legal documents
 */
router.get('/documents', async (req: Request, res: Response) => {
  try {
    const documents = await LegalService.getAllLegalDocuments();

    res.json({
      message: 'Legal documents retrieved successfully',
      documents: documents.map(doc => ({
        id: doc.id,
        type: doc.type,
        title: doc.title,
        version: doc.version,
        effectiveDate: doc.effective_date,
      })),
    });
  } catch (error) {
    console.error('Error fetching legal documents:', error);
    res.status(500).json({
      error: 'Failed to fetch legal documents',
      code: 'DOCUMENTS_FETCH_FAILED'
    });
  }
});

/**
 * POST /api/legal/dmca-report
 * Submit DMCA report
 */
router.post('/dmca-report',
  dmcaReportValidation,
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const {
        reporterName,
        reporterEmail,
        reporterAddress,
        copyrightOwner,
        copyrightedWorkDescription,
        infringingUrl,
        infringingContentDescription,
        goodFaithStatement,
        accuracyStatement,
        signature,
      } = req.body;

      // Validate required statements
      if (!goodFaithStatement || !accuracyStatement) {
        return res.status(400).json({
          error: 'Both good faith and accuracy statements must be true',
          code: 'INVALID_STATEMENTS'
        });
      }

      const report = await LegalService.submitDMCAReport({
        reporterName,
        reporterEmail,
        reporterAddress,
        copyrightOwner,
        copyrightedWorkDescription,
        infringingUrl,
        infringingContentDescription,
        goodFaithStatement,
        accuracyStatement,
        signature,
      });

      res.status(201).json({
        message: 'DMCA report submitted successfully',
        reportId: report.id,
        status: report.status,
      });
    } catch (error) {
      console.error('Error submitting DMCA report:', error);
      res.status(500).json({
        error: 'Failed to submit DMCA report',
        code: 'DMCA_SUBMISSION_FAILED'
      });
    }
  }
);

/**
 * GET /api/legal/dmca-reports
 * Get DMCA reports (admin only)
 */
router.get('/dmca-reports',
  authenticateAdmin,
  requireAdminPermission('user_management'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('status').optional().isIn(['pending', 'under_review', 'valid', 'invalid', 'resolved']).withMessage('Invalid status'),
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const status = req.query.status as string;

      const result = await LegalService.getDMCAReports(page, limit, status);

      res.json({
        message: 'DMCA reports retrieved successfully',
        ...result,
      });
    } catch (error) {
      console.error('Error fetching DMCA reports:', error);
      res.status(500).json({
        error: 'Failed to fetch DMCA reports',
        code: 'DMCA_REPORTS_FETCH_FAILED'
      });
    }
  }
);

/**
 * PUT /api/legal/dmca-reports/:reportId/process
 * Process DMCA report (admin only)
 */
router.put('/dmca-reports/:reportId/process',
  authenticateAdmin,
  requireAdminPermission('user_management'),
  param('reportId').isUUID().withMessage('Valid report ID is required'),
  body('status').isIn(['valid', 'invalid']).withMessage('Status must be valid or invalid'),
  body('notes').optional().isString().withMessage('Notes must be a string'),
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { reportId } = req.params;
      const { status, notes } = req.body;
      const adminId = req.admin!.adminId;

      const report = await LegalService.processDMCAReport(reportId, adminId, status, notes);

      res.json({
        message: 'DMCA report processed successfully',
        report: {
          id: report.id,
          status: report.status,
          processedBy: report.processed_by,
          processedAt: report.processed_at,
          adminNotes: report.admin_notes,
        },
      });
    } catch (error) {
      console.error('Error processing DMCA report:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to process DMCA report';
      res.status(400).json({
        error: errorMessage,
        code: 'DMCA_PROCESSING_FAILED'
      });
    }
  }
);

export default router;
