import { getFirestore } from '../config/firebase';
import * as admin from 'firebase-admin';
import { logger } from '../utils/logger';
import { notificationService } from './notification.service';
import { emailService } from './email.service';
import { cacheService } from './cache.service';

/**
 * Comprehensive Admin Service
 * Provides all admin powers for the dashboard
 */

const db = getFirestore();

export class AdminService {
    // ============================================
    // USER MANAGEMENT
    // ============================================

    /**
     * Get all users with filters and pagination
     */
    async getUsers(options: {
        role?: string;
        status?: string;
        verified?: boolean;
        search?: string;
        limit?: number;
        offset?: number;
        sortBy?: string;
        sortOrder?: 'asc' | 'desc';
    }) {
        let query: any = db.collection('users');

        if (options.role) {
            query = query.where('role', '==', options.role);
        }

        if (options.status === 'active') {
            query = query.where('isActive', '==', true);
        } else if (options.status === 'inactive') {
            query = query.where('isActive', '==', false);
        }

        if (options.verified !== undefined) {
            query = query.where('emailVerified', '==', options.verified);
        }

        query = query.orderBy(options.sortBy || 'createdAt', options.sortOrder || 'desc');
        query = query.limit(options.limit || 50);

        if (options.offset) {
            query = query.offset(options.offset);
        }

        const snapshot = await query.get();
        const users = snapshot.docs.map((doc: any) => ({
            id: doc.id,
            ...doc.data(),
            // Remove sensitive fields
            password: undefined,
        }));

        // Get total count
        const total = (await db.collection('users').count().get()).data().count;

        return { users, total, limit: options.limit || 50, offset: options.offset || 0 };
    }

    /**
     * Ban a user
     */
    async banUser(userId: string, reason: string, adminId: string, duration?: number) {
        const banUntil = duration
            ? new Date(Date.now() + duration * 24 * 60 * 60 * 1000).toISOString()
            : null; // Permanent ban if no duration

        await db.collection('users').doc(userId).update({
            isBanned: true,
            banReason: reason,
            banUntil,
            bannedBy: adminId,
            bannedAt: new Date().toISOString(),
            isActive: false,
        });

        // Log action
        await this.logAction('user_banned', { userId, reason, duration, adminId });

        // Notify user
        await notificationService.send({
            userId,
            type: 'system_alert',
            title: 'Account Suspended',
            message: `Your account has been suspended. Reason: ${reason}`,
            channels: ['email'],
        });

        logger.info(`User ${userId} banned by admin ${adminId}`);
        return { success: true, banUntil };
    }

    /**
     * Unban a user
     */
    async unbanUser(userId: string, adminId: string) {
        await db.collection('users').doc(userId).update({
            isBanned: false,
            banReason: admin.firestore.FieldValue.delete(),
            banUntil: admin.firestore.FieldValue.delete(),
            isActive: true,
        });

        await this.logAction('user_unbanned', { userId, adminId });

        await notificationService.send({
            userId,
            type: 'system_alert',
            title: 'Account Restored',
            message: 'Your account has been restored. You can now access all features.',
            channels: ['email'],
        });

        return { success: true };
    }

    /**
     * Verify a user (KYC)
     */
    async verifyUser(userId: string, adminId: string, notes?: string) {
        await db.collection('users').doc(userId).update({
            verified: true,
            verifiedBy: adminId,
            verifiedAt: new Date().toISOString(),
            verificationNotes: notes,
        });

        await this.logAction('user_verified', { userId, adminId, notes });

        await notificationService.send({
            userId,
            type: 'kyc_verified',
            title: 'Account Verified!',
            message: 'Congratulations! Your account has been verified. You now have full access.',
            channels: ['in_app', 'email'],
        });

        return { success: true };
    }

    /**
     * Change user role
     */
    async changeUserRole(userId: string, newRole: string, adminId: string) {
        const userDoc = await db.collection('users').doc(userId).get();
        const oldRole = userDoc.data()?.role;

        await db.collection('users').doc(userId).update({
            role: newRole,
            roleChangedBy: adminId,
            roleChangedAt: new Date().toISOString(),
        });

        // Set Firebase custom claims
        await admin.auth().setCustomUserClaims(userId, { role: newRole });

        await this.logAction('user_role_changed', { userId, oldRole, newRole, adminId });

        return { success: true, oldRole, newRole };
    }

    /**
     * Impersonate user (for debugging)
     */
    async createImpersonationToken(userId: string, adminId: string): Promise<string> {
        // Log for audit
        await this.logAction('user_impersonation', { userId, adminId });

        // Create custom token for impersonation
        const token = await admin.auth().createCustomToken(userId, {
            impersonatedBy: adminId,
            impersonationTime: Date.now(),
        });

        return token;
    }

