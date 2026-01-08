import { getFirestore } from '../config/firebase';
import { getStorage } from '../config/firebase';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

export class UserService {
    private db = getFirestore();

    /**
     * Get user profile by ID
     */
    async getUserProfile(uid: string) {
        try {
            const userDoc = await this.db.collection('users').doc(uid).get();

            if (!userDoc.exists) {
                throw new AppError(404, 'User not found');
            }

            return {
                success: true,
                user: { id: userDoc.id, ...userDoc.data() },
            };
        } catch (error) {
            logger.error('Get profile error:', error);
            throw error;
        }
    }

    /**
     * Update user profile
     */
    async updateProfile(uid: string, updates: {
        displayName?: string;
        photoURL?: string;
        phoneNumber?: string;
        bio?: string;
        location?: string;
    }) {
        try {
            await this.db.collection('users').doc(uid).update({
                ...updates,
                updatedAt: new Date().toISOString(),
            });

            logger.info(`User profile updated: ${uid}`);

            return { success: true };
        } catch (error) {
            logger.error('Update profile error:', error);
            throw new AppError(500, 'Failed to update profile');
        }
    }

    /**
     * Upload user avatar
     */
    async uploadAvatar(uid: string, file: any) {
        try {
            // TODO: Implement file upload to Firebase Storage
            const photoURL = `https://storage.googleapis.com/avatars/${uid}.jpg`;

            await this.db.collection('users').doc(uid).update({
                photoURL,
                updatedAt: new Date().toISOString(),
            });

            return {
                success: true,
                photoURL,
            };
        } catch (error) {
            logger.error('Avatar upload error:', error);
            throw new AppError(500, 'Failed to upload avatar');
        }
    }

    /**
     * Get user statistics
     */
    async getUserStats(uid: string) {
        try {
            const userDoc = await this.db.collection('users').doc(uid).get();
            const userData = userDoc.data();

            if (!userData) {
                throw new AppError(404, 'User not found');
            }

            // Get property count
            const propertiesSnapshot = await this.db
                .collection('properties')
                .where('sellerId', '==', uid)
                .get();

            // Get favorites count
            const favoritesSnapshot = await this.db
                .collection('favorites')
                .where('userId', '==', uid)
                .get();

            // Get messages count
            const messagesSnapshot = await this.db
                .collection('conversations')
                .where('participants', 'array-contains', uid)
                .get();

            return {
                success: true,
                stats: {
                    role: userData.role,
                    propertiesCount: propertiesSnapshot.size,
                    favoritesCount: favoritesSnapshot.size,
                    conversationsCount: messagesSnapshot.size,
                    memberSince: userData.createdAt,
                },
            };
        } catch (error) {
            logger.error('Get stats error:', error);
            throw new AppError(500, 'Failed to get user statistics');
        }
    }

    /**
     * Update notification preferences
     */
    async updateNotificationPreferences(uid: string, preferences: {
        emailNotifications?: boolean;
        smsNotifications?: boolean;
        pushNotifications?: boolean;
    }) {
        try {
            await this.db.collection('users').doc(uid).update({
                notificationPreferences: preferences,
                updatedAt: new Date().toISOString(),
            });

            return { success: true };
        } catch (error) {
            logger.error('Update preferences error:', error);
            throw new AppError(500, 'Failed to update preferences');
        }
    }

    /**
     * Search users (admin only)
     */
    async searchUsers(query: string, role?: string, limit: number = 50) {
        try {
            let usersQuery = this.db.collection('users').limit(limit);

            if (role) {
                usersQuery = usersQuery.where('role', '==', role) as any;
            }

            const snapshot = await usersQuery.get();
            const users = snapshot.docs
                .map((doc: any) => ({ id: doc.id, ...doc.data() }))
                .filter((user: any) =>
                    user.displayName?.toLowerCase().includes(query.toLowerCase()) ||
                    user.email?.toLowerCase().includes(query.toLowerCase())
                );

            return {
                success: true,
                users,
                count: users.length,
            };
        } catch (error) {
            logger.error('Search users error:', error);
            throw new AppError(500, 'Failed to search users');
        }
    }
}

export const userService = new UserService();
