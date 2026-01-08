import { Router } from 'express';
import { notificationController } from '../controllers/notification.controller';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

/**
 * @route   GET /api/v1/notifications
 * @desc    Get user's notifications with pagination
 * @access  Private
 */
router.get('/', authenticate, notificationController.getUserNotifications);

/**
 * @route   PUT /api/v1/notifications/mark-all-read
 * @desc    Mark all notifications as read
 * @access  Private
 */
router.put('/mark-all-read', authenticate, notificationController.markAllAsRead);

/**
 * @route   PUT /api/v1/notifications/:id/read
 * @desc    Mark specific notification as read
 * @access  Private
 */
router.put('/:id/read', authenticate, notificationController.markAsRead);

/**
 * @route   POST /api/v1/notifications
 * @desc    Create notification (admin/system only)
 * @access  Admin
 */
router.post('/', authenticate, requireRole('admin'), notificationController.createNotification);

/**
 * @route   DELETE /api/v1/notifications/:id
 * @desc    Delete notification
 * @access  Private
 */
router.delete('/:id', authenticate, notificationController.deleteNotification);

export default router;
