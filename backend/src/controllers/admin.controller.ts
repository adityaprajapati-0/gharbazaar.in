import { Request, Response, NextFunction } from 'express';
import { adminService } from '../services/admin.service';
import { AppError } from '../middleware/errorHandler';
import { notificationService } from '../services/notification.service';
import { getFirestore } from '../config/firebase';

/**
 * Admin Controller
 * Complete admin powers for dashboard
 */
export class AdminController {
    // ============================================
    // USER MANAGEMENT
    // ============================================

    async getAllUsers(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await adminService.getUsers({
                role: req.query.role as string,
                status: req.query.status as string,
                verified: req.query.verified === 'true' ? true : req.query.verified === 'false' ? false : undefined,
                search: req.query.search as string,
                limit: parseInt(req.query.limit as string) || 50,
                offset: parseInt(req.query.offset as string) || 0,
                sortBy: req.query.sortBy as string,
                sortOrder: req.query.sortOrder as 'asc' | 'desc',
            });

            res.json({ success: true, data: result });
        } catch (error) {
            next(new AppError(500, 'Failed to fetch users'));
        }
    }

    async getUserById(req: Request, res: Response, next: NextFunction) {
        try {
            const db = getFirestore();
            const doc = await db.collection('users').doc(req.params.userId).get();

            if (!doc.exists) throw new AppError(404, 'User not found');

            // Get user's properties, transactions, and activities
            const [properties, transactions, bids] = await Promise.all([
                db.collection('properties').where('sellerId', '==', req.params.userId).limit(20).get(),
                db.collection('transactions').where('userId', '==', req.params.userId).limit(20).get(),
                db.collection('bids').where('buyerId', '==', req.params.userId).limit(20).get(),
            ]);

            res.json({
                success: true,
                data: {
                    user: { id: doc.id, ...doc.data() },
                    properties: properties.docs.map((d: any) => ({ id: d.id, ...d.data() })),
                    transactions: transactions.docs.map((d: any) => ({ id: d.id, ...d.data() })),
                    bids: bids.docs.map((d: any) => ({ id: d.id, ...d.data() })),
                },
            });
        } catch (error) {
            next(error instanceof AppError ? error : new AppError(500, 'Failed to fetch user'));
        }
    }

    async updateUser(req: Request, res: Response, next: NextFunction) {
        try {
            const db = getFirestore();
            await db.collection('users').doc(req.params.userId).update({
                ...req.body,
                updatedAt: new Date().toISOString(),
            });
            res.json({ success: true, message: 'User updated successfully' });
        } catch (error) {
            next(new AppError(500, 'Failed to update user'));
        }
    }

    async banUser(req: Request, res: Response, next: NextFunction) {
        try {
            const { reason, duration } = req.body;
            const result = await adminService.banUser(
                req.params.userId,
                reason,
                (req as any).user.id,
                duration
            );
            res.json({ success: true, message: 'User banned successfully', data: result });
        } catch (error) {
            next(new AppError(500, 'Failed to ban user'));
        }
    }

    async unbanUser(req: Request, res: Response, next: NextFunction) {
        try {
            await adminService.unbanUser(req.params.userId, (req as any).user.id);
            res.json({ success: true, message: 'User unbanned successfully' });
        } catch (error) {
            next(new AppError(500, 'Failed to unban user'));
        }
    }

    async verifyUser(req: Request, res: Response, next: NextFunction) {
        try {
            await adminService.verifyUser(
                req.params.userId,
                (req as any).user.id,
                req.body.notes
            );
            res.json({ success: true, message: 'User verified successfully' });
        } catch (error) {
            next(new AppError(500, 'Failed to verify user'));
        }
    }

    async changeUserRole(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await adminService.changeUserRole(
                req.params.userId,
                req.body.role,
                (req as any).user.id
            );
            res.json({ success: true, message: 'User role changed', data: result });
        } catch (error) {
            next(new AppError(500, 'Failed to change user role'));
        }
    }

    async impersonateUser(req: Request, res: Response, next: NextFunction) {
        try {
            const token = await adminService.createImpersonationToken(
                req.params.userId,
                (req as any).user.id
            );
            res.json({ success: true, data: { token } });
        } catch (error) {
            next(new AppError(500, 'Failed to create impersonation token'));
        }
    }

    async deactivateUser(req: Request, res: Response, next: NextFunction) {
        try {
            const db = getFirestore();
            await db.collection('users').doc(req.params.userId).update({
                isActive: false,
                deactivatedBy: (req as any).user.id,
                deactivatedAt: new Date().toISOString(),
            });
            res.json({ success: true, message: 'User deactivated' });
        } catch (error) {
            next(new AppError(500, 'Failed to deactivate user'));
        }
    }

    // ============================================
    // PROPERTY MANAGEMENT
    // ============================================

    async getAllProperties(req: Request, res: Response, next: NextFunction) {
        try {
            const db = getFirestore();
            let query: any = db.collection('properties');

            if (req.query.status) {
                query = query.where('status', '==', req.query.status);
            }

            query = query.orderBy('createdAt', 'desc').limit(100);

            const snapshot = await query.get();
            const properties = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));

            res.json({ success: true, data: { properties } });
        } catch (error) {
            next(new AppError(500, 'Failed to fetch properties'));
        }
    }

    async getPropertiesForModeration(req: Request, res: Response, next: NextFunction) {
        try {
            const properties = await adminService.getPropertiesForModeration(
                req.query.status as string || 'pending'
            );
            res.json({ success: true, data: { properties } });
        } catch (error) {
            next(new AppError(500, 'Failed to fetch properties for moderation'));
        }
    }

    async approveProperty(req: Request, res: Response, next: NextFunction) {
        try {
            const db = getFirestore();
            const propertyRef = db.collection('properties').doc(req.params.id);
            const property = await propertyRef.get();

            if (!property.exists) throw new AppError(404, 'Property not found');

            const propertyData = property.data();

            await propertyRef.update({
                status: 'active',
                approvedAt: new Date().toISOString(),
                approvedBy: (req as any).user.id,
            });

            await notificationService.send({
                userId: propertyData!.sellerId,
                type: 'property_approved',
                title: 'Property Approved!',
                message: `Your property "${propertyData!.title}" is now live!`,
                data: { propertyId: req.params.id, propertyTitle: propertyData!.title },
                channels: ['in_app', 'email', 'push'],
            });

            res.json({ success: true, message: 'Property approved' });
        } catch (error) {
            next(error instanceof AppError ? error : new AppError(500, 'Failed to approve property'));
        }
    }

    async rejectProperty(req: Request, res: Response, next: NextFunction) {
        try {
            const db = getFirestore();
            const propertyRef = db.collection('properties').doc(req.params.id);
            const property = await propertyRef.get();

            if (!property.exists) throw new AppError(404, 'Property not found');

            const propertyData = property.data();

            await propertyRef.update({
                status: 'rejected',
                rejectionReason: req.body.reason,
                rejectedAt: new Date().toISOString(),
                rejectedBy: (req as any).user.id,
            });

            await notificationService.send({
                userId: propertyData!.sellerId,
                type: 'property_rejected',
                title: 'Property Rejected',
                message: `Your property "${propertyData!.title}" was rejected. Reason: ${req.body.reason}`,
                channels: ['in_app', 'email'],
            });

            res.json({ success: true, message: 'Property rejected' });
        } catch (error) {
            next(error instanceof AppError ? error : new AppError(500, 'Failed to reject property'));
        }
    }

    async featureProperty(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await adminService.featureProperty(
                req.params.id,
                req.body.duration || 7,
                (req as any).user.id
            );
            res.json({ success: true, message: 'Property featured', data: result });
        } catch (error) {
            next(new AppError(500, 'Failed to feature property'));
        }
    }

    async unfeatureProperty(req: Request, res: Response, next: NextFunction) {
        try {
            await adminService.unfeatureProperty(req.params.id, (req as any).user.id);
            res.json({ success: true, message: 'Property unfeatured' });
        } catch (error) {
            next(new AppError(500, 'Failed to unfeature property'));
        }
    }

    async bulkApproveProperties(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await adminService.bulkApproveProperties(
                req.body.propertyIds,
                (req as any).user.id
            );
            res.json({ success: true, message: `${result.count} properties approved` });
        } catch (error) {
            next(new AppError(500, 'Failed to bulk approve properties'));
        }
    }

    async deleteProperty(req: Request, res: Response, next: NextFunction) {
        try {
            await adminService.deleteProperty(
                req.params.id,
                (req as any).user.id,
                req.body.reason
            );
            res.json({ success: true, message: 'Property deleted' });
        } catch (error) {
            next(new AppError(500, 'Failed to delete property'));
        }
    }

    // ============================================
    // FINANCIAL MANAGEMENT
    // ============================================

    async getAllTransactions(req: Request, res: Response, next: NextFunction) {
        try {
            const db = getFirestore();
            let query: any = db.collection('transactions');

            if (req.query.status) {
                query = query.where('status', '==', req.query.status);
            }

            if (req.query.purpose) {
                query = query.where('purpose', '==', req.query.purpose);
            }

            query = query.orderBy('createdAt', 'desc').limit(100);

            const snapshot = await query.get();
            const transactions = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));

            res.json({ success: true, data: { transactions } });
        } catch (error) {
            next(new AppError(500, 'Failed to fetch transactions'));
        }
    }

    async getRevenueAnalytics(req: Request, res: Response, next: NextFunction) {
        try {
            const startDate = req.query.startDate as string || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
            const endDate = req.query.endDate as string || new Date().toISOString();

            const analytics = await adminService.getRevenueAnalytics(startDate, endDate);
            res.json({ success: true, data: analytics });
        } catch (error) {
            next(new AppError(500, 'Failed to fetch revenue analytics'));
        }
    }

    async processRefund(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await adminService.processRefund(
                req.params.transactionId,
                req.body.amount,
                req.body.reason,
                (req as any).user.id
            );
            res.json({ success: true, message: 'Refund processed', data: result });
        } catch (error) {
            next(new AppError(500, 'Failed to process refund'));
        }
    }

    async getPendingPayouts(_req: Request, res: Response, next: NextFunction) {
        try {
            const payouts = await adminService.getPendingPayouts();
            res.json({ success: true, data: { payouts } });
        } catch (error) {
            next(new AppError(500, 'Failed to fetch pending payouts'));
        }
    }

    async processPartnerPayout(req: Request, res: Response, next: NextFunction) {
        try {
            await adminService.processPartnerPayout(req.params.payoutId, (req as any).user.id);
            res.json({ success: true, message: 'Payout processed' });
        } catch (error) {
            next(new AppError(500, 'Failed to process payout'));
        }
    }

    // ============================================
    // SYSTEM CONFIGURATION
    // ============================================

    async getSystemConfig(_req: Request, res: Response, next: NextFunction) {
        try {
            const config = await adminService.getSystemConfig();
            res.json({ success: true, data: config });
        } catch (error) {
            next(new AppError(500, 'Failed to fetch system config'));
        }
    }

    async updateSystemConfig(req: Request, res: Response, next: NextFunction) {
        try {
            await adminService.updateSystemConfig(
                req.params.configId,
                req.body,
                (req as any).user.id
            );
            res.json({ success: true, message: 'Config updated' });
        } catch (error) {
            next(new AppError(500, 'Failed to update system config'));
        }
    }

    async setMaintenanceMode(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await adminService.setMaintenanceMode(
                req.body.enabled,
                req.body.message || 'System under maintenance',
                (req as any).user.id
            );
            res.json({ success: true, message: 'Maintenance mode updated', data: result });
        } catch (error) {
            next(new AppError(500, 'Failed to set maintenance mode'));
        }
    }

    // ============================================
    // ANALYTICS & REPORTING
    // ============================================

    async getDashboardStats(_req: Request, res: Response, next: NextFunction) {
        try {
            const stats = await adminService.getDashboardStats();
            res.json({ success: true, data: stats });
        } catch (error) {
            next(new AppError(500, 'Failed to fetch dashboard stats'));
        }
    }

    async getAnalytics(_req: Request, res: Response, next: NextFunction) {
        try {
            const stats = await adminService.getDashboardStats();
            res.json({ success: true, data: stats });
        } catch (error) {
            next(new AppError(500, 'Failed to fetch analytics'));
        }
    }

    async getUserGrowthReport(req: Request, res: Response, next: NextFunction) {
        try {
            const days = parseInt(req.query.days as string) || 30;
            const growth = await adminService.getUserGrowthReport(days);
            res.json({ success: true, data: growth });
        } catch (error) {
            next(new AppError(500, 'Failed to fetch user growth report'));
        }
    }

    async getPropertyAnalytics(_req: Request, res: Response, next: NextFunction) {
        try {
            const analytics = await adminService.getPropertyAnalytics();
            res.json({ success: true, data: analytics });
        } catch (error) {
            next(new AppError(500, 'Failed to fetch property analytics'));
        }
    }

    // ============================================
    // PARTNER MANAGEMENT
    // ============================================

    async getPartners(req: Request, res: Response, next: NextFunction) {
        try {
            const partners = await adminService.getPartners(req.query.type as string);
            res.json({ success: true, data: { partners } });
        } catch (error) {
            next(new AppError(500, 'Failed to fetch partners'));
        }
    }

    async approvePartner(req: Request, res: Response, next: NextFunction) {
        try {
            await adminService.approvePartner(req.params.partnerId, (req as any).user.id);
            res.json({ success: true, message: 'Partner approved' });
        } catch (error) {
            next(new AppError(500, 'Failed to approve partner'));
        }
    }

    async suspendPartner(req: Request, res: Response, next: NextFunction) {
        try {
            await adminService.suspendPartner(
                req.params.partnerId,
                req.body.reason,
                (req as any).user.id
            );
            res.json({ success: true, message: 'Partner suspended' });
        } catch (error) {
            next(new AppError(500, 'Failed to suspend partner'));
        }
    }

    // ============================================
    // EMPLOYEE MANAGEMENT
    // ============================================

    async getAllEmployees(_req: Request, res: Response, next: NextFunction) {
        try {
            const db = getFirestore();
            const snapshot = await db.collection('users')
                .where('role', 'in', ['employee', 'support', 'moderator'])
                .get();
            const employees = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
            res.json({ success: true, data: { employees } });
        } catch (error) {
            next(new AppError(500, 'Failed to fetch employees'));
        }
    }

    async createEmployee(req: Request, res: Response, next: NextFunction) {
        try {
            const db = getFirestore();
            const { email, displayName, role, department, permissions } = req.body;

            // Create user document
            const userRef = await db.collection('users').add({
                email,
                displayName,
                role: role || 'employee',
                department,
                permissions: permissions || [],
                isActive: true,
                createdAt: new Date().toISOString(),
                createdBy: (req as any).user.id,
            });

            res.json({ success: true, message: 'Employee created', data: { id: userRef.id } });
        } catch (error) {
            next(new AppError(500, 'Failed to create employee'));
        }
    }

    // ============================================
    // BULK OPERATIONS
    // ============================================

    async sendBulkNotification(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await adminService.sendBulkNotification({
                userIds: req.body.userIds,
                role: req.body.role,
                title: req.body.title,
                message: req.body.message,
                adminId: (req as any).user.id,
            });
            res.json({ success: true, message: 'Notifications sent', data: result });
        } catch (error) {
            next(new AppError(500, 'Failed to send bulk notification'));
        }
    }

    async bulkUpdateUsers(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await adminService.bulkUpdateUsers(
                req.body.userIds,
                req.body.updates,
                (req as any).user.id
            );
            res.json({ success: true, message: 'Users updated', data: result });
        } catch (error) {
            next(new AppError(500, 'Failed to bulk update users'));
        }
    }

    // ============================================
    // AUDIT LOGS
    // ============================================

    async getActivityLogs(req: Request, res: Response, next: NextFunction) {
        try {
            const logs = await adminService.getActivityLogs({
                adminId: req.query.adminId as string,
                action: req.query.action as string,
                limit: parseInt(req.query.limit as string) || 100,
            });
            res.json({ success: true, data: { logs } });
        } catch (error) {
            next(new AppError(500, 'Failed to fetch activity logs'));
        }
    }
}

export const adminController = new AdminController();
