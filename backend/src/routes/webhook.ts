import { Router, Request, Response } from 'express';
import PaymentService from '../services/paymentService';

const router = Router();

/**
 * POST /api/webhook/stripe
 * Handle Stripe webhooks
 */
router.post('/stripe', async (req: Request, res: Response) => {
  try {
    const signature = req.headers['stripe-signature'] as string;
    
    if (!signature) {
      return res.status(400).json({
        error: 'Missing Stripe signature',
        code: 'MISSING_SIGNATURE'
      });
    }

    // Get raw body for webhook verification
    const payload = req.body;

    await PaymentService.processWebhook(payload, signature);

    res.json({
      message: 'Webhook processed successfully',
      received: true,
    });
  } catch (error) {
    console.error('Webhook processing error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Webhook processing failed';
    
    res.status(400).json({
      error: errorMessage,
      code: 'WEBHOOK_PROCESSING_FAILED'
    });
  }
});

/**
 * GET /api/webhook/test
 * Test webhook endpoint
 */
router.get('/test', (req: Request, res: Response) => {
  res.json({
    message: 'Webhook endpoint is working',
    timestamp: new Date().toISOString(),
  });
});

export default router;
