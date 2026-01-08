import Redis from 'ioredis';
import { config } from '../config';
import { logger } from '../utils/logger';

/**
 * High-performance Redis caching service for fast data retrieval
 */
export class CacheService {
    private redis: Redis | null = null;
    private memoryCache: Map<string, { data: any; expiry: number }> = new Map();
    private isConnected: boolean = false;

    // Cache TTL constants (in seconds)
    static readonly TTL = {
        VERY_SHORT: 30,        // 30 seconds - for rapidly changing data
        SHORT: 60,             // 1 minute
        MEDIUM: 300,           // 5 minutes
        LONG: 900,             // 15 minutes
        VERY_LONG: 3600,       // 1 hour
        PROPERTY_LIST: 120,    // 2 minutes for property listings
        PROPERTY_DETAIL: 300,  // 5 minutes for property details
        USER_PROFILE: 600,     // 10 minutes for user profiles
        TRENDING: 180,         // 3 minutes for trending data
        ANALYTICS: 60,         // 1 minute for analytics
    };

    // Cache key prefixes
    static readonly KEYS = {
        PROPERTY: 'prop:',
        PROPERTY_LIST: 'proplist:',
        PROPERTY_SEARCH: 'propsearch:',
        PROPERTY_TRENDING: 'trending:',
        PROPERTY_SIMILAR: 'similar:',
        USER: 'user:',
        NOTIFICATION: 'notif:',
        ANALYTICS: 'analytics:',
        HEALTH: 'health:',
    };

    constructor() {
        this.initRedis();
    }

    /**
     * Initialize Redis connection with fallback to memory cache
     */
    private initRedis(): void {
        try {
            this.redis = new Redis({
                host: config.redis.host,
                port: config.redis.port,
                password: config.redis.password || undefined,
                maxRetriesPerRequest: 3,
                retryStrategy: (times) => {
                    if (times > 3) {
                        logger.warn('Redis connection failed, falling back to memory cache');
                        return null;
                    }
                    return Math.min(times * 100, 2000);
                },
                lazyConnect: true,
            });

            this.redis.on('connect', () => {
                this.isConnected = true;
                logger.info('✅ Redis cache connected');
            });

            this.redis.on('error', (err) => {
                this.isConnected = false;
                logger.warn('Redis error, using memory cache:', err.message);
            });

            this.redis.on('close', () => {
                this.isConnected = false;
            });

            // Attempt connection
            this.redis.connect().catch(() => {
                logger.info('Using in-memory cache (Redis unavailable)');
            });
        } catch (error) {
            logger.warn('Redis initialization failed, using memory cache');
            this.redis = null;
        }
    }

    /**
     * Get value from cache (Redis or memory fallback)
     */
    async get<T>(key: string): Promise<T | null> {
        try {
            // Try Redis first
            if (this.redis && this.isConnected) {
                const value = await this.redis.get(key);
                if (value) {
                    return JSON.parse(value) as T;
                }
                return null;
            }

            // Fallback to memory cache
            const cached = this.memoryCache.get(key);
            if (cached && cached.expiry > Date.now()) {
                return cached.data as T;
            }

            // Clean up expired entry
            if (cached) {
                this.memoryCache.delete(key);
            }

            return null;
        } catch (error) {
            logger.error('Cache get error:', error);
            return null;
        }
    }

    /**
     * Set value in cache with TTL
     */
    async set(key: string, value: any, ttlSeconds: number = CacheService.TTL.MEDIUM): Promise<boolean> {
        try {
            const serialized = JSON.stringify(value);

            // Try Redis first
            if (this.redis && this.isConnected) {
                await this.redis.setex(key, ttlSeconds, serialized);
                return true;
            }

            // Fallback to memory cache
            this.memoryCache.set(key, {
                data: value,
                expiry: Date.now() + (ttlSeconds * 1000),
            });

            // Clean memory cache if too large (prevent memory leaks)
            if (this.memoryCache.size > 1000) {
                this.cleanMemoryCache();
            }

            return true;
        } catch (error) {
            logger.error('Cache set error:', error);
            return false;
        }
    }

    /**
     * Delete key from cache
     */
    async delete(key: string): Promise<boolean> {
        try {
            if (this.redis && this.isConnected) {
                await this.redis.del(key);
            }
            this.memoryCache.delete(key);
            return true;
        } catch (error) {
            logger.error('Cache delete error:', error);
            return false;
        }
    }

    /**
     * Delete multiple keys by pattern (e.g., "prop:*")
     */
    async deletePattern(pattern: string): Promise<number> {
        try {
            let count = 0;

            if (this.redis && this.isConnected) {
                const keys = await this.redis.keys(pattern);
                if (keys.length > 0) {
                    count = await this.redis.del(...keys);
                }
            }

            // Also clear from memory cache
            for (const key of this.memoryCache.keys()) {
                if (this.matchPattern(key, pattern)) {
                    this.memoryCache.delete(key);
                    count++;
                }
            }

            return count;
        } catch (error) {
            logger.error('Cache delete pattern error:', error);
            return 0;
        }
    }