    // ============================================
    // PROPERTY MANAGEMENT
    // ============================================

    /**
     * Get properties for moderation
     */
    async getPropertiesForModeration(status: string = 'pending') {
        const snapshot = await db.collection('properties')
            .where('status', '==', status)
            .orderBy('createdAt', 'asc')
            .limit(50)
            .get();

        return snapshot.docs.map((doc: any) => ({
            id: doc.id,
            ...doc.data(),
        }));
    }

    /**
     * Feature a property
     */
    async featureProperty(propertyId: string, duration: number, adminId: string) {
        const featuredUntil = new Date(Date.now() + duration * 24 * 60 * 60 * 1000);

        await db.collection('properties').doc(propertyId).update({
            isFeatured: true,
            featuredUntil: featuredUntil.toISOString(),
            featuredBy: adminId,
            featuredAt: new Date().toISOString(),
        });

        await this.logAction('property_featured', { propertyId, duration, adminId });

        // Invalidate cache
        await cacheService.invalidateProperty(propertyId);

        return { success: true, featuredUntil };
    }

    /**
     * Unfeature a property
     */
    async unfeatureProperty(propertyId: string, adminId: string) {
        await db.collection('properties').doc(propertyId).update({
            isFeatured: false,
            featuredUntil: admin.firestore.FieldValue.delete(),
        });

        await this.logAction('property_unfeatured', { propertyId, adminId });
        await cacheService.invalidateProperty(propertyId);

        return { success: true };
    }

    /**
     * Bulk approve properties
     */
    async bulkApproveProperties(propertyIds: string[], adminId: string) {
        const batch = db.batch();
        const now = new Date().toISOString();

        for (const propertyId of propertyIds) {
            const ref = db.collection('properties').doc(propertyId);
            batch.update(ref, {
                status: 'active',
                approvedAt: now,
                approvedBy: adminId,
            });
        }

        await batch.commit();
        await this.logAction('bulk_properties_approved', { propertyIds, adminId });

        return { success: true, count: propertyIds.length };
    }

    /**
     * Delete property permanently
     */
    async deleteProperty(propertyId: string, adminId: string, reason: string) {
        const propertyDoc = await db.collection('properties').doc(propertyId).get();
        const propertyData = propertyDoc.data();

        // Archive before delete
        await db.collection('deletedProperties').doc(propertyId).set({
            ...propertyData,
            deletedBy: adminId,
            deleteReason: reason,
            deletedAt: new Date().toISOString(),
        });

        // Delete property
        await db.collection('properties').doc(propertyId).delete();

        // Notify seller
        if (propertyData?.sellerId) {
            await notificationService.send({
                userId: propertyData.sellerId,
                type: 'property_rejected',
                title: 'Property Removed',
                message: `Your property "${propertyData.title}" has been removed. Reason: ${reason}`,
                channels: ['in_app', 'email'],
            });
        }

        await this.logAction('property_deleted', { propertyId, reason, adminId });
        await cacheService.invalidateProperty(propertyId);

        return { success: true };
    }

    // ============================================
    // FINANCIAL MANAGEMENT
    // ============================================

    /**
     * Get revenue analytics
     */
    async getRevenueAnalytics(startDate: string, endDate: string) {
        const snapshot = await db.collection('transactions')
            .where('status', '==', 'completed')
            .where('createdAt', '>=', startDate)
            .where('createdAt', '<=', endDate)
            .get();

        const transactions = snapshot.docs.map((doc: any) => doc.data());

        const totalRevenue = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
        const byPurpose = transactions.reduce((acc: any, t) => {
            acc[t.purpose] = (acc[t.purpose] || 0) + t.amount;
            return acc;
        }, {});

        return {
            totalRevenue,
            transactionCount: transactions.length,
            averageTransaction: transactions.length > 0 ? totalRevenue / transactions.length : 0,
            byPurpose,
        };
    }

    /**
     * Process refund
     */
    async processRefund(transactionId: string, amount: number, reason: string, adminId: string) {
        const transactionDoc = await db.collection('transactions').doc(transactionId).get();
        if (!transactionDoc.exists) {
            throw new Error('Transaction not found');
        }

        const transaction = transactionDoc.data()!;

        // Create refund record
        const refundRef = await db.collection('refunds').add({
            transactionId,
            userId: transaction.userId,
            originalAmount: transaction.amount,
            refundAmount: amount,
            reason,
            status: 'processed',
            processedBy: adminId,
            createdAt: new Date().toISOString(),
        });

        // Update transaction
        await db.collection('transactions').doc(transactionId).update({
            refundedAmount: admin.firestore.FieldValue.increment(amount),
            refundStatus: amount >= transaction.amount ? 'full' : 'partial',
        });

        await this.logAction('refund_processed', { transactionId, amount, reason, adminId });

        // Notify user
        await notificationService.send({
            userId: transaction.userId,
            type: 'payment_success',
            title: 'Refund Processed',
            message: `Your refund of ₹${amount.toLocaleString('en-IN')} has been processed.`,
            channels: ['in_app', 'email'],
        });

        return { success: true, refundId: refundRef.id };
    }

