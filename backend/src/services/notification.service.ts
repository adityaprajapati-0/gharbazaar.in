import { getFirestore } from '../config/firebase';
import * as admin from 'firebase-admin';
import { logger } from '../utils/logger';
import { emailService } from './email.service';
import { smsService } from './sms.service';
import { circuitBreakers } from '../utils/circuitBreaker';

/**
 * Comprehensive Notification Service
 * Handles in-app, email, SMS, and push notifications
 */

export interface NotificationData {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    link?: string;
    data?: Record<string, any>;
    metadata?: Record<string, any>;
    channels?: NotificationChannel[];
}

export type NotificationType =
    | 'property_approved'
    | 'property_rejected'
    | 'new_inquiry'
    | 'new_message'
    | 'new_bid'
    | 'bid_accepted'
    | 'bid_rejected'
    | 'payment_success'
    | 'payment_failed'
    | 'visit_scheduled'
    | 'visit_reminder'
    | 'document_uploaded'
    | 'kyc_verified'
    | 'partner_task'
    | 'system_alert'
    | 'welcome';

export type NotificationChannel = 'in_app' | 'email' | 'sms' | 'push';

const DEFAULT_CHANNELS: NotificationChannel[] = ['in_app'];

export class NotificationService {
    private db = getFirestore();

    /**
     * Create a simple in-app notification (backwards compatible)
     */
    async create(data: {
        userId: string;
        type: string;
        title: string;
        message: string;
        link?: string;
        data?: Record<string, any>;
        metadata?: Record<string, any>;
    }): Promise<{ id: string } & typeof data> {
        const notif = await this.db.collection('notifications').add({
            ...data,
            read: false,
            createdAt: new Date().toISOString(),
        });

        await this.db.collection('users').doc(data.userId).update({
            unreadNotifications: admin.firestore.FieldValue.increment(1),
        });

        logger.debug(`Notification created for user ${data.userId}: ${data.title}`);
        return { id: notif.id, ...data };
    }

    /**
     * Send notifications to multiple users (backwards compatible)
     */
    async sendMultiple(notifications: Array<{
        userId: string;
        type: string;
        title: string;
        message: string;
        link?: string;
        data?: Record<string, any>;
    }>): Promise<void> {
        const batch = this.db.batch();
        const now = new Date().toISOString();

        notifications.forEach((notif) => {
            const ref = this.db.collection('notifications').doc();
            batch.set(ref, {
                ...notif,
                read: false,
                createdAt: now,
            });

            const userRef = this.db.collection('users').doc(notif.userId);
            batch.update(userRef, {
                unreadNotifications: admin.firestore.FieldValue.increment(1),
            });
        });

        await batch.commit();
        logger.info(`Bulk notifications sent to ${notifications.length} users`);
    }

    /**
     * Send notification through multiple channels
     */
    async send(data: NotificationData): Promise<{ success: boolean; channels: Record<string, boolean> }> {
        const channels = data.channels || DEFAULT_CHANNELS;
        const results: Record<string, boolean> = {};

        // Get user data for email/phone
        let userData: any = null;
        if (channels.includes('email') || channels.includes('sms') || channels.includes('push')) {
            try {
                const userDoc = await this.db.collection('users').doc(data.userId).get();
                userData = userDoc.data();
            } catch (error) {
                logger.error('Error fetching user for notification:', error);
            }
        }

        // Process each channel
        const promises: Promise<void>[] = [];

        if (channels.includes('in_app')) {
            promises.push(this.sendInApp(data).then(r => { results.in_app = r; }));
        }

        if (channels.includes('email') && userData?.email) {
            promises.push(this.sendEmail(data, userData.email).then(r => { results.email = r; }));
        }

        if (channels.includes('sms') && userData?.phoneNumber) {
            promises.push(this.sendSMS(data, userData.phoneNumber).then(r => { results.sms = r; }));
        }

        if (channels.includes('push') && userData?.fcmToken) {
            promises.push(this.sendPush(data, userData.fcmToken).then(r => { results.push = r; }));
        }

        await Promise.allSettled(promises);

        return {
            success: Object.values(results).some(r => r),
            channels: results,
        };
    }

    /**
     * Send in-app notification
     */
    private async sendInApp(data: NotificationData): Promise<boolean> {
        try {
            await this.db.collection('notifications').add({
                userId: data.userId,
                type: data.type,
                title: data.title,
                message: data.message,
                link: data.link,
                data: data.data,
                read: false,
                createdAt: new Date().toISOString(),
            });

            // Increment unread count
            await this.db.collection('users').doc(data.userId).update({
                unreadNotifications: admin.firestore.FieldValue.increment(1),
            });

            return true;
        } catch (error) {
            logger.error('In-app notification error:', error);
            return false;
        }
    }

