import { getFirestore } from '../config/firebase';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { notificationService } from './notification.service';

interface ReviewData {
    propertyId: string;
    userId: string;
    rating: number;
    title: string;
    comment: string;
}

export class ReviewService {
    private db = getFirestore();

    /**
     * Create review
     */
    async createReview(reviewData: ReviewData) {
        try {
            const { propertyId, userId, rating, title, comment } = reviewData;

            // Validate rating (1-5)
            if (rating < 1 || rating > 5) {
                throw new AppError(400, 'Rating must be between 1 and 5');
            }

            // Check if user already reviewed this property
            const existingReview = await this.db
                .collection('reviews')
                .where('propertyId', '==', propertyId)
                .where('userId', '==', userId)
                .get();

            if (!existingReview.empty) {
                throw new AppError(400, 'You have already reviewed this property');
            }

            // Create review
            const reviewRef = await this.db.collection('reviews').add({
                propertyId,
                userId,
                rating,
                title,
                comment,
                status: 'pending', // pending, approved, rejected
                helpfulCount: 0,
                reportCount: 0,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            });

            // Update property average rating
            await this.updatePropertyRating(propertyId);

            // Get property details
            const propertyDoc = await this.db.collection('properties').doc(propertyId).get();
            const property = propertyDoc.data();

            // Notify seller
            if (property?.sellerId) {
                await notificationService.create({
                    userId: property.sellerId,
                    type: 'review_received',
                    title: 'New Review',
                    message: `You received a ${rating}-star review on your property`,
                    data: { propertyId, reviewId: reviewRef.id, rating },
                });
            }

            logger.info(`Review created: ${reviewRef.id}`);

            return {
                success: true,
                review: {
                    id: reviewRef.id,
                    ...reviewData,
                    status: 'pending',
                },
            };
        } catch (error) {
            logger.error('Create review error:', error);
            throw error;
        }
    }

    /**
     * Update property average rating
     */
    async updatePropertyRating(propertyId: string) {
        try {
            const reviewsSnapshot = await this.db
                .collection('reviews')
                .where('propertyId', '==', propertyId)
                .where('status', '==', 'approved')
                .get();

            if (reviewsSnapshot.empty) {
                return;
            }

            const reviews = reviewsSnapshot.docs.map((doc: any) => doc.data());
            const totalRating = reviews.reduce((sum: number, review: any) => sum + review.rating, 0);
            const averageRating = totalRating / reviews.length;
            const reviewCount = reviews.length;

            await this.db.collection('properties').doc(propertyId).update({
                averageRating: parseFloat(averageRating.toFixed(2)),
                reviewCount,
                updatedAt: new Date().toISOString(),
            });

            return { averageRating, reviewCount };
        } catch (error) {
            logger.error('Update property rating error:', error);
            throw error;
        }
    }

    /**
     * Get reviews for property
     */
    async getPropertyReviews(propertyId: string, limit: number = 20) {
        try {
            const snapshot = await this.db
                .collection('reviews')
                .where('propertyId', '==', propertyId)
                .where('status', '==', 'approved')
                .orderBy('createdAt', 'desc')
                .limit(limit)
                .get();

            const reviews = await Promise.all(
                snapshot.docs.map(async (doc: any) => {
                    const reviewData = doc.data();

                    // Get user details
                    const userDoc = await this.db.collection('users').doc(reviewData.userId).get();
                    const user = userDoc.exists ? userDoc.data() : null;

                    return {
                        id: doc.id,
                        ...reviewData,
                        user: user ? {
                            id: reviewData.userId,
                            displayName: user.displayName,
                            photoURL: user.photoURL,
                        } : null,
                    };
                })
            );

            return {
                success: true,
                reviews,
                count: reviews.length,
            };
        } catch (error) {
            logger.error('Get property reviews error:', error);
            throw new AppError(500, 'Failed to get reviews');
        }
    }

    /**
     * Mark review as helpful
     */
    async markHelpful(reviewId: string, userId: string) {
        try {
            const reviewDoc = await this.db.collection('reviews').doc(reviewId).get();

            if (!reviewDoc.exists) {
                throw new AppError(404, 'Review not found');
            }

            // Check if already marked helpful
            const helpfulDoc = await this.db
                .collection('reviewHelpful')
                .where('reviewId', '==', reviewId)
                .where('userId', '==', userId)
                .get();

            if (!helpfulDoc.empty) {
                throw new AppError(400, 'Already marked as helpful');
            }

            // Add helpful record
            await this.db.collection('reviewHelpful').add({
                reviewId,
                userId,
                createdAt: new Date().toISOString(),
            });

            // Increment helpful count
            const currentCount = reviewDoc.data()?.helpfulCount || 0;
            await reviewDoc.ref.update({
                helpfulCount: currentCount + 1,
                updatedAt: new Date().toISOString(),
            });

            logger.info(`Review marked helpful: ${reviewId}`);

            return { success: true };
        } catch (error) {
            logger.error('Mark helpful error:', error);
            throw error;
        }
    }

