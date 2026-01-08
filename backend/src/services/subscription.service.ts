import Razorpay from 'razorpay';
import crypto from 'crypto';
import { getFirestore } from '../config/firebase';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/errorHandler';
import { notificationService } from './notification.service';

/**
 * Subscription Service with Razorpay Integration
 * Manages user subscriptions for seller listing plans
 */

export interface SubscriptionPlan {
    id: string;
    name: string;
    price: number;
    duration: number; // in months
    listingLimit: number; // -1 for unlimited
    features: string[];
    razorpayPlanId?: string;
}

export interface UserSubscription {
    id: string;
    userId: string;
    planId: string;
    razorpaySubscriptionId?: string;
    status: 'active' | 'expired' | 'cancelled';
    startDate: string;
    endDate: string;
    listingsUsed: number;
    listingLimit: number;
    paymentId?: string;
    createdAt: string;
    updatedAt: string;
}

// Subscription plans matching Razorpay Dashboard
const SELLER_PLANS: SubscriptionPlan[] = [
    {
        id: 'basic-seller',
        name: 'Basic Seller Plan',
        price: 999,
        duration: 1,
        listingLimit: 1,
        razorpayPlanId: process.env.RAZORPAY_PLAN_BASIC_SELLER || 'plan_S0woG4Vzfc2oKY',
        features: [
            'List 1 property',
            'Basic property photos (5 per listing)',
            'Standard listing visibility',
            'Email support',
            'Basic analytics dashboard',
            'Mobile app access',
        ],
    },
    {
        id: 'premium-seller',
        name: 'Premium Seller Plan',
        price: 19999,
        duration: 6,
        listingLimit: 24,
        razorpayPlanId: process.env.RAZORPAY_PLAN_PREMIUM_SELLER || 'plan_S0wrh5Fo5aG5F5',
        features: [
            'List up to 24 properties',
            'Professional photography (15 photos per listing)',
            'Premium listing placement',
            'Priority customer support',
            'Advanced analytics & insights',
            'Virtual tour integration',
        ],
    },
    {
        id: 'pro-seller',
        name: 'Pro Seller Plan',
        price: 49999,
        duration: 12,
        listingLimit: 60,
        razorpayPlanId: process.env.RAZORPAY_PLAN_PRO_SELLER || 'plan_S0wscEZGwJhMvR',
        features: [
            'List up to 60 properties',
            'Professional photography + drone shots',
            'Featured listing placement',
            'Dedicated account manager',
            'Complete market analysis',
            'Lead generation tools',
        ],
    },
];

const BUYER_PLANS: SubscriptionPlan[] = [
    {
        id: 'basic-buyer',
        name: 'Basic Buyer Access',
        price: 599,
        duration: 1,
        listingLimit: -1, // Unlimited viewing for buyers
        razorpayPlanId: process.env.RAZORPAY_PLAN_BASIC_BUYER || 'plan_S0wttUn20K4uuw',
        features: [
            'Browse properties',
            'Owner contacts',
            'Email support',
            'Support manager',
            'Add two favourites',
        ],
    },
    {
        id: 'smart-buyer',
        name: 'Smart Buyer Plan',
        price: 2999,
        duration: 6,
        listingLimit: -1,
        razorpayPlanId: process.env.RAZORPAY_PLAN_SMART_BUYER || 'plan_S0wuZ8gE0Z2x1D',
        features: [
            'Browse properties',
            'Owner contacts',
            'Email support',
            'Support manager',
            'Add two favourites',
        ],
    },
    {
        id: 'pro-buyer',
        name: 'Pro Buyer Plan',
        price: 4999,
        duration: 12,
        listingLimit: -1,
        razorpayPlanId: process.env.RAZORPAY_PLAN_PRO_BUYER || 'plan_S0wv4fAEaIM93n',
        features: [
            'Browse properties',
            'Owner contacts',
            'Email support',
            'Support manager',
            'Add two favourites',
        ],
    },
];

// Combined plans array
const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [...SELLER_PLANS, ...BUYER_PLANS];

