import { Request, Response, NextFunction } from 'express';
import { getAuth } from '../config/firebase';
import { AppError } from './errorHandler';
import { logger } from '../utils/logger';

export interface AuthRequest extends Request {
    user?: {
        uid: string;
        email: string | null;
        role: string;
        emailVerified: boolean;
    };
}

export const authenticate = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new AppError(401, 'No authorization token provided');
        }

        const token = authHeader.split('Bearer ')[1];

        // Verify Firebase ID token
        const decodedToken = await getAuth().verifyIdToken(token);

        // Attach user info to request
        (req as AuthRequest).user = {
            uid: decodedToken.uid,
            email: decodedToken.email || null,
            role: (decodedToken as any).role || 'buyer',
            emailVerified: decodedToken.email_verified || false,
        };

        next();
    } catch (error: any) {
        logger.error('Authentication error:', error);

        if (error.code === 'auth/id-token-expired') {
            return next(new AppError(401, 'Token expired. Please login again.'));
        }

        if (error.code === 'auth/argument-error') {
            return next(new AppError(401, 'Invalid token format'));
        }

        next(new AppError(401, 'Authentication failed'));
    }
};

// Role-based authorization middleware
export const authorize = (...roles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const user = (req as AuthRequest).user;

        if (!user) {
            return next(new AppError(401, 'Not authenticated'));
        }

        if (!roles.includes(user.role)) {
            return next(
                new AppError(
                    403,
                    `Access denied. Required role: ${roles.join(' or ')}`
                )
            );
        }

        next();
    };
};

// Alias for authorize (backward compatibility)
export const requireRole = authorize;
