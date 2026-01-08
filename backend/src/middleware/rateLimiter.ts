import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';
import { config } from '../config';
import { logger } from '../utils/logger';

/**
 * Create rate limit response with Retry-After header
 */
const createRateLimitResponse = (message: string) => ({
    success: false,
    error: message,
    meta: {
        timestamp: new Date().toISOString(),
    },
});

/**
 * Key generator that uses user ID for authenticated requests
 */
const userKeyGenerator = (req: Request): string => {
    const userId = (req as any).user?.uid;
    if (userId) {
        return `user:${userId}`;
    }
    return req.ip || req.socket.remoteAddress || 'unknown';
};

/**
 * IP-based key generator
 */
const ipKeyGenerator = (req: Request): string => {
    return req.ip || req.socket.remoteAddress || 'unknown';
};

// ============================================
// GENERAL API RATE LIMITERS
// ============================================

/**
 * General API rate limiter - balanced for normal usage
 */
export const apiLimiter = rateLimit({
    windowMs: config.rateLimit.windowMs, // 15 minutes
    max: config.rateLimit.maxRequests,   // 100 requests per window
    message: createRateLimitResponse('Too many requests from this IP, please try again later.'),
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: ipKeyGenerator,
    handler: (req, res) => {
        logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
        res.status(429).json(createRateLimitResponse('Too many requests from this IP, please try again later.'));
    },
});

/**
 * Relaxed limiter for public read endpoints
 */
export const publicLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 60, // 60 requests per minute
    message: createRateLimitResponse('Too many requests, please slow down.'),
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: ipKeyGenerator,
});

/**
 * Strict limiter for expensive operations
 */
export const strictLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 requests per minute
    message: createRateLimitResponse('Too many requests for this operation.'),
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: userKeyGenerator,
});

// ============================================
// AUTH RATE LIMITERS
// ============================================

/**
 * Stricter rate limiter for auth routes - prevents brute force
 */
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 attempts per 15 minutes
    message: createRateLimitResponse('Too many authentication attempts, please try again later.'),
    skipSuccessfulRequests: true, // Don't count successful logins
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: ipKeyGenerator,
    handler: (req, res) => {
        logger.warn(`Auth rate limit exceeded for IP: ${req.ip}, email: ${req.body?.email}`);
        res.set('Retry-After', '900'); // 15 minutes
        res.status(429).json(createRateLimitResponse('Too many authentication attempts, please try again in 15 minutes.'));
    },
});

/**
 * Very strict limiter for password reset
 */
export const passwordResetLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 attempts per hour
    message: createRateLimitResponse('Too many password reset attempts, please try again later.'),
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: ipKeyGenerator,
    handler: (req, res) => {
        res.set('Retry-After', '3600');
        res.status(429).json(createRateLimitResponse('Too many password reset attempts, please try again in 1 hour.'));
    },
});

// ============================================
// UPLOAD RATE LIMITERS
// ============================================

/**
 * Rate limiter for file uploads
 */
export const uploadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // 20 uploads per hour
    message: createRateLimitResponse('Too many upload requests, please try again later.'),
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: userKeyGenerator,
    handler: (req, res) => {
        res.set('Retry-After', '3600');
        res.status(429).json(createRateLimitResponse('Upload limit reached, please try again in 1 hour.'));
    },
});

// ============================================
// PAYMENT RATE LIMITERS
// ============================================

/**
 * Rate limiter for payment operations
 */
export const paymentLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 5, // 5 payment attempts per minute
    message: createRateLimitResponse('Too many payment attempts, please wait.'),
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: userKeyGenerator,
    handler: (req, res) => {
        logger.warn(`Payment rate limit exceeded for user: ${(req as any).user?.uid}`);
        res.set('Retry-After', '60');
        res.status(429).json(createRateLimitResponse('Too many payment attempts, please wait 1 minute.'));
    },
});

// ============================================
// MESSAGING RATE LIMITERS
// ============================================

/**
 * Rate limiter for chat/messaging
 */
export const messageLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 30, // 30 messages per minute
    message: createRateLimitResponse('Sending messages too quickly, please slow down.'),
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: userKeyGenerator,
});

// ============================================
// SEARCH RATE LIMITERS
// ============================================

/**
 * Rate limiter for search operations
 */
export const searchLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 30, // 30 searches per minute
    message: createRateLimitResponse('Too many search requests, please slow down.'),
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: ipKeyGenerator,
});

// ============================================
// DDoS PROTECTION
// ============================================

/**
 * Very strict emergency rate limiter for suspected DDoS
 */
export const ddosProtection = rateLimit({
    windowMs: 1000, // 1 second
    max: 10, // 10 requests per second
    message: createRateLimitResponse('Request rate too high.'),
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: ipKeyGenerator,
    skipFailedRequests: false,
});

/**
 * Middleware to add security headers for rate limiting
 */
export const rateLimitHeaders = (req: Request, res: Response, next: NextFunction) => {
    // Add headers indicating rate limit info
    res.on('finish', () => {
        const remaining = (req as any).rateLimit?.remaining;
        const limit = (req as any).rateLimit?.limit;
        const resetTime = (req as any).rateLimit?.resetTime;

        if (remaining !== undefined && limit !== undefined) {
            res.set('X-RateLimit-Limit', String(limit));
            res.set('X-RateLimit-Remaining', String(remaining));
            if (resetTime) {
                res.set('X-RateLimit-Reset', String(Math.ceil(resetTime.getTime() / 1000)));
            }
        }
    });
    next();
};

/**
 * Create a custom rate limiter with specific options
 */
export const createRateLimiter = (options: {
    windowMs: number;
    max: number;
    message?: string;
    useUserKey?: boolean;
}) => {
    return rateLimit({
        windowMs: options.windowMs,
        max: options.max,
        message: createRateLimitResponse(options.message || 'Rate limit exceeded.'),
        standardHeaders: true,
        legacyHeaders: false,
        keyGenerator: options.useUserKey ? userKeyGenerator : ipKeyGenerator,
    });
};
