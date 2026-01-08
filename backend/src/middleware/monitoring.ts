import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

interface RequestLog {
    method: string;
    url: string;
    statusCode: number;
    responseTime: number;
    userAgent?: string;
    ip?: string;
    userId?: string;
}

/**
 * Request logging and monitoring middleware
 */
export const requestMonitor = (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();

    // Log when response finishes
    res.on('finish', () => {
        const responseTime = Date.now() - startTime;

        const logData: RequestLog = {
            method: req.method,
            url: req.originalUrl,
            statusCode: res.statusCode,
            responseTime,
            userAgent: req.get('user-agent'),
            ip: req.ip || req.socket.remoteAddress,
            userId: (req as any).user?.uid,
        };

        // Log based on status code
        if (res.statusCode >= 500) {
            logger.error('Request failed', logData);
        } else if (res.statusCode >= 400) {
            logger.warn('Client error', logData);
        } else {
            logger.info('Request completed', logData);
        }

        // Warn about slow requests (>3s)
        if (responseTime > 3000) {
            logger.warn('Slow request detected', {
                ...logData,
                threshold: '3000ms',
            });
        }
    });

    next();
};

/**
 * Rate limit info middleware
 */
export const rateLimitInfo = (req: Request, res: Response, next: NextFunction) => {
    res.on('finish', () => {
        // Add rate limit headers for transparency
        const remaining = (req as any).rateLimit?.remaining;
        const limit = (req as any).rateLimit?.limit;

        if (remaining !== undefined && limit !== undefined) {
            res.setHeader('X-RateLimit-Limit', limit);
            res.setHeader('X-RateLimit-Remaining', remaining);
        }
    });

    next();
};

/**
 * Security headers middleware
 */
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
    // Remove powered by header
    res.removeHeader('X-Powered-By');

    // Add security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

    next();
};

/**
 * Request ID middleware
 */
export const requestId = (req: Request, res: Response, next: NextFunction) => {
    const id = req.get('X-Request-ID') || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    (req as any).requestId = id;
    res.setHeader('X-Request-ID', id);
    next();
};
