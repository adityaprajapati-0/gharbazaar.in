import { getFirestore } from '../config/firebase';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { notificationService } from './notification.service';
import { cacheService, CacheService } from './cache.service';

interface PropertyFilters {
    city?: string;
    state?: string;
    propertyType?: string;
    minPrice?: number;
    maxPrice?: number;
    minArea?: number;
    maxArea?: number;
    bedrooms?: number;
    bathrooms?: number;
    status?: string;
    sellerId?: string;
}

interface PaginationOptions {
    limit?: number;
    offset?: number;
    orderBy?: string;
    orderDirection?: 'asc' | 'desc';
}

export class PropertyService {
    private db = getFirestore();

    /**
     * Generate cache key for search queries
     */
    private generateSearchCacheKey(filters: PropertyFilters, options: PaginationOptions): string {
        const filterKey = Object.entries(filters)
            .filter(([, v]) => v !== undefined)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, v]) => `${k}:${v}`)
            .join('|');
        const optionsKey = `${options.limit || 20}:${options.offset || 0}:${options.orderBy || 'createdAt'}:${options.orderDirection || 'desc'}`;
        return `${CacheService.KEYS.PROPERTY_SEARCH}${filterKey}:${optionsKey}`;
    }

    /**
     * Advanced property search with filters, pagination, and caching
     */
    async searchProperties(filters: PropertyFilters, options: PaginationOptions = {}) {
        const cacheKey = this.generateSearchCacheKey(filters, options);

        // Try cache first
        const cached = await cacheService.get<any>(cacheKey);
        if (cached) {
            logger.debug('Property search cache hit');
            return { ...cached, cached: true };
        }

        try {
            const {
                limit = 20,
                offset = 0,
                orderBy = 'createdAt',
                orderDirection = 'desc',
            } = options;

            let query: any = this.db.collection('properties');

            // Apply filters
            if (filters.city) {
                query = query.where('city', '==', filters.city);
            }

            if (filters.state) {
                query = query.where('state', '==', filters.state);
            }

            if (filters.propertyType) {
                query = query.where('propertyType', '==', filters.propertyType);
            }

            if (filters.status) {
                query = query.where('status', '==', filters.status);
            } else {
                // Default: only show active properties
                query = query.where('status', '==', 'active');
            }

            if (filters.sellerId) {
                query = query.where('sellerId', '==', filters.sellerId);
            }

            // Order and paginate
            query = query.orderBy(orderBy, orderDirection).limit(limit).offset(offset);

            const snapshot = await query.get();
            let properties = snapshot.docs.map((doc: any) => ({
                id: doc.id,
                ...doc.data(),
            }));

            // Client-side filtering for price and area ranges (Firestore limitation)
            if (filters.minPrice !== undefined) {
                properties = properties.filter((p: any) => p.price >= filters.minPrice!);
            }

            if (filters.maxPrice !== undefined) {
                properties = properties.filter((p: any) => p.price <= filters.maxPrice!);
            }

            if (filters.minArea !== undefined) {
                properties = properties.filter((p: any) => p.area >= filters.minArea!);
            }

            if (filters.maxArea !== undefined) {
                properties = properties.filter((p: any) => p.area <= filters.maxArea!);
            }

            if (filters.bedrooms !== undefined) {
                properties = properties.filter((p: any) => p.bedrooms >= filters.bedrooms!);
            }

            if (filters.bathrooms !== undefined) {
                properties = properties.filter((p: any) => p.bathrooms >= filters.bathrooms!);
            }

            const result = {
                success: true,
                properties,
                pagination: {
                    total: properties.length,
                    limit,
                    offset,
                    hasMore: snapshot.size === limit,
                },
            };

            // Cache the result
            await cacheService.set(cacheKey, result, CacheService.TTL.PROPERTY_LIST);

            return result;
        } catch (error) {
            logger.error('Property search error:', error);
            throw new AppError(500, 'Failed to search properties');
        }
    }

    /**
     * Get similar properties based on property details (CACHED)
     */
    async getSimilarProperties(propertyId: string, limit: number = 5) {
        const cacheKey = `${CacheService.KEYS.PROPERTY_SIMILAR}${propertyId}:${limit}`;

        // Try cache first
        const cached = await cacheService.get<any>(cacheKey);
        if (cached) {
            return { ...cached, cached: true };
        }

        try {
            const propertyDoc = await this.db.collection('properties').doc(propertyId).get();

            if (!propertyDoc.exists) {
                throw new AppError(404, 'Property not found');
            }

            const propertyData = propertyDoc.data();

            // Find similar properties based on location and type
            const similarSnapshot = await this.db
                .collection('properties')
                .where('city', '==', propertyData?.city)
                .where('propertyType', '==', propertyData?.propertyType)
                .where('status', '==', 'active')
                .limit(limit + 1)
                .get();

            const similarProperties = similarSnapshot.docs
                .map((doc: any) => ({ id: doc.id, ...doc.data() }))
                .filter((p: any) => p.id !== propertyId)
                .slice(0, limit);

            const result = {
                success: true,
                properties: similarProperties,
            };

            // Cache for 5 minutes
            await cacheService.set(cacheKey, result, CacheService.TTL.MEDIUM);

            return result;
        } catch (error) {
            logger.error('Similar properties error:', error);
            throw error;
        }
    }

    /**
     * Get property analytics (views, favorites, inquiries)
     */
    async getPropertyAnalytics(propertyId: string) {
        const cacheKey = `${CacheService.KEYS.ANALYTICS}property:${propertyId}`;

        // Try cache first (short TTL for analytics)
        const cached = await cacheService.get<any>(cacheKey);
        if (cached) {
            return { ...cached, cached: true };
        }

        try {
            const propertyDoc = await this.db.collection('properties').doc(propertyId).get();

            if (!propertyDoc.exists) {
                throw new AppError(404, 'Property not found');
            }

            const propertyData = propertyDoc.data();

            // Use Promise.all for parallel fetching (faster!)
            const [viewsSnapshot, favoritesSnapshot, inquiriesSnapshot, recentViewsSnapshot] = await Promise.all([
                // Get view count
                this.db.collection('propertyViews').where('propertyId', '==', propertyId).get(),
                // Get favorites count
                this.db.collection('favorites').where('propertyId', '==', propertyId).get(),
                // Get inquiries count
                this.db.collection('inquiries').where('propertyId', '==', propertyId).get(),
                // Get recent views (last 30 days)
                (() => {
                    const thirtyDaysAgo = new Date();
                    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                    return this.db
                        .collection('propertyViews')
                        .where('propertyId', '==', propertyId)
                        .where('viewedAt', '>=', thirtyDaysAgo.toISOString())
                        .get();
                })(),
            ]);

            const result = {
                success: true,
                analytics: {
                    totalViews: viewsSnapshot.size,
                    recentViews: recentViewsSnapshot.size,
                    favoritesCount: favoritesSnapshot.size,
                    inquiriesCount: inquiriesSnapshot.size,
                    status: propertyData?.status,
                    createdAt: propertyData?.createdAt,
                    updatedAt: propertyData?.updatedAt,
                },
            };

            // Cache for 1 minute
            await cacheService.set(cacheKey, result, CacheService.TTL.ANALYTICS);

            return result;
        } catch (error) {
            logger.error('Property analytics error:', error);
            throw error;
        }
    }

    /**
     * Track property view (with batching for high traffic)
     */
    async trackPropertyView(propertyId: string, userId?: string) {
        try {
            // Use batch for atomic operations
            const batch = this.db.batch();

            // Add view record
            const viewRef = this.db.collection('propertyViews').doc();
            batch.set(viewRef, {
                propertyId,
                userId: userId || 'anonymous',
                viewedAt: new Date().toISOString(),
            });

            // Increment view count on property
            const propertyRef = this.db.collection('properties').doc(propertyId);
            const propertyDoc = await propertyRef.get();

            if (propertyDoc.exists) {
                const currentViews = propertyDoc.data()?.views || 0;
                batch.update(propertyRef, {
                    views: currentViews + 1,
                    updatedAt: new Date().toISOString(),
                });
            }

            await batch.commit();

            // Invalidate analytics cache
            await cacheService.delete(`${CacheService.KEYS.ANALYTICS}property:${propertyId}`);

            return { success: true };
        } catch (error) {
            logger.error('Track view error:', error);
            throw new AppError(500, 'Failed to track view');
        }
    }

    /**
     * Create property inquiry
     */
    async createInquiry(propertyId: string, buyerId: string, message: string) {
        try {
            const propertyDoc = await this.db.collection('properties').doc(propertyId).get();

            if (!propertyDoc.exists) {
                throw new AppError(404, 'Property not found');
            }

            const propertyData = propertyDoc.data();
            const sellerId = propertyData?.sellerId;

            // Use batch for atomic operations
            const batch = this.db.batch();

            // Create inquiry
            const inquiryRef = this.db.collection('inquiries').doc();
            batch.set(inquiryRef, {
                propertyId,
                buyerId,
                sellerId,
                message,
                status: 'pending',
                createdAt: new Date().toISOString(),
            });

            // Update property inquiry count
            const propertyRef = this.db.collection('properties').doc(propertyId);
            batch.update(propertyRef, {
                inquiries: (propertyData?.inquiries || 0) + 1,
                updatedAt: new Date().toISOString(),
            });

            await batch.commit();

            // Send notification to seller (async, don't block)
            notificationService.create({
                userId: sellerId,
                type: 'inquiry',
                title: 'New Property Inquiry',
                message: `You have a new inquiry for your property`,
                data: {
                    propertyId,
                    inquiryId: inquiryRef.id,
                },
            }).catch(err => logger.error('Notification error:', err));

            // Invalidate caches
            await cacheService.invalidateProperty(propertyId);

            logger.info(`Inquiry created: ${inquiryRef.id}`);

            return {
                success: true,
                inquiryId: inquiryRef.id,
            };
        } catch (error) {
            logger.error('Create inquiry error:', error);
            throw error;
        }
    }

    /**
     * Get trending properties (most viewed/favorited) - CACHED
     */
    async getTrendingProperties(limit: number = 10) {
        const cacheKey = `${CacheService.KEYS.PROPERTY_TRENDING}${limit}`;

        // Try cache first
        const cached = await cacheService.get<any>(cacheKey);
        if (cached) {
            logger.debug('Trending properties cache hit');
            return { ...cached, cached: true };
        }

        try {
            // Get properties ordered by views
            const snapshot = await this.db
                .collection('properties')
                .where('status', '==', 'active')
                .orderBy('views', 'desc')
                .limit(limit)
                .get();

            const properties = snapshot.docs.map((doc: any) => ({
                id: doc.id,
                ...doc.data(),
            }));

            const result = {
                success: true,
                properties,
            };

            // Cache trending for 3 minutes
            await cacheService.set(cacheKey, result, CacheService.TTL.TRENDING);

            return result;
        } catch (error) {
            logger.error('Trending properties error:', error);
            throw new AppError(500, 'Failed to get trending properties');
        }
    }

    /**
     * Update property visibility/status
     */
    async updatePropertyStatus(propertyId: string, status: string, reason?: string) {
        try {
            const propertyRef = this.db.collection('properties').doc(propertyId);
            const propertyDoc = await propertyRef.get();

            if (!propertyDoc.exists) {
                throw new AppError(404, 'Property not found');
            }

            const propertyData = propertyDoc.data();

            await propertyRef.update({
                status,
                statusReason: reason || null,
                updatedAt: new Date().toISOString(),
            });

            // Notify seller
            if (propertyData?.sellerId) {
                notificationService.create({
                    userId: propertyData.sellerId,
                    type: 'property_status',
                    title: 'Property Status Updated',
                    message: `Your property status has been updated to: ${status}`,
                    data: { propertyId, status, reason },
                }).catch(err => logger.error('Notification error:', err));
            }

            // Invalidate all related caches
            await cacheService.invalidateProperty(propertyId);

            logger.info(`Property status updated: ${propertyId} -> ${status}`);

            return { success: true };
        } catch (error) {
            logger.error('Update property status error:', error);
            throw error;
        }
    }

    /**
     * Delete property (soft delete)
     */
    async deleteProperty(propertyId: string, userId: string) {
        try {
            const propertyRef = this.db.collection('properties').doc(propertyId);
            const propertyDoc = await propertyRef.get();

            if (!propertyDoc.exists) {
                throw new AppError(404, 'Property not found');
            }

            const propertyData = propertyDoc.data();

            // Verify ownership
            if (propertyData?.sellerId !== userId) {
                throw new AppError(403, 'Unauthorized to delete this property');
            }

            // Soft delete
            await propertyRef.update({
                status: 'deleted',
                deletedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            });

            // Invalidate all related caches
            await cacheService.invalidateProperty(propertyId);

            logger.info(`Property deleted: ${propertyId}`);

            return { success: true };
        } catch (error) {
            logger.error('Delete property error:', error);
            throw error;
        }
    }
}

export const propertyService = new PropertyService();
