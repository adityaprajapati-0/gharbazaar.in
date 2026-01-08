import { getFirestore } from '../config/firebase';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { notificationService } from './notification.service';

interface BidData {
    propertyId: string;
    buyerId: string;
    amount: number;
    message?: string;
    validUntil?: string;
}

export class BidService {
    private db = getFirestore();

    /**
     * Create new bid on property
     */
    async createBid(bidData: BidData) {
        try {
            const { propertyId, buyerId, amount, message, validUntil } = bidData;

            // Get property details
            const propertyDoc = await this.db.collection('properties').doc(propertyId).get();

            if (!propertyDoc.exists) {
                throw new AppError(404, 'Property not found');
            }

            const property = propertyDoc.data();
            const sellerId = property?.sellerId;

            // Validate bid amount
            if (amount <= 0) {
                throw new AppError(400, 'Bid amount must be greater than 0');
            }

            // Create bid
            const bidRef = await this.db.collection('bids').add({
                propertyId,
                buyerId,
                sellerId,
                amount,
                message: message || null,
                status: 'pending',
                validUntil: validUntil || null,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            });

            // Notify seller
            await notificationService.create({
                userId: sellerId,
                type: 'bid_received',
                title: 'New Bid Received',
                message: `You received a bid of ₹${amount.toLocaleString('en-IN')} on your property`,
                data: { propertyId, bidId: bidRef.id, amount },
            });

            // Update property bid count
            await this.db.collection('properties').doc(propertyId).update({
                totalBids: (property?.totalBids || 0) + 1,
                updatedAt: new Date().toISOString(),
            });

            logger.info(`Bid created: ${bidRef.id} for property ${propertyId}`);

            return {
                success: true,
                bid: {
                    id: bidRef.id,
                    ...bidData,
                    status: 'pending',
                },
            };
        } catch (error) {
            logger.error('Create bid error:', error);
            throw error;
        }
    }

    /**
     * Accept bid
     */
    async acceptBid(bidId: string, sellerId: string) {
        try {
            const bidDoc = await this.db.collection('bids').doc(bidId).get();

            if (!bidDoc.exists) {
                throw new AppError(404, 'Bid not found');
            }

            const bid = bidDoc.data();

            // Verify seller
            if (bid?.sellerId !== sellerId) {
                throw new AppError(403, 'Unauthorized to accept this bid');
            }

            // Update bid status
            await this.db.collection('bids').doc(bidId).update({
                status: 'accepted',
                acceptedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            });

            // Reject other pending bids on same property
            const otherBidsSnapshot = await this.db
                .collection('bids')
                .where('propertyId', '==', bid.propertyId)
                .where('status', '==', 'pending')
                .get();

            const batch = this.db.batch();
            otherBidsSnapshot.docs.forEach((doc: any) => {
                if (doc.id !== bidId) {
                    batch.update(doc.ref, {
                        status: 'rejected',
                        rejectedAt: new Date().toISOString(),
                        rejectionReason: 'Another bid was accepted',
                    });
                }
            });
            await batch.commit();

            // Notify buyer
            await notificationService.create({
                userId: bid.buyerId,
                type: 'bid_accepted',
                title: 'Bid Accepted!',
                message: `Your bid of ₹${bid.amount.toLocaleString('en-IN')} was accepted`,
                data: { propertyId: bid.propertyId, bidId, amount: bid.amount },
            });

            // Update property status
            await this.db.collection('properties').doc(bid.propertyId).update({
                status: 'sold',
                soldPrice: bid.amount,
                soldAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            });

            logger.info(`Bid accepted: ${bidId}`);

            return { success: true };
        } catch (error) {
            logger.error('Accept bid error:', error);
            throw error;
        }
    }

    /**
     * Reject bid
     */
    async rejectBid(bidId: string, sellerId: string, reason?: string) {
        try {
            const bidDoc = await this.db.collection('bids').doc(bidId).get();

            if (!bidDoc.exists) {
                throw new AppError(404, 'Bid not found');
            }

            const bid = bidDoc.data();

            // Verify seller
            if (bid?.sellerId !== sellerId) {
                throw new AppError(403, 'Unauthorized to reject this bid');
            }

            // Update bid status
            await this.db.collection('bids').doc(bidId).update({
                status: 'rejected',
                rejectedAt: new Date().toISOString(),
                rejectionReason: reason || 'Bid rejected',
                updatedAt: new Date().toISOString(),
            });

            // Notify buyer
            await notificationService.create({
                userId: bid.buyerId,
                type: 'bid_rejected',
                title: 'Bid Rejected',
                message: `Your bid of ₹${bid.amount.toLocaleString('en-IN')} was rejected`,
                data: { propertyId: bid.propertyId, bidId, reason },
            });

            logger.info(`Bid rejected: ${bidId}`);

            return { success: true };
        } catch (error) {
            logger.error('Reject bid error:', error);
            throw error;
        }
    }

