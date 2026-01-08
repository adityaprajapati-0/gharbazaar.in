import { getAuth } from '../config/firebase';
import { getFirestore } from '../config/firebase';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import * as admin from 'firebase-admin';

export class AuthService {
    private auth = getAuth();
    private db = getFirestore();

    /**
     * Register new user
     */
    async register(email: string, password: string, displayName: string, role: string = 'buyer') {
        try {
            // Create user in Firebase Auth
            const userRecord = await this.auth.createUser({
                email,
                password,
                displayName,
            });

            // Set custom claims for role
            await this.auth.setCustomUserClaims(userRecord.uid, { role });

            // Create user document in Firestore
            await this.db.collection('users').doc(userRecord.uid).set({
                uid: userRecord.uid,
                email,
                displayName,
                role,
                photoURL: null,
                phoneNumber: null,
                emailVerified: false,
                onlineStatus: 'offline',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            });

            logger.info(`User registered: ${userRecord.uid}`);

            return {
                success: true,
                user: {
                    uid: userRecord.uid,
                    email,
                    displayName,
                    role,
                },
            };
        } catch (error: any) {
            logger.error('Registration error:', error);

            if (error.code === 'auth/email-already-exists') {
                throw new AppError(400, 'Email already registered');
            }

            throw new AppError(500, 'Failed to register user');
        }
    }

    /**
     * Create custom token for login
     */
    async createCustomToken(uid: string) {
        try {
            const customToken = await this.auth.createCustomToken(uid);
            return customToken;
        } catch (error) {
            logger.error('Error creating custom token:', error);
            throw new AppError(500, 'Failed to create authentication token');
        }
    }

    /**
     * Verify Firebase ID token
     */
    async verifyToken(idToken: string) {
        try {
            const decodedToken = await this.auth.verifyIdToken(idToken);
            return decodedToken;
        } catch (error) {
            logger.error('Token verification error:', error);
            throw new AppError(401, 'Invalid or expired token');
        }
    }

    /**
     * Get user by email (for login)
     */
    async getUserByEmail(email: string) {
        try {
            const userRecord = await this.auth.getUserByEmail(email);

            // Get user data from Firestore
            const userDoc = await this.db.collection('users').doc(userRecord.uid).get();
            const userData = userDoc.data();

            return {
                uid: userRecord.uid,
                email: userRecord.email,
                displayName: userRecord.displayName,
                photoURL: userRecord.photoURL,
                emailVerified: userRecord.emailVerified,
                role: userData?.role || 'buyer',
                ...userData,
            };
        } catch (error: any) {
            if (error.code === 'auth/user-not-found') {
                throw new AppError(404, 'User not found');
            }
            throw new AppError(500, 'Failed to get user');
        }
    }

    /**
     * Update user profile
     */
    async updateUserProfile(uid: string, updates: {
        displayName?: string;
        photoURL?: string;
        phoneNumber?: string;
    }) {
        try {
            // Update in Firebase Auth
            await this.auth.updateUser(uid, updates);

            // Update in Firestore
            await this.db.collection('users').doc(uid).update({
                ...updates,
                updatedAt: new Date().toISOString(),
            });

            logger.info(`User profile updated: ${uid}`);

            return { success: true };
        } catch (error) {
            logger.error('Profile update error:', error);
            throw new AppError(500, 'Failed to update profile');
        }
    }

    /**
     * Send password reset email
     */
    async sendPasswordResetEmail(email: string) {
        try {
            const resetLink = await this.auth.generatePasswordResetLink(email);

            // TODO: Send email using SendGrid
            logger.info(`Password reset link generated for: ${email}`);

            return {
                success: true,
                message: 'Password reset email sent',
            };
        } catch (error: any) {
            if (error.code === 'auth/user-not-found') {
                throw new AppError(404, 'User not found');
            }
            throw new AppError(500, 'Failed to send reset email');
        }
    }

    /**
     * Send email verification
     */
    async sendEmailVerification(uid: string, email: string) {
        try {
            const verificationLink = await this.auth.generateEmailVerificationLink(email);

            // TODO: Send email using SendGrid
            logger.info(`Email verification link generated for: ${uid}`);

            return {
                success: true,
                message: 'Verification email sent',
            };
        } catch (error) {
            logger.error('Email verification error:', error);
            throw new AppError(500, 'Failed to send verification email');
        }
    }

    /**
     * Delete user account
     */
    async deleteUser(uid: string) {
        try {
            // Delete from Firebase Auth
            await this.auth.deleteUser(uid);

            // Delete from Firestore
            await this.db.collection('users').doc(uid).delete();

            logger.info(`User deleted: ${uid}`);

            return { success: true };
        } catch (error) {
            logger.error('User deletion error:', error);
            throw new AppError(500, 'Failed to delete user');
        }
    }

    /**
     * Update user role
     */
    async updateUserRole(uid: string, role: string) {
        try {
            // Update custom claims
            await this.auth.setCustomUserClaims(uid, { role });

            // Update in Firestore
            await this.db.collection('users').doc(uid).update({
                role,
                updatedAt: new Date().toISOString(),
            });

            logger.info(`User role updated: ${uid} -> ${role}`);

            return { success: true };
        } catch (error) {
            logger.error('Role update error:', error);
            throw new AppError(500, 'Failed to update role');
        }
    }
}

export const authService = new AuthService();
