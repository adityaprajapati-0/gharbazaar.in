import { getStorage as getFirebaseStorage } from '../config/firebase';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import {
    optimizeImage,
    generateImageSizes,
    validateImage,
    createPlaceholder,
    getOptimalFormat,
    PROPERTY_IMAGE_SIZES,
    PROFILE_IMAGE_SIZES,
} from '../utils/imageOptimizer';

export class UploadService {
    private bucketName: string;

    constructor() {
        this.bucketName = process.env.FIREBASE_STORAGE_BUCKET || 'gharbazaar-bucket';
    }

    /**
     * Upload file to Firebase Storage
     */
    async uploadFile(file: Express.Multer.File, folder: string = 'uploads') {
        try {
            const storage = getFirebaseStorage();
            const bucket = storage.bucket();

            const fileName = `${folder}/${uuidv4()}-${file.originalname}`;
            const fileUpload = bucket.file(fileName);

            const blobStream = fileUpload.createWriteStream({
                metadata: {
                    contentType: file.mimetype,
                    cacheControl: 'public, max-age=31536000', // 1 year cache
                    metadata: {
                        firebaseStorageDownloadTokens: uuidv4(),
                    },
                },
            });

            return new Promise<string>((resolve, reject) => {
                blobStream.on('error', (error) => {
                    logger.error('Upload error:', error);
                    reject(new AppError(500, 'Failed to upload file'));
                });

                blobStream.on('finish', async () => {
                    await fileUpload.makePublic();
                    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
                    resolve(publicUrl);
                });

                blobStream.end(file.buffer);
            });
        } catch (error) {
            logger.error('Upload service error:', error);
            throw new AppError(500, 'File upload failed');
        }
    }

