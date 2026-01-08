import { Request, Response, NextFunction } from 'express';
import { getFirestore } from '../config/firebase';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { PropertyStatus } from '../types';
import { notificationService } from '../services/notification.service';
import { leadService } from '../services/lead.service';
import { propertyService } from '../services/property.service';

export class PropertyController {
    async searchProperties(req: Request, res: Response, next: NextFunction) {
        try {
            const {
                city,
                propertyType,
                minPrice,
                maxPrice,
                bedrooms,
                page = '1',
                limit = '20'
            } = req.query;

            const db = getFirestore();
            let query = db.collection('properties').where('status', '==', PropertyStatus.ACTIVE);

            if (city) {
                query = query.where('city', '==', city as string);
            }

            if (propertyType) {
                query = query.where('propertyType', '==', propertyType as string);
            }

            const snapshot = await query.orderBy('createdAt', 'desc').get();

            let properties = snapshot.docs.map((doc: any) => ({
                id: doc.id,
                ...doc.data()
            }));

            // Client-side filtering for price and bedrooms
            if (minPrice) {
                properties = properties.filter((p: any) => p.price >= parseInt(minPrice as string));
            }
            if (maxPrice) {
                properties = properties.filter((p: any) => p.price <= parseInt(maxPrice as string));
            }
            if (bedrooms) {
                properties = properties.filter((p: any) => p.bedrooms === parseInt(bedrooms as string));
            }

            const pageNum = parseInt(page as string);
            const limitNum = parseInt(limit as string);
            const startIndex = (pageNum - 1) * limitNum;
            const paginatedProperties = properties.slice(startIndex, startIndex + limitNum);

            res.json({
                success: true,
                data: {
                    properties: paginatedProperties,
                    pagination: {
                        page: pageNum,
                        limit: limitNum,
                        total: properties.length,
                        pages: Math.ceil(properties.length / limitNum)
                    }
                }
            });
        } catch (error) {
            next(new AppError(500, 'Failed to search properties'));
        }
    }