    /**
     * Report review
     */
    async reportReview(reviewId: string, userId: string, reason: string) {
        try {
            const reviewDoc = await this.db.collection('reviews').doc(reviewId).get();

            if (!reviewDoc.exists) {
                throw new AppError(404, 'Review not found');
            }

            // Add report
            await this.db.collection('reviewReports').add({
                reviewId,
                userId,
                reason,
                createdAt: new Date().toISOString(),
            });

            // Increment report count
            const currentCount = reviewDoc.data()?.reportCount || 0;
            await reviewDoc.ref.update({
                reportCount: currentCount + 1,
                updatedAt: new Date().toISOString(),
            });

            // Auto-hide if too many reports
            if (currentCount + 1 >= 5) {
                await reviewDoc.ref.update({
                    status: 'rejected',
                    rejectionReason: 'Multiple user reports',
                });
            }

            logger.info(`Review reported: ${reviewId}`);

            return { success: true };
        } catch (error) {
            logger.error('Report review error:', error);
            throw error;
        }
    }

    /**
     * Approve review (admin)
     */
    async approveReview(reviewId: string) {
        try {
            const reviewDoc = await this.db.collection('reviews').doc(reviewId).get();

            if (!reviewDoc.exists) {
                throw new AppError(404, 'Review not found');
            }

            await reviewDoc.ref.update({
                status: 'approved',
                approvedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            });

            // Update property rating
            const review = reviewDoc.data();
            await this.updatePropertyRating(review?.propertyId);

            logger.info(`Review approved: ${reviewId}`);

            return { success: true };
        } catch (error) {
            logger.error('Approve review error:', error);
            throw error;
        }
    }

    /**
     * Reject review (admin)
     */
    async rejectReview(reviewId: string, reason: string) {
        try {
            const reviewDoc = await this.db.collection('reviews').doc(reviewId).get();

            if (!reviewDoc.exists) {
                throw new AppError(404, 'Review not found');
            }

            await reviewDoc.ref.update({
                status: 'rejected',
                rejectionReason: reason,
                rejectedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            });

            logger.info(`Review rejected: ${reviewId}`);

            return { success: true };
        } catch (error) {
            logger.error('Reject review error:', error);
            throw error;
        }
    }

    /**
     * Get user's reviews
     */
    async getUserReviews(userId: string) {
        try {
            const snapshot = await this.db
                .collection('reviews')
                .where('userId', '==', userId)
                .orderBy('createdAt', 'desc')
                .get();

            const reviews = await Promise.all(
                snapshot.docs.map(async (doc: any) => {
                    const reviewData = doc.data();

                    // Get property details
                    const propertyDoc = await this.db.collection('properties').doc(reviewData.propertyId).get();
                    const property = propertyDoc.exists ? propertyDoc.data() : null;

                    return {
                        id: doc.id,
                        ...reviewData,
                        property: property ? {
                            id: reviewData.propertyId,
                            title: property.title,
                            city: property.city,
                        } : null,
                    };
                })
            );

            return {
                success: true,
                reviews,
                count: reviews.length,
            };
        } catch (error) {
            logger.error('Get user reviews error:', error);
            throw new AppError(500, 'Failed to get user reviews');
        }
    }

    /**
     * Get pending reviews (admin)
     */
    async getPendingReviews(limit: number = 50) {
        try {
            const snapshot = await this.db
                .collection('reviews')
                .where('status', '==', 'pending')
                .orderBy('createdAt', 'desc')
                .limit(limit)
                .get();

            const reviews = await Promise.all(
                snapshot.docs.map(async (doc: any) => {
                    const reviewData = doc.data();

                    // Get user and property details
                    const userDoc = await this.db.collection('users').doc(reviewData.userId).get();
                    const propertyDoc = await this.db.collection('properties').doc(reviewData.propertyId).get();

                    return {
                        id: doc.id,
                        ...reviewData,
                        user: userDoc.exists ? {
                            displayName: userDoc.data()?.displayName,
                            email: userDoc.data()?.email,
                        } : null,
                        property: propertyDoc.exists ? {
                            title: propertyDoc.data()?.title,
                        } : null,
                    };
                })
            );

            return {
                success: true,
                reviews,
                count: reviews.length,
            };
        } catch (error) {
            logger.error('Get pending reviews error:', error);
            throw new AppError(500, 'Failed to get pending reviews');
        }
    }
}

export const reviewService = new ReviewService();
