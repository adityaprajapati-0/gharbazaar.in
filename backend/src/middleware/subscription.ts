import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { subscriptionService } from '../services/subscription.service';
import { AppError } from './errorHandler';

/**
 * Middleware to require active subscription
 */
export const requireActiveSubscription = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    try {
        const userId = req.user!.uid;

        const status = await subscriptionService.checkStatus(userId);

        if (!status.hasActiveSubscription) {
            throw new AppError(
                403,
                'Active subscription required. Please purchase a plan to continue.',
                { redirectTo: '/dashboard/seller-pricing' }
            );
        }

        // Attach subscription to request for use in controllers
        (req as any).subscription = status.subscription;

        next();
    } catch (error) {
        next(error);
    }
};

/**
 * Middleware to check if user can create listing
 */
export const requireCanCreateListing = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    try {
        const userId = req.user!.uid;

        const status = await subscriptionService.checkStatus(userId);

        if (!status.hasActiveSubscription) {
            throw new AppError(
                403,
                'Active subscription required to create listings.',
                { redirectTo: '/dashboard/seller-pricing' }
            );
        }

        if (!status.canCreateListing) {
            throw new AppError(
                403,
                'Listing limit reached. Please upgrade your plan or wait for renewal.',
                {
                    redirectTo: '/dashboard/seller-pricing?reason=limit_reached',
                    remainingListings: status.remainingListings,
                    currentPlan: status.subscription?.planId,
                }
            );
        }

        // Attach subscription info to request
        (req as any).subscription = status.subscription;
        (req as any).remainingListings = status.remainingListings;

        next();
    } catch (error) {
        next(error);
    }
};

/**
 * Middleware to check specific plan level
 */
export const requirePlan = (minPlanLevel: 'basic' | 'premium' | 'pro') => {
    const planHierarchy = {
        basic: 1,
        premium: 2,
        pro: 3,
    };

    return async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const userId = req.user!.uid;

            const status = await subscriptionService.checkStatus(userId);

            if (!status.hasActiveSubscription) {
                throw new AppError(
                    403,
                    'Active subscription required.',
                    { redirectTo: '/dashboard/seller-pricing' }
                );
            }

            const userPlanLevel = planHierarchy[status.subscription!.planId as keyof typeof planHierarchy] || 0;
            const requiredLevel = planHierarchy[minPlanLevel];

            if (userPlanLevel < requiredLevel) {
                throw new AppError(
                    403,
                    `This feature requires ${minPlanLevel} plan or higher.`,
                    {
                        redirectTo: '/dashboard/seller-pricing',
                        currentPlan: status.subscription!.planId,
                        requiredPlan: minPlanLevel,
                    }
                );
            }

            (req as any).subscription = status.subscription;

            next();
        } catch (error) {
            next(error);
        }
    };
};
