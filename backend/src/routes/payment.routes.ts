import { Router } from 'express';
import { paymentController } from '../controllers/payment.controller';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

/**
 * @route   POST /api/v1/payment/create-order
 * @desc    Create Razorpay payment order
 * @access  Private
 */
router.post('/create-order', authenticate, paymentController.createOrder);

/**
 * @route   POST /api/v1/payment/verify
 * @desc    Verify payment signature
 * @access  Private
 */
router.post('/verify', authenticate, paymentController.verifyPayment);

/**
 * @route   GET /api/v1/payment/transactions
 * @desc    Get user's transaction history
 * @access  Private
 */
router.get('/transactions', authenticate, paymentController.getTransactionHistory);

/**
 * @route   GET /api/v1/payment/transactions/:id
 * @desc    Get transaction by ID
 * @access  Private
 */
router.get('/transactions/:id', authenticate, paymentController.getTransaction);

/**
 * @route   POST /api/v1/payment/refund
 * @desc    Initiate refund
 * @access  Admin Only
 */
router.post('/refund', authenticate, requireRole('admin'), paymentController.initiateRefund);

/**
 * @route   GET /api/v1/payment/invoice/:transactionId
 * @desc    Generate invoice for transaction
 * @access  Private
 */
router.get('/invoice/:transactionId', authenticate, paymentController.generateInvoice);

/**
 * @route   GET /api/v1/payment/stats
 * @desc    Get payment statistics for user
 * @access  Private
 */
router.get('/stats', authenticate, paymentController.getPaymentStats);

/**
 * @route   POST /api/v1/payment/webhook
 * @desc    Handle Razorpay webhook
 * @access  Public (verified by signature)
 */
router.post('/webhook', paymentController.handleWebhook);

export default router;
