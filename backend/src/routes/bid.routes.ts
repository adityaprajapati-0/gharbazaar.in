import { Router } from 'express';
import { bidController } from '../controllers/bid.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

/**
 * @route   POST /api/v1/bids
 * @desc    Create a bid on property
 * @access  Private (Buyer)
 */
router.post('/', authenticate, bidController.createBid);

/**
 * @route   POST /api/v1/bids/:bidId/accept
 * @desc    Accept a bid
 * @access  Private (Seller)
 */
router.post('/:bidId/accept', authenticate, bidController.acceptBid);

/**
 * @route   POST /api/v1/bids/:bidId/reject
 * @desc    Reject a bid
 * @access  Private (Seller)
 */
router.post('/:bidId/reject', authenticate, bidController.rejectBid);

/**
 * @route   POST /api/v1/bids/:bidId/counter
 * @desc    Create counter offer
 * @access  Private (Seller)
 */
router.post('/:bidId/counter', authenticate, bidController.createCounterOffer);

/**
 * @route   POST /api/v1/bids/:bidId/accept-counter
 * @desc    Accept counter offer
 * @access  Private (Buyer)
 */
router.post('/:bidId/accept-counter', authenticate, bidController.acceptCounterOffer);

/**
 * @route   POST /api/v1/bids/:bidId/withdraw
 * @desc    Withdraw a bid
 * @access  Private (Buyer)
 */
router.post('/:bidId/withdraw', authenticate, bidController.withdrawBid);

/**
 * @route   GET /api/v1/bids/property/:propertyId
 * @desc    Get all bids for a property
 * @access  Private (Seller)
 */
router.get('/property/:propertyId', authenticate, bidController.getPropertyBids);

/**
 * @route   GET /api/v1/bids/my-bids
 * @desc    Get buyer's bids
 * @access  Private (Buyer)
 */
router.get('/my-bids', authenticate, bidController.getBuyerBids);

export default router;
