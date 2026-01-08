import { Router } from 'express';
import { body, query } from 'express-validator';
import { PropertyController } from '../controllers/property.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validator';
import { searchLimiter, publicLimiter, strictLimiter } from '../middleware/rateLimiter';
import { propertyCache, trendingCache, responseCache } from '../middleware/cacheMiddleware';
import { CacheService } from '../services/cache.service';

const router = Router();
const propertyController = new PropertyController();

/**
 * @route   GET /api/v1/properties/search
 * @desc    Search properties with filters (CACHED)
 * @access  Public
 */
router.get(
    '/search',
    searchLimiter,
    propertyCache,
    [
        query('city').optional().trim(),
        query('propertyType').optional().isIn(['apartment', 'villa', 'house', 'plot', 'commercial']),
        query('minPrice').optional().isNumeric(),
        query('maxPrice').optional().isNumeric(),
        query('bedrooms').optional().isNumeric(),
        query('page').optional().isNumeric(),
        query('limit').optional().isNumeric(),
        validate,
    ],
    propertyController.searchProperties
);

/**
 * @route   GET /api/v1/properties/trending
 * @desc    Get trending properties (CACHED - high traffic)
 * @access  Public
 */
router.get(
    '/trending',
    publicLimiter,
    trendingCache,
    propertyController.getTrendingProperties
);

/**
 * @route   GET /api/v1/properties/:id
 * @desc    Get property by ID (CACHED)
 * @access  Public
 */
router.get(
    '/:id',
    publicLimiter,
    responseCache({ ttl: CacheService.TTL.PROPERTY_DETAIL, prefix: 'propdetail' }),
    propertyController.getPropertyById
);

/**
 * @route   POST /api/v1/properties/:id/inquiry
 * @desc    Create inquiry for property (creates lead, notifies seller & employee)
 * @access  Private (Buyer)
 */
router.post(
    '/:id/inquiry',
    authenticate,
    strictLimiter, // Prevent spam inquiries
    [
        body('message').optional().trim(),
        validate,
    ],
    propertyController.createInquiry
);

/**
 * @route   POST /api/v1/properties
 * @desc    Create new property listing
 * @access  Private (Seller)
 */
router.post(
    '/',
    authenticate,
    authorize('seller', 'admin'),
    strictLimiter,
    [
        body('title').trim().notEmpty().withMessage('Title is required'),
        body('description').trim().notEmpty(),
        body('propertyType').isIn(['apartment', 'villa', 'house', 'plot', 'commercial']),
        body('price').isNumeric().withMessage('Price must be a number'),
        body('area').isNumeric(),
        body('city').trim().notEmpty(),
        body('state').trim().notEmpty(),
        validate,
    ],
    propertyController.createProperty
);

/**
 * @route   PUT /api/v1/properties/:id
 * @desc    Update property
 * @access  Private (Owner/Admin)
 */
router.put(
    '/:id',
    authenticate,
    authorize('seller', 'admin'),
    propertyController.updateProperty
);

/**
 * @route   DELETE /api/v1/properties/:id
 * @desc    Delete property
 * @access  Private (Owner/Admin)
 */
router.delete(
    '/:id',
    authenticate,
    authorize('seller', 'admin'),
    propertyController.deleteProperty
);

/**
 * @route   GET /api/v1/properties/user/:userId
 * @desc    Get properties by user ID
 * @access  Private
 */
router.get(
    '/user/:userId',
    authenticate,
    propertyController.getPropertiesByUser
);

/**
 * @route   GET /api/v1/properties/:id/analytics
 * @desc    Get property analytics (views, favorites, inquiries)
 * @access  Private (Owner/Admin)
 */
router.get(
    '/:id/analytics',
    authenticate,
    propertyController.getPropertyAnalytics
);

/**
 * @route   GET /api/v1/properties/:id/similar
 * @desc    Get similar properties (CACHED)
 * @access  Public
 */
router.get(
    '/:id/similar',
    publicLimiter,
    responseCache({ ttl: CacheService.TTL.MEDIUM, prefix: 'similar' }),
    propertyController.getSimilarProperties
);

/**
 * @route   POST /api/v1/properties/:id/view
 * @desc    Track property view
 * @access  Public
 */
router.post(
    '/:id/view',
    publicLimiter,
    propertyController.trackPropertyView
);

export default router;

