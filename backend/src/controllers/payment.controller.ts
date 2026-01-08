import { Request, Response, NextFunction } from 'express';
import { paymentService } from '../services/payment.service';
import { AppError } from '../middleware/errorHandler';

export class PaymentController {
    /**
     * Create payment order
     */
    async createOrder(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user?.uid;
            const { amount, currency, purpose, metadata } = req.body;

            if (!userId) {
                throw new AppError(401, 'Unauthorized');
            }

            if (!amount || !purpose) {
                throw new AppError(400, 'Amount and purpose are required');
            }

            const result = await paymentService.createOrder(amount, currency, userId, purpose, metadata);

            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Verify payment
     */
    async verifyPayment(req: Request, res: Response, next: NextFunction) {
        try {
            const { orderId, paymentId, signature } = req.body;

            if (!orderId || !paymentId || !signature) {
                throw new AppError(400, 'Order ID, payment ID, and signature are required');
            }

            const result = await paymentService.verifyPayment(orderId, paymentId, signature);

            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get transaction history
     */
    async getTransactionHistory(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user?.uid;
            const { limit } = req.query;

            if (!userId) {
                throw new AppError(401, 'Unauthorized');
            }

            const result = await paymentService.getTransactionHistory(
                userId,
                limit ? parseInt(limit as string) : 50
            );

            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get transaction by ID
     */
    async getTransaction(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;

            const result = await paymentService.getTransaction(id);

            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Initiate refund
     */
    async initiateRefund(req: Request, res: Response, next: NextFunction) {
        try {
            const { paymentId, amount, reason } = req.body;

            if (!paymentId) {
                throw new AppError(400, 'Payment ID is required');
            }

            const result = await paymentService.initiateRefund(paymentId, amount, reason);

            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Generate invoice
     */
    async generateInvoice(req: Request, res: Response, next: NextFunction) {
        try {
            const { transactionId } = req.params;

            const result = await paymentService.generateInvoice(transactionId);

            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get payment statistics
     */
    async getPaymentStats(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user?.uid;

            if (!userId) {
                throw new AppError(401, 'Unauthorized');
            }

            const result = await paymentService.getPaymentStats(userId);

            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Handle Razorpay webhook
     */
    async handleWebhook(req: Request, res: Response, next: NextFunction) {
        try {
            const signature = req.headers['x-razorpay-signature'] as string;
            const event = req.body;

            await paymentService.handleWebhook(event, signature);

            res.json({ success: true });
        } catch (error) {
            next(error);
        }
    }
}

export const paymentController = new PaymentController();