    /**
     * Upload buffer directly to Firebase Storage
     */
    private async uploadBuffer(
        buffer: Buffer,
        fileName: string,
        contentType: string,
        folder: string
    ): Promise<string> {
        const storage = getFirebaseStorage();
        const bucket = storage.bucket();

        const fullPath = `${folder}/${fileName}`;
        const fileUpload = bucket.file(fullPath);

        return new Promise<string>((resolve, reject) => {
            const blobStream = fileUpload.createWriteStream({
                metadata: {
                    contentType,
                    cacheControl: 'public, max-age=31536000',
                    metadata: {
                        firebaseStorageDownloadTokens: uuidv4(),
                    },
                },
            });

            blobStream.on('error', (error) => {
                logger.error('Buffer upload error:', error);
                reject(new AppError(500, 'Failed to upload buffer'));
            });

            blobStream.on('finish', async () => {
                await fileUpload.makePublic();
                const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fullPath}`;
                resolve(publicUrl);
            });

            blobStream.end(buffer);
        });
    }

    /**
     * Upload and optimize image with multiple sizes
     */
    async uploadImage(file: Express.Multer.File, folder: string = 'images', options?: {
        width?: number;
        height?: number;
        quality?: number;
        format?: 'jpeg' | 'png' | 'webp';
        generateSizes?: boolean;
    }) {
        try {
            // Validate image
            const validation = await validateImage(file.buffer);
            if (!validation.valid) {
                throw new AppError(400, validation.error || 'Invalid image');
            }

            const {
                width = 1200,
                height,
                quality = 80,
                format = 'webp',
                generateSizes = false,
            } = options || {};

            // Optimize main image
            const optimizedBuffer = await optimizeImage(file.buffer, {
                width,
                height,
                quality,
                format,
            });

            const fileId = uuidv4();
            const fileName = `${fileId}.${format}`;
            const mainUrl = await this.uploadBuffer(optimizedBuffer, fileName, `image/${format}`, folder);

            const result: any = {
                success: true,
                url: mainUrl,
            };

            // Generate multiple sizes if requested
            if (generateSizes) {
                const sizes = await generateImageSizes(file.buffer, PROPERTY_IMAGE_SIZES, format);
                const sizeUrls: Record<string, string> = {};

                // Upload all sizes in parallel
                const uploadPromises = Array.from(sizes.entries()).map(async ([sizeName, buffer]) => {
                    const sizeFileName = `${fileId}_${sizeName}.${format}`;
                    const url = await this.uploadBuffer(buffer, sizeFileName, `image/${format}`, folder);
                    return { sizeName, url };
                });

                const uploadedSizes = await Promise.all(uploadPromises);
                for (const { sizeName, url } of uploadedSizes) {
                    sizeUrls[sizeName] = url;
                }

                result.sizes = sizeUrls;
            }

            // Generate placeholder
            result.placeholder = await createPlaceholder(file.buffer);

            return result;
        } catch (error) {
            logger.error('Image optimization error:', error);
            throw error instanceof AppError ? error : new AppError(500, 'Image optimization failed');
        }
    }

    /**
     * Upload property images with all sizes and placeholders
     */
    async uploadPropertyImages(files: Express.Multer.File[]) {
        try {
            // Process all images in parallel for speed
            const uploadPromises = files.map(async (file, index) => {
                const result = await this.uploadImage(file, 'properties', {
                    width: 1280,
                    quality: 85,
                    format: 'webp',
                    generateSizes: true,
                });

                return {
                    index,
                    ...result,
                };
            });

            const results = await Promise.all(uploadPromises);

            // Sort by original index
            results.sort((a, b) => a.index - b.index);

            return {
                success: true,
                count: results.length,
                images: results.map(r => ({
                    url: r.url,
                    sizes: r.sizes,
                    placeholder: r.placeholder,
                })),
            };
        } catch (error) {
            logger.error('Property images upload error:', error);
            throw error;
        }
    }

    /**
     * Upload user avatar with sizes
     */
    async uploadAvatar(file: Express.Multer.File, userId: string) {
        try {
            const fileId = uuidv4();
            const format = 'webp';

            // Generate all avatar sizes in parallel
            const sizes = await generateImageSizes(file.buffer, PROFILE_IMAGE_SIZES, format);
            const sizeUrls: Record<string, string> = {};

            const uploadPromises = Array.from(sizes.entries()).map(async ([sizeName, buffer]) => {
                const fileName = `${userId}_${fileId}_${sizeName}.${format}`;
                const url = await this.uploadBuffer(buffer, fileName, `image/${format}`, 'avatars');
                return { sizeName, url };
            });

            const uploadedSizes = await Promise.all(uploadPromises);
            for (const { sizeName, url } of uploadedSizes) {
                sizeUrls[sizeName] = url;
            }

            logger.info(`Avatar uploaded for user: ${userId}`);

            return {
                success: true,
                url: sizeUrls.medium || sizeUrls.large,
                sizes: sizeUrls,
            };
        } catch (error) {
            logger.error('Avatar upload error:', error);
            throw error;
        }
    }

    /**
     * Upload document (PDF, etc.)
     */
    async uploadDocument(file: Express.Multer.File, folder: string = 'documents') {
        try {
            const allowedTypes = [
                'application/pdf',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            ];

            if (!allowedTypes.includes(file.mimetype)) {
                throw new AppError(400, 'Invalid document type. Only PDF and Word documents are allowed.');
            }

            if (file.size > 10 * 1024 * 1024) {
                throw new AppError(400, 'File size exceeds 10MB limit');
            }

            const url = await this.uploadFile(file, folder);

            return {
                success: true,
                url,
            };
        } catch (error) {
            logger.error('Document upload error:', error);
            throw error;
        }
    }

    /**
     * Delete file from storage
     */
    async deleteFile(fileUrl: string) {
        try {
            const storage = getFirebaseStorage();
            const bucket = storage.bucket();

            const baseUrl = `https://storage.googleapis.com/${bucket.name}/`;
            const filePath = fileUrl.replace(baseUrl, '');

            await bucket.file(filePath).delete();

            logger.info(`File deleted: ${filePath}`);

            return { success: true };
        } catch (error) {
            logger.error('Delete file error:', error);
            throw new AppError(500, 'Failed to delete file');
        }
    }

    /**
     * Delete multiple files (for cleanup)
     */
    async deleteFiles(fileUrls: string[]) {
        try {
            const deletePromises = fileUrls.map(url => this.deleteFile(url).catch(() => null));
            await Promise.all(deletePromises);

            logger.info(`Deleted ${fileUrls.length} files`);

            return { success: true, deleted: fileUrls.length };
        } catch (error) {
            logger.error('Batch delete error:', error);
            throw new AppError(500, 'Failed to delete files');
        }
    }

    /**
     * Validate image file
     */
    validateImageFile(file: Express.Multer.File): boolean {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        const maxSize = 10 * 1024 * 1024; // 10MB

        if (!allowedTypes.includes(file.mimetype)) {
            throw new AppError(400, 'Invalid image type. Only JPEG, PNG, and WebP are allowed.');
        }

        if (file.size > maxSize) {
            throw new AppError(400, 'Image size exceeds 10MB limit');
        }

        return true;
    }
}

export const uploadService = new UploadService();

