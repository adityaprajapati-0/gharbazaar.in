import Joi from 'joi';

/**
 * Input Validation Schemas
 * Business-ready validation for all API endpoints
 */

// Common validators
const objectId = Joi.string().min(1).max(100);
const email = Joi.string().email().lowercase().trim();
const phone = Joi.string().pattern(/^[+]?[0-9]{10,15}$/);
const password = Joi.string().min(8).max(100).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/);
const url = Joi.string().uri();
const currency = Joi.number().positive().precision(2);

// ============================================
// AUTH SCHEMAS
// ============================================

export const authSchemas = {
    register: Joi.object({
        email: email.required(),
        password: password.required().messages({
            'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
        }),
        displayName: Joi.string().min(2).max(100).required(),
        phoneNumber: phone.optional(),
        role: Joi.string().valid('buyer', 'seller', 'agent').default('buyer'),
    }),

    login: Joi.object({
        email: email.required(),
        password: Joi.string().required(),
    }),

    resetPassword: Joi.object({
        email: email.required(),
    }),

    changePassword: Joi.object({
        currentPassword: Joi.string().required(),
        newPassword: password.required(),
    }),

    updateProfile: Joi.object({
        displayName: Joi.string().min(2).max(100),
        phoneNumber: phone,
        address: Joi.string().max(500),
        city: Joi.string().max(100),
        state: Joi.string().max(100),
        pincode: Joi.string().pattern(/^[0-9]{6}$/),
    }),
};

// ============================================
// PROPERTY SCHEMAS
// ============================================

export const propertySchemas = {
    create: Joi.object({
        title: Joi.string().min(10).max(200).required(),
        description: Joi.string().min(50).max(5000).required(),
        propertyType: Joi.string().valid('apartment', 'house', 'villa', 'plot', 'commercial', 'pg', 'office').required(),
        transactionType: Joi.string().valid('sale', 'rent').required(),
        price: currency.min(1000).required(),
        area: Joi.number().positive().required(),
        areaUnit: Joi.string().valid('sqft', 'sqm', 'sqyd', 'acre').default('sqft'),
        bedrooms: Joi.number().integer().min(0).max(20),
        bathrooms: Joi.number().integer().min(0).max(20),
        furnishing: Joi.string().valid('unfurnished', 'semi-furnished', 'furnished'),
        parking: Joi.number().integer().min(0).max(10),
        floor: Joi.number().integer().min(-5).max(200),
        totalFloors: Joi.number().integer().min(1).max(200),
        facing: Joi.string().valid('north', 'south', 'east', 'west', 'north-east', 'north-west', 'south-east', 'south-west'),
        age: Joi.string().valid('under-construction', '0-1', '1-5', '5-10', '10+'),
        address: Joi.object({
            street: Joi.string().max(200),
            locality: Joi.string().max(100).required(),
            city: Joi.string().max(100).required(),
            state: Joi.string().max(100).required(),
            pincode: Joi.string().pattern(/^[0-9]{6}$/).required(),
            landmark: Joi.string().max(200),
        }).required(),
        location: Joi.object({
            lat: Joi.number().min(-90).max(90),
            lng: Joi.number().min(-180).max(180),
        }),
        amenities: Joi.array().items(Joi.string().max(50)).max(50),
        images: Joi.array().items(url).max(20),
        videos: Joi.array().items(url).max(5),
        documents: Joi.array().items(Joi.object({
            type: Joi.string().required(),
            url: url.required(),
            name: Joi.string(),
        })).max(20),
        features: Joi.object().pattern(Joi.string(), Joi.any()),
        availability: Joi.string().valid('immediate', '15-days', '1-month', '3-months', 'negotiable'),
        negotiable: Joi.boolean().default(false),
    }),

    update: Joi.object({
        title: Joi.string().min(10).max(200),
        description: Joi.string().min(50).max(5000),
        price: currency.min(1000),
        status: Joi.string().valid('active', 'pending', 'sold', 'rented', 'inactive'),
        // All other fields from create are optional
    }).unknown(true),

    search: Joi.object({
        city: Joi.string().max(100),
        locality: Joi.string().max(100),
        propertyType: Joi.alternatives().try(
            Joi.string(),
            Joi.array().items(Joi.string())
        ),
        transactionType: Joi.string().valid('sale', 'rent'),
        minPrice: currency,
        maxPrice: currency,
        minArea: Joi.number().positive(),
        maxArea: Joi.number().positive(),
        bedrooms: Joi.alternatives().try(
            Joi.number().integer(),
            Joi.array().items(Joi.number().integer())
        ),
        bathrooms: Joi.number().integer(),
        furnishing: Joi.string(),
        amenities: Joi.array().items(Joi.string()),
        sortBy: Joi.string().valid('price', 'area', 'createdAt', 'views'),
        sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(100).default(20),
    }),
};

// ============================================
// BID SCHEMAS
// ============================================

export const bidSchemas = {
    create: Joi.object({
        propertyId: objectId.required(),
        amount: currency.required(),
        message: Joi.string().max(1000),
        validUntil: Joi.date().greater('now'),
        financing: Joi.string().valid('cash', 'loan', 'mixed'),
    }),

    update: Joi.object({
        status: Joi.string().valid('pending', 'accepted', 'rejected', 'negotiating', 'withdrawn'),
        counterAmount: currency,
        message: Joi.string().max(1000),
    }),

    negotiate: Joi.object({
        counterAmount: currency.required(),
        message: Joi.string().max(1000),
    }),
};

// ============================================
// PAYMENT SCHEMAS
// ============================================

