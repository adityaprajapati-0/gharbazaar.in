import { Response } from 'express';

/**
 * Standardized API response format for consistent client handling
 */
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
    pagination?: PaginationMeta;
    meta?: ResponseMeta;
}

export interface PaginationMeta {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
}

export interface ResponseMeta {
    requestId?: string;
    timestamp: string;
    responseTime?: number;
    cached?: boolean;
}

/**
 * Success response helper
 */
export function success<T>(
    res: Response,
    data: T,
    options: {
        message?: string;
        statusCode?: number;
        pagination?: PaginationMeta;
        cached?: boolean;
    } = {}
): Response {
    const { message, statusCode = 200, pagination, cached } = options;

    const response: ApiResponse<T> = {
        success: true,
        data,
        meta: {
            timestamp: new Date().toISOString(),
            cached,
        },
    };

    if (message) {
        response.message = message;
    }

    if (pagination) {
        response.pagination = pagination;
    }

    return res.status(statusCode).json(response);
}

/**
 * Created response (201)
 */
export function created<T>(
    res: Response,
    data: T,
    message: string = 'Resource created successfully'
): Response {
    return success(res, data, { message, statusCode: 201 });
}

/**
 * No content response (204)
 */
export function noContent(res: Response): Response {
    return res.status(204).end();
}

/**
 * Error response helper
 */
export function error(
    res: Response,
    message: string,
    statusCode: number = 500,
    details?: any
): Response {
    const response: ApiResponse = {
        success: false,
        error: message,
        meta: {
            timestamp: new Date().toISOString(),
        },
    };

    if (details && process.env.NODE_ENV === 'development') {
        (response as any).details = details;
    }

    return res.status(statusCode).json(response);
}

/**
 * Bad request response (400)
 */
export function badRequest(res: Response, message: string = 'Bad request'): Response {
    return error(res, message, 400);
}

/**
 * Unauthorized response (401)
 */
export function unauthorized(res: Response, message: string = 'Unauthorized'): Response {
    return error(res, message, 401);
}

/**
 * Forbidden response (403)
 */
export function forbidden(res: Response, message: string = 'Forbidden'): Response {
    return error(res, message, 403);
}

/**
 * Not found response (404)
 */
export function notFound(res: Response, resource: string = 'Resource'): Response {
    return error(res, `${resource} not found`, 404);
}

/**
 * Conflict response (409)
 */
export function conflict(res: Response, message: string = 'Resource already exists'): Response {
    return error(res, message, 409);
}

/**
 * Validation error response (422)
 */
export function validationError(res: Response, errors: any[]): Response {
    return res.status(422).json({
        success: false,
        error: 'Validation failed',
        errors,
        meta: {
            timestamp: new Date().toISOString(),
        },
    });
}

/**
 * Rate limit response (429)
 */
export function tooManyRequests(
    res: Response,
    retryAfter: number = 60,
    message: string = 'Too many requests'
): Response {
    res.set('Retry-After', String(retryAfter));
    return error(res, message, 429);
}

/**
 * Internal server error (500)
 */
export function serverError(res: Response, message: string = 'Internal server error'): Response {
    return error(res, message, 500);
}

/**
 * Paginated response helper
 */
export function paginated<T>(
    res: Response,
    data: T[],
    pagination: {
        page: number;
        pageSize: number;
        total: number;
    },
    options: { cached?: boolean } = {}
): Response {
    const totalPages = Math.ceil(pagination.total / pagination.pageSize);

    return success(res, data, {
        pagination: {
            page: pagination.page,
            pageSize: pagination.pageSize,
            total: pagination.total,
            totalPages,
            hasNext: pagination.page < totalPages,
            hasPrev: pagination.page > 1,
        },
        cached: options.cached,
    });
}

/**
 * Format price for display
 */
export function formatPrice(amount: number, currency: string = 'INR'): string {
    if (currency === 'INR') {
        if (amount >= 10000000) {
            return `₹${(amount / 10000000).toFixed(2)} Cr`;
        } else if (amount >= 100000) {
            return `₹${(amount / 100000).toFixed(2)} L`;
        }
        return `₹${amount.toLocaleString('en-IN')}`;
    }
    return `${currency} ${amount.toLocaleString()}`;
}

/**
 * Filter object fields (for field selection in API)
 */
export function selectFields<T extends object>(obj: T, fields: string[]): Partial<T> {
    if (fields.length === 0) return obj;

    const result: Partial<T> = {};
    for (const field of fields) {
        if (field in obj) {
            (result as any)[field] = (obj as any)[field];
        }
    }
    return result;
}

/**
 * Apply field selection to array of objects
 */
export function selectFieldsArray<T extends object>(arr: T[], fields: string[]): Partial<T>[] {
    if (fields.length === 0) return arr;
    return arr.map(obj => selectFields(obj, fields));
}

/**
 * Parse fields query parameter
 */
export function parseFieldsParam(fieldsParam: string | undefined): string[] {
    if (!fieldsParam) return [];
    return fieldsParam.split(',').map(f => f.trim()).filter(Boolean);
}

/**
 * Parse pagination parameters
 */
export function parsePaginationParams(query: {
    page?: string;
    pageSize?: string;
    limit?: string;
}): { page: number; pageSize: number } {
    const page = Math.max(1, parseInt(query.page || '1', 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize || query.limit || '20', 10) || 20));
    return { page, pageSize };
}