    async getPropertyById(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const db = getFirestore();

            const doc = await db.collection('properties').doc(id).get();

            if (!doc.exists) {
                throw new AppError(404, 'Property not found');
            }

            // Increment view count
            await db.collection('properties').doc(id).update({
                views: (doc.data()?.views || 0) + 1
            });

            res.json({
                success: true,
                data: {
                    id: doc.id,
                    ...doc.data()
                }
            });
        } catch (error) {
            next(error instanceof AppError ? error : new AppError(500, 'Failed to fetch property'));
        }
    }

    async createProperty(req: Request, res: Response, next: NextFunction) {
        try {
            const user = (req as AuthRequest).user;
            const db = getFirestore();

            const propertyData = {
                ...req.body,
                sellerId: user!.uid,
                sellerEmail: user!.email,
                status: PropertyStatus.PENDING,
                views: 0,
                favorites: 0,
                inquiries: 0,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };

            const docRef = await db.collection('properties').add(propertyData);

            // **INTEGRATION:** Notify admin for approval
            const admins = await db.collection('users').where('role', '==', 'admin').get();
            await notificationService.sendMultiple(
                admins.docs.map((admin: any) => ({
                    userId: admin.id,
                    type: 'property_pending',
                    title: 'New Property Pending Approval',
                    message: `${user!.email} created: ${propertyData.title}`,
                    link: `/admin/properties/${docRef.id}`,
                }))
            );

            logger.info(`Property created: ${docRef.id} by user ${user!.uid}`);

            res.status(201).json({
                success: true,
                message: 'Property created successfully. Pending admin approval.',
                data: { id: docRef.id, ...propertyData }
            });
        } catch (error) {
            next(new AppError(500, 'Failed to create property'));
        }
    }

    async createInquiry(req: Request, res: Response, next: NextFunction) {
        try {
            const { id: propertyId } = req.params;
            const user = (req as AuthRequest).user;
            const { message } = req.body;

            const db = getFirestore();

            // Get property details
            const propertyDoc = await db.collection('properties').doc(propertyId).get();
            if (!propertyDoc.exists) {
                throw new AppError(404, 'Property not found');
            }

            const property = propertyDoc.data();

            // Create inquiry
            const inquiryData = {
                propertyId,
                userId: user!.uid,
                sellerId: property!.sellerId,
                name: user!.email?.split('@')[0] || 'User',
                email: user!.email || '',
                phone: '', // Get from user profile if available
                message,
                createdAt: new Date().toISOString(),
            };

            const inquiryRef = await db.collection('inquiries').add(inquiryData);

            // **INTEGRATION:** Create lead and notify all parties
            await leadService.createFromInquiry(inquiryData);

            // Update property inquiry count
            await db.collection('properties').doc(propertyId).update({
                inquiries: (property!.inquiries || 0) + 1
            });

            res.status(201).json({
                success: true,
                message: 'Inquiry sent successfully',
                data: { id: inquiryRef.id }
            });
        } catch (error) {
            next(error instanceof AppError ? error : new AppError(500, 'Failed to create inquiry'));
        }
    }

    async updateProperty(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const user = (req as AuthRequest).user;
            const db = getFirestore();

            const doc = await db.collection('properties').doc(id).get();

            if (!doc.exists) {
                throw new AppError(404, 'Property not found');
            }

            const property = doc.data();
            if (property?.sellerId !== user!.uid && user!.role !== 'admin') {
                throw new AppError(403, 'Not authorized to update this property');
            }

            const updateData = {
                ...req.body,
                updatedAt: new Date().toISOString()
            };

            await db.collection('properties').doc(id).update(updateData);

            res.json({
                success: true,
                message: 'Property updated successfully',
                data: { id, ...updateData }
            });
        } catch (error) {
            next(error instanceof AppError ? error : new AppError(500, 'Failed to update property'));
        }
    }

    async deleteProperty(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const user = (req as AuthRequest).user;
            const db = getFirestore();

            const doc = await db.collection('properties').doc(id).get();

            if (!doc.exists) {
                throw new AppError(404, 'Property not found');
            }

            const property = doc.data();
            if (property?.sellerId !== user!.uid && user!.role !== 'admin') {
                throw new AppError(403, 'Not authorized to delete this property');
            }

            await db.collection('properties').doc(id).update({
                status: PropertyStatus.INACTIVE,
                updatedAt: new Date().toISOString()
            });

            res.json({
                success: true,
                message: 'Property deleted successfully'
            });
        } catch (error) {
            next(error instanceof AppError ? error : new AppError(500, 'Failed to delete property'));
        }
    }

    async getPropertiesByUser(req: Request, res: Response, next: NextFunction) {
        try {
            const { userId } = req.params;
            const db = getFirestore();

            const snapshot = await db.collection('properties')
                .where('sellerId', '==', userId)
                .orderBy('createdAt', 'desc')
                .get();

            const properties = snapshot.docs.map((doc: any) => ({
                id: doc.id,
                ...doc.data()
            }));

            res.json({
                success: true,
                data: { properties }
            });
        } catch (error) {
            next(new AppError(500, 'Failed to fetch user properties'));
        }
    }

    async getPropertyAnalytics(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const result = await propertyService.getPropertyAnalytics(id);
            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    async getSimilarProperties(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const { limit = '5' } = req.query;
            const result = await propertyService.getSimilarProperties(id, parseInt(limit as string));
            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    async getTrendingProperties(req: Request, res: Response, next: NextFunction) {
        try {
            const { limit = '10' } = req.query;
            const result = await propertyService.getTrendingProperties(parseInt(limit as string));
            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    async trackPropertyView(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const user = (req as AuthRequest).user;
            const result = await propertyService.trackPropertyView(id, user?.uid);
            res.json(result);
        } catch (error) {
            next(error);
        }
    }
}