    /**
     * Send email notification
     */
    private async sendEmail(data: NotificationData, email: string): Promise<boolean> {
        try {
            return await circuitBreakers.sendgrid.execute(
                async () => {
                    await this.sendEmailByType(data, email);
                    return true;
                },
                () => false
            );
        } catch (error) {
            logger.error('Email notification error:', error);
            return false;
        }
    }

    /**
     * Send email based on notification type
     */
    private async sendEmailByType(data: NotificationData, email: string): Promise<void> {
        switch (data.type) {
            case 'welcome':
                await emailService.sendWelcomeEmail(email, data.data?.name || 'User');
                break;
            case 'property_approved':
                await emailService.sendPropertyApprovedEmail(email, data.data?.propertyTitle, data.data?.propertyId);
                break;
            case 'new_inquiry':
                await emailService.sendInquiryNotificationEmail(email, data.data?.propertyTitle, data.data?.message || '');
                break;
            case 'new_bid':
                await emailService.sendBidNotificationEmail(email, data.data?.propertyTitle, data.data?.bidAmount);
                break;
            case 'payment_success':
                await emailService.sendPaymentSuccessEmail(email, data.data?.amount, data.data?.purpose, data.data?.transactionId);
                break;
            default:
                // Generic email for other types
                await emailService.sendEmail(email, data.title, `<p>${data.message}</p>`);
        }
    }

    /**
     * Send SMS notification
     */
    private async sendSMS(data: NotificationData, phoneNumber: string): Promise<boolean> {
        try {
            return await circuitBreakers.twilio.execute(
                async () => {
                    await this.sendSMSByType(data, phoneNumber);
                    return true;
                },
                () => false
            );
        } catch (error) {
            logger.error('SMS notification error:', error);
            return false;
        }
    }

    /**
     * Send SMS based on notification type
     */
    private async sendSMSByType(data: NotificationData, phoneNumber: string): Promise<void> {
        switch (data.type) {
            case 'welcome':
                await smsService.sendWelcomeSMS(phoneNumber, data.data?.name || 'User');
                break;
            case 'property_approved':
                await smsService.sendPropertyApprovedSMS(phoneNumber, data.data?.propertyTitle);
                break;
            case 'new_inquiry':
                await smsService.sendInquiryNotificationSMS(phoneNumber, data.data?.propertyTitle);
                break;
            case 'new_bid':
                await smsService.sendBidNotificationSMS(phoneNumber, data.data?.bidAmount);
                break;
            case 'payment_success':
                await smsService.sendPaymentSuccessSMS(phoneNumber, data.data?.amount, data.data?.transactionId);
                break;
            case 'visit_reminder':
                await smsService.sendVisitReminderSMS(phoneNumber, data.data?.propertyTitle, data.data?.visitDate);
                break;
            default:
                // Generic SMS for other types
                await smsService.sendSMS(phoneNumber, data.message.substring(0, 160));
        }
    }

    /**
     * Send push notification (Firebase Cloud Messaging)
     */
    private async sendPush(data: NotificationData, fcmToken: string): Promise<boolean> {
        try {
            const message: admin.messaging.Message = {
                token: fcmToken,
                notification: {
                    title: data.title,
                    body: data.message,
                },
                data: {
                    type: data.type,
                    link: data.link || '',
                    ...Object.fromEntries(
                        Object.entries(data.data || {}).map(([k, v]) => [k, String(v)])
                    ),
                },
                android: {
                    priority: 'high',
                    notification: {
                        channelId: 'gharbazaar_notifications',
                        icon: 'ic_notification',
                        color: '#10b981',
                    },
                },
                apns: {
                    payload: {
                        aps: {
                            badge: 1,
                            sound: 'default',
                        },
                    },
                },
            };

            await admin.messaging().send(message);
            logger.debug(`Push notification sent to ${data.userId}`);
            return true;
        } catch (error: any) {
            // Handle invalid token
            if (error.code === 'messaging/invalid-registration-token' ||
                error.code === 'messaging/registration-token-not-registered') {
                // Remove invalid token
                await this.db.collection('users').doc(data.userId).update({
                    fcmToken: admin.firestore.FieldValue.delete(),
                });
                logger.warn(`Removed invalid FCM token for user ${data.userId}`);
            } else {
                logger.error('Push notification error:', error);
            }
            return false;
        }
    }

    /**
     * Send notification to multiple users
     */
    async sendToMultiple(userIds: string[], baseData: Omit<NotificationData, 'userId'>): Promise<void> {
        const batch = this.db.batch();
        const now = new Date().toISOString();

        for (const userId of userIds) {
            const ref = this.db.collection('notifications').doc();
            batch.set(ref, {
                userId,
                ...baseData,
                read: false,
                createdAt: now,
            });

            const userRef = this.db.collection('users').doc(userId);
            batch.update(userRef, {
                unreadNotifications: admin.firestore.FieldValue.increment(1),
            });
        }

        await batch.commit();
        logger.info(`Bulk notification sent to ${userIds.length} users`);
    }

