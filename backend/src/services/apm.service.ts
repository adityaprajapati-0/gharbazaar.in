import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * APM (Application Performance Monitoring) Service
 * Provides performance tracking, metrics collection, and alerting
 */

interface MetricData {
    name: string;
    value: number;
    timestamp: Date;
    tags?: Record<string, string>;
}

interface RequestMetrics {
    path: string;
    method: string;
    statusCode: number;
    duration: number;
    userId?: string;
    timestamp: Date;
}

interface ErrorMetrics {
    path: string;
    method: string;
    error: string;
    stack?: string;
    userId?: string;
    timestamp: Date;
}

class APMService {
    private requestMetrics: RequestMetrics[] = [];
    private errorMetrics: ErrorMetrics[] = [];
    private customMetrics: MetricData[] = [];
    private readonly maxMetricsSize = 10000;

    // Performance thresholds
    private readonly thresholds = {
        slowRequest: 500, // ms
        verySlowRequest: 2000, // ms
        errorRateAlert: 0.05, // 5%
        memoryWarning: 0.8, // 80% of heap
    };

    /**
     * Track a request
     */
    trackRequest(metrics: RequestMetrics): void {
        this.requestMetrics.push(metrics);

        // Trim if too large
        if (this.requestMetrics.length > this.maxMetricsSize) {
            this.requestMetrics = this.requestMetrics.slice(-this.maxMetricsSize / 2);
        }

        // Log slow requests
        if (metrics.duration > this.thresholds.verySlowRequest) {
            logger.warn('Very slow request detected', {
                path: metrics.path,
                method: metrics.method,
                duration: metrics.duration,
                userId: metrics.userId,
            });
        } else if (metrics.duration > this.thresholds.slowRequest) {
            logger.info('Slow request detected', {
                path: metrics.path,
                duration: metrics.duration,
            });
        }
    }

    /**
     * Track an error
     */
    trackError(metrics: ErrorMetrics): void {
        this.errorMetrics.push(metrics);

        if (this.errorMetrics.length > this.maxMetricsSize) {
            this.errorMetrics = this.errorMetrics.slice(-this.maxMetricsSize / 2);
        }
    }

    /**
     * Track custom metric
     */
    trackMetric(name: string, value: number, tags?: Record<string, string>): void {
        this.customMetrics.push({
            name,
            value,
            timestamp: new Date(),
            tags,
        });

        if (this.customMetrics.length > this.maxMetricsSize) {
            this.customMetrics = this.customMetrics.slice(-this.maxMetricsSize / 2);
        }
    }

