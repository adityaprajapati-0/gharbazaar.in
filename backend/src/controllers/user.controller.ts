import { Request, Response, NextFunction } from 'express';
import { userService } from '../services/user.service';
import { AppError } from '../middleware/errorHandler';

export class UserController {
    /**
     * Get current user profile
     */
    async getProfile(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user?.uid;

            if (!userId) {
                throw new AppError(401, 'Unauthorized');
            }

            const result = await userService.getUserProfile(userId);

            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Update user profile
     */
    async updateProfile(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user?.uid;
            const updates = req.body;

            if (!userId) {
                throw new AppError(401, 'Unauthorized');
            }

            const result = await userService.updateProfile(userId, updates);

            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Upload avatar
     */
    async uploadAvatar(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user?.uid;
            const file = req.file;

            if (!userId) {
                throw new AppError(401, 'Unauthorized');
            }

            if (!file) {
                throw new AppError(400, 'No file uploaded');
            }

            const result = await userService.uploadAvatar(userId, file);

            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get user statistics
     */
    async getStats(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user?.uid;

            if (!userId) {
                throw new AppError(401, 'Unauthorized');
            }

            const result = await userService.getUserStats(userId);

            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Update notification preferences
     */
    async updateNotificationPreferences(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user?.uid;
            const preferences = req.body;

            if (!userId) {
                throw new AppError(401, 'Unauthorized');
            }

            const result = await userService.updateNotificationPreferences(userId, preferences);

            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Search users (admin only)
     */
    async searchUsers(req: Request, res: Response, next: NextFunction) {
        try {
            const { query, role, limit } = req.query;

            const result = await userService.searchUsers(
                query as string || '',
                role as string,
                limit ? parseInt(limit as string) : 50
            );

            res.json(result);
        } catch (error) {
            next(error);
        }
    }
}

export const userController = new UserController();
