import { Router } from 'express';
import { webhookController } from '../controllers/webhook.controller';

const router = Router();

/**
 * Unified Razorpay webhook endpoint
 * Handles both payment and subscription events
 * 
 * Events handled:
 * - payment.authorized
 * - payment.captured  
 * - payment.failed
 * - subscription.charged
 * - subscription.activated
 * - subscription.completed
 * - subscription.cancelled
 * - subscription.halted
 * - refund.created
 */
router.post('/razorpay', webhookController.handleRazorpayWebhook);

export default router;
