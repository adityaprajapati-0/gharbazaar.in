import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import propertyRoutes from './property.routes';
import transactionRoutes from './transaction.routes';
import notificationRoutes from './notification.routes';
import messageRoutes from './message.routes';
import leadRoutes from './lead.routes';
import subscriptionRoutes from './subscription.routes';
import adminRoutes from './admin.routes';
import partnerRoutes from './partner.routes';
import legalPartnerRoutes from './legalPartner.routes';
import groundPartnerRoutes from './groundPartner.routes';
import employeeRoutes from './employee.routes';
import chatRoutes from './chat.routes';
import uploadRoutes from './upload.routes';
import paymentRoutes from './payment.routes';
import bidRoutes from './bid.routes';
import analyticsRoutes from './analytics.routes';
import reviewRoutes from './review.routes';
import healthRoutes from './health.routes';
import webhookRoutes from './webhook.routes';
import chatbotRoutes from './chatbot.routes';
import supportTicketRoutes from './supportTicket.routes';

const router = Router();

// Health check routes (no /api/v1 prefix)
router.use('/health', healthRoutes);

// Public routes
router.use('/auth', authRoutes);

// Protected routes
router.use('/users', userRoutes);
router.use('/properties', propertyRoutes);
router.use('/transactions', transactionRoutes);
router.use('/notifications', notificationRoutes);
router.use('/messages', messageRoutes);
router.use('/leads', leadRoutes);
router.use('/subscriptions', subscriptionRoutes);
router.use('/chat', chatRoutes);
router.use('/upload', uploadRoutes);
router.use('/payment', paymentRoutes);
router.use('/bids', bidRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/reviews', reviewRoutes);
router.use('/chatbot', chatbotRoutes);
router.use('/tickets', supportTicketRoutes);

// Portal-specific routes
router.use('/admin', adminRoutes);
router.use('/partner', partnerRoutes);
router.use('/legal-partner', legalPartnerRoutes);
router.use('/ground-partner', groundPartnerRoutes);
router.use('/employee', employeeRoutes);

// Webhook routes (must be before authentication middleware)
router.use('/webhooks', webhookRoutes);

export default router;
