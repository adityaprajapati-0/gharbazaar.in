import { Request, Response, NextFunction } from 'express';
import { analyticsService } from '../services/analytics.service';
import { AppError } from '../middleware/errorHandler';

export class AnalyticsController {
    /**
     * Get admin dashboard analytics
     */
    async getAdminDashboard(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await analyticsService.getAdminDashboardAnalytics();
            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get seller insights
     */
    async getSellerInsights(req: Request, res: Response, next: NextFunction) {
        try {
            const sellerId = req.user?.uid;

            if (!sellerId) {
                throw new AppError(401, 'Unauthorized');
            }

            const result = await analyticsService.getSellerInsights(sellerId);
            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get search suggestions
     */
    async getSearchSuggestions(req: Request, res: Response, next: NextFunction) {
        try {
            const { query, limit } = req.query;

            if (!query) {
                throw new AppError(400, 'Query parameter is required');
            }

            const result = await analyticsService.getSearchSuggestions(
                query as string,
                limit ? parseInt(limit as string) : 10
            );

            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Track search
     */
    async trackSearch(req: Request, res: Response, next: NextFunction) {
        try {
            const { query } = req.body;
            const userId = req.user?.uid;

            if (!query) {
                throw new AppError(400, 'Query is required');
            }

            const result = await analyticsService.trackSearch(query, userId);
            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get popular searches
     */
    async getPopularSearches(req: Request, res: Response, next: NextFunction) {
        try {
            const { limit } = req.query;

            const result = await analyticsService.getPopularSearches(
                limit ? parseInt(limit as string) : 10
            );

            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get property performance
     */
    async getPropertyPerformance(req: Request, res: Response, next: NextFunction) {
        try {
            const { propertyId } = req.params;

            const result = await analyticsService.getPropertyPerformance(propertyId);
            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get citywise analytics
     */
    async getCitywiseAnalytics(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await analyticsService.getCitywiseAnalytics();
            res.json(result);
        } catch (error) {
            next(error);
        }
    }
}

export const analyticsController = new AnalyticsController();
