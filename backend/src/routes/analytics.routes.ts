import { Router } from 'express';
import { analyticsController } from '../controllers/analytics.controller';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

/**
 * @route   GET /api/v1/analytics/admin/dashboard
 * @desc    Get admin dashboard analytics
 * @access  Admin Only
 */
router.get(
    '/admin/dashboard',
    authenticate,
    requireRole('admin'),
    analyticsController.getAdminDashboard
);

/**
 * @route   GET /api/v1/analytics/seller/insights
 * @desc    Get seller property insights
 * @access  Private (Seller)
 */
router.get(
    '/seller/insights',
    authenticate,
    analyticsController.getSellerInsights
);

/**
 * @route   GET /api/v1/analytics/search/suggestions
 * @desc    Get search suggestions
 * @access  Public
 */
router.get(
    '/search/suggestions',
    analyticsController.getSearchSuggestions
);

/**
 * @route   POST /api/v1/analytics/search/track
 * @desc    Track search query
 * @access  Public
 */
router.post(
    '/search/track',
    analyticsController.trackSearch
);

/**
 * @route   GET /api/v1/analytics/search/popular
 * @desc    Get popular searches
 * @access  Public
 */
router.get(
    '/search/popular',
    analyticsController.getPopularSearches
);

/**
 * @route   GET /api/v1/analytics/property/:propertyId/performance
 * @desc    Get property performance metrics
 * @access  Private
 */
router.get(
    '/property/:propertyId/performance',
    authenticate,
    analyticsController.getPropertyPerformance
);

/**
 * @route   GET /api/v1/analytics/citywise
 * @desc    Get citywise property analytics
 * @access  Public
 */
router.get(
    '/citywise',
    analyticsController.getCitywiseAnalytics
);

export default router;