export const paymentSchemas = {
    createOrder: Joi.object({
        amount: currency.required(),
        purpose: Joi.string().valid('listing', 'subscription', 'premium', 'visit_booking', 'partner_fee').required(),
        metadata: Joi.object({
            propertyId: objectId,
            planId: Joi.string(),
            duration: Joi.number().integer(),
        }),
    }),

    verifyPayment: Joi.object({
        razorpay_order_id: Joi.string().required(),
        razorpay_payment_id: Joi.string().required(),
        razorpay_signature: Joi.string().required(),
    }),

    refund: Joi.object({
        paymentId: objectId.required(),
        amount: currency,
        reason: Joi.string().max(500).required(),
    }),
};

// ============================================
// INQUIRY SCHEMAS
// ============================================

export const inquirySchemas = {
    create: Joi.object({
        propertyId: objectId.required(),
        message: Joi.string().min(10).max(1000).required(),
        name: Joi.string().min(2).max(100).required(),
        email: email.required(),
        phone: phone.required(),
        preferredTime: Joi.string().valid('morning', 'afternoon', 'evening', 'anytime'),
        visitDate: Joi.date().greater('now'),
    }),

    respond: Joi.object({
        message: Joi.string().min(1).max(1000).required(),
        status: Joi.string().valid('responded', 'scheduled', 'closed'),
    }),
};

// ============================================
// REVIEW SCHEMAS
// ============================================

export const reviewSchemas = {
    create: Joi.object({
        propertyId: objectId,
        sellerId: objectId,
        rating: Joi.number().min(1).max(5).required(),
        title: Joi.string().min(5).max(100).required(),
        comment: Joi.string().min(20).max(2000).required(),
        aspects: Joi.object({
            location: Joi.number().min(1).max(5),
            valueForMoney: Joi.number().min(1).max(5),
            amenities: Joi.number().min(1).max(5),
            connectivity: Joi.number().min(1).max(5),
            maintenance: Joi.number().min(1).max(5),
        }),
    }).or('propertyId', 'sellerId'),

    respond: Joi.object({
        response: Joi.string().min(10).max(1000).required(),
    }),
};

// ============================================
// MESSAGE SCHEMAS
// ============================================

export const messageSchemas = {
    send: Joi.object({
        conversationId: objectId,
        recipientId: objectId,
        propertyId: objectId,
        content: Joi.string().min(1).max(5000).required(),
        type: Joi.string().valid('text', 'image', 'file', 'property_share').default('text'),
        attachments: Joi.array().items(Joi.object({
            type: Joi.string().required(),
            url: url.required(),
            name: Joi.string(),
        })).max(10),
    }).or('conversationId', 'recipientId'),
};

// ============================================
// PARTNER SCHEMAS
// ============================================

export const partnerSchemas = {
    apply: Joi.object({
        partnerType: Joi.string().valid('ground', 'legal', 'promotion').required(),
        name: Joi.string().min(2).max(100).required(),
        email: email.required(),
        phone: phone.required(),
        city: Joi.string().max(100).required(),
        experience: Joi.number().integer().min(0).max(50),
        qualifications: Joi.array().items(Joi.string()).max(10),
        documents: Joi.array().items(Joi.object({
            type: Joi.string().required(),
            url: url.required(),
        })).max(10),
        referralCode: Joi.string().max(20),
    }),

    updateTask: Joi.object({
        status: Joi.string().valid('pending', 'in_progress', 'completed', 'cancelled').required(),
        notes: Joi.string().max(1000),
        documents: Joi.array().items(url).max(10),
    }),

    submitReport: Joi.object({
        taskId: objectId.required(),
        report: Joi.string().min(50).max(5000).required(),
        findings: Joi.object().required(),
        documents: Joi.array().items(url).max(20),
        recommendation: Joi.string().valid('approved', 'rejected', 'needs_review'),
    }),
};

// ============================================
// NOTIFICATION SCHEMAS
// ============================================

export const notificationSchemas = {
    updatePreferences: Joi.object({
        email: Joi.boolean(),
        sms: Joi.boolean(),
        push: Joi.boolean(),
        types: Joi.object().pattern(
            Joi.string(),
            Joi.array().items(Joi.string().valid('in_app', 'email', 'sms', 'push'))
        ),
    }),
};

// ============================================
// ADMIN SCHEMAS
// ============================================

export const adminSchemas = {
    updateUserStatus: Joi.object({
        isActive: Joi.boolean(),
        role: Joi.string().valid('buyer', 'seller', 'agent', 'partner', 'admin'),
        verified: Joi.boolean(),
        notes: Joi.string().max(500),
    }),

    moderateProperty: Joi.object({
        status: Joi.string().valid('approved', 'rejected', 'suspended').required(),
        reason: Joi.string().max(500),
        notes: Joi.string().max(1000),
    }),

    systemConfig: Joi.object({
        maintenanceMode: Joi.boolean(),
        featuredPropertyLimit: Joi.number().integer().min(1).max(100),
        commissionRate: Joi.number().min(0).max(100),
        minListingPrice: currency,
    }),
};

// ============================================
// VALIDATION MIDDLEWARE HELPER
// ============================================

import { Request, Response, NextFunction } from 'express';

export const validate = (schema: Joi.ObjectSchema, property: 'body' | 'query' | 'params' = 'body') => {
    return (req: Request, res: Response, next: NextFunction): void => {
        const { error, value } = schema.validate(req[property], {
            abortEarly: false,
            stripUnknown: true,
        });

        if (error) {
            const errors = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message,
            }));

            res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: errors,
            });
            return;
        }

        // Replace with validated/sanitized values
        req[property] = value;
        next();
    };
};
