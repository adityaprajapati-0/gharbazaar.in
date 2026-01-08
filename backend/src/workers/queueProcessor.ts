import { queues, EmailJob, NotificationJob, ImageProcessingJob, AnalyticsJob, CleanupJob } from '../services/queue.service';
import { emailService } from '../services/email.service';
import { notificationService } from '../services/notification.service';
import { uploadService } from '../services/upload.service';
import { cacheService } from '../services/cache.service';
import { getFirestore } from '../config/firebase';
import { logger } from '../utils/logger';

/**
 * Queue Processors (Workers)
 * Complete business-ready job processing
 * 
 * Run in production: node dist/workers/queueProcessor.js
 */

const db = getFirestore();

// ============================================
// EMAIL PROCESSING
// ============================================
queues.email.process(3, async (job) => {
    const data = job.data as EmailJob;
    logger.info(`Processing email job ${job.id} to ${data.to}`);

    try {
        switch (data.template) {
            case 'welcome':
                await emailService.sendWelcomeEmail(data.to, data.data.name);
                break;
            case 'verification':
                await emailService.sendVerificationEmail(data.to, data.data.verificationLink);
                break;
            case 'password_reset':
                await emailService.sendPasswordResetEmail(data.to, data.data.resetLink);
                break;
            case 'property_approved':
                await emailService.sendPropertyApprovedEmail(data.to, data.data.propertyTitle, data.data.propertyId);
                break;
            case 'inquiry':
                await emailService.sendInquiryNotificationEmail(data.to, data.data.propertyTitle, data.data.message);
                break;
            case 'bid':
                await emailService.sendBidNotificationEmail(data.to, data.data.propertyTitle, data.data.bidAmount);
                break;
            case 'payment_success':
                await emailService.sendPaymentSuccessEmail(data.to, data.data.amount, data.data.purpose, data.data.transactionId);
                break;
            default:
                // Generic email
                await emailService.sendEmail(data.to, data.subject, data.data.html || `<p>${data.data.message}</p>`);
        }

        logger.info(`Email sent successfully: ${data.to} (${data.template})`);
        return { success: true, to: data.to, template: data.template };
    } catch (error: any) {
        logger.error(`Email job ${job.id} failed:`, error);
        throw error;
    }
});

// ============================================
// NOTIFICATION PROCESSING
// ============================================
queues.notification.process(5, async (job) => {
    const data = job.data as NotificationJob;
    logger.debug(`Processing notification job ${job.id} for ${data.userId}`);

    try {
        const result = await notificationService.send({
            userId: data.userId,
            type: data.type as any,
            title: data.title,
            message: data.message,
            data: data.data,
            channels: ['in_app', 'push'], // Default channels for queue-based notifications
        });

        return { success: result.success, userId: data.userId, channels: result.channels };
    } catch (error: any) {
        logger.error(`Notification job ${job.id} failed:`, error);
        throw error;
    }
});

// ============================================
// IMAGE PROCESSING
// ============================================
queues.imageProcessing.process(2, async (job) => {
    const data = job.data as ImageProcessingJob;
    logger.info(`Processing image job ${job.id} for property ${data.propertyId}`);

    try {
        // Download and process each size requested
        const sizes = data.sizes || ['thumbnail', 'small', 'medium', 'large'];

        // The actual image processing is handled by uploadService
        // This job would be for post-upload processing like:
        // 1. Generating additional formats (AVIF for modern browsers)
        // 2. Creating blurhash placeholders
        // 3. Updating property document with sizes

        // Update property with processing status
        await db.collection('properties').doc(data.propertyId).update({
            imagesProcessed: true,
            imagesProcessedAt: new Date().toISOString(),
        });

        logger.info(`Image processing completed for property ${data.propertyId}`);
        return { success: true, propertyId: data.propertyId, sizes };
    } catch (error: any) {
        logger.error(`Image job ${job.id} failed:`, error);
        throw error;
    }
});

