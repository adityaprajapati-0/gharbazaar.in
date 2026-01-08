import { Request, Response, NextFunction } from 'express';
import { uploadService } from '../services/upload.service';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

export class UploadController {
    /**
     * Upload single image
     */
    async uploadImage(req: Request, res: Response, next: NextFunction) {
        try {
            if (!req.file) {
                throw new AppError(400, 'No file uploaded');
            }

            const result = await uploadService.uploadImage(req.file);

            res.json({
                success: true,
                url: result,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Upload multiple property images
     */
    async uploadPropertyImages(req: Request, res: Response, next: NextFunction) {
        try {
            if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
                throw new AppError(400, 'No files uploaded');
            }

            const result = await uploadService.uploadPropertyImages(req.files);

            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Upload user avatar
     */
    async uploadAvatar(req: Request, res: Response, next: NextFunction) {
        try {
            if (!req.file) {
                throw new AppError(400, 'No file uploaded');
            }

            const userId = req.user?.uid;
            if (!userId) {
                throw new AppError(401, 'Unauthorized');
            }

            const result = await uploadService.uploadAvatar(req.file, userId);

            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Upload document
     */
    async uploadDocument(req: Request, res: Response, next: NextFunction) {
        try {
            if (!req.file) {
                throw new AppError(400, 'No file uploaded');
            }

            const result = await uploadService.uploadDocument(req.file);

            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Delete file
     */
    async deleteFile(req: Request, res: Response, next: NextFunction) {
        try {
            const { url } = req.body;

            if (!url) {
                throw new AppError(400, 'File URL is required');
            }

            const result = await uploadService.deleteFile(url);

            res.json(result);
        } catch (error) {
            next(error);
        }
    }
}

export const uploadController = new UploadController();
