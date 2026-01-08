import { Router } from 'express';
import { PartnerController } from '../controllers/partner.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
const partnerController = new PartnerController();

// All partner routes require authentication and partner role
router.use(authenticate);
router.use(authorize('partner'));

/**
 * @route   GET /api/v1/partner/leads
 * @desc    Get partner's leads
 * @access  Partner
 */
router.get('/leads', partnerController.getLeads);

/**
 * @route   GET /api/v1/partner/leads/:id
 * @desc    Get lead by ID
 * @access  Partner
 */
router.get('/leads/:id', partnerController.getLeadById);

/**
 * @route   PUT /api/v1/partner/leads/:id
 * @desc    Update lead status
 * @access  Partner
 */
router.put('/leads/:id', partnerController.updateLead);

/**
 * @route   GET /api/v1/partner/earnings
 * @desc    Get partner earnings
 * @access  Partner
 */
router.get('/earnings', partnerController.getEarnings);

/**
 * @route   GET /api/v1/partner/referrals
 * @desc    Get partner referrals
 * @access  Partner
 */
router.get('/referrals', partnerController.getReferrals);

/**
 * @route   POST /api/v1/partner/referrals
 * @desc    Create referral
 * @access  Partner
 */
router.post('/referrals', partnerController.createReferral);

/**
 * @route   GET /api/v1/partner/payments
 * @desc    Get payment history
 * @access  Partner
 */
router.get('/payments', partnerController.getPayments);

export default router;
