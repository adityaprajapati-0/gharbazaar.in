import { Request, Response, NextFunction } from 'express';

/**
 * Input sanitization middleware for security
 * Prevents XSS, SQL injection, and NoSQL injection attacks
 */

/**
 * HTML entities that need escaping
 */
const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;',
};

/**
 * Dangerous patterns for NoSQL injection
 */
const dangerousPatterns = [
    /\$where/gi,
    /\$gt/gi,
    /\$lt/gi,
    /\$gte/gi,
    /\$lte/gi,
    /\$ne/gi,
    /\$in/gi,
    /\$nin/gi,
    /\$or/gi,
    /\$and/gi,
    /\$not/gi,
    /\$exists/gi,
    /\$regex/gi,
    /\$expr/gi,
];

/**
 * Escape HTML entities in a string
 */
function escapeHtml(str: string): string {
    return str.replace(/[&<>"'`=\/]/g, (char) => htmlEntities[char] || char);
}

/**
 * Check if string contains dangerous NoSQL patterns
 */
function containsDangerousPattern(str: string): boolean {
    return dangerousPatterns.some(pattern => pattern.test(str));
}

/**
 * Sanitize a single value
 */
function sanitizeValue(value: any, options: SanitizeOptions): any {
    if (value === null || value === undefined) {
        return value;
    }

    if (typeof value === 'string') {
        let sanitized = value.trim();

        // Escape HTML if enabled
        if (options.escapeHtml) {
            sanitized = escapeHtml(sanitized);
        }

        // Check for NoSQL injection patterns
        if (options.preventNoSQLInjection && containsDangerousPattern(sanitized)) {
            throw new SanitizationError('Potentially malicious input detected');
        }

        // Truncate if too long
        if (options.maxLength && sanitized.length > options.maxLength) {
            sanitized = sanitized.substring(0, options.maxLength);
        }

        return sanitized;
    }

    if (typeof value === 'number') {
        // Check for NaN and Infinity
        if (!isFinite(value)) {
            return 0;
        }
        return value;
    }

    if (Array.isArray(value)) {
        return value.map(item => sanitizeValue(item, options));
    }

    if (typeof value === 'object') {
        const sanitized: Record<string, any> = {};
        for (const key of Object.keys(value)) {
            // Skip keys that start with $ (NoSQL injection prevention)
            if (options.preventNoSQLInjection && key.startsWith('$')) {
                continue;
            }
            sanitized[key] = sanitizeValue(value[key], options);
        }
        return sanitized;
    }

    return value;
}

/**
 * Sanitization error class
 */
class SanitizationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'SanitizationError';
    }
}

/**
 * Sanitization options
 */
interface SanitizeOptions {
    escapeHtml: boolean;
    preventNoSQLInjection: boolean;
    maxLength?: number;
}

/**
 * Main sanitization middleware
 */
export const sanitize = (options: Partial<SanitizeOptions> = {}) => {
    const defaultOptions: SanitizeOptions = {
        escapeHtml: true,
        preventNoSQLInjection: true,
        maxLength: 10000,
        ...options,
    };

    return (req: Request, res: Response, next: NextFunction): void => {
        try {
            // Sanitize body
            if (req.body && typeof req.body === 'object') {
                req.body = sanitizeValue(req.body, defaultOptions);
            }

            // Sanitize query parameters
            if (req.query && typeof req.query === 'object') {
                req.query = sanitizeValue(req.query, {
                    ...defaultOptions,
                    maxLength: 500, // Shorter limit for query params
                });
            }

            // Sanitize URL parameters
            if (req.params && typeof req.params === 'object') {
                req.params = sanitizeValue(req.params, {
                    ...defaultOptions,
                    maxLength: 200,
                });
            }

            next();
            return;
        } catch (error) {
            if (error instanceof SanitizationError) {
                res.status(400).json({
                    success: false,
                    error: error.message,
                });
                return;
            }
            next(error);
            return;
        }
    };
};

/**
 * Strict sanitization for sensitive endpoints
 */
export const strictSanitize = sanitize({
    escapeHtml: true,
    preventNoSQLInjection: true,
    maxLength: 5000,
});

/**
 * Light sanitization (no HTML escaping, useful for rich text)
 */
export const lightSanitize = sanitize({
    escapeHtml: false,
    preventNoSQLInjection: true,
    maxLength: 50000,
});

/**
 * Validate and sanitize email
 */
export function sanitizeEmail(email: string): string | null {
    if (!email || typeof email !== 'string') {
        return null;
    }

    const sanitized = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(sanitized)) {
        return null;
    }

    return sanitized;
}

/**
 * Validate and sanitize phone number
 */
export function sanitizePhone(phone: string): string | null {
    if (!phone || typeof phone !== 'string') {
        return null;
    }

    // Remove all non-digit characters except +
    const sanitized = phone.replace(/[^\d+]/g, '');

    // Basic validation
    if (sanitized.length < 10 || sanitized.length > 15) {
        return null;
    }

    return sanitized;
}

/**
 * Sanitize URL
 */
export function sanitizeUrl(url: string): string | null {
    if (!url || typeof url !== 'string') {
        return null;
    }

    try {
        const parsed = new URL(url);
        // Only allow http and https protocols
        if (!['http:', 'https:'].includes(parsed.protocol)) {
            return null;
        }
        return parsed.href;
    } catch {
        return null;
    }
}

/**
 * Sanitize ID (alphanumeric, dashes, underscores only)
 */
export function sanitizeId(id: string): string | null {
    if (!id || typeof id !== 'string') {
        return null;
    }

    const sanitized = id.trim();
    const idRegex = /^[a-zA-Z0-9_-]+$/;

    if (!idRegex.test(sanitized) || sanitized.length > 128) {
        return null;
    }

    return sanitized;
}

export default sanitize;
