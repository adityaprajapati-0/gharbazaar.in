import { Request, Response, NextFunction } from 'express';
import { getAuth, getFirestore } from '../config/firebase';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config';

export class AuthController {
    /**
     * Register a new user
     */
    async register(req: Request, res: Response, next: NextFunction) {
        try {
            const { email, password, displayName, role = 'buyer', phoneNumber } = req.body;

            // Create user in Firebase Auth
            const userRecord = await getAuth().createUser({
                email,
                password,
                displayName,
                phoneNumber,
                emailVerified: false,
            });

            // Set custom claims for role
            await getAuth().setCustomUserClaims(userRecord.uid, { role });

            // Create user document in Firestore
            const db = getFirestore();
            await db.collection('users').doc(userRecord.uid).set({
                uid: userRecord.uid,
                email,
                displayName,
                phoneNumber: phoneNumber || null,
                role,
                emailVerified: false,
                isActive: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            });

            // Generate custom JWT token
            const jwtOptions: jwt.SignOptions = { expiresIn: config.jwt.expiresIn as any };
            const token = jwt.sign(
                { uid: userRecord.uid, email, role },
                config.jwt.secret,
                jwtOptions
            );

            logger.info(`User registered successfully: ${email}`);

            res.status(201).json({
                success: true,
                message: 'User registered successfully',
                data: {
                    user: {
                        uid: userRecord.uid,
                        email,
                        displayName,
                        role,
                    },
                    token,
                },
            });
        } catch (error: any) {
            logger.error('Registration error:', error);

            if (error.code === 'auth/email-already-exists') {
                return next(new AppError(409, 'Email already registered'));
            }

            next(new AppError(500, 'Registration failed'));
        }
    }

    /**
     * Login user
     */
    async login(req: Request, res: Response, next: NextFunction) {
        try {
            const { email, password } = req.body;

            // Firebase Admin SDK doesn't have a direct login method
            // You would typically handle this on the client side with Firebase Auth
            // Here, we'll verify user exists and generate a custom token

            const user = await getAuth().getUserByEmail(email);
            const db = getFirestore();
            const userDoc = await db.collection('users').doc(user.uid).get();

            if (!userDoc.exists) {
                throw new AppError(404, 'User not found');
            }

            const userData = userDoc.data();

            if (!userData?.isActive) {
                throw new AppError(403, 'Account is deactivated');
            }

            // Update last login
            await db.collection('users').doc(user.uid).update({
                lastLogin: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            });

            // Generate custom JWT token
            const jwtOptions2: jwt.SignOptions = { expiresIn: config.jwt.expiresIn as any };
            const token = jwt.sign(
                { uid: user.uid, email: user.email, role: userData.role },
                config.jwt.secret,
                jwtOptions2
            );

            logger.info(`User logged in: ${email}`);

            res.status(200).json({
                success: true,
                message: 'Login successful',
                data: {
                    user: {
                        uid: user.uid,
                        email: user.email,
                        displayName: user.displayName,
                        role: userData.role,
                        emailVerified: user.emailVerified,
                    },
                    token,
                },
            });
        } catch (error: any) {
            logger.error('Login error:', error);

            if (error instanceof AppError) {
                return next(error);
            }

            next(new AppError(401, 'Invalid credentials'));
        }
    }

    /**
     * Verify Firebase ID token
     */
    async verifyToken(req: Request, res: Response, next: NextFunction) {
        try {
            const { token } = req.body;

            if (!token) {
                throw new AppError(400, 'Token is required');
            }

            const decodedToken = await getAuth().verifyIdToken(token);

            res.status(200).json({
                success: true,
                data: {
                    uid: decodedToken.uid,
                    email: decodedToken.email,
                    emailVerified: decodedToken.email_verified,
                },
            });
        } catch (error: any) {
            logger.error('Token verification error:', error);
            next(new AppError(401, 'Invalid or expired token'));
        }
    }

    /**
     * Refresh token
     */
    async refreshToken(req: Request, res: Response, next: NextFunction) {
        try {
            const { refreshToken } = req.body;

            if (!refreshToken) {
                throw new AppError(400, 'Refresh token is required');
            }

            // Verify refresh token
            const decoded: any = jwt.verify(refreshToken, config.jwt.refreshSecret);

            // Generate new access token
            const jwtOptions3: jwt.SignOptions = { expiresIn: config.jwt.expiresIn as any };
            const newToken = jwt.sign(
                { uid: decoded.uid, email: decoded.email, role: decoded.role },
                config.jwt.secret,
                jwtOptions3
            );

            res.status(200).json({
                success: true,
                data: { token: newToken },
            });
        } catch (error: any) {
            logger.error('Token refresh error:', error);
            next(new AppError(401, 'Invalid refresh token'));
        }
    }

    /**
     * Logout user
     */
    async logout(req: Request, res: Response, next: NextFunction) {
        try {
            // For Firebase, logout is typically handled on the client
            // Here we can revoke refresh tokens if needed

            res.status(200).json({
                success: true,
                message: 'Logout successful',
            });
        } catch (error) {
            logger.error('Logout error:', error);
            next(new AppError(500, 'Logout failed'));
        }
    }

    /**
     * Send password reset email
     */
    async forgotPassword(req: Request, res: Response, next: NextFunction) {
        try {
            const { email } = req.body;

            // Generate password reset link
            const link = await getAuth().generatePasswordResetLink(email);

            // TODO: Send email with link using SendGrid or similar
            logger.info(`Password reset link generated for: ${email}`);

            res.status(200).json({
                success: true,
                message: 'Password reset email sent',
            });
        } catch (error: any) {
            logger.error('Password reset error:', error);

            if (error.code === 'auth/user-not-found') {
                return next(new AppError(404, 'User not found'));
            }

            next(new AppError(500, 'Password reset failed'));
        }
    }
}
