import { getFirestore } from '../config/firebase';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

export class AnalyticsService {
    private db = getFirestore();

    /**
     * Get admin dashboard analytics
     */
    async getAdminDashboardAnalytics() {
        try {
            // Total users
            const usersSnapshot = await this.db.collection('users').get();
            const totalUsers = usersSnapshot.size;

            // Users by role
            const buyers = usersSnapshot.docs.filter((doc: any) => doc.data().role === 'buyer').length;
            const sellers = usersSnapshot.docs.filter((doc: any) => doc.data().role === 'seller').length;
            const employees = usersSnapshot.docs.filter((doc: any) => doc.data().role === 'employee').length;

            // Total properties
            const propertiesSnapshot = await this.db.collection('properties').get();
            const totalProperties = propertiesSnapshot.size;

            // Properties by status
            const activeProperties = propertiesSnapshot.docs.filter((doc: any) => doc.data().status === 'active').length;
            const pendingProperties = propertiesSnapshot.docs.filter((doc: any) => doc.data().status === 'pending').length;
            const soldProperties = propertiesSnapshot.docs.filter((doc: any) => doc.data().status === 'sold').length;

            // Transactions
            const transactionsSnapshot = await this.db
                .collection('transactions')
                .where('status', '==', 'completed')
                .get();

            const totalRevenue = transactionsSnapshot.docs.reduce((sum: number, doc: any) => {
                return sum + (doc.data().amount || 0);
            }, 0);

            // Monthly stats (last 30 days)
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const recentUsersSnapshot = await this.db
                .collection('users')
                .where('createdAt', '>=', thirtyDaysAgo.toISOString())
                .get();

            const recentPropertiesSnapshot = await this.db
                .collection('properties')
                .where('createdAt', '>=', thirtyDaysAgo.toISOString())
                .get();

            return {
                success: true,
                analytics: {
                    users: {
                        total: totalUsers,
                        buyers,
                        sellers,
                        employees,
                        newThisMonth: recentUsersSnapshot.size,
                    },
                    properties: {
                        total: totalProperties,
                        active: activeProperties,
                        pending: pendingProperties,
                        sold: soldProperties,
                        newThisMonth: recentPropertiesSnapshot.size,
                    },
                    revenue: {
                        total: totalRevenue,
                        transactions: transactionsSnapshot.size,
                        currency: 'INR',
                    },
                },
            };
        } catch (error) {
            logger.error('Admin analytics error:', error);
            throw new AppError(500, 'Failed to get admin analytics');
        }
    }

    /**
     * Get seller property insights
     */
    async getSellerInsights(sellerId: string) {
        try {
            // Get seller's properties
            const propertiesSnapshot = await this.db
                .collection('properties')
                .where('sellerId', '==', sellerId)
                .get();

            const properties = propertiesSnapshot.docs.map((doc: any) => ({
                id: doc.id,
                ...doc.data(),
            }));

            // Calculate metrics
            const totalProperties = properties.length;
            const activeProperties = properties.filter((p: any) => p.status === 'active').length;
            const soldProperties = properties.filter((p: any) => p.status === 'sold').length;

            const totalViews = properties.reduce((sum: number, p: any) => sum + (p.views || 0), 0);
            const totalInquiries = properties.reduce((sum: number, p: any) => sum + (p.inquiries || 0), 0);
            const totalFavorites = properties.reduce((sum: number, p: any) => sum + (p.favorites || 0), 0);

            // Get bids
            const bidsSnapshot = await this.db
                .collection('bids')
                .where('sellerId', '==', sellerId)
                .get();

            const totalBids = bidsSnapshot.size;
            const acceptedBids = bidsSnapshot.docs.filter((doc: any) => doc.data().status === 'accepted').length;

            // Top performing properties
            const topProperties = properties
                .sort((a: any, b: any) => (b.views || 0) - (a.views || 0))
                .slice(0, 5)
                .map((p: any) => ({
                    id: p.id,
                    title: p.title,
                    views: p.views || 0,
                    inquiries: p.inquiries || 0,
                    favorites: p.favorites || 0,
                }));

            return {
                success: true,
                insights: {
                    overview: {
                        totalProperties,
                        activeProperties,
                        soldProperties,
                        totalViews,
                        totalInquiries,
                        totalFavorites,
                        totalBids,
                        acceptedBids,
                    },
                    topProperties,
                    averageViews: totalProperties > 0 ? Math.round(totalViews / totalProperties) : 0,
                    inquiryRate: totalViews > 0 ? ((totalInquiries / totalViews) * 100).toFixed(2) : 0,
                },
            };
        } catch (error) {
            logger.error('Seller insights error:', error);
            throw new AppError(500, 'Failed to get seller insights');
        }
    }

