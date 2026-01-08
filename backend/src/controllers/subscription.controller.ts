import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { subscriptionService } from '../services/subscription.service';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

export class SubscriptionController {
    /**
     * Get all available subscription plans
     */
    async getPlans(req: Request, res: Response, next: NextFunction) {
        try {
            const plans = subscriptionService.getPlans();

            res.json({
                success: true,
                data: { plans },
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Create Razorpay subscription
     */
    async createSubscription(req: Request, res: Response, next: NextFunction) {
        try {
            const user = (req as AuthRequest).user;
            const { planId } = req.body;

            if (!planId) {
                throw new AppError(400, 'Plan ID is required');
            }

            // Create Razorpay subscription
            const subscription = await subscriptionService.createRazorpaySubscription(
                user!.uid,
                planId
            );

            res.status(201).json({
                success: true,
                message: 'Subscription created successfully',
                data: { subscription },
            });
        } catch (error) {
            logger.error('Create subscription error:', error);
            next(error);
        }
    }

    /**
     * Verify subscription payment
     */
    async verifySubscription(req: Request, res: Response, next: NextFunction) {
        try {
            const user = (req as AuthRequest).user;
            const { subscription_id, payment_id, signature } = req.body;

            if (!subscription_id || !payment_id || !signature) {
                throw new AppError(400, 'Missing required fields');
            }

            // Verify signature
            const result = await subscriptionService.verifySubscriptionPayment(
                subscription_id,
                payment_id,
                signature,
                user!.uid
            );

            res.json(result);
        } catch (error) {
            logger.error('Verify subscription error:', error);
            next(error);
        }
    }

    /**
     * Get user's active subscription
     */
    async getUserSubscription(req: Request, res: Response, next: NextFunction) {
        try {
            const user = (req as AuthRequest).user;
            const subscription = await subscriptionService.getUserSubscription(user!.uid);

            res.json({
                success: true,
                data: { subscription },
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Check subscription status
     */
    async checkStatus(req: Request, res: Response, next: NextFunction) {
        try {
            const user = (req as AuthRequest).user;
            const status = await subscriptionService.checkStatus(user!.uid);

            res.json({
                success: true,
                data: status,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Cancel subscription
     */
    async cancelSubscription(req: Request, res: Response, next: NextFunction) {
        try {
            const user = (req as AuthRequest).user;
            const { subscriptionId } = req.params;

            await subscriptionService.cancelSubscription(subscriptionId, user!.uid);

            res.json({
                success: true,
                message: 'Subscription cancelled successfully',
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Handle subscription webhook from Razorpay
     */
    async handleWebhook(req: Request, res: Response, next: NextFunction) {
        try {
            const signature = req.headers['x-razorpay-signature'] as string;
            const event = req.body;

            await subscriptionService.handleWebhook(event, signature);

            res.json({ success: true });
        } catch (error) {
            logger.error('Subscription webhook error:', error);
            next(error);
        }
    }
}

export const subscriptionController = new SubscriptionController();
