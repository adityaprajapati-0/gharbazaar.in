import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * Application Error class with categories and metadata
 */
export class AppError extends Error {
    public readonly statusCode: number;
    public readonly isOperational: boolean;
    public readonly code?: string;
    public readonly details?: any;

    constructor(
        statusCode: number,
        message: string,
        optionsOrIsOperational?: boolean | {
            isOperational?: boolean;
            code?: string;
            details?: any;
            stack?: string;
            redirectTo?: string;
            remainingListings?: number;
            currentPlan?: string;
            requiredPlan?: string;
            [key: string]: any; // Allow additional metadata
        }
    ) {
        super(message);
        this.statusCode = statusCode;

        // Backwards compatibility: accept boolean or options object
        if (typeof optionsOrIsOperational === 'boolean') {
            this.isOperational = optionsOrIsOperational;
            Error.captureStackTrace(this, this.constructor);
        } else {
            const options = optionsOrIsOperational || {};
            this.isOperational = options.isOperational ?? true;
            this.code = options.code;
            this.details = options.details;

            // Allow any additional metadata to be attached
            Object.keys(options).forEach(key => {
                if (!['isOperational', 'code', 'details', 'stack'].includes(key)) {
                    (this as any)[key] = options[key];
                }
            });

            if (options.stack) {
                this.stack = options.stack;
            } else {
                Error.captureStackTrace(this, this.constructor);
            }
        }

        Object.setPrototypeOf(this, AppError.prototype);
    }

    /**
     * Factory methods for common errors
     */
    static badRequest(message: string = 'Bad request', details?: any): AppError {
        return new AppError(400, message, { code: 'BAD_REQUEST', details });
    }

    static unauthorized(message: string = 'Unauthorized'): AppError {
        return new AppError(401, message, { code: 'UNAUTHORIZED' });
    }

    static forbidden(message: string = 'Forbidden'): AppError {
        return new AppError(403, message, { code: 'FORBIDDEN' });
    }

    static notFound(resource: string = 'Resource'): AppError {
        return new AppError(404, `${resource} not found`, { code: 'NOT_FOUND' });
    }

    static conflict(message: string = 'Resource already exists'): AppError {
        return new AppError(409, message, { code: 'CONFLICT' });
    }

    static validation(errors: any[]): AppError {
        return new AppError(422, 'Validation failed', { code: 'VALIDATION_ERROR', details: errors });
    }

    static tooManyRequests(message: string = 'Too many requests'): AppError {
        return new AppError(429, message, { code: 'RATE_LIMITED' });
    }

    static internal(message: string = 'Internal server error'): AppError {
        return new AppError(500, message, { code: 'INTERNAL_ERROR', isOperational: false });
    }
}

/**
 * Error category for logging and monitoring
 */
function getErrorCategory(statusCode: number): string {
    if (statusCode >= 500) return 'server_error';
    if (statusCode >= 400) return 'client_error';
    return 'unknown';
}

/**
 * Global error handler middleware
 */
export const errorHandler = (
    err: Error | AppError,
    req: Request,
    res: Response,
    _next: NextFunction
): void => {
    let statusCode = 500;
    let message = 'Internal Server Error';
    let code = 'INTERNAL_ERROR';
    let isOperational = false;
    let details: any = undefined;

    // Handle AppError
    if (err instanceof AppError) {
        statusCode = err.statusCode;
        message = err.message;
        code = err.code || 'ERROR';
        isOperational = err.isOperational;
        details = err.details;
    } else if (err.name === 'ValidationError') {
        // Handle validation errors
        statusCode = 422;
        message = err.message;
        code = 'VALIDATION_ERROR';
        isOperational = true;
    } else if (err.name === 'UnauthorizedError' || err.name === 'JsonWebTokenError') {
        // Handle JWT errors
        statusCode = 401;
        message = 'Invalid or expired token';
        code = 'AUTH_ERROR';
        isOperational = true;
    } else if (err.name === 'TokenExpiredError') {
        statusCode = 401;
        message = 'Token expired';
        code = 'TOKEN_EXPIRED';
        isOperational = true;
    }

    // Log error with structured data
    const errorLog = {
        message: err.message,
        statusCode,
        code,
        category: getErrorCategory(statusCode),
        isOperational,
        stack: err.stack,
        path: req.path,
        method: req.method,
        ip: req.ip,
        userId: (req as any).user?.uid,
        requestId: (req as any).requestId,
        userAgent: req.get('user-agent'),
    };

    if (statusCode >= 500) {
        logger.error('Server error', errorLog);
    } else if (statusCode >= 400) {
        logger.warn('Client error', errorLog);
    }

    // Build response
    const response: any = {
        success: false,
        error: message,
        code,
        statusCode,
        meta: {
            timestamp: new Date().toISOString(),
            requestId: (req as any).requestId,
        },
    };

    // Add details for validation errors
    if (details && isOperational) {
        response.details = details;
    }

    // Add additional metadata from AppError (for subscription errors, etc.)
    if (err instanceof AppError) {
        const additionalMeta: any = {};
        const metaKeys = ['redirectTo', 'remainingListings', 'currentPlan', 'requiredPlan'];

        metaKeys.forEach(key => {
            if ((err as any)[key] !== undefined) {
                additionalMeta[key] = (err as any)[key];
            }
        });

        if (Object.keys(additionalMeta).length > 0) {
            response.meta = { ...response.meta, ...additionalMeta };
        }
    }

    // Add stack trace only in development
    if (process.env.NODE_ENV === 'development' && err.stack) {
        response.stack = err.stack;
    }

    // Add Retry-After header for rate limiting
    if (statusCode === 429) {
        res.set('Retry-After', '60');
    }

    // Send response
    res.status(statusCode).json(response);
};

/**
 * Async handler wrapper to catch errors in async route handlers
 */
export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

/**
 * Not found error factory
 */
export const createNotFoundError = (resource: string = 'Resource'): AppError => {
    return AppError.notFound(resource);
};

