/**
 * 🛣️ AUTHENTICATION ROUTES
 * 
 * Defines all auth-related API endpoints.
 * 
 * @author GharBazaar Backend Team
 */

import express from 'express';
import * as authController from '../controllers/auth.controller';

const router = express.Router();

/**
 * @route   POST /api/v1/auth/login
 * @desc    Authenticate user & get token
 * @access  Public
 */
router.post('/login', authController.login);

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', authController.register);

/**
 * @route   POST /api/v1/auth/verify-token
 * @desc    Verify if JWT is valid
 * @access  Public
 */
router.post('/verify-token', authController.verifyToken);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout user
 * @access  Public
 */
router.post('/logout', authController.logout);

/**
 * @route   POST /api/v1/auth/forgot-password
 * @desc    Request password reset
 * @access  Public
 */
router.post('/forgot-password', (req, res) => {
    res.json({ success: true, message: 'Reset email sent (Mock)' });
});

export default router;
