import Bull from 'bull';
import { config } from '../config';
import { logger } from '../utils/logger';

/**
 * Background Job Queue Service
 * Uses Bull (Redis-backed) for reliable job processing
 * Offloads heavy operations from the request-response cycle
 */

// Queue options
const defaultJobOptions: Bull.JobOptions = {
    attempts: 3,
    backoff: {
        type: 'exponential',
        delay: 2000,
    },
    removeOnComplete: 100, // Keep last 100 completed jobs
    removeOnFail: 50, // Keep last 50 failed jobs
};

// Redis connection options
const redisConfig = {
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
    maxRetriesPerRequest: 3,
};

/**
 * Queue definitions
 */
export const queues = {
    email: new Bull('email-queue', { redis: redisConfig }),
    notification: new Bull('notification-queue', { redis: redisConfig }),
    imageProcessing: new Bull('image-processing-queue', { redis: redisConfig }),
    analytics: new Bull('analytics-queue', { redis: redisConfig }),
    cleanup: new Bull('cleanup-queue', { redis: redisConfig }),
};

/**
 * Job types
 */
export interface EmailJob {
    to: string;
    subject: string;
    template: string;
    data: Record<string, any>;
}

export interface NotificationJob {
    userId: string;
    type: string;
    title: string;
    message: string;
    data?: Record<string, any>;
}

export interface ImageProcessingJob {
    fileUrl: string;
    propertyId: string;
    sizes: string[];
}

export interface AnalyticsJob {
    eventType: string;
    userId?: string;
    propertyId?: string;
    data: Record<string, any>;
    timestamp: string;
}

export interface CleanupJob {
    type: 'expired_cache' | 'old_notifications' | 'temp_files';
    olderThan?: number; // days
}

/**
 * Queue service for adding jobs
 */
class QueueService {
    /**
     * Send email asynchronously
     */
    async sendEmail(job: EmailJob): Promise<Bull.Job<EmailJob>> {
        logger.info(`Queueing email to ${job.to}`);
        return queues.email.add(job, {
            ...defaultJobOptions,
            priority: 2, // Higher priority
        });
    }

    /**
     * Send notification asynchronously
     */
    async sendNotification(job: NotificationJob): Promise<Bull.Job<NotificationJob>> {
        logger.debug(`Queueing notification for ${job.userId}`);
        return queues.notification.add(job, {
            ...defaultJobOptions,
            priority: 3,
        });
    }

    /**
     * Process image in background
     */
    async processImage(job: ImageProcessingJob): Promise<Bull.Job<ImageProcessingJob>> {
        logger.info(`Queueing image processing for property ${job.propertyId}`);
        return queues.imageProcessing.add(job, {
            ...defaultJobOptions,
            priority: 5, // Lower priority
            timeout: 60000, // 1 minute timeout
        });
    }

    /**
     * Track analytics event
     */
    async trackAnalytics(job: AnalyticsJob): Promise<Bull.Job<AnalyticsJob>> {
        return queues.analytics.add(job, {
            ...defaultJobOptions,
            priority: 10, // Lowest priority
        });
    }

    /**
     * Schedule cleanup job
     */
    async scheduleCleanup(job: CleanupJob): Promise<Bull.Job<CleanupJob>> {
        logger.info(`Scheduling cleanup: ${job.type}`);
        return queues.cleanup.add(job, {
            ...defaultJobOptions,
            delay: 0,
        });
    }

    /**
     * Get queue statistics
     */
    async getStats(): Promise<Record<string, any>> {
        const stats: Record<string, any> = {};

        for (const [name, queue] of Object.entries(queues)) {
            const [waiting, active, completed, failed] = await Promise.all([
                queue.getWaitingCount(),
                queue.getActiveCount(),
                queue.getCompletedCount(),
                queue.getFailedCount(),
            ]);

            stats[name] = { waiting, active, completed, failed };
        }

        return stats;
    }

    /**
     * Pause all queues (for maintenance)
     */
    async pauseAll(): Promise<void> {
        await Promise.all(Object.values(queues).map(q => q.pause()));
        logger.info('All queues paused');
    }

    /**
     * Resume all queues
     */
    async resumeAll(): Promise<void> {
        await Promise.all(Object.values(queues).map(q => q.resume()));
        logger.info('All queues resumed');
    }

    /**
     * Graceful shutdown
     */
    async shutdown(): Promise<void> {
        logger.info('Shutting down job queues...');
        await Promise.all(Object.values(queues).map(q => q.close()));
        logger.info('Job queues closed');
    }
}

export const queueService = new QueueService();

/**
 * Queue event handlers (for logging/monitoring)
 */
for (const [name, queue] of Object.entries(queues)) {
    queue.on('error', (error) => {
        logger.error(`Queue ${name} error:`, error);
    });

    queue.on('failed', (job, error) => {
        logger.error(`Job ${job.id} in ${name} failed:`, error.message);
    });

    queue.on('stalled', (job) => {
        logger.warn(`Job ${job.id} in ${name} stalled`);
    });

    queue.on('completed', (job) => {
        logger.debug(`Job ${job.id} in ${name} completed`);
    });
}
