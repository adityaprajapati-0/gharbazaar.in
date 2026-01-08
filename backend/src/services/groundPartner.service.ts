import { getFirestore } from '../config/firebase';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { notificationService } from './notification.service';

export class GroundPartnerService {
    private db = getFirestore();

    /**
     * Get ground partner's tasks
     */
    async getTasks(partnerId: string, status?: string) {
        try {
            let query = this.db
                .collection('groundPartnerTasks')
                .where('groundPartnerId', '==', partnerId)
                .orderBy('createdAt', 'desc');

            if (status) {
                query = query.where('status', '==', status);
            }

            const snapshot = await query.get();

            const tasks = snapshot.docs.map((doc: any) => ({
                id: doc.id,
                ...doc.data(),
            }));

            return {
                success: true,
                tasks,
                count: tasks.length,
            };
        } catch (error) {
            logger.error('Get tasks error:', error);
            throw new AppError(500, 'Failed to get tasks');
        }
    }

    /**
     * Get task by ID
     */
    async getTaskById(taskId: string, partnerId: string) {
        try {
            const doc = await this.db.collection('groundPartnerTasks').doc(taskId).get();

            if (!doc.exists) {
                throw new AppError(404, 'Task not found');
            }

            const task = doc.data();

            if (task?.groundPartnerId !== partnerId) {
                throw new AppError(403, 'Access denied');
            }

            return {
                success: true,
                task: { id: doc.id, ...task },
            };
        } catch (error) {
            logger.error('Get task error:', error);
            throw error;
        }
    }

    /**
     * Update task status
     */
    async updateTask(taskId: string, partnerId: string, updates: any) {
        try {
            const taskRef = this.db.collection('groundPartnerTasks').doc(taskId);
            const taskDoc = await taskRef.get();

            if (!taskDoc.exists) {
                throw new AppError(404, 'Task not found');
            }

            if (taskDoc.data()?.groundPartnerId !== partnerId) {
                throw new AppError(403, 'Access denied');
            }

            await taskRef.update({
                ...updates,
                updatedAt: new Date().toISOString(),
            });

            // If task completed, calculate payment
            if (updates.status === 'completed') {
                await this.calculateTaskPayment(taskId, partnerId);
            }

            logger.info(`Task updated: ${taskId}`);

            return {
                success: true,
                message: 'Task updated successfully',
            };
        } catch (error) {
            logger.error('Update task error:', error);
            throw error;
        }
    }

    /**
     * Submit task report
     */
    async submitReport(partnerId: string, reportData: any) {
        try {
            const { taskId, findings, photos, recommendations, condition } = reportData;

            const reportRef = await this.db.collection('groundPartnerReports').add({
                groundPartnerId: partnerId,
                taskId,
                findings,
                photos: photos || [],
                recommendations,
                condition, // excellent, good, fair, poor
                submittedAt: new Date().toISOString(),
            });

            // Update task with report
            await this.db.collection('groundPartnerTasks').doc(taskId).update({
                reportId: reportRef.id,
                status: 'under_review',
                updatedAt: new Date().toISOString(),
            });

            logger.info(`Report submitted: ${reportRef.id}`);

            return {
                success: true,
                report: {
                    id: reportRef.id,
                    ...reportData,
                },
            };
        } catch (error) {
            logger.error('Submit report error:', error);
            throw new AppError(500, 'Failed to submit report');
        }
    }

    /**
     * Get property visits
     */
    async getVisits(partnerId: string) {
        try {
            const snapshot = await this.db
                .collection('propertyVisits')
                .where('groundPartnerId', '==', partnerId)
                .orderBy('scheduledAt', 'desc')
                .get();

            const visits = snapshot.docs.map((doc: any) => ({
                id: doc.id,
                ...doc.data(),
            }));

            return {
                success: true,
                visits,
                count: visits.length,
            };
        } catch (error) {
            logger.error('Get visits error:', error);
            throw new AppError(500, 'Failed to get visits');
        }
    }

