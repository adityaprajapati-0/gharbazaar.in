import { Router } from 'express';
import { subscriptionController } from '../controllers/subscription.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

/**
 * @route   GET /api/v1/subscriptions/plans
 * @desc    Get all available subscription plans
 * @access  Public
 */
router.get('/plans', subscriptionController.getPlans);

/**
 * @route   POST /api/v1/subscriptions
 * @desc    Create Razorpay subscription
 * @access  Private
 */
router.post('/', authenticate, subscriptionController.createSubscription);

/**
 * @route   POST /api/v1/subscriptions/verify
 * @desc    Verify subscription payment
 * @access  Private
 */
router.post('/verify', authenticate, subscriptionController.verifySubscription);

/**
 * @route   GET /api/v1/subscriptions/my-subscription
 * @desc    Get user's active subscription
 * @access  Private
 */
router.get('/my-subscription', authenticate, subscriptionController.getUserSubscription);

/**
 * @route   GET /api/v1/subscriptions/status
 * @desc    Check subscription status
 * @access  Private
 */
router.get('/status', authenticate, subscriptionController.checkStatus);

/**
 * @route   POST /api/v1/subscriptions/:subscriptionId/cancel
 * @desc    Cancel subscription
 * @access  Private
 */
router.post('/:subscriptionId/cancel', authenticate, subscriptionController.cancelSubscription);

/**
 * @route   POST /api/v1/subscriptions/webhook
 * @desc    Handle Razorpay webhooks for subscriptions
 * @access  Public (verified by signature)
 */
router.post('/webhook', subscriptionController.handleWebhook);

export default router;
