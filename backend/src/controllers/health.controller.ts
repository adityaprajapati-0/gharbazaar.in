import { Request, Response, NextFunction } from 'express';
import { getFirestore } from '../config/firebase';
import { logger } from '../utils/logger';
import { cacheService } from '../services/cache.service';

export class HealthController {
    /**
     * Basic health check (fast, for load balancers)
     */
    async healthCheck(req: Request, res: Response, _next: NextFunction) {
        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: Math.floor(process.uptime()),
            environment: process.env.NODE_ENV || 'development',
        });
    }

    /**
     * Detailed health check (database, cache, services)
     */
    async detailedHealthCheck(req: Request, res: Response, next: NextFunction) {
        const startTime = Date.now();

        try {
            const checks: any = {
                timestamp: new Date().toISOString(),
                uptime: Math.floor(process.uptime()),
                environment: process.env.NODE_ENV || 'development',
                services: {},
                performance: {},
            };

            // Check Firestore (with timeout)
            const firestoreCheck = await Promise.race([
                (async () => {
                    const dbStart = Date.now();
                    const db = getFirestore();
                    await db.collection('health_check').limit(1).get();
                    return { status: 'healthy', latency: Date.now() - dbStart };
                })(),
                new Promise<{ status: string; error: string }>((resolve) =>
                    setTimeout(() => resolve({ status: 'timeout', error: 'Connection timeout' }), 5000)
                ),
            ]).catch(() => ({ status: 'unhealthy', error: 'Connection failed' }));
            checks.services.firestore = firestoreCheck;

            // Check Cache (Redis or memory)
            const cacheHealth = await cacheService.healthCheck();
            const cacheStats = await cacheService.getStats();
            checks.services.cache = {
                status: cacheHealth.status,
                type: cacheStats.type,
                latency: cacheHealth.latency,
                memoryEntries: cacheStats.memorySize,
            };

            // Check Firebase Storage
            checks.services.storage = process.env.FIREBASE_STORAGE_BUCKET
                ? { status: 'configured' }
                : { status: 'not_configured' };

            // Check SendGrid
            checks.services.email = process.env.SENDGRID_API_KEY
                ? { status: 'configured' }
                : { status: 'not_configured' };

            // Check Twilio
            checks.services.sms = process.env.TWILIO_ACCOUNT_SID
                ? { status: 'configured' }
                : { status: 'not_configured' };

            // Check Razorpay
            checks.services.payment = process.env.RAZORPAY_KEY_ID
                ? { status: 'configured' }
                : { status: 'not_configured' };

            // Memory usage
            const memUsage = process.memoryUsage();
            checks.performance.memory = {
                heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
                heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
                rss: Math.round(memUsage.rss / 1024 / 1024),
                unit: 'MB',
            };

            // Overall status
            const criticalServices = [checks.services.firestore];
            const allHealthy = criticalServices.every(
                (service: any) => service.status === 'healthy'
            );
            const hasDegraded = Object.values(checks.services).some(
                (service: any) => service.status === 'degraded' || service.status === 'timeout'
            );

            if (allHealthy && !hasDegraded) {
                checks.status = 'healthy';
            } else if (allHealthy) {
                checks.status = 'degraded';
            } else {
                checks.status = 'unhealthy';
            }

            checks.responseTime = Date.now() - startTime;

            const statusCode = checks.status === 'healthy' ? 200 :
                checks.status === 'degraded' ? 200 : 503;

            res.status(statusCode).json(checks);
        } catch (error) {
            logger.error('Health check error:', error);
            res.status(500).json({
                status: 'error',
                timestamp: new Date().toISOString(),
                error: 'Health check failed',
            });
        }
    }

    /**
     * Readiness check (for k8s/docker)
     */
    async readinessCheck(req: Request, res: Response, _next: NextFunction) {
        try {
            // Check if critical services are ready
            const db = getFirestore();
            await db.collection('health_check').limit(1).get();

            res.json({
                status: 'ready',
                timestamp: new Date().toISOString(),
            });
        } catch (error) {
            res.status(503).json({
                status: 'not_ready',
                timestamp: new Date().toISOString(),
                error: 'Database not ready',
            });
        }
    }

    /**
     * Liveness check (for k8s/docker) - ultra fast
     */
    async livenessCheck(_req: Request, res: Response, _next: NextFunction) {
        res.json({
            status: 'alive',
            timestamp: new Date().toISOString(),
        });
    }

    /**
     * Get API stats and metrics
     */
    async getStats(req: Request, res: Response, next: NextFunction) {
        try {
            const memUsage = process.memoryUsage();
            const cpuUsage = process.cpuUsage();

            const stats = {
                timestamp: new Date().toISOString(),
                uptime: {
                    seconds: Math.floor(process.uptime()),
                    formatted: formatUptime(process.uptime()),
                },
                memory: {
                    heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)} MB`,
                    heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)} MB`,
                    rss: `${Math.round(memUsage.rss / 1024 / 1024)} MB`,
                    external: `${Math.round((memUsage.external || 0) / 1024 / 1024)} MB`,
                },
                cpu: {
                    user: Math.round(cpuUsage.user / 1000),
                    system: Math.round(cpuUsage.system / 1000),
                    unit: 'ms',
                },
                version: process.env.npm_package_version || '1.0.0',
                environment: process.env.NODE_ENV || 'development',
                node: process.version,
            };

            res.json(stats);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get cache statistics
     */
    async getCacheStats(req: Request, res: Response, next: NextFunction) {
        try {
            const health = await cacheService.healthCheck();
            const stats = await cacheService.getStats();

            res.json({
                timestamp: new Date().toISOString(),
                cache: {
                    type: stats.type,
                    connected: stats.connected,
                    health: health.status,
                    latency: health.latency,
                    memoryEntries: stats.memorySize,
                },
            });
        } catch (error) {
            next(error);
        }
    }
}

/**
 * Format uptime as human-readable string
 */
function formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    parts.push(`${secs}s`);

    return parts.join(' ');
}

export const healthController = new HealthController();
