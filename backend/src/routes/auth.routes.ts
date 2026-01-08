import { Router } from 'express';
import { body } from 'express-validator';
import { AuthController } from '../controllers/auth.controller';
import { authLimiter } from '../middleware/rateLimiter';
import { validate } from '../middleware/validator';

const router = Router();
const authController = new AuthController();

// Apply rate limiting to all auth routes
router.use(authLimiter);

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post(
    '/register',
    [
        body('email').isEmail().withMessage('Invalid email address'),
        body('password')
            .isLength({ min: 6 })
            .withMessage('Password must be at least 6 characters'),
        body('displayName')
            .trim()
            .notEmpty()
            .withMessage('Display name is required'),
        body('role')
            .optional()
            .isIn(['buyer', 'seller', 'partner', 'legal_partner', 'ground_partner'])
            .withMessage('Invalid role'),
        validate,
    ],
    authController.register
);

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post(
    '/login',
    [
        body('email').isEmail().withMessage('Invalid email address'),
        body('password').notEmpty().withMessage('Password is required'),
        validate,
    ],
    authController.login
);

/**
 * @route   POST /api/v1/auth/verify-token
 * @desc    Verify Firebase ID token
 * @access  Public
 */
router.post('/verify-token', authController.verifyToken);

/**
 * @route   POST /api/v1/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
router.post('/refresh', authController.refreshToken);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout user
 * @access  Public
 */
router.post('/logout', authController.logout);

/**
 * @route   POST /api/v1/auth/forgot-password
 * @desc    Send password reset email
 * @access  Public
 */
router.post(
    '/forgot-password',
    [
        body('email').isEmail().withMessage('Invalid email address'),
        validate,
    ],
    authController.forgotPassword
);

export default router;
