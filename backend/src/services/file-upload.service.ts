import { Storage } from '@google-cloud/storage';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/errorHandler';

export class FileUploadService {
    private storage: Storage;
    private bucketName: string;

    constructor() {
        this.storage = new Storage();
        this.bucketName = process.env.FIREBASE_STORAGE_BUCKET || 'gharbazaar.appspot.com';
    }

    /**
     * Upload file to Firebase Storage
     */
    async uploadFile(
        file: Express.Multer.File,
        userId: string,
        conversationId: string
    ): Promise<{ url: string; thumbnailUrl?: string; metadata: any }> {
        try {
            const bucket = this.storage.bucket(this.bucketName);
            const fileExtension = file.originalname.split('.').pop()?.toLowerCase();
            const fileName = `chat/${conversationId}/${uuidv4()}.${fileExtension}`;

            const fileUpload = bucket.file(fileName);

            // Upload original file
            await fileUpload.save(file.buffer, {
                metadata: {
                    contentType: file.mimetype,
                    metadata: {
                        uploadedBy: userId,
                        conversationId: conversationId,
                        originalName: file.originalname,
                        uploadedAt: new Date().toISOString(),
                    },
                },
                public: false,
            });

            // Generate signed URL (valid for 7 days)
            const [url] = await fileUpload.getSignedUrl({
                action: 'read',
                expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
            });

            let thumbnailUrl: string | undefined;

            // Generate thumbnail for images
            if (this.isImage(file.mimetype)) {
                thumbnailUrl = await this.generateThumbnail(file, conversationId);
            }

            const metadata = {
                fileName: file.originalname,
                fileSize: file.size,
                mimeType: file.mimetype,
                fileType: this.getFileType(file.mimetype),
            };

            logger.info(`File uploaded: ${fileName} by user ${userId}`);

            return { url, thumbnailUrl, metadata };
        } catch (error) {
            logger.error('File upload failed:', error);
            throw new AppError(500, 'File upload failed');
        }
    }

    /**
     * Generate thumbnail for images
     */
    private async generateThumbnail(
        file: Express.Multer.File,
        conversationId: string
    ): Promise<string> {
        try {
            const bucket = this.storage.bucket(this.bucketName);
            const thumbnailName = `chat/${conversationId}/thumbnails/${uuidv4()}.webp`;

            // Resize and optimize image
            const thumbnailBuffer = await sharp(file.buffer)
                .resize(300, 300, { fit: 'inside', withoutEnlargement: true })
                .webp({ quality: 80 })
                .toBuffer();

            const thumbnailFile = bucket.file(thumbnailName);
            await thumbnailFile.save(thumbnailBuffer, {
                metadata: {
                    contentType: 'image/webp',
                },
                public: false,
            });

            const [thumbnailUrl] = await thumbnailFile.getSignedUrl({
                action: 'read',
                expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
            });

            return thumbnailUrl;
        } catch (error) {
            logger.error('Thumbnail generation failed:', error);
            throw error;
        }
    }

    /**
     * Validate file upload
     */
    validateFile(file: Express.Multer.File): void {
        const MAX_FILE_SIZE = {
            image: 10 * 1024 * 1024, // 10MB
            document: 25 * 1024 * 1024, // 25MB
            other: 10 * 1024 * 1024, // 10MB
        };

        const ALLOWED_TYPES = {
            image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
            document: [
                'application/pdf',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/vnd.ms-excel',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            ],
            archive: ['application/zip', 'application/x-rar-compressed'],
        };

        const fileType = this.getFileType(file.mimetype);

        // Check file type
        const allAllowedTypes = [
            ...ALLOWED_TYPES.image,
            ...ALLOWED_TYPES.document,
            ...ALLOWED_TYPES.archive,
        ];

        if (!allAllowedTypes.includes(file.mimetype)) {
            throw new AppError(400, 'File type not allowed');
        }

        // Check file size
        let maxSize = MAX_FILE_SIZE.other;
        if (fileType === 'image') maxSize = MAX_FILE_SIZE.image;
        if (fileType === 'document') maxSize = MAX_FILE_SIZE.document;

        if (file.size > maxSize) {
            throw new AppError(400, `File size exceeds limit of ${maxSize / 1024 / 1024}MB`);
        }
    }

    /**
     * Get file type from MIME type
     */
    private getFileType(mimeType: string): 'image' | 'document' | 'archive' | 'other' {
        if (mimeType.startsWith('image/')) return 'image';
        if (mimeType.includes('pdf') || mimeType.includes('word') || mimeType.includes('document')) {
            return 'document';
        }
        if (mimeType.includes('zip') || mimeType.includes('rar')) return 'archive';
        return 'other';
    }

    /**
     * Check if file is an image
     */
    private isImage(mimeType: string): boolean {
        return mimeType.startsWith('image/');
    }

    /**
     * Delete file from storage
     */
    async deleteFile(filePath: string): Promise<void> {
        try {
            const bucket = this.storage.bucket(this.bucketName);
            await bucket.file(filePath).delete();
            logger.info(`File deleted: ${filePath}`);
        } catch (error) {
            logger.error('File deletion failed:', error);
            throw new AppError(500, 'File deletion failed');
        }
    }
}

export const fileUploadService = new FileUploadService();