    /**
     * Get search suggestions based on popular searches
     */
    async getSearchSuggestions(query: string, limit: number = 10) {
        try {
            const lowerQuery = query.toLowerCase();

            // Get all properties
            const snapshot = await this.db
                .collection('properties')
                .where('status', '==', 'active')
                .limit(100)
                .get();

            const suggestions = new Set<string>();

            // Extract cities and property types
            snapshot.docs.forEach((doc: any) => {
                const data = doc.data();

                if (data.city?.toLowerCase().includes(lowerQuery)) {
                    suggestions.add(data.city);
                }

                if (data.title?.toLowerCase().includes(lowerQuery)) {
                    suggestions.add(data.title);
                }
            });

            return {
                success: true,
                suggestions: Array.from(suggestions).slice(0, limit),
            };
        } catch (error) {
            logger.error('Search suggestions error:', error);
            throw new AppError(500, 'Failed to get search suggestions');
        }
    }

    /**
     * Track search query
     */
    async trackSearch(query: string, userId?: string) {
        try {
            await this.db.collection('searchLogs').add({
                query,
                userId: userId || 'anonymous',
                timestamp: new Date().toISOString(),
            });

            return { success: true };
        } catch (error) {
            logger.error('Track search error:', error);
            return { success: false };
        }
    }

    /**
     * Get popular searches
     */
    async getPopularSearches(limit: number = 10) {
        try {
            const snapshot = await this.db
                .collection('searchLogs')
                .orderBy('timestamp', 'desc')
                .limit(1000)
                .get();

            // Count query frequency
            const queryCount: { [key: string]: number } = {};

            snapshot.docs.forEach((doc: any) => {
                const query = doc.data().query;
                queryCount[query] = (queryCount[query] || 0) + 1;
            });

            // Sort by frequency
            const popular = Object.entries(queryCount)
                .sort(([, a], [, b]) => b - a)
                .slice(0, limit)
                .map(([query, count]) => ({ query, count }));

            return {
                success: true,
                searches: popular,
            };
        } catch (error) {
            logger.error('Popular searches error:', error);
            throw new AppError(500, 'Failed to get popular searches');
        }
    }

    /**
     * Get property performance metrics
     */
    async getPropertyPerformance(propertyId: string) {
        try {
            const propertyDoc = await this.db.collection('properties').doc(propertyId).get();

            if (!propertyDoc.exists) {
                throw new AppError(404, 'Property not found');
            }

            const property = propertyDoc.data();

            // Get view history (last 30 days)
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const viewsSnapshot = await this.db
                .collection('propertyViews')
                .where('propertyId', '==', propertyId)
                .where('viewedAt', '>=', thirtyDaysAgo.toISOString())
                .get();

            // Group views by date
            const viewsByDate: { [key: string]: number } = {};

            viewsSnapshot.docs.forEach((doc: any) => {
                const date = new Date(doc.data().viewedAt).toISOString().split('T')[0];
                viewsByDate[date] = (viewsByDate[date] || 0) + 1;
            });

            return {
                success: true,
                performance: {
                    totalViews: property?.views || 0,
                    recentViews: viewsSnapshot.size,
                    inquiries: property?.inquiries || 0,
                    favorites: property?.favorites || 0,
                    viewsByDate,
                },
            };
        } catch (error) {
            logger.error('Property performance error:', error);
            throw error;
        }
    }

    /**
     * Get citywise analytics
     */
    async getCitywiseAnalytics() {
        try {
            const snapshot = await this.db
                .collection('properties')
                .where('status', '==', 'active')
                .get();

            const cityStats: { [key: string]: number } = {};

            snapshot.docs.forEach((doc: any) => {
                const city = doc.data().city;
                if (city) {
                    cityStats[city] = (cityStats[city] || 0) + 1;
                }
            });

            const cities = Object.entries(cityStats)
                .sort(([, a], [, b]) => b - a)
                .map(([city, count]) => ({ city, propertyCount: count }));

            return {
                success: true,
                cities,
            };
        } catch (error) {
            logger.error('Citywise analytics error:', error);
            throw new AppError(500, 'Failed to get citywise analytics');
        }
    }
}

export const analyticsService = new AnalyticsService();