export class SubscriptionService {
    private db = getFirestore();
    private razorpay: Razorpay;

    constructor() {
        this.razorpay = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID || '',
            key_secret: process.env.RAZORPAY_KEY_SECRET || '',
        });
    }

    /**
     * Get all available subscription plans
     */
    getPlans(): SubscriptionPlan[] {
        return SUBSCRIPTION_PLANS;
    }

    /**
     * Get seller-specific plans only
     */
    getSellerPlans(): SubscriptionPlan[] {
        return SELLER_PLANS;
    }

    /**
     * Get buyer-specific plans only
     */
    getBuyerPlans(): SubscriptionPlan[] {
        return BUYER_PLANS;
    }

    /**
     * Get plan by ID
     */
    getPlanById(planId: string): SubscriptionPlan | undefined {
        return SUBSCRIPTION_PLANS.find(plan => plan.id === planId);
    }

    /**
     * Create Razorpay subscription
     */
    async createRazorpaySubscription(userId: string, planId: string) {
        try {
            const plan = this.getPlanById(planId);
            if (!plan) {
                throw new AppError(404, 'Plan not found');
            }

            if (!plan.razorpayPlanId) {
                throw new AppError(500, 'Razorpay plan ID not configured');
            }

            // Get user details
            const userDoc = await this.db.collection('users').doc(userId).get();
            const user = userDoc.data();

            // Create subscription in Razorpay
            const subscription = await this.razorpay.subscriptions.create({
                plan_id: plan.razorpayPlanId,
                total_count: 1, // Single billing cycle
                quantity: 1,
                customer_notify: 1, // Send email to customer
                notes: {
                    userId,
                    planId,
                    email: user?.email || '',
                },
            });

            logger.info(`Razorpay subscription created: ${subscription.id} for user ${userId}`);

            return {
                id: subscription.id,
                planId,
                status: subscription.status,
                short_url: subscription.short_url,
            };
        } catch (error) {
            logger.error('Error creating Razorpay subscription:', error);
            throw error;
        }
    }

    /**
     * Verify subscription payment signature
     */
    async verifySubscriptionPayment(
        subscriptionId: string,
        paymentId: string,
        signature: string,
        userId: string
    ) {
        try {
            // Verify signature
            const text = `${subscriptionId}|${paymentId}`;
            const expectedSignature = crypto
                .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
                .update(text)
                .digest('hex');

            if (expectedSignature !== signature) {
                throw new AppError(400, 'Invalid payment signature');
            }

            // Fetch subscription from Razorpay
            const razorpaySubscription = await this.razorpay.subscriptions.fetch(subscriptionId);

            // Extract planId from notes (with null safety)
            const planId = razorpaySubscription.notes?.planId;

            if (!planId || typeof planId !== 'string') {
                throw new AppError(400, 'Invalid subscription data - missing plan ID');
            }

            // Create subscription in database
            await this.createSubscription(userId, planId, paymentId, subscriptionId);

            logger.info(`Subscription payment verified: ${subscriptionId}`);

            return {
                success: true,
                verified: true,
                message: 'Subscription activated successfully',
            };
        } catch (error) {
            logger.error('Error verifying subscription payment:', error);
            throw error;
        }
    }

    /**
     * Get user's active subscription
     */
    async getUserSubscription(userId: string): Promise<UserSubscription | null> {
        try {
            const snapshot = await this.db
                .collection('subscriptions')
                .where('userId', '==', userId)
                .where('status', '==', 'active')
                .orderBy('createdAt', 'desc')
                .limit(1)
                .get();

            if (snapshot.empty) {
                return null;
            }

            const doc = snapshot.docs[0];
            return {
                id: doc.id,
                ...doc.data(),
            } as UserSubscription;
        } catch (error) {
            logger.error('Error fetching user subscription:', error);
            throw error;
        }
    }

    /**
     * Check if user has active subscription
     */
    async checkStatus(userId: string): Promise<{
        hasActiveSubscription: boolean;
        subscription: UserSubscription | null;
        canCreateListing: boolean;
        remainingListings: number;
    }> {
        const subscription = await this.getUserSubscription(userId);

        if (!subscription) {
            return {
                hasActiveSubscription: false,
                subscription: null,
                canCreateListing: false,
                remainingListings: 0,
            };
        }

        // Check if expired
        const now = new Date();
        const endDate = new Date(subscription.endDate);

        if (now > endDate) {
            // Mark as expired
            await this.db.collection('subscriptions').doc(subscription.id).update({
                status: 'expired',
                updatedAt: now.toISOString(),
            });

            return {
                hasActiveSubscription: false,
                subscription: null,
                canCreateListing: false,
                remainingListings: 0,
            };
        }

        // Check listing limits
        const remainingListings =
            subscription.listingLimit === -1
                ? -1 // unlimited
                : subscription.listingLimit - subscription.listingsUsed;

        const canCreateListing = remainingListings === -1 || remainingListings > 0;

        return {
            hasActiveSubscription: true,
            subscription,
            canCreateListing,
            remainingListings,
        };
    }

    /**
     * Create new subscription in database
     */
    async createSubscription(
        userId: string,
        planId: string,
        paymentId: string,
        razorpaySubscriptionId?: string
    ): Promise<UserSubscription> {
        const plan = this.getPlanById(planId);

        if (!plan) {
            throw new AppError(404, 'Invalid plan ID');
        }

        const now = new Date();
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + plan.duration);

        const subscriptionData = {
            userId,
            planId,
            razorpaySubscriptionId: razorpaySubscriptionId || null,
            status: 'active',
            startDate: now.toISOString(),
            endDate: endDate.toISOString(),
            listingsUsed: 0,
            listingLimit: plan.listingLimit,
            paymentId,
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
        };

        const docRef = await this.db.collection('subscriptions').add(subscriptionData);

        // Send notification
        await notificationService.create({
            userId,
            type: 'subscription_activated',
            title: 'Subscription Activated!',
            message: `Your ${plan.name} is now active. You can create ${plan.listingLimit === -1 ? 'unlimited' : plan.listingLimit} listings.`,
            data: { subscriptionId: docRef.id, planId },
        });

        logger.info(`Subscription created for user ${userId}: ${planId}`);

        return {
            id: docRef.id,
            ...subscriptionData,
        } as UserSubscription;
    }

    /**
     * Cancel subscription
     */
    async cancelSubscription(subscriptionId: string, userId: string): Promise<void> {
        const doc = await this.db.collection('subscriptions').doc(subscriptionId).get();

        if (!doc.exists) {
            throw new AppError(404, 'Subscription not found');
        }

        const subscription = doc.data() as UserSubscription;

        if (subscription.userId !== userId) {
            throw new AppError(403, 'Unauthorized');
        }

        // Cancel in Razorpay if applicable
        if (subscription.razorpaySubscriptionId) {
            try {
                await this.razorpay.subscriptions.cancel(subscription.razorpaySubscriptionId);
            } catch (error) {
                logger.error('Error cancelling Razorpay subscription:', error);
            }
        }

        await this.db.collection('subscriptions').doc(subscriptionId).update({
            status: 'cancelled',
            updatedAt: new Date().toISOString(),
        });

        logger.info(`Subscription cancelled: ${subscriptionId}`);
    }

    /**
     * Increment listing usage
     */
    async incrementListingUsage(userId: string): Promise<void> {
        const subscription = await this.getUserSubscription(userId);

        if (!subscription) {
            throw new AppError(403, 'No active subscription');
        }

        if (
            subscription.listingLimit !== -1 &&
            subscription.listingsUsed >= subscription.listingLimit
        ) {
            throw new AppError(403, 'Listing limit reached');
        }

        await this.db.collection('subscriptions').doc(subscription.id).update({
            listingsUsed: subscription.listingsUsed + 1,
            updatedAt: new Date().toISOString(),
        });
    }

    /**
     * Decrement listing usage (when listing is deleted)
     */
    async decrementListingUsage(userId: string): Promise<void> {
        const subscription = await this.getUserSubscription(userId);

        if (!subscription) {
            return; // No active subscription, nothing to decrement
        }

        await this.db.collection('subscriptions').doc(subscription.id).update({
            listingsUsed: Math.max(0, subscription.listingsUsed - 1),
            updatedAt: new Date().toISOString(),
        });
    }

    /**
     * Handle Razorpay webhooks
     */
    async handleWebhook(event: any, signature: string) {
        try {
            // Verify webhook signature
            const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || '';
            const expectedSignature = crypto
                .createHmac('sha256', webhookSecret)
                .update(JSON.stringify(event))
                .digest('hex');

            if (expectedSignature !== signature) {
                throw new AppError(400, 'Invalid webhook signature');
            }

            const eventType = event.event;
            const payload = event.payload;

            logger.info(`Processing webhook event: ${eventType}`);

            switch (eventType) {
                case 'subscription.activated':
                    await this.handleSubscriptionActivated(payload);
                    break;

                case 'subscription.charged':
                    await this.handleSubscriptionCharged(payload);
                    break;

                case 'subscription.completed':
                    await this.handleSubscriptionCompleted(payload);
                    break;

                case 'subscription.cancelled':
                    await this.handleSubscriptionCancelled(payload);
                    break;

                case 'subscription.halted':
                    await this.handleSubscriptionHalted(payload);
                    break;

                case 'payment.failed':
                    await this.handlePaymentFailed(payload);
                    break;

                default:
                    logger.info(`Unhandled webhook event: ${eventType}`);
            }

            return { success: true };
        } catch (error) {
            logger.error('Webhook processing error:', error);
            throw error;
        }
    }

    private async handleSubscriptionActivated(payload: any) {
        const subscription = payload.subscription.entity;
        const { userId, planId } = subscription.notes;

        logger.info(`Subscription activated via webhook: ${subscription.id}`);

        // Subscription already created via payment verification
        // This is a confirmation event
    }

    private async handleSubscriptionCharged(payload: any) {
        const payment = payload.payment.entity;
        logger.info(`Subscription charged: ${payment.id}`);
    }

    private async handleSubscriptionCompleted(payload: any) {
        const subscription = payload.subscription.entity;
        const { userId } = subscription.notes;

        logger.info(`Subscription completed: ${subscription.id}`);

        // Find and mark as completed
        const snapshot = await this.db
            .collection('subscriptions')
            .where('razorpaySubscriptionId', '==', subscription.id)
            .limit(1)
            .get();

        if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            await doc.ref.update({
                status: 'expired',
                updatedAt: new Date().toISOString(),
            });
        }
    }

    private async handleSubscriptionCancelled(payload: any) {
        const subscription = payload.subscription.entity;

        logger.info(`Subscription cancelled via webhook: ${subscription.id}`);

        const snapshot = await this.db
            .collection('subscriptions')
            .where('razorpaySubscriptionId', '==', subscription.id)
            .limit(1)
            .get();

        if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            await doc.ref.update({
                status: 'cancelled',
                updatedAt: new Date().toISOString(),
            });

            // Notify user
            const sub = doc.data();
            await notificationService.create({
                userId: sub.userId,
                type: 'subscription_cancelled',
                title: 'Subscription Cancelled',
                message: 'Your subscription has been cancelled.',
                data: { subscriptionId: subscription.id },
            });
        }
    }

    private async handleSubscriptionHalted(payload: any) {
        const subscription = payload.subscription.entity;
        logger.info(`Subscription halted: ${subscription.id}`);
    }

    private async handlePaymentFailed(payload: any) {
        const payment = payload.payment.entity;
        logger.info(`Payment failed: ${payment.id}`);

        // Notify user about payment failure
        if (payment.notes?.userId) {
            await notificationService.create({
                userId: payment.notes.userId,
                type: 'payment_failed',
                title: 'Payment Failed',
                message: 'Your subscription payment failed. Please update your payment method.',
                data: { paymentId: payment.id },
            });
        }
    }
}

export const subscriptionService = new SubscriptionService();