    /**
     * Get or set cache with callback (memoization pattern)
     */
    async getOrSet<T>(
        key: string,
        fetchFn: () => Promise<T>,
        ttlSeconds: number = CacheService.TTL.MEDIUM
    ): Promise<T> {
        // Try to get from cache first
        const cached = await this.get<T>(key);
        if (cached !== null) {
            return cached;
        }

        // Fetch fresh data
        const data = await fetchFn();

        // Cache the result (don't await to avoid blocking)
        this.set(key, data, ttlSeconds).catch(() => { });

        return data;
    }

    /**
     * Invalidate property-related caches
     */
    async invalidateProperty(propertyId: string): Promise<void> {
        const patterns = [
            `${CacheService.KEYS.PROPERTY}${propertyId}`,
            `${CacheService.KEYS.PROPERTY_SIMILAR}${propertyId}`,
        ];

        // Also invalidate list caches
        await this.deletePattern(`${CacheService.KEYS.PROPERTY_LIST}*`);
        await this.deletePattern(`${CacheService.KEYS.PROPERTY_SEARCH}*`);
        await this.deletePattern(`${CacheService.KEYS.PROPERTY_TRENDING}*`);

        for (const pattern of patterns) {
            await this.delete(pattern);
        }

        logger.info(`Cache invalidated for property: ${propertyId}`);
    }

    /**
     * Invalidate user-related caches
     */
    async invalidateUser(userId: string): Promise<void> {
        await this.deletePattern(`${CacheService.KEYS.USER}${userId}*`);
        logger.info(`Cache invalidated for user: ${userId}`);
    }

    /**
     * Get cache statistics
     */
    async getStats(): Promise<{
        type: 'redis' | 'memory';
        connected: boolean;
        memorySize: number;
        info?: string;
    }> {
        if (this.redis && this.isConnected) {
            try {
                const info = await this.redis.info('memory');
                return {
                    type: 'redis',
                    connected: true,
                    memorySize: this.memoryCache.size,
                    info,
                };
            } catch {
                return {
                    type: 'redis',
                    connected: false,
                    memorySize: this.memoryCache.size,
                };
            }
        }

        return {
            type: 'memory',
            connected: false,
            memorySize: this.memoryCache.size,
        };
    }

    /**
     * Health check for cache service
     */
    async healthCheck(): Promise<{ status: 'healthy' | 'degraded' | 'unhealthy'; latency?: number }> {
        const start = Date.now();

        try {
            if (this.redis && this.isConnected) {
                await this.redis.ping();
                return {
                    status: 'healthy',
                    latency: Date.now() - start,
                };
            }

            // Memory cache is always available but considered degraded
            return {
                status: 'degraded',
                latency: 0,
            };
        } catch {
            return { status: 'unhealthy' };
        }
    }

    /**
     * Cleanup expired cache entries (for scheduled job)
     */
    async cleanup(): Promise<number> {
        let cleaned = 0;

        // Clean memory cache
        const now = Date.now();
        for (const [key, value] of this.memoryCache.entries()) {
            if (value.expiry < now) {
                this.memoryCache.delete(key);
                cleaned++;
            }
        }

        logger.info(`Cache cleanup: removed ${cleaned} expired entries`);
        return cleaned;
    }

    /**
     * Graceful shutdown
     */
    async disconnect(): Promise<void> {
        if (this.redis) {
            await this.redis.quit();
            this.isConnected = false;
        }
        this.memoryCache.clear();
        logger.info('Cache service disconnected');
    }

    /**
     * Clean expired entries from memory cache
     */
    private cleanMemoryCache(): void {
        const now = Date.now();
        let cleaned = 0;

        for (const [key, value] of this.memoryCache.entries()) {
            if (value.expiry < now) {
                this.memoryCache.delete(key);
                cleaned++;
            }
        }

        // If still too large, remove oldest entries
        if (this.memoryCache.size > 800) {
            const entries = Array.from(this.memoryCache.entries())
                .sort((a, b) => a[1].expiry - b[1].expiry);

            const toRemove = entries.slice(0, 200);
            for (const [key] of toRemove) {
                this.memoryCache.delete(key);
            }
        }

        if (cleaned > 0) {
            logger.debug(`Cleaned ${cleaned} expired cache entries`);
        }
    }

    /**
     * Simple pattern matching for memory cache keys
     */
    private matchPattern(key: string, pattern: string): boolean {
        const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
        return regex.test(key);
    }
}

// Singleton instance
export const cacheService = new CacheService();
