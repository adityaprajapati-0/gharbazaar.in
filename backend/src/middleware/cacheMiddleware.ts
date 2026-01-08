import { Request, Response, NextFunction } from 'express';
import { cacheService, CacheService } from '../services/cache.service';
import { logger } from '../utils/logger';
import crypto from 'crypto';

/**
 * Generate cache key from request
 */
function generateCacheKey(req: Request, prefix: string = 'api'): string {
    const userId = (req as any).user?.uid || 'anon';
    const path = req.originalUrl || req.url;
    const query = JSON.stringify(req.query || {});

    // Create hash for consistent key length
    const hash = crypto
        .createHash('md5')
        .update(`${path}:${query}`)
        .digest('hex')
        .substring(0, 12);

    return `${prefix}:${userId}:${hash}`;
}

/**
 * Generate ETag from response body
 */
function generateETag(body: any): string {
    const content = typeof body === 'string' ? body : JSON.stringify(body);
    return crypto.createHash('md5').update(content).digest('hex');
}

/**
 * Response caching middleware for GET requests
 */
export const responseCache = (options: {
    ttl?: number;
    prefix?: string;
    condition?: (req: Request) => boolean;
} = {}) => {
    const {
        ttl = CacheService.TTL.SHORT,
        prefix = 'api',
        condition = () => true,
    } = options;

    return async (req: Request, res: Response, next: NextFunction) => {
        // Only cache GET requests
        if (req.method !== 'GET') {
            return next();
        }

        // Check custom condition
        if (!condition(req)) {
            return next();
        }

        const cacheKey = generateCacheKey(req, prefix);

        try {
            // Check for cached response
            const cached = await cacheService.get<{
                body: any;
                headers: Record<string, string>;
                etag: string;
            }>(cacheKey);

            if (cached) {
                // Check If-None-Match header for 304 response
                const clientETag = req.get('If-None-Match');
                if (clientETag && clientETag === cached.etag) {
                    res.status(304).end();
                    return;
                }

                // Set cached headers
                res.set('X-Cache', 'HIT');
                res.set('ETag', cached.etag);
                res.set('Cache-Control', `private, max-age=${ttl}`);

                return res.json(cached.body);
            }

            // Cache miss - intercept response
            res.set('X-Cache', 'MISS');

            const originalJson = res.json.bind(res);
            res.json = (body: any) => {
                // Generate ETag
                const etag = generateETag(body);
                res.set('ETag', etag);
                res.set('Cache-Control', `private, max-age=${ttl}`);

                // Cache the response (async, don't block)
                cacheService.set(cacheKey, {
                    body,
                    headers: {},
                    etag,
                }, ttl).catch(() => { });

                return originalJson(body);
            };

            next();
        } catch (error) {
            logger.error('Cache middleware error:', error);
            next();
        }
    };
};

/**
 * Cache-Control headers middleware
 */
export const cacheControl = (maxAge: number = 60, isPrivate: boolean = true) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const directive = isPrivate ? 'private' : 'public';
        res.set('Cache-Control', `${directive}, max-age=${maxAge}`);
        next();
    };
};

/**
 * No-cache middleware for dynamic content
 */
export const noCache = (req: Request, res: Response, next: NextFunction) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    next();
};

/**
 * Stale-while-revalidate caching for better UX
 */
export const staleWhileRevalidate = (maxAge: number = 60, staleAge: number = 300) => {
    return (req: Request, res: Response, next: NextFunction) => {
        res.set('Cache-Control', `public, max-age=${maxAge}, stale-while-revalidate=${staleAge}`);
        next();
    };
};

/**
 * Property-specific caching
 */
export const propertyCache = responseCache({
    ttl: CacheService.TTL.PROPERTY_LIST,
    prefix: CacheService.KEYS.PROPERTY_LIST,
});

/**
 * Trending properties caching
 */
export const trendingCache = responseCache({
    ttl: CacheService.TTL.TRENDING,
    prefix: CacheService.KEYS.PROPERTY_TRENDING,
});

/**
 * Analytics caching (shorter TTL)
 */
export const analyticsCache = responseCache({
    ttl: CacheService.TTL.ANALYTICS,
    prefix: CacheService.KEYS.ANALYTICS,
});
