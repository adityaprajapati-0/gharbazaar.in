import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

/**
 * Validation schemas for chat endpoints
 */
const chatSchemas = {
    createConversation: Joi.object({
        otherUserId: Joi.string().required(),
        type: Joi.string().valid('buyer-seller', 'buyer-employee', 'seller-employee').required(),
        propertyId: Joi.string().optional(),
    }),

    sendMessage: Joi.object({
        content: Joi.string().min(1).max(5000).required(),
        type: Joi.string().valid('text', 'image', 'file').optional().default('text'),
    }),

    getMessages: Joi.object({
        limit: Joi.number().min(1).max(100).optional().default(50),
        before: Joi.string().optional(),
    }),
};

/**
 * Validation middleware factory
 */
export function validateRequest(schema: Joi.ObjectSchema, source: 'body' | 'query' | 'params' = 'body') {
    return (req: Request, res: Response, next: NextFunction): void => {
        const { error, value } = schema.validate(req[source], {
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

        // Replace request data with sanitized values
        req[source] = value;
        next();
    };
}

/**
 * Sanitize HTML content to prevent XSS
 */
export function sanitizeContent(content: string): string {
    if (!content) return '';

    // Basic HTML entity encoding
    return content
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
}

export const chatValidation = {
    createConversation: validateRequest(chatSchemas.createConversation),
    sendMessage: validateRequest(chatSchemas.sendMessage),
    getMessages: validateRequest(chatSchemas.getMessages, 'query'),
};