    /**
     * Get pending payouts for partners
     */
    async getPendingPayouts() {
        const snapshot = await db.collection('payouts')
            .where('status', '==', 'pending')
            .orderBy('createdAt', 'asc')
            .get();

        return snapshot.docs.map((doc: any) => ({
            id: doc.id,
            ...doc.data(),
        }));
    }

    /**
     * Process partner payout
     */
    async processPartnerPayout(payoutId: string, adminId: string) {
        const payoutDoc = await db.collection('payouts').doc(payoutId).get();
        if (!payoutDoc.exists) {
            throw new Error('Payout not found');
        }

        await db.collection('payouts').doc(payoutId).update({
            status: 'processed',
            processedBy: adminId,
            processedAt: new Date().toISOString(),
        });

        await this.logAction('payout_processed', { payoutId, adminId });

        return { success: true };
    }

    // ============================================
    // SYSTEM CONFIGURATION
    // ============================================

    /**
     * Get system configuration
     */
    async getSystemConfig() {
        const configDocs = await db.collection('config').get();
        const config: Record<string, any> = {};

        configDocs.docs.forEach((doc: any) => {
            config[doc.id] = doc.data();
        });

        return config;
    }

    /**
     * Update system configuration
     */
    async updateSystemConfig(configId: string, updates: Record<string, any>, adminId: string) {
        await db.collection('config').doc(configId).set({
            ...updates,
            updatedBy: adminId,
            updatedAt: new Date().toISOString(),
        }, { merge: true });

        await this.logAction('config_updated', { configId, updates, adminId });

        return { success: true };
    }

    /**
     * Enable/disable maintenance mode
     */
    async setMaintenanceMode(enabled: boolean, message: string, adminId: string) {
        await this.updateSystemConfig('platform', {
            maintenanceMode: enabled,
            maintenanceMessage: message,
            maintenanceStartedBy: adminId,
        }, adminId);

        return { success: true, maintenanceMode: enabled };
    }

    // ============================================
    // ANALYTICS & REPORTING
    // ============================================

    /**
     * Get comprehensive dashboard stats
     */
    async getDashboardStats() {
        const [
            users,
            properties,
            activeProperties,
            pendingProperties,
            transactions,
            leads,
            partners,
            inquiries,
        ] = await Promise.all([
            db.collection('users').count().get(),
            db.collection('properties').count().get(),
            db.collection('properties').where('status', '==', 'active').count().get(),
            db.collection('properties').where('status', '==', 'pending').count().get(),
            db.collection('transactions').count().get(),
            db.collection('leads').count().get(),
            db.collection('partners').count().get(),
            db.collection('inquiries').count().get(),
        ]);

        // Get today's stats
        const today = new Date().toISOString().split('T')[0];
        const [todayUsers, todayProperties, todayTransactions] = await Promise.all([
            db.collection('users').where('createdAt', '>=', today).count().get(),
            db.collection('properties').where('createdAt', '>=', today).count().get(),
            db.collection('transactions').where('createdAt', '>=', today).count().get(),
        ]);

        return {
            totals: {
                users: users.data().count,
                properties: properties.data().count,
                activeProperties: activeProperties.data().count,
                pendingProperties: pendingProperties.data().count,
                transactions: transactions.data().count,
                leads: leads.data().count,
                partners: partners.data().count,
                inquiries: inquiries.data().count,
            },
            today: {
                newUsers: todayUsers.data().count,
                newProperties: todayProperties.data().count,
                newTransactions: todayTransactions.data().count,
            },
        };
    }

    /**
     * Get user growth report
     */
    async getUserGrowthReport(days: number = 30) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const snapshot = await db.collection('users')
            .where('createdAt', '>=', startDate.toISOString())
            .orderBy('createdAt', 'asc')
            .get();

        // Group by date
        const growth: Record<string, number> = {};
        snapshot.docs.forEach((doc: any) => {
            const date = doc.data().createdAt.split('T')[0];
            growth[date] = (growth[date] || 0) + 1;
        });