    /**
     * Get aggregated metrics for a time period
     */
    getMetrics(periodMinutes: number = 60): {
        requests: {
            total: number;
            successful: number;
            failed: number;
            avgDuration: number;
            p95Duration: number;
            p99Duration: number;
            slowRequests: number;
            requestsPerMinute: number;
        };
        errors: {
            total: number;
            rate: number;
            topErrors: Array<{ error: string; count: number }>;
        };
        endpoints: Array<{
            path: string;
            method: string;
            count: number;
            avgDuration: number;
            errorRate: number;
        }>;
    } {
        const cutoff = new Date(Date.now() - periodMinutes * 60 * 1000);

        const recentRequests = this.requestMetrics.filter(m => m.timestamp >= cutoff);
        const recentErrors = this.errorMetrics.filter(m => m.timestamp >= cutoff);

        // Request metrics
        const durations = recentRequests.map(r => r.duration).sort((a, b) => a - b);
        const total = recentRequests.length;
        const successful = recentRequests.filter(r => r.statusCode < 400).length;

        // Endpoint breakdown
        const endpointMap = new Map<string, {
            count: number;
            totalDuration: number;
            errors: number;
        }>();

        for (const req of recentRequests) {
            const key = `${req.method}:${req.path}`;
            const existing = endpointMap.get(key) || { count: 0, totalDuration: 0, errors: 0 };
            existing.count++;
            existing.totalDuration += req.duration;
            if (req.statusCode >= 400) existing.errors++;
            endpointMap.set(key, existing);
        }

        // Error breakdown
        const errorMap = new Map<string, number>();
        for (const err of recentErrors) {
            const count = errorMap.get(err.error) || 0;
            errorMap.set(err.error, count + 1);
        }

        return {
            requests: {
                total,
                successful,
                failed: total - successful,
                avgDuration: total > 0 ? durations.reduce((a, b) => a + b, 0) / total : 0,
                p95Duration: durations[Math.floor(durations.length * 0.95)] || 0,
                p99Duration: durations[Math.floor(durations.length * 0.99)] || 0,
                slowRequests: recentRequests.filter(r => r.duration > this.thresholds.slowRequest).length,
                requestsPerMinute: total / periodMinutes,
            },
            errors: {
                total: recentErrors.length,
                rate: total > 0 ? recentErrors.length / total : 0,
                topErrors: Array.from(errorMap.entries())
                    .map(([error, count]) => ({ error, count }))
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 10),
            },
            endpoints: Array.from(endpointMap.entries())
                .map(([key, data]) => {
                    const [method, path] = key.split(':');
                    return {
                        path,
                        method,
                        count: data.count,
                        avgDuration: data.totalDuration / data.count,
                        errorRate: data.errors / data.count,
                    };
                })
                .sort((a, b) => b.count - a.count)
                .slice(0, 20),
        };
    }

    /**
     * Get system health metrics
     */
    getSystemHealth(): {
        memory: {
            heapUsed: number;
            heapTotal: number;
            rss: number;
            external: number;
            utilizationPercent: number;
        };
        uptime: number;
        activeRequests: number;
    } {
        const mem = process.memoryUsage();

        return {
            memory: {
                heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
                heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
                rss: Math.round(mem.rss / 1024 / 1024),
                external: Math.round((mem.external || 0) / 1024 / 1024),
                utilizationPercent: Math.round((mem.heapUsed / mem.heapTotal) * 100),
            },
            uptime: Math.floor(process.uptime()),
            activeRequests: 0, // Would need connection tracking
        };
    }

    /**
     * Check for alerts
     */
    checkAlerts(): Array<{
        type: 'warning' | 'critical';
        message: string;
        value: number;
        threshold: number;
    }> {
        const alerts = [];
        const metrics = this.getMetrics(5); // Last 5 minutes
        const health = this.getSystemHealth();

        // High error rate
        if (metrics.errors.rate > this.thresholds.errorRateAlert) {
            alerts.push({
                type: 'critical' as const,
                message: 'High error rate detected',
                value: metrics.errors.rate,
                threshold: this.thresholds.errorRateAlert,
            });
        }

        // Memory warning
        if (health.memory.utilizationPercent / 100 > this.thresholds.memoryWarning) {
            alerts.push({
                type: 'warning' as const,
                message: 'High memory usage',
                value: health.memory.utilizationPercent,
                threshold: this.thresholds.memoryWarning * 100,
            });
        }

        // Slow average response time
        if (metrics.requests.avgDuration > this.thresholds.slowRequest) {
            alerts.push({
                type: 'warning' as const,
                message: 'Slow average response time',
                value: metrics.requests.avgDuration,
                threshold: this.thresholds.slowRequest,
            });
        }

        return alerts;
    }

    /**
     * Clear old metrics
     */
    cleanup(maxAgeMinutes: number = 60): void {
        const cutoff = new Date(Date.now() - maxAgeMinutes * 60 * 1000);

        this.requestMetrics = this.requestMetrics.filter(m => m.timestamp >= cutoff);
        this.errorMetrics = this.errorMetrics.filter(m => m.timestamp >= cutoff);
        this.customMetrics = this.customMetrics.filter(m => m.timestamp >= cutoff);
    }
}

// Singleton instance
export const apmService = new APMService();

/**
 * APM middleware - tracks request performance
 */
export const apmMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    const startTime = Date.now();

    // Track response
    res.on('finish', () => {
        const duration = Date.now() - startTime;

        apmService.trackRequest({
            path: req.path,
            method: req.method,
            statusCode: res.statusCode,
            duration,
            userId: (req as any).user?.uid,
            timestamp: new Date(),
        });

        // Track errors
        if (res.statusCode >= 400) {
            apmService.trackError({
                path: req.path,
                method: req.method,
                error: `HTTP ${res.statusCode}`,
                userId: (req as any).user?.uid,
                timestamp: new Date(),
            });
        }
    });

    next();
};

/**
 * Scheduled cleanup (call from a cron job or interval)
 */
export function cleanupOldMetrics(): void {
    apmService.cleanup(120); // Keep 2 hours
    logger.info('APM metrics cleanup completed');
}

// Auto-cleanup every 30 minutes
setInterval(() => {
    apmService.cleanup(120);
}, 30 * 60 * 1000);
