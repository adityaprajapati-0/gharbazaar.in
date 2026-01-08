import { Request, Response, NextFunction } from 'express';
import { paymentService } from '../services/payment.service';
import { subscriptionService } from '../services/subscription.service';
import { logger } from '../utils/logger';

export class WebhookController {
    /**
     * Handle Razorpay webhooks - unified handler for all Razorpay events
     */
    async handleRazorpayWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const signature = req.headers['x-razorpay-signature'] as string;
            const event = req.body;

            if (!signature) {
                logger.error('Webhook signature missing');
                res.status(400).json({
                    success: false,
                    error: 'Signature missing'
                });
                return;
            }

            logger.info(`Received Razorpay webhook: ${event.event}`);

            // Determine if it's a payment or subscription event
            const eventType = event.event;

            if (eventType.startsWith('subscription.')) {
                // Handle subscription events
                await subscriptionService.handleWebhook(event, signature);
            } else if (eventType.startsWith('payment.') || eventType.startsWith('refund.')) {
                // Handle payment and refund events
                await paymentService.handleWebhook(event, signature);
            } else {
                logger.warn(`Unhandled webhook event type: ${eventType}`);
            }

            res.json({ success: true });
        } catch (error) {
            logger.error('Webhook processing error:', error);
            // Still return 200 to prevent Razorpay from retrying
            // Log the error for manual investigation
            res.status(200).json({
                success: false,
                error: 'Internal processing error'
            });
        }
    }
}

export const webhookController = new WebhookController();
