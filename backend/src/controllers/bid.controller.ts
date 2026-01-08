import { Request, Response, NextFunction } from 'express';
import { bidService } from '../services/bid.service';
import { AppError } from '../middleware/errorHandler';

export class BidController {
    /**
     * Create bid
     */
    async createBid(req: Request, res: Response, next: NextFunction) {
        try {
            const buyerId = req.user?.uid;
            const { propertyId, amount, message, validUntil } = req.body;

            if (!buyerId) {
                throw new AppError(401, 'Unauthorized');
            }

            if (!propertyId || !amount) {
                throw new AppError(400, 'Property ID and amount are required');
            }

            const result = await bidService.createBid({
                propertyId,
                buyerId,
                amount,
                message,
                validUntil,
            });

            res.status(201).json(result);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Accept bid
     */
    async acceptBid(req: Request, res: Response, next: NextFunction) {
        try {
            const sellerId = req.user?.uid;
            const { bidId } = req.params;

            if (!sellerId) {
                throw new AppError(401, 'Unauthorized');
            }

            const result = await bidService.acceptBid(bidId, sellerId);

            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Reject bid
     */
    async rejectBid(req: Request, res: Response, next: NextFunction) {
        try {
            const sellerId = req.user?.uid;
            const { bidId } = req.params;
            const { reason } = req.body;

            if (!sellerId) {
                throw new AppError(401, 'Unauthorized');
            }

            const result = await bidService.rejectBid(bidId, sellerId, reason);

            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Create counter offer
     */
    async createCounterOffer(req: Request, res: Response, next: NextFunction) {
        try {
            const sellerId = req.user?.uid;
            const { bidId } = req.params;
            const { counterAmount, message } = req.body;

            if (!sellerId) {
                throw new AppError(401, 'Unauthorized');
            }

            if (!counterAmount) {
                throw new AppError(400, 'Counter amount is required');
            }

            const result = await bidService.createCounterOffer(bidId, sellerId, counterAmount, message);

            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Accept counter offer
     */
    async acceptCounterOffer(req: Request, res: Response, next: NextFunction) {
        try {
            const buyerId = req.user?.uid;
            const { bidId } = req.params;

            if (!buyerId) {
                throw new AppError(401, 'Unauthorized');
            }

            const result = await bidService.acceptCounterOffer(bidId, buyerId);

            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get property bids
     */
    async getPropertyBids(req: Request, res: Response, next: NextFunction) {
        try {
            const { propertyId } = req.params;
            const sellerId = req.user?.uid;

            const result = await bidService.getPropertyBids(propertyId, sellerId);

            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get buyer bids
     */
    async getBuyerBids(req: Request, res: Response, next: NextFunction) {
        try {
            const buyerId = req.user?.uid;

            if (!buyerId) {
                throw new AppError(401, 'Unauthorized');
            }

            const result = await bidService.getBuyerBids(buyerId);

            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Withdraw bid
     */
    async withdrawBid(req: Request, res: Response, next: NextFunction) {
        try {
            const buyerId = req.user?.uid;
            const { bidId } = req.params;

            if (!buyerId) {
                throw new AppError(401, 'Unauthorized');
            }

            const result = await bidService.withdrawBid(bidId, buyerId);

            res.json(result);
        } catch (error) {
            next(error);
        }
    }
}

export const bidController = new BidController();