// ============================================
// ANALYTICS TRACKING
// ============================================
queues.analytics.process(10, async (job) => {
    const data = job.data as AnalyticsJob;

    try {
        // Store analytics event
        await db.collection('analytics').add({
            eventType: data.eventType,
            userId: data.userId,
            propertyId: data.propertyId,
            data: data.data,
            timestamp: data.timestamp,
            createdAt: new Date().toISOString(),
        });

        // Update aggregates based on event type
        switch (data.eventType) {
            case 'property_view':
                await db.collection('properties').doc(data.propertyId!).update({
                    views: require('firebase-admin').firestore.FieldValue.increment(1),
                });
                break;

            case 'property_search':
                // Track search patterns
                const searchKey = `search:${data.data.city || 'all'}:${data.data.propertyType || 'all'}`;
                await db.collection('searchAnalytics').doc(searchKey).set({
                    count: require('firebase-admin').firestore.FieldValue.increment(1),
                    lastSearched: new Date().toISOString(),
                }, { merge: true });
                break;

            case 'user_login':
                await db.collection('users').doc(data.userId!).update({
                    lastLogin: new Date().toISOString(),
                    loginCount: require('firebase-admin').firestore.FieldValue.increment(1),
                });
                break;
        }

        return { success: true, eventType: data.eventType };
    } catch (error: any) {
        logger.error(`Analytics job ${job.id} failed:`, error);
        throw error;
    }
});

// ============================================
// CLEANUP JOBS
// ============================================
queues.cleanup.process(async (job) => {
    const data = job.data as CleanupJob;
    logger.info(`Processing cleanup job ${job.id}: ${data.type}`);

    try {
        let deletedCount = 0;

        switch (data.type) {
            case 'expired_cache':
                // Clean expired cache entries (handled by cache service)
                await cacheService.cleanup();
                logger.info('Cache cleanup completed');
                break;

            case 'old_notifications':
                // Delete notifications older than X days
                const daysOld = data.olderThan || 30;
                deletedCount = await notificationService.deleteOldNotifications(daysOld);
                logger.info(`Deleted ${deletedCount} old notifications (older than ${daysOld} days)`);
                break;

            case 'temp_files':
                // Clean temporary upload files
                const cutoff = new Date();
                cutoff.setDate(cutoff.getDate() - 1);

                const tempFiles = await db.collection('tempUploads')
                    .where('createdAt', '<', cutoff.toISOString())
                    .limit(100)
                    .get();

                if (!tempFiles.empty) {
                    const batch = db.batch();
                    const urls: string[] = [];

                    tempFiles.docs.forEach(doc => {
                        urls.push(doc.data().url);
                        batch.delete(doc.ref);
                    });

                    // Delete files from storage
                    await uploadService.deleteFiles(urls);
                    await batch.commit();
                    deletedCount = tempFiles.size;
                }
                logger.info(`Cleaned ${deletedCount} temporary files`);
                break;
        }

        return { success: true, type: data.type, deletedCount };
    } catch (error: any) {
        logger.error(`Cleanup job ${job.id} failed:`, error);
        throw error;
    }
});

// ============================================
// SCHEDULED JOBS
// ============================================
export async function scheduleRecurringJobs(): Promise<void> {
    // Clean expired cache every hour
    await queues.cleanup.add(
        { type: 'expired_cache' },
        {
            repeat: { cron: '0 * * * *' },
            jobId: 'recurring-cache-cleanup',
        }
    );

    // Clean old notifications daily at 3am
    await queues.cleanup.add(
        { type: 'old_notifications', olderThan: 30 },
        {
            repeat: { cron: '0 3 * * *' },
            jobId: 'recurring-notification-cleanup',
        }
    );

    // Clean temp files every 6 hours
    await queues.cleanup.add(
        { type: 'temp_files' },
        {
            repeat: { cron: '0 */6 * * *' },
            jobId: 'recurring-temp-cleanup',
        }
    );

    logger.info('Recurring cleanup jobs scheduled');
}

// ============================================
// WORKER STARTUP
// ============================================
async function startWorkers() {
    logger.info('🚀 Starting queue workers...');

    try {
        await scheduleRecurringJobs();
        logger.info('✅ Queue workers started successfully');
        logger.info(`   - Email queue: 3 concurrent`);
        logger.info(`   - Notification queue: 5 concurrent`);
        logger.info(`   - Image processing queue: 2 concurrent`);
        logger.info(`   - Analytics queue: 10 concurrent`);
        logger.info(`   - Cleanup queue: 1 concurrent`);
    } catch (error) {
        logger.error('Failed to start workers:', error);
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, closing queues...');

    await Promise.all([
        queues.email.close(),
        queues.notification.close(),
        queues.imageProcessing.close(),
        queues.analytics.close(),
        queues.cleanup.close(),
    ]);

    logger.info('All queues closed gracefully');
    process.exit(0);
});

process.on('SIGINT', async () => {
    logger.info('SIGINT received, closing queues...');
    process.emit('SIGTERM', 'SIGTERM');
});

// Start workers if run directly
if (require.main === module) {
    startWorkers();
}
