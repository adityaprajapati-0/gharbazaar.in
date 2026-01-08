import sharp from 'sharp';
import path from 'path';
import { logger } from './logger';

/**
 * Image Optimization Utility
 * Provides image resizing, compression, and format conversion for optimal loading
 */

interface OptimizeOptions {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'jpeg' | 'webp' | 'png' | 'avif';
    fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
}

interface ThumbnailSizes {
    thumbnail: { width: number; height: number };
    small: { width: number; height: number };
    medium: { width: number; height: number };
    large: { width: number; height: number };
}

// Standard sizes for property images
export const PROPERTY_IMAGE_SIZES: ThumbnailSizes = {
    thumbnail: { width: 150, height: 150 },
    small: { width: 320, height: 240 },
    medium: { width: 640, height: 480 },
    large: { width: 1280, height: 960 },
};

// Standard sizes for profile images
export const PROFILE_IMAGE_SIZES: ThumbnailSizes = {
    thumbnail: { width: 50, height: 50 },
    small: { width: 100, height: 100 },
    medium: { width: 200, height: 200 },
    large: { width: 400, height: 400 },
};

/**
 * Optimize a single image
 */
export async function optimizeImage(
    inputBuffer: Buffer,
    options: OptimizeOptions = {}
): Promise<Buffer> {
    const {
        width,
        height,
        quality = 80,
        format = 'webp',
        fit = 'cover',
    } = options;

    try {
        let pipeline = sharp(inputBuffer);

        // Resize if dimensions provided
        if (width || height) {
            pipeline = pipeline.resize(width, height, {
                fit,
                withoutEnlargement: true,
            });
        }

        // Convert to target format with compression
        switch (format) {
            case 'webp':
                pipeline = pipeline.webp({ quality, effort: 4 });
                break;
            case 'jpeg':
                pipeline = pipeline.jpeg({ quality, mozjpeg: true });
                break;
            case 'png':
                pipeline = pipeline.png({ quality, compressionLevel: 9 });
                break;
            case 'avif':
                pipeline = pipeline.avif({ quality, effort: 4 });
                break;
        }

        return await pipeline.toBuffer();
    } catch (error) {
        logger.error('Image optimization error:', error);
        throw error;
    }
}

/**
 * Generate multiple sizes for an image
 */
export async function generateImageSizes(
    inputBuffer: Buffer,
    sizes: ThumbnailSizes = PROPERTY_IMAGE_SIZES,
    format: 'webp' | 'jpeg' | 'png' = 'webp'
): Promise<Map<string, Buffer>> {
    const results = new Map<string, Buffer>();

    const sizeEntries = Object.entries(sizes);

    // Process all sizes in parallel for speed
    const promises = sizeEntries.map(async ([name, dimensions]) => {
        const optimized = await optimizeImage(inputBuffer, {
            width: dimensions.width,
            height: dimensions.height,
            format,
            quality: name === 'thumbnail' ? 70 : 80,
        });
        return { name, buffer: optimized };
    });

    const resolved = await Promise.all(promises);

    for (const { name, buffer } of resolved) {
        results.set(name, buffer);
    }

    return results;
}

/**
 * Get image metadata
 */
export async function getImageMetadata(inputBuffer: Buffer): Promise<{
    width: number;
    height: number;
    format: string;
    size: number;
    hasAlpha: boolean;
}> {
    const metadata = await sharp(inputBuffer).metadata();

    return {
        width: metadata.width || 0,
        height: metadata.height || 0,
        format: metadata.format || 'unknown',
        size: inputBuffer.length,
        hasAlpha: metadata.hasAlpha || false,
    };
}

/**
 * Convert image format (for legacy browser support)
 */
export async function convertImageFormat(
    inputBuffer: Buffer,
    targetFormat: 'jpeg' | 'webp' | 'png' | 'avif',
    quality: number = 80
): Promise<Buffer> {
    return optimizeImage(inputBuffer, { format: targetFormat, quality });
}

/**
 * Create a blurred placeholder (LQIP - Low Quality Image Placeholder)
 */
export async function createPlaceholder(
    inputBuffer: Buffer,
    width: number = 20
): Promise<string> {
    const tiny = await sharp(inputBuffer)
        .resize(width, undefined, { fit: 'inside' })
        .blur(1)
        .webp({ quality: 20 })
        .toBuffer();

    return `data:image/webp;base64,${tiny.toString('base64')}`;
}

/**
 * Validate image file
 */
export async function validateImage(inputBuffer: Buffer): Promise<{
    valid: boolean;
    error?: string;
    metadata?: {
        width: number;
        height: number;
        format: string;
    };
}> {
    try {
        const metadata = await sharp(inputBuffer).metadata();

        // Check format
        const allowedFormats = ['jpeg', 'png', 'webp', 'gif', 'avif'];
        if (!metadata.format || !allowedFormats.includes(metadata.format)) {
            return {
                valid: false,
                error: `Unsupported format: ${metadata.format}. Allowed: ${allowedFormats.join(', ')}`,
            };
        }

        // Check dimensions
        const maxDimension = 8000;
        if ((metadata.width || 0) > maxDimension || (metadata.height || 0) > maxDimension) {
            return {
                valid: false,
                error: `Image too large. Maximum dimension: ${maxDimension}px`,
            };
        }

        // Check minimum dimensions
        const minDimension = 100;
        if ((metadata.width || 0) < minDimension || (metadata.height || 0) < minDimension) {
            return {
                valid: false,
                error: `Image too small. Minimum dimension: ${minDimension}px`,
            };
        }

        return {
            valid: true,
            metadata: {
                width: metadata.width || 0,
                height: metadata.height || 0,
                format: metadata.format,
            },
        };
    } catch (error) {
        return {
            valid: false,
            error: 'Invalid or corrupted image file',
        };
    }
}

/**
 * Get optimal image format based on browser support
 */
export function getOptimalFormat(acceptHeader: string | undefined): 'avif' | 'webp' | 'jpeg' {
    if (!acceptHeader) return 'jpeg';

    if (acceptHeader.includes('image/avif')) {
        return 'avif';
    }

    if (acceptHeader.includes('image/webp')) {
        return 'webp';
    }

    return 'jpeg';
}

/**
 * Generate srcset for responsive images
 */
export function generateSrcSet(
    baseUrl: string,
    sizes: number[] = [320, 640, 960, 1280]
): string {
    const ext = path.extname(baseUrl);
    const base = baseUrl.replace(ext, '');

    return sizes
        .map(size => `${base}_${size}w${ext} ${size}w`)
        .join(', ');
}

/**
 * Calculate aspect ratio
 */
export function calculateAspectRatio(width: number, height: number): string {
    const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
    const divisor = gcd(width, height);
    return `${width / divisor}:${height / divisor}`;
}
