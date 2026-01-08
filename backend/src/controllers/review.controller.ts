import { Request, Response, NextFunction } from 'express';
import { reviewService } from '../services/review.service';
import { AppError } from '../middleware/errorHandler';

export class ReviewController {
    /**
     * Create review
     */
    async createReview(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user?.uid;
            const { propertyId, rating, title, comment } = req.body;

            if (!userId) {
                throw new AppError(401, 'Unauthorized');
            }

            if (!propertyId || !rating || !title || !comment) {
                throw new AppError(400, 'All fields are required');
            }

            const result = await reviewService.createReview({
                propertyId,
                userId,
                rating,
                title,
                comment,
            });

            res.status(201).json(result);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get property reviews
     */
    async getPropertyReviews(req: Request, res: Response, next: NextFunction) {
        try {
            const { propertyId } = req.params;
            const { limit } = req.query;

            const result = await reviewService.getPropertyReviews(
                propertyId,
                limit ? parseInt(limit as string) : 20
            );

            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Mark review as helpful
     */
    async markHelpful(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user?.uid;
            const { reviewId } = req.params;

            if (!userId) {
                throw new AppError(401, 'Unauthorized');
            }

            const result = await reviewService.markHelpful(reviewId, userId);

            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Report review
     */
    async reportReview(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user?.uid;
            const { reviewId } = req.params;
            const { reason } = req.body;

            if (!userId) {
                throw new AppError(401, 'Unauthorized');
            }

            if (!reason) {
                throw new AppError(400, 'Reason is required');
            }

            const result = await reviewService.reportReview(reviewId, userId, reason);

            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Approve review (admin)
     */
    async approveReview(req: Request, res: Response, next: NextFunction) {
        try {
            const { reviewId } = req.params;

            const result = await reviewService.approveReview(reviewId);

            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Reject review (admin)
     */
    async rejectReview(req: Request, res: Response, next: NextFunction) {
        try {
            const { reviewId } = req.params;
            const { reason } = req.body;

            const result = await reviewService.rejectReview(reviewId, reason || 'Inappropriate content');

            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get user's reviews
     */
    async getUserReviews(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user?.uid;

            if (!userId) {
                throw new AppError(401, 'Unauthorized');
            }

            const result = await reviewService.getUserReviews(userId);

            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get pending reviews (admin)
     */
    async getPendingReviews(req: Request, res: Response, next: NextFunction) {
        try {
            const { limit } = req.query;

            const result = await reviewService.getPendingReviews(
                limit ? parseInt(limit as string) : 50
            );

            res.json(result);
        } catch (error) {
            next(error);
        }
    }
}

export const reviewController = new ReviewController();