        return growth;
    }

    /**
     * Get property analytics
     */
    async getPropertyAnalytics() {
        const snapshot = await db.collection('properties').get();
        const properties = snapshot.docs.map((doc: any) => doc.data());

        return {
            byType: this.groupBy(properties, 'propertyType'),
            byCity: this.groupBy(properties, 'city'),
            byStatus: this.groupBy(properties, 'status'),
            averagePrice: properties.reduce((sum, p) => sum + (p.price || 0), 0) / properties.length,
            totalViews: properties.reduce((sum, p) => sum + (p.views || 0), 0),
        };
    }

    // ============================================
    // PARTNER MANAGEMENT
    // ============================================

    /**
     * Get all partners
     */
    async getPartners(type?: string) {
        let query: any = db.collection('partners');

        if (type) {
            query = query.where('partnerType', '==', type);
        }

        const snapshot = await query.orderBy('createdAt', 'desc').get();

        return snapshot.docs.map((doc: any) => ({
            id: doc.id,
            ...doc.data(),
        }));
    }

    /**
     * Approve partner application
     */
    async approvePartner(partnerId: string, adminId: string) {
        const partnerDoc = await db.collection('partners').doc(partnerId).get();
        if (!partnerDoc.exists) {
            throw new Error('Partner not found');
        }

        const partner = partnerDoc.data()!;

        await db.collection('partners').doc(partnerId).update({
            status: 'active',
            approvedBy: adminId,
            approvedAt: new Date().toISOString(),
        });

        // Update user role
        if (partner.userId) {
            await db.collection('users').doc(partner.userId).update({
                role: partner.partnerType + '_partner',
            });
        }

        await this.logAction('partner_approved', { partnerId, adminId });

        await notificationService.send({
            userId: partner.userId,
            type: 'partner_task',
            title: 'Partner Application Approved!',
            message: 'Congratulations! Your partner application has been approved.',
            channels: ['in_app', 'email'],
        });

        return { success: true };
    }

    /**
     * Suspend partner
     */
    async suspendPartner(partnerId: string, reason: string, adminId: string) {
        await db.collection('partners').doc(partnerId).update({
            status: 'suspended',
            suspendReason: reason,
            suspendedBy: adminId,
            suspendedAt: new Date().toISOString(),
        });

        await this.logAction('partner_suspended', { partnerId, reason, adminId });

        return { success: true };
    }

    // ============================================
    // BULK OPERATIONS
    // ============================================

    /**
     * Send bulk notification to users
     */
    async sendBulkNotification(options: {
        userIds?: string[];
        role?: string;
        title: string;
        message: string;
        adminId: string;
    }) {
        let userIds = options.userIds || [];

        // If role specified, get all users with that role
        if (options.role && !options.userIds) {
            const snapshot = await db.collection('users')
                .where('role', '==', options.role)
                .select()
                .get();
            userIds = snapshot.docs.map((doc: any) => doc.id);
        }

        // Send in batches
        const batchSize = 100;
        for (let i = 0; i < userIds.length; i += batchSize) {
            const batch = userIds.slice(i, i + batchSize);
            await notificationService.sendToMultiple(batch, {
                type: 'system_alert',
                title: options.title,
                message: options.message,
            });
        }

        await this.logAction('bulk_notification_sent', {
            recipientCount: userIds.length,
            role: options.role,
            adminId: options.adminId,
        });

        return { success: true, recipientCount: userIds.length };
    }

    /**
     * Bulk update users
     */
    async bulkUpdateUsers(userIds: string[], updates: Record<string, any>, adminId: string) {
        const batch = db.batch();
        const now = new Date().toISOString();

        for (const userId of userIds) {
            const ref = db.collection('users').doc(userId);
            batch.update(ref, { ...updates, updatedAt: now });
        }

        await batch.commit();
        await this.logAction('bulk_users_updated', { userIds, updates, adminId });

        return { success: true, count: userIds.length };
    }

    // ============================================
    // AUDIT LOGGING
    // ============================================

    /**
     * Log admin action
     */
    private async logAction(action: string, details: Record<string, any>) {
        await db.collection('adminLogs').add({
            action,
            details,
            timestamp: new Date().toISOString(),
            ip: details.ip,
        });
    }

    /**
     * Get admin activity logs
     */
    async getActivityLogs(options: { adminId?: string; action?: string; limit?: number }) {
        let query: any = db.collection('adminLogs');

        if (options.adminId) {
            query = query.where('details.adminId', '==', options.adminId);
        }

        if (options.action) {
            query = query.where('action', '==', options.action);
        }

        query = query.orderBy('timestamp', 'desc').limit(options.limit || 100);

        const snapshot = await query.get();

        return snapshot.docs.map((doc: any) => ({
            id: doc.id,
            ...doc.data(),
        }));
    }

    // ============================================
    // HELPER METHODS
    // ============================================

    private groupBy(arr: any[], key: string): Record<string, number> {
        return arr.reduce((acc, item) => {
            const value = item[key] || 'unknown';
            acc[value] = (acc[value] || 0) + 1;
            return acc;
        }, {});
    }
}

export const adminService = new AdminService();
