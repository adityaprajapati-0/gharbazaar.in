import { Router } from 'express';
import { reviewController } from '../controllers/review.controller';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

/**
 * @route   POST /api/v1/reviews
 * @desc    Create a review
 * @access  Private
 */
router.post('/', authenticate, reviewController.createReview);

/**
 * @route   GET /api/v1/reviews/property/:propertyId
 * @desc    Get reviews for a property
 * @access  Public
 */
router.get('/property/:propertyId', reviewController.getPropertyReviews);

/**
 * @route   POST /api/v1/reviews/:reviewId/helpful
 * @desc    Mark review as helpful
 * @access  Private
 */
router.post('/:reviewId/helpful', authenticate, reviewController.markHelpful);

/**
 * @route   POST /api/v1/reviews/:reviewId/report
 * @desc    Report a review
 * @access  Private
 */
router.post('/:reviewId/report', authenticate, reviewController.reportReview);

/**
 * @route   POST /api/v1/reviews/:reviewId/approve
 * @desc    Approve a review
 * @access  Admin Only
 */
router.post(
    '/:reviewId/approve',
    authenticate,
    requireRole('admin'),
    reviewController.approveReview
);

/**
 * @route   POST /api/v1/reviews/:reviewId/reject
 * @desc    Reject a review
 * @access  Admin Only
 */
router.post(
    '/:reviewId/reject',
    authenticate,
    requireRole('admin'),
    reviewController.rejectReview
);

/**
 * @route   GET /api/v1/reviews/my-reviews
 * @desc    Get user's reviews
 * @access  Private
 */
router.get('/my-reviews', authenticate, reviewController.getUserReviews);

/**
 * @route   GET /api/v1/reviews/pending
 * @desc    Get pending reviews for moderation
 * @access  Admin Only
 */
router.get(
    '/pending',
    authenticate,
    requireRole('admin'),
    reviewController.getPendingReviews
);

export default router;
