import { Router } from 'express';
import { uploadController } from '../controllers/upload.controller';
import { authenticate } from '../middleware/auth';
import { uploadSingleImage, uploadMultipleImages, uploadAvatar, uploadDocument, handleMulterError } from '../middleware/upload';

const router = Router();

/**
 * @route   POST /api/v1/upload/image
 * @desc    Upload single image
 * @access  Private
 */
router.post(
    '/image',
    authenticate,
    uploadSingleImage,
    handleMulterError,
    uploadController.uploadImage
);

/**
 * @route   POST /api/v1/upload/property-images
 * @desc    Upload multiple property images
 * @access  Private (Seller/Admin)
 */
router.post(
    '/property-images',
    authenticate,
    uploadMultipleImages,
    handleMulterError,
    uploadController.uploadPropertyImages
);

/**
 * @route   POST /api/v1/upload/avatar
 * @desc    Upload user avatar
 * @access  Private
 */
router.post(
    '/avatar',
    authenticate,
    uploadAvatar,
    handleMulterError,
    uploadController.uploadAvatar
);

/**
 * @route   POST /api/v1/upload/document
 * @desc    Upload document (PDF, Word)
 * @access  Private
 */
router.post(
    '/document',
    authenticate,
    uploadDocument,
    handleMulterError,
    uploadController.uploadDocument
);

/**
 * @route   DELETE /api/v1/upload/file
 * @desc    Delete file from storage
 * @access  Private
 */
router.delete(
    '/file',
    authenticate,
    uploadController.deleteFile
);

export default router;
