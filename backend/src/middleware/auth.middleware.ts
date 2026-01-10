/**
 * 🔐 EXPRESS AUTHENTICATION MIDDLEWARE
 * 
 * Verifies JWT tokens for REST API requests.
 * Protects API routes from unauthorized access.
 * 
 * @author GharBazaar Backend Team
 */

import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';

/**
 * 🔒 AUTHENTICATE API REQUEST
 * 
 * Middleware to verify JWT token in API requests.
 * Token should be in Authorization header: "Bearer <token>"
 */
export const authenticateRequest = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        // Get token from Authorization header
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: 'No token provided. Please login.'
            });
        }

        // Extract token (remove "Bearer " prefix)
        const token = authHeader.substring(7);

        // Verify token
        const decoded = verifyToken(token);

        // Attach user to request object
        (req as any).user = decoded;

        // Continue to next middleware/route handler
        next();

    } catch (error) {
        return res.status(401).json({
            success: false,
            error: 'Invalid or expired token. Please login again.'
        });
    }
};