    /**
     * Schedule property visit
     */
    async scheduleVisit(partnerId: string, visitData: any) {
        try {
            const { propertyId, scheduledAt, purpose, notes } = visitData;

            const visitRef = await this.db.collection('propertyVisits').add({
                groundPartnerId: partnerId,
                propertyId,
                scheduledAt,
                purpose, // verification, photography, inspection
                notes,
                status: 'scheduled',
                createdAt: new Date().toISOString(),
            });

            // Get property details
            const propertyDoc = await this.db.collection('properties').doc(propertyId).get();
            const property = propertyDoc.data();

            // Notify property owner
            if (property?.sellerId) {
                await notificationService.create({
                    userId: property.sellerId,
                    type: 'visit_scheduled',
                    title: 'Property Visit Scheduled',
                    message: `A ground verification visit is scheduled for ${new Date(scheduledAt).toLocaleString()}`,
                    data: { visitId: visitRef.id, propertyId, scheduledAt },
                });
            }

            logger.info(`Visit scheduled: ${visitRef.id}`);

            return {
                success: true,
                visit: {
                    id: visitRef.id,
                    ...visitData,
                },
            };
        } catch (error) {
            logger.error('Schedule visit error:', error);
            throw new AppError(500, 'Failed to schedule visit');
        }
    }

    /**
     * Calculate task payment
     */
    async calculateTaskPayment(taskId: string, partnerId: string) {
        try {
            const taskDoc = await this.db.collection('groundPartnerTasks').doc(taskId).get();
            const task = taskDoc.data();

            // Payment structure based on task type
            const paymentStructure: any = {
                property_verification: 1000,
                photography: 1500,
                inspection: 2000,
                measurement: 1200,
                documentation: 800,
            };

            const paymentAmount = paymentStructure[task?.taskType] || 1000;

            // Create payment record
            await this.db.collection('groundPartnerPayments').add({
                groundPartnerId: partnerId,
                taskId,
                amount: paymentAmount,
                taskType: task?.taskType,
                status: 'pending',
                createdAt: new Date().toISOString(),
            });

            await notificationService.create({
                userId: partnerId,
                type: 'payment_earned',
                title: 'Payment Earned',
                message: `You earned ₹${paymentAmount.toLocaleString('en-IN')} for task completion`,
                data: { taskId, amount: paymentAmount },
            });

            logger.info(`Task payment calculated for ${taskId}: ₹${paymentAmount}`);
        } catch (error) {
            logger.error('Calculate task payment error:', error);
        }
    }

    /**
     * Get earnings
     */
    async getEarnings(partnerId: string) {
        try {
            const snapshot = await this.db
                .collection('groundPartnerPayments')
                .where('groundPartnerId', '==', partnerId)
                .get();

            const payments = snapshot.docs.map((doc: any) => ({
                id: doc.id,
                ...doc.data(),
            }));

            const totalEarnings = payments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
            const paidEarnings = payments
                .filter((p: any) => p.status === 'paid')
                .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
            const pendingEarnings = payments
                .filter((p: any) => p.status === 'pending')
                .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

            return {
                success: true,
                earnings: {
                    total: totalEarnings,
                    paid: paidEarnings,
                    pending: pendingEarnings,
                    currency: 'INR',
                    payments: payments.slice(0, 10),
                },
            };
        } catch (error) {
            logger.error('Get ground earnings error:', error);
            throw new AppError(500, 'Failed to get earnings');
        }
    }

    /**
     * Get performance metrics
     */
    async getPerformance(partnerId: string) {
        try {
            // Get all tasks
            const tasksSnapshot = await this.db
                .collection('groundPartnerTasks')
                .where('groundPartnerId', '==', partnerId)
                .get();

            const tasks = tasksSnapshot.docs.map((doc: any) => doc.data());

            const totalTasks = tasks.length;
            const completedTasks = tasks.filter((t: any) => t.status === 'completed').length;
            const pendingTasks = tasks.filter((t: any) => t.status === 'pending' || t.status === 'in_progress').length;
            const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

            // Average rating from reports
            const reportsSnapshot = await this.db
                .collection('groundPartnerReports')
                .where('groundPartnerId', '==', partnerId)
                .get();

            const reports = reportsSnapshot.docs.map((doc: any) => doc.data());
            const averageRating = reports.length > 0
                ? reports.reduce((sum: number, r: any) => sum + (r.rating || 0), 0) / reports.length
                : 0;

            return {
                success: true,
                performance: {
                    totalTasks,
                    completedTasks,
                    pendingTasks,
                    completionRate: parseFloat(completionRate.toFixed(2)),
                    averageRating: parseFloat(averageRating.toFixed(2)),
                    totalReports: reports.length,
                },
            };
        } catch (error) {
            logger.error('Get performance error:', error);
            throw new AppError(500, 'Failed to get performance metrics');
        }
    }
}

export const groundPartnerService = new GroundPartnerService();