    /**
     * Create counter offer
     */
    async createCounterOffer(bidId: string, sellerId: string, counterAmount: number, message?: string) {
        try {
            const bidDoc = await this.db.collection('bids').doc(bidId).get();

            if (!bidDoc.exists) {
                throw new AppError(404, 'Bid not found');
            }

            const bid = bidDoc.data();

            // Verify seller
            if (bid?.sellerId !== sellerId) {
                throw new AppError(403, 'Unauthorized to counter this bid');
            }

            // Update bid with counter offer
            await this.db.collection('bids').doc(bidId).update({
                status: 'countered',
                counterOffer: {
                    amount: counterAmount,
                    message: message || null,
                    createdAt: new Date().toISOString(),
                },
                updatedAt: new Date().toISOString(),
            });

            // Notify buyer
            await notificationService.create({
                userId: bid.buyerId,
                type: 'counter_offer',
                title: 'Counter Offer Received',
                message: `Seller countered with ₹${counterAmount.toLocaleString('en-IN')}`,
                data: { propertyId: bid.propertyId, bidId, originalAmount: bid.amount, counterAmount },
            });

            logger.info(`Counter offer created for bid: ${bidId}`);

            return { success: true };
        } catch (error) {
            logger.error('Create counter offer error:', error);
            throw error;
        }
    }

    /**
     * Accept counter offer
     */
    async acceptCounterOffer(bidId: string, buyerId: string) {
        try {
            const bidDoc = await this.db.collection('bids').doc(bidId).get();

            if (!bidDoc.exists) {
                throw new AppError(404, 'Bid not found');
            }

            const bid = bidDoc.data();

            // Verify buyer
            if (bid?.buyerId !== buyerId) {
                throw new AppError(403, 'Unauthorized');
            }

            if (bid?.status !== 'countered') {
                throw new AppError(400, 'No counter offer to accept');
            }

            // Update bid - accept counter offer
            await this.db.collection('bids').doc(bidId).update({
                status: 'accepted',
                amount: bid.counterOffer.amount,
                acceptedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            });

            // Notify seller
            await notificationService.create({
                userId: bid.sellerId,
                type: 'counter_accepted',
                title: 'Counter Offer Accepted!',
                message: `Buyer accepted your counter offer of ₹${bid.counterOffer.amount.toLocaleString('en-IN')}`,
                data: { propertyId: bid.propertyId, bidId, amount: bid.counterOffer.amount },
            });

            // Update property status
            await this.db.collection('properties').doc(bid.propertyId).update({
                status: 'sold',
                soldPrice: bid.counterOffer.amount,
                soldAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            });

            logger.info(`Counter offer accepted for bid: ${bidId}`);

            return { success: true };
        } catch (error) {
            logger.error('Accept counter offer error:', error);
            throw error;
        }
    }

    /**
     * Get bids for property
     */
    async getPropertyBids(propertyId: string, sellerId?: string) {
        try {
            const snapshot = await this.db
                .collection('bids')
                .where('propertyId', '==', propertyId)
                .orderBy('createdAt', 'desc')
                .get();

            const bids = snapshot.docs.map((doc: any) => ({
                id: doc.id,
                ...doc.data(),
            }));

            return {
                success: true,
                bids,
                count: bids.length,
            };
        } catch (error) {
            logger.error('Get property bids error:', error);
            throw new AppError(500, 'Failed to get bids');
        }
    }

    /**
     * Get buyer's bids
     */
    async getBuyerBids(buyerId: string) {
        try {
            const snapshot = await this.db
                .collection('bids')
                .where('buyerId', '==', buyerId)
                .orderBy('createdAt', 'desc')
                .get();

            const bids = await Promise.all(
                snapshot.docs.map(async (doc: any) => {
                    const bidData = doc.data();

                    // Get property details
                    const propertyDoc = await this.db.collection('properties').doc(bidData.propertyId).get();
                    const property = propertyDoc.exists ? propertyDoc.data() : null;

                    return {
                        id: doc.id,
                        ...bidData,
                        property: property ? {
                            id: bidData.propertyId,
                            title: property.title,
                            city: property.city,
                            price: property.price,
                        } : null,
                    };
                })
            );

            return {
                success: true,
                bids,
                count: bids.length,
            };
        } catch (error) {
            logger.error('Get buyer bids error:', error);
            throw new AppError(500, 'Failed to get buyer bids');
        }
    }

    /**
     * Withdraw bid
     */
    async withdrawBid(bidId: string, buyerId: string) {
        try {
            const bidDoc = await this.db.collection('bids').doc(bidId).get();

            if (!bidDoc.exists) {
                throw new AppError(404, 'Bid not found');
            }

            const bid = bidDoc.data();

            // Verify buyer
            if (bid?.buyerId !== buyerId) {
                throw new AppError(403, 'Unauthorized');
            }

            if (bid?.status !== 'pending' && bid?.status !== 'countered') {
                throw new AppError(400, 'Cannot withdraw this bid');
            }

            // Update bid status
            await this.db.collection('bids').doc(bidId).update({
                status: 'withdrawn',
                withdrawnAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            });

            logger.info(`Bid withdrawn: ${bidId}`);

            return { success: true };
        } catch (error) {
            logger.error('Withdraw bid error:', error);
            throw error;
        }
    }
}

export const bidService = new BidService();
