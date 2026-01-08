import { Request, Response, NextFunction } from 'express';
import { cacheService } from '../services/cache.service';
import { logger } from '../utils/logger';
import crypto from 'crypto';

/**
 * Request Deduplication Middleware
 * Prevents duplicate API requests from being processed multiple times
 * Useful for idempotent operations and preventing double-submissions
 */

interface DeduplicationOptions {
    ttl?: number; // Time to keep request signature (ms)
    keyPrefix?: string; // Cache key prefix
    methods?: string[]; // HTTP methods to deduplicate
    skipPaths?: RegExp[]; // Paths to skip
}

const DEFAULT_OPTIONS: DeduplicationOptions = {
    ttl: 5000, // 5 seconds
    keyPrefix: 'dedup:',
    methods: ['POST', 'PUT', 'PATCH', 'DELETE'],
    skipPaths: [
        /^\/health/,
        /^\/api\/v1\/health/,
        /^\/api\/v1\/properties\/\w+\/view$/, // View tracking can be duplicate
    ],
};

/**
 * Generate a unique signature for a request
 */
function generateRequestSignature(req: Request): string {
    const parts = [
        req.method,
        req.path,
        JSON.stringify(req.body || {}),
        (req as any).user?.uid || req.ip || 'anonymous',
    ];

    return crypto
        .createHash('md5')
        .update(parts.join('|'))
        .digest('hex');
}

/**
 * Request deduplication middleware factory
 */
export function deduplicateRequests(options: DeduplicationOptions = {}) {
    const config = { ...DEFAULT_OPTIONS, ...options };
    const pendingRequests = new Map<string, Promise<any>>();

    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        // Skip if method not in list
        if (!config.methods?.includes(req.method)) {
            return next();
        }

        // Skip if path matches skip patterns
        if (config.skipPaths?.some(pattern => pattern.test(req.path))) {
            return next();
        }

        // Check for idempotency key header
        const idempotencyKey = req.headers['x-idempotency-key'] as string;

        // Generate request signature
        const signature = idempotencyKey || generateRequestSignature(req);
        const cacheKey = `${config.keyPrefix}${signature}`;

        try {
            // Check if we have a cached response
            const cachedResponse = await cacheService.get<{
                status: number;
                body: any;
                headers: Record<string, string>;
            }>(cacheKey);

            if (cachedResponse) {
                logger.debug(`Deduplicated request: ${req.method} ${req.path}`);

                // Set cached headers
                for (const [key, value] of Object.entries(cachedResponse.headers || {})) {
                    res.setHeader(key, value);
                }

                res.setHeader('X-Deduplicated', 'true');
                res.status(cachedResponse.status).json(cachedResponse.body);
                return;
            }

            // Check if request is currently being processed
            const pendingRequest = pendingRequests.get(signature);
            if (pendingRequest) {
                logger.debug(`Request in flight, waiting: ${req.method} ${req.path}`);

                try {
                    const result = await pendingRequest;
                    res.setHeader('X-Deduplicated', 'true');
                    res.status(result.status).json(result.body);
                    return;
                } catch (error) {
                    // Original request failed, let this one proceed
                    pendingRequests.delete(signature);
                }
            }

            // Capture the response
            const originalJson = res.json.bind(res);
            let responseBody: any;
            let captured = false;

            const capturePromise = new Promise<{ status: number; body: any }>((resolve, reject) => {
                res.json = function (body: any) {
                    if (!captured) {
                        captured = true;
                        responseBody = body;

                        // Cache successful responses (2xx, 4xx client errors)
                        if (res.statusCode < 500) {
                            const responseData = {
                                status: res.statusCode,
                                body,
                                headers: {
                                    'Content-Type': 'application/json',
                                },
                            };

                            cacheService.set(cacheKey, responseData, config.ttl! / 1000)
                                .catch(err => logger.error('Dedup cache error:', err));

                            resolve(responseData);
                        } else {
                            reject(new Error('Server error'));
                        }
                    }

                    return originalJson(body);
                };

                // Handle response end without json
                res.on('finish', () => {
                    if (!captured) {
                        pendingRequests.delete(signature);
                    }
                });
            });

            pendingRequests.set(signature, capturePromise);

            // Clean up after TTL
            setTimeout(() => {
                pendingRequests.delete(signature);
            }, config.ttl);

            next();
        } catch (error) {
            logger.error('Deduplication error:', error);
            next();
        }
    };
}

/**
 * Simple idempotency key validator
 */
export function requireIdempotencyKey(req: Request, res: Response, next: NextFunction): void {
    const idempotencyKey = req.headers['x-idempotency-key'];

    if (!idempotencyKey) {
        res.status(400).json({
            success: false,
            error: 'Missing X-Idempotency-Key header',
            message: 'This endpoint requires an idempotency key for safe retries',
        });
        return;
    }

    // Validate key format (UUID-like)
    const uuidPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
    if (!uuidPattern.test(idempotencyKey as string)) {
        res.status(400).json({
            success: false,
            error: 'Invalid X-Idempotency-Key format',
            message: 'Idempotency key should be a valid UUID',
        });
        return;
    }

    next();
}

/**
 * Request coalescing for identical concurrent requests
 * Groups identical requests and returns the same response to all
 */
const coalescingMap = new Map<string, {
    promise: Promise<any>;
    timeout: NodeJS.Timeout;
}>();

export function coalesceRequests(
    keyGenerator: (req: Request) => string,
    ttl: number = 100 // ms to wait for coalescing
) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        const key = keyGenerator(req);

        const existing = coalescingMap.get(key);
        if (existing) {
            try {
                const result = await existing.promise;
                res.setHeader('X-Coalesced', 'true');
                res.status(result.status).json(result.body);
                return;
            } catch {
                // Fall through to process normally
            }
        }

        next();
    };
}
