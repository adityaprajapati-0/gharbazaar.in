/**
 * 🔐 JWT (JSON WEB TOKEN) UTILITIES
 * 
 * Helper functions for creating and verifying JWT tokens.
 * Used for authenticating users in both REST API and Socket.IO connections.
 * 
 * @author GharBazaar Backend Team
 * @description Secure token generation and verification for user authentication
 */

import jwt from 'jsonwebtoken';
import config from '../config';

/**
 * User payload interface
 * This is what we store inside the JWT token
 */
export interface TokenPayload {
    userId: string;          // Unique user identifier
    email: string;           // User's email
    role?: string;           // User role (buyer, seller, employee, etc.)
}

/**
 * Decoded token interface (includes JWT standard claims)
 */
export interface DecodedToken extends TokenPayload {
    iat: number;   // Issued at (timestamp)
    exp: number;   // Expires at (timestamp)
}

/**
 * 🎫 GENERATE JWT TOKEN
 * 
 * Creates a signed JWT token containing user information.
 * This token is sent to the frontend after successful login.
 * 
 * @param payload - User data to encode in the token
 * @returns Signed JWT token string
 * 
 * @example
 * const token = generateToken({
 *   userId: '12345',
 *   email: 'user@example.com',
 *   role: 'buyer'
 * });
 * // Returns: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 */
export const generateToken = (payload: TokenPayload): string => {
    try {
        // Sign the token with our secret key
        // The token will be valid for the duration specified in config
        const token = jwt.sign(
            payload,
            config.jwtSecret,
            {
                expiresIn: config.jwtExpiresIn,     // e.g., '7d' for 7 days
                issuer: 'gharbazaar-backend',        // Who issued this token
                audience: 'gharbazaar-frontend',     // Who should use this token
            } as jwt.SignOptions
        );

        return token;
    } catch (error) {
        console.error('❌ Error generating JWT token:', error);
        throw new Error('Failed to generate authentication token');
    }
};

/**
 * 🔓 VERIFY JWT TOKEN
 * 
 * Verifies and decodes a JWT token.
 * Used in API middleware and Socket.IO authentication to validate users.
 * 
 * @param token - JWT token string to verify
 * @returns Decoded token payload if valid
 * @throws Error if token is invalid, expired, or malformed
 * 
 * @example
 * try {
 *   const decoded = verifyToken('eyJhbGciOiJIUzI1NiIs...');
 *   console.log('User ID:', decoded.userId);
 * } catch (error) {
 *   console.error('Invalid token');
 * }
 */
export const verifyToken = (token: string): DecodedToken => {
    try {
        // Verify the token signature and check expiration
        const decoded = jwt.verify(
            token,
            config.jwtSecret,
            {
                issuer: 'gharbazaar-backend',
                audience: 'gharbazaar-frontend',
            }
        ) as DecodedToken;

        return decoded;
    } catch (error) {
        // Token verification failed - could be expired, invalid signature, etc.
        if (error instanceof jwt.TokenExpiredError) {
            throw new Error('Token has expired. Please login again.');
        } else if (error instanceof jwt.JsonWebTokenError) {
            throw new Error('Invalid token. Please login again.');
        } else {
            throw new Error('Token verification failed.');
        }
    }
};

/**
 * 🔍 DECODE TOKEN WITHOUT VERIFICATION
 * 
 * Decodes a JWT token WITHOUT verifying its signature.
 * Useful for reading token contents when you don't need to verify authenticity.
 * 
 * ⚠️ WARNING: Do NOT use this for authentication! Always use verifyToken() instead.
 * 
 * @param token - JWT token string
 * @returns Decoded token payload (unverified)
 */
export const decodeToken = (token: string): DecodedToken | null => {
    try {
        const decoded = jwt.decode(token) as DecodedToken;
        return decoded;
    } catch (error) {
        console.error('❌ Error decoding token:', error);
        return null;
    }
};

/**
 * ⏰ CHECK IF TOKEN IS EXPIRED
 * 
 * Helper function to check if a token has expired without throwing an error.
 * 
 * @param token - JWT token string
 * @returns true if expired, false if still valid
 */
export const isTokenExpired = (token: string): boolean => {
    try {
        const decoded = decodeToken(token);
        if (!decoded) return true;

        // Check if current time is past the expiration time
        const currentTime = Math.floor(Date.now() / 1000);
        return decoded.exp < currentTime;
    } catch (error) {
        return true;
    }
};

/**
 * 🔄 REFRESH TOKEN (Optional future feature)
 * 
 * Generate a new token with extended expiration.
 * Useful for "remember me" functionality or silent token refresh.
 * 
 * @param oldToken - Existing token to refresh
 * @returns New token with fresh expiration
 */
export const refreshToken = (oldToken: string): string => {
    try {
        // Verify the old token first
        const decoded = verifyToken(oldToken);

        // Generate a new token with the same payload but fresh expiration
        const newToken = generateToken({
            userId: decoded.userId,
            email: decoded.email,
            role: decoded.role,
        });

        return newToken;
    } catch (error) {
        throw new Error('Cannot refresh invalid token');
    }
};
