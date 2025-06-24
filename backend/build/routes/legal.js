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
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const legalService_1 = __importDefault(require("../services/legalService"));
const adminAuth_1 = require("../middleware/adminAuth");
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
 * Validation rules
 */
const dmcaReportValidation = [
    (0, express_validator_1.body)('reporterName').notEmpty().withMessage('Reporter name is required'),
    (0, express_validator_1.body)('reporterEmail').isEmail().withMessage('Valid reporter email is required'),
    (0, express_validator_1.body)('reporterAddress').notEmpty().withMessage('Reporter address is required'),
    (0, express_validator_1.body)('copyrightOwner').notEmpty().withMessage('Copyright owner is required'),
    (0, express_validator_1.body)('copyrightedWorkDescription').notEmpty().withMessage('Copyrighted work description is required'),
    (0, express_validator_1.body)('infringingUrl').isURL().withMessage('Valid infringing URL is required'),
    (0, express_validator_1.body)('infringingContentDescription').notEmpty().withMessage('Infringing content description is required'),
    (0, express_validator_1.body)('goodFaithStatement').isBoolean().withMessage('Good faith statement must be boolean'),
    (0, express_validator_1.body)('accuracyStatement').isBoolean().withMessage('Accuracy statement must be boolean'),
    (0, express_validator_1.body)('signature').notEmpty().withMessage('Signature is required'),
];
/**
 * GET /api/legal/documents/:type
 * Get legal document by type
 */
router.get('/documents/:type', (0, express_validator_1.param)('type').isIn(['terms_of_service', 'privacy_policy', 'dmca_policy', 'user_agreement']).withMessage('Invalid document type'), validateRequest, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { type } = req.params;
        const document = yield legalService_1.default.getLegalDocument(type);
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
    }
    catch (error) {
        console.error('Error fetching legal document:', error);
        res.status(500).json({
            error: 'Failed to fetch legal document',
            code: 'DOCUMENT_FETCH_FAILED'
        });
    }
}));
/**
 * GET /api/legal/documents
 * Get all active legal documents
 */
router.get('/documents', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const documents = yield legalService_1.default.getAllLegalDocuments();
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
    }
    catch (error) {
        console.error('Error fetching legal documents:', error);
        res.status(500).json({
            error: 'Failed to fetch legal documents',
            code: 'DOCUMENTS_FETCH_FAILED'
        });
    }
}));
/**
 * POST /api/legal/dmca-report
 * Submit DMCA report
 */
router.post('/dmca-report', dmcaReportValidation, validateRequest, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { reporterName, reporterEmail, reporterAddress, copyrightOwner, copyrightedWorkDescription, infringingUrl, infringingContentDescription, goodFaithStatement, accuracyStatement, signature, } = req.body;
        // Validate required statements
        if (!goodFaithStatement || !accuracyStatement) {
            return res.status(400).json({
                error: 'Both good faith and accuracy statements must be true',
                code: 'INVALID_STATEMENTS'
            });
        }
        const report = yield legalService_1.default.submitDMCAReport({
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
    }
    catch (error) {
        console.error('Error submitting DMCA report:', error);
        res.status(500).json({
            error: 'Failed to submit DMCA report',
            code: 'DMCA_SUBMISSION_FAILED'
        });
    }
}));
/**
 * GET /api/legal/dmca-reports
 * Get DMCA reports (admin only)
 */
router.get('/dmca-reports', adminAuth_1.authenticateAdmin, (0, adminAuth_1.requireAdminPermission)('user_management'), (0, express_validator_1.query)('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'), (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'), (0, express_validator_1.query)('status').optional().isIn(['pending', 'under_review', 'valid', 'invalid', 'resolved']).withMessage('Invalid status'), validateRequest, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const status = req.query.status;
        const result = yield legalService_1.default.getDMCAReports(page, limit, status);
        res.json(Object.assign({ message: 'DMCA reports retrieved successfully' }, result));
    }
    catch (error) {
        console.error('Error fetching DMCA reports:', error);
        res.status(500).json({
            error: 'Failed to fetch DMCA reports',
            code: 'DMCA_REPORTS_FETCH_FAILED'
        });
    }
}));
/**
 * PUT /api/legal/dmca-reports/:reportId/process
 * Process DMCA report (admin only)
 */
router.put('/dmca-reports/:reportId/process', adminAuth_1.authenticateAdmin, (0, adminAuth_1.requireAdminPermission)('user_management'), (0, express_validator_1.param)('reportId').isUUID().withMessage('Valid report ID is required'), (0, express_validator_1.body)('status').isIn(['valid', 'invalid']).withMessage('Status must be valid or invalid'), (0, express_validator_1.body)('notes').optional().isString().withMessage('Notes must be a string'), validateRequest, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { reportId } = req.params;
        const { status, notes } = req.body;
        const adminId = req.admin.adminId;
        const report = yield legalService_1.default.processDMCAReport(reportId, adminId, status, notes);
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
    }
    catch (error) {
        console.error('Error processing DMCA report:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to process DMCA report';
        res.status(400).json({
            error: errorMessage,
            code: 'DMCA_PROCESSING_FAILED'
        });
    }
}));
exports.default = router;
