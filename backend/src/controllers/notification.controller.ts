import { Request, Response, NextFunction } from 'express';
import { notificationService } from '../services/notification.service';
import { logger } from '../utils/logger';

/**
 * Notification Controller
 * Handles notification-related HTTP endpoints
 */

/**
 * Get user's notifications
 * GET /api/v1/notifications
 */
export const getUserNotifications = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const userId = req.user?.uid;
        if (!userId) {
            res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
            return;
        }

        const { limit, after, unreadOnly } = req.query;

        const result = await notificationService.getUserNotifications(userId, {
            limit: limit ? parseInt(limit as string) : 20,
            after: after as string,
            unreadOnly: unreadOnly === 'true',
        });

        // Get unread count
        const userDoc = await notificationService['db']
            .collection('users')
            .doc(userId)
            .get();
        const unreadCount = userDoc.data()?.unreadNotifications || 0;

        res.json({
            success: true,
            data: {
                notifications: result.notifications,
                hasMore: result.hasMore,
                unreadCount,
            },
        });
    } catch (error) {
        logger.error('Error fetching notifications:', error);
        next(error);
    }
};

/**
 * Mark notification as read
 * PUT /api/v1/notifications/:id/read
 */
export const markAsRead = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const userId = req.user?.uid;
        const { id } = req.params;

        if (!userId) {
            res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
            return;
        }

        await notificationService.markAsRead(id, userId);

        res.json({
            success: true,
            message: 'Notification marked as read',
        });
    } catch (error) {
        logger.error('Error marking notification as read:', error);
        next(error);
    }
};

/**
 * Mark all notifications as read
 * PUT /api/v1/notifications/mark-all-read
 */
export const markAllAsRead = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const userId = req.user?.uid;

        if (!userId) {
            res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
            return;
        }

        const count = await notificationService.markAllAsRead(userId);

        res.json({
            success: true,
            message: `${count} notifications marked as read`,
            data: { count },
        });
    } catch (error) {
        logger.error('Error marking all notifications as read:', error);
        next(error);
    }
};

/**
 * Create notification (admin/system only)
 * POST /api/v1/notifications
 */
export const createNotification = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { userId, type, title, message, link, data, metadata, channels } = req.body;

        if (!userId || !type || !title || !message) {
            res.status(400).json({
                success: false,
                message: 'Missing required fields: userId, type, title, message',
            });
            return;
        }

        const result = await notificationService.send({
            userId,
            type,
            title,
            message,
            link,
            data,
            metadata,
            channels: channels || ['in_app'],
        });

        res.status(201).json({
            success: true,
            message: 'Notification created',
            data: result,
        });
    } catch (error) {
        logger.error('Error creating notification:', error);
        next(error);
    }
};

/**
 * Delete notification
 * DELETE /api/v1/notifications/:id
 */
export const deleteNotification = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const userId = req.user?.uid;
        const { id } = req.params;

        if (!userId) {
            res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
            return;
        }

        // Verify notification belongs to user
        const notifDoc = await notificationService['db']
            .collection('notifications')
            .doc(id)
            .get();

        if (!notifDoc.exists) {
            res.status(404).json({
                success: false,
                message: 'Notification not found',
            });
            return;
        }

        if (notifDoc.data()?.userId !== userId) {
            res.status(403).json({
                success: false,
                message: 'Forbidden',
            });
            return;
        }

        await notificationService['db'].collection('notifications').doc(id).delete();

        res.json({
            success: true,
            message: 'Notification deleted',
        });
    } catch (error) {
        logger.error('Error deleting notification:', error);
        next(error);
    }
};

export const notificationController = {
    getUserNotifications,
    markAsRead,
    markAllAsRead,
    createNotification,
    deleteNotification,
};
