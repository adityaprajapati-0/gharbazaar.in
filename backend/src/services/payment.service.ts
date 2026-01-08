import Razorpay from 'razorpay';
import crypto from 'crypto';
import { getFirestore } from '../config/firebase';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { notificationService } from './notification.service';

export class PaymentService {
    private razorpay: Razorpay;
    private db = getFirestore();

    constructor() {
        this.razorpay = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID || '',
            key_secret: process.env.RAZORPAY_KEY_SECRET || '',
        });
    }

    /**
     * Create payment order
     */
    async createOrder(amount: number, currency: string = 'INR', userId: string, purpose: string, metadata?: any) {
        try {
            const options = {
                amount: amount * 100, // Convert to paise
                currency,
                receipt: `receipt_${Date.now()}`,
                notes: {
                    userId,
                    purpose,
                    ...metadata,
                },
            };

            const order = await this.razorpay.orders.create(options);

            // Save order to database
            await this.db.collection('paymentOrders').doc(order.id).set({
                orderId: order.id,
                userId,
                amount: amount,
                currency,
                purpose,
                status: 'created',
                metadata: metadata || null,
                createdAt: new Date().toISOString(),
            });

            logger.info(`Payment order created: ${order.id} for user ${userId}`);

            return {
                success: true,
                order: {
                    id: order.id,
                    amount: amount,
                    currency: order.currency,
                },
            };
        } catch (error) {
            logger.error('Create order error:', error);
            throw new AppError(500, 'Failed to create payment order');
        }
    }

    /**
     * Verify payment signature
     */
    async verifyPayment(orderId: string, paymentId: string, signature: string) {
        try {
            const text = `${orderId}|${paymentId}`;
            const expectedSignature = crypto
                .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
                .update(text)
                .digest('hex');

            const isValid = expectedSignature === signature;

            if (!isValid) {
                throw new AppError(400, 'Invalid payment signature');
            }

            // Update order status
            await this.db.collection('paymentOrders').doc(orderId).update({
                status: 'paid',
                paymentId,
                paidAt: new Date().toISOString(),
            });

            // Get order details
            const orderDoc = await this.db.collection('paymentOrders').doc(orderId).get();
            const orderData = orderDoc.data();

            // Create transaction record
            const transactionRef = await this.db.collection('transactions').add({
                orderId,
                paymentId,
                userId: orderData?.userId,
                amount: orderData?.amount,
                currency: orderData?.currency,
                purpose: orderData?.purpose,
                status: 'completed',
                type: 'payment',
                metadata: orderData?.metadata,
                createdAt: new Date().toISOString(),
            });

            // Send notification to user
            await notificationService.create({
                userId: orderData?.userId!,
                type: 'payment_success',
                title: 'Payment Successful',
                message: `Your payment of ₹${orderData?.amount} was successful`,
                data: { orderId, paymentId, transactionId: transactionRef.id },
            });

            logger.info(`Payment verified: ${paymentId} for order ${orderId}`);

            return {
                success: true,
                verified: true,
                transactionId: transactionRef.id,
            };
        } catch (error) {
            logger.error('Verify payment error:', error);
            throw error;
        }
    }

    /**
     * Get transaction history for user
     */
    async getTransactionHistory(userId: string, limit: number = 50) {
        try {
            const snapshot = await this.db
                .collection('transactions')
                .where('userId', '==', userId)
                .orderBy('createdAt', 'desc')
                .limit(limit)
                .get();

            const transactions = snapshot.docs.map((doc: any) => ({
                id: doc.id,
                ...doc.data(),
            }));

            return {
                success: true,
                transactions,
                count: transactions.length,
            };
        } catch (error) {
            logger.error('Get transaction history error:', error);
            throw new AppError(500, 'Failed to get transaction history');
        }
    }

    /**
     * Get transaction by ID
     */
    async getTransaction(transactionId: string) {
        try {
            const doc = await this.db.collection('transactions').doc(transactionId).get();

            if (!doc.exists) {
                throw new AppError(404, 'Transaction not found');
            }

            return {
                success: true,
                transaction: { id: doc.id, ...doc.data() },
            };
        } catch (error) {
            logger.error('Get transaction error:', error);
            throw error;
        }
    }

    /**
     * Initiate refund
     */
    async initiateRefund(paymentId: string, amount?: number, reason?: string) {
        try {
            const refund = await this.razorpay.payments.refund(paymentId, {
                amount: amount ? amount * 100 : undefined, // Partial or full refund
                notes: { reason: reason || 'Refund requested' },
            });

            // Create refund record
            const refundRef = await this.db.collection('refunds').add({
                refundId: refund.id,
                paymentId,
                amount: (refund.amount || 0) / 100,
                status: refund.status,
                reason,
                createdAt: new Date().toISOString(),
            });

            logger.info(`Refund initiated: ${refund.id} for payment ${paymentId}`);

            return {
                success: true,
                refund: {
                    id: refund.id,
                    amount: (refund.amount || 0) / 100,
                    status: refund.status,
                },
            };
        } catch (error) {
            logger.error('Initiate refund error:', error);
            throw new AppError(500, 'Failed to initiate refund');
        }
    }

    /**
     * Generate invoice
     */
    async generateInvoice(transactionId: string) {
        try {
            const transactionDoc = await this.db.collection('transactions').doc(transactionId).get();

            if (!transactionDoc.exists) {
                throw new AppError(404, 'Transaction not found');
            }

            const transaction = transactionDoc.data();

            // Get user details
            const userDoc = await this.db.collection('users').doc(transaction?.userId).get();
            const user = userDoc.data();

            const invoice = {
                invoiceNumber: `INV-${Date.now()}`,
                transactionId,
                date: new Date().toISOString(),
                customer: {
                    name: user?.displayName,
                    email: user?.email,
                },
                items: [
                    {
                        description: transaction?.purpose,
                        amount: transaction?.amount,
                    },
                ],
                total: transaction?.amount,
                currency: transaction?.currency || 'INR',
                status: 'paid',
            };

            // Save invoice
            const invoiceRef = await this.db.collection('invoices').add({
                ...invoice,
                createdAt: new Date().toISOString(),
            });

            logger.info(`Invoice generated: ${invoice.invoiceNumber}`);

            return {
                success: true,
                invoice: { id: invoiceRef.id, ...invoice },
            };
        } catch (error) {
            logger.error('Generate invoice error:', error);
            throw new AppError(500, 'Failed to generate invoice');
        }
    }

    /**
     * Get payment statistics for user
     */
    async getPaymentStats(userId: string) {
        try {
            const snapshot = await this.db
                .collection('transactions')
                .where('userId', '==', userId)
                .where('status', '==', 'completed')
                .get();

            const transactions = snapshot.docs.map((doc: any) => doc.data());

            const totalSpent = transactions.reduce((sum: number, t: any) => sum + (t.amount || 0), 0);
            const transactionCount = transactions.length;

            return {
                success: true,
                stats: {
                    totalSpent,
                    transactionCount,
                    currency: 'INR',
                },
            };
        } catch (error) {
            logger.error('Get payment stats error:', error);
            throw new AppError(500, 'Failed to get payment statistics');
        }
    }

    /**
     * Handle Razorpay webhook
     */
    async handleWebhook(event: any, signature: string) {
        try {
            // Verify webhook signature
            const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || '';
            const expectedSignature = crypto
                .createHmac('sha256', webhookSecret)
                .update(JSON.stringify(event))
                .digest('hex');

            if (expectedSignature !== signature) {
                throw new AppError(400, 'Invalid webhook signature');
            }

            const { event: eventType, payload } = event;

            switch (eventType) {
                case 'payment.captured':
                    await this.handlePaymentCaptured(payload.payment.entity);
                    break;
                case 'payment.failed':
                    await this.handlePaymentFailed(payload.payment.entity);
                    break;
                case 'refund.created':
                    await this.handleRefundCreated(payload.refund.entity);
                    break;
                default:
                    logger.info(`Unhandled webhook event: ${eventType}`);
            }

            return { success: true };
        } catch (error) {
            logger.error('Webhook error:', error);
            throw error;
        }
    }

    private async handlePaymentCaptured(payment: any) {
        logger.info(`Payment captured: ${payment.id}`);
        // Additional logic for payment captured
    }

    private async handlePaymentFailed(payment: any) {
        logger.info(`Payment failed: ${payment.id}`);

        // Update order status
        if (payment.order_id) {
            await this.db.collection('paymentOrders').doc(payment.order_id).update({
                status: 'failed',
                failedAt: new Date().toISOString(),
            });
        }

        // Notify user
        // TODO: Send payment failed notification
    }

    private async handleRefundCreated(refund: any) {
        logger.info(`Refund created: ${refund.id}`);

        // Update refund status
        await this.db.collection('refunds').where('refundId', '==', refund.id).get()
            .then((snapshot: any) => {
                if (!snapshot.empty) {
                    snapshot.docs[0].ref.update({
                        status: refund.status,
                        updatedAt: new Date().toISOString(),
                    });
                }
            });
    }
}

export const paymentService = new PaymentService();
