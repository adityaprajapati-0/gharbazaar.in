import { Router } from 'express';
import { adminController } from '../controllers/admin.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(authorize('admin'));

// ============================================
// USER MANAGEMENT
// ============================================

/** Get all users with filters */
router.get('/users', adminController.getAllUsers);

/** Get user by ID with full details */
router.get('/users/:userId', adminController.getUserById);

/** Update user */
router.put('/users/:userId', adminController.updateUser);

/** Ban user */
router.post('/users/:userId/ban', adminController.banUser);

/** Unban user */
router.post('/users/:userId/unban', adminController.unbanUser);

/** Verify user (KYC) */
router.post('/users/:userId/verify', adminController.verifyUser);

/** Change user role */
router.post('/users/:userId/role', adminController.changeUserRole);

/** Impersonate user (for debugging) */
router.post('/users/:userId/impersonate', adminController.impersonateUser);

/** Deactivate user */
router.delete('/users/:userId', adminController.deactivateUser);

/** Bulk update users */
router.post('/users/bulk-update', adminController.bulkUpdateUsers);

// ============================================
// PROPERTY MANAGEMENT
// ============================================

/** Get all properties with filters */
router.get('/properties', adminController.getAllProperties);

/** Get properties pending moderation */
router.get('/properties/moderation', adminController.getPropertiesForModeration);

/** Approve property */
router.put('/properties/:id/approve', adminController.approveProperty);

/** Reject property */
router.put('/properties/:id/reject', adminController.rejectProperty);

/** Feature property */
router.post('/properties/:id/feature', adminController.featureProperty);

/** Unfeature property */
router.delete('/properties/:id/feature', adminController.unfeatureProperty);

/** Delete property permanently */
router.delete('/properties/:id', adminController.deleteProperty);

/** Bulk approve properties */
router.post('/properties/bulk-approve', adminController.bulkApproveProperties);

// ============================================
// FINANCIAL MANAGEMENT
// ============================================

/** Get all transactions */
router.get('/transactions', adminController.getAllTransactions);

/** Get revenue analytics */
router.get('/revenue', adminController.getRevenueAnalytics);

/** Process refund */
router.post('/transactions/:transactionId/refund', adminController.processRefund);

/** Get pending partner payouts */
router.get('/payouts/pending', adminController.getPendingPayouts);

/** Process partner payout */
router.post('/payouts/:payoutId/process', adminController.processPartnerPayout);

// ============================================
// SYSTEM CONFIGURATION
// ============================================

/** Get system configuration */
router.get('/config', adminController.getSystemConfig);

/** Update system configuration */
router.put('/config/:configId', adminController.updateSystemConfig);

/** Enable/disable maintenance mode */
router.post('/maintenance', adminController.setMaintenanceMode);

// ============================================
// ANALYTICS & REPORTING
// ============================================

/** Get dashboard stats */
router.get('/dashboard', adminController.getDashboardStats);

/** Get platform analytics */
router.get('/analytics', adminController.getAnalytics);

/** Get user growth report */
router.get('/reports/user-growth', adminController.getUserGrowthReport);

/** Get property analytics */
router.get('/reports/properties', adminController.getPropertyAnalytics);

// ============================================
// PARTNER MANAGEMENT
// ============================================

/** Get all partners */
router.get('/partners', adminController.getPartners);

/** Approve partner application */
router.post('/partners/:partnerId/approve', adminController.approvePartner);

/** Suspend partner */
router.post('/partners/:partnerId/suspend', adminController.suspendPartner);

// ============================================
// EMPLOYEE MANAGEMENT
// ============================================

/** Get all employees */
router.get('/employees', adminController.getAllEmployees);

/** Create employee */
router.post('/employees', adminController.createEmployee);

// ============================================
// BULK OPERATIONS & NOTIFICATIONS
// ============================================

/** Send bulk notification */
router.post('/notifications/bulk', adminController.sendBulkNotification);

// ============================================
// AUDIT LOGS
// ============================================

/** Get admin activity logs */
router.get('/logs', adminController.getActivityLogs);

export default router;
