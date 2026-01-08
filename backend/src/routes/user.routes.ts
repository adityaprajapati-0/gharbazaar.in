import { Router } from 'express';
import { userController } from '../controllers/user.controller';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

/**
 * @route   GET /api/v1/users/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/profile', authenticate, userController.getProfile);

/**
 * @route   PUT /api/v1/users/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile', authenticate, userController.updateProfile);

/**
 * @route   POST /api/v1/users/avatar
 * @desc    Upload user avatar
 * @access  Private
 */
router.post('/avatar', authenticate, userController.uploadAvatar);

/**
 * @route   GET /api/v1/users/stats
 * @desc    Get user statistics
 * @access  Private
 */
router.get('/stats', authenticate, userController.getStats);

/**
 * @route   PUT /api/v1/users/preferences
 * @desc    Update notification preferences
 * @access  Private
 */
router.put('/preferences', authenticate, userController.updateNotificationPreferences);

/**
 * @route   GET /api/v1/users/search
 * @desc    Search users
 * @access  Admin Only
 */
router.get('/search', authenticate, requireRole('admin'), userController.searchUsers);

export default router;