    /**
     * Mark notification as read
     */
    async markAsRead(notificationId: string, userId: string): Promise<void> {
        const notifRef = this.db.collection('notifications').doc(notificationId);
        const notif = await notifRef.get();

        if (!notif.exists || notif.data()?.read) {
            return;
        }

        await notifRef.update({
            read: true,
            readAt: new Date().toISOString(),
        });

        await this.db.collection('users').doc(userId).update({
            unreadNotifications: admin.firestore.FieldValue.increment(-1),
        });
    }

    /**
     * Mark all notifications as read
     */
    async markAllAsRead(userId: string): Promise<number> {
        const snapshot = await this.db
            .collection('notifications')
            .where('userId', '==', userId)
            .where('read', '==', false)
            .get();

        if (snapshot.empty) return 0;

        const batch = this.db.batch();
        const now = new Date().toISOString();

        snapshot.docs.forEach(doc => {
            batch.update(doc.ref, { read: true, readAt: now });
        });

        await batch.commit();

        await this.db.collection('users').doc(userId).update({
            unreadNotifications: 0,
        });

        return snapshot.size;
    }

    /**
     * Get user's notifications with pagination
     */
    async getUserNotifications(
        userId: string,
        options: { limit?: number; after?: string; unreadOnly?: boolean } = {}
    ): Promise<{ notifications: any[]; hasMore: boolean }> {
        const { limit = 20, after, unreadOnly = false } = options;

        let query = this.db
            .collection('notifications')
            .where('userId', '==', userId)
            .orderBy('createdAt', 'desc')
            .limit(limit + 1);

        if (unreadOnly) {
            query = query.where('read', '==', false);
        }

        if (after) {
            const afterDoc = await this.db.collection('notifications').doc(after).get();
            if (afterDoc.exists) {
                query = query.startAfter(afterDoc);
            }
        }

        const snapshot = await query.get();
        const notifications = snapshot.docs.slice(0, limit).map(doc => ({
            id: doc.id,
            ...doc.data(),
        }));

        return {
            notifications,
            hasMore: snapshot.docs.length > limit,
        };
    }

    /**
     * Delete old notifications
     */
    async deleteOldNotifications(olderThanDays: number = 30): Promise<number> {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

        const snapshot = await this.db
            .collection('notifications')
            .where('createdAt', '<', cutoffDate.toISOString())
            .limit(500)
            .get();

        if (snapshot.empty) return 0;

        const batch = this.db.batch();
        snapshot.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();

        logger.info(`Deleted ${snapshot.size} old notifications`);
        return snapshot.size;
    }

    /**
     * Update FCM token for push notifications
     */
    async updateFcmToken(userId: string, fcmToken: string): Promise<void> {
        await this.db.collection('users').doc(userId).update({
            fcmToken,
            fcmTokenUpdatedAt: new Date().toISOString(),
        });
    }

    /**
     * Get notification preferences
     */
    async getPreferences(userId: string): Promise<Record<NotificationType, NotificationChannel[]>> {
        const userDoc = await this.db.collection('users').doc(userId).get();
        return userDoc.data()?.notificationPreferences || this.getDefaultPreferences();
    }

    /**
     * Update notification preferences
     */
    async updatePreferences(userId: string, preferences: Partial<Record<NotificationType, NotificationChannel[]>>): Promise<void> {
        await this.db.collection('users').doc(userId).update({
            notificationPreferences: preferences,
        });
    }

    /**
     * Default notification preferences
     */
    private getDefaultPreferences(): Record<NotificationType, NotificationChannel[]> {
        return {
            property_approved: ['in_app', 'email', 'push'],
            property_rejected: ['in_app', 'email'],
            new_inquiry: ['in_app', 'email', 'push'],
            new_message: ['in_app', 'push'],
            new_bid: ['in_app', 'email', 'push'],
            bid_accepted: ['in_app', 'email', 'sms', 'push'],
            bid_rejected: ['in_app', 'email'],
            payment_success: ['in_app', 'email', 'sms'],
            payment_failed: ['in_app', 'email', 'sms'],
            visit_scheduled: ['in_app', 'email', 'sms'],
            visit_reminder: ['in_app', 'sms', 'push'],
            document_uploaded: ['in_app'],
            kyc_verified: ['in_app', 'email'],
            partner_task: ['in_app', 'push'],
            system_alert: ['in_app'],
            welcome: ['in_app', 'email'],
        };
    }
}

export const notificationService = new NotificationService();
