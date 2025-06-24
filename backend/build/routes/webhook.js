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
const paymentService_1 = __importDefault(require("../services/paymentService"));
const router = (0, express_1.Router)();
/**
 * POST /api/webhook/stripe
 * Handle Stripe webhooks
 */
router.post('/stripe', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const signature = req.headers['stripe-signature'];
        if (!signature) {
            return res.status(400).json({
                error: 'Missing Stripe signature',
                code: 'MISSING_SIGNATURE'
            });
        }
        // Get raw body for webhook verification
        const payload = req.body;
        yield paymentService_1.default.processWebhook(payload, signature);
        res.json({
            message: 'Webhook processed successfully',
            received: true,
        });
    }
    catch (error) {
        console.error('Webhook processing error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Webhook processing failed';
        res.status(400).json({
            error: errorMessage,
            code: 'WEBHOOK_PROCESSING_FAILED'
        });
    }
}));
/**
 * GET /api/webhook/test
 * Test webhook endpoint
 */
router.get('/test', (req, res) => {
    res.json({
        message: 'Webhook endpoint is working',
        timestamp: new Date().toISOString(),
    });
});
exports.default = router;
