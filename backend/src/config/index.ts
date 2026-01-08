import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface Config {
    nodeEnv: string;
    port: number;
    apiVersion: string;
    frontendUrl: string;
    firebase: {
        projectId: string;
        privateKeyId: string;
        privateKey: string;
        clientEmail: string;
        clientId: string;
    };
    jwt: {
        secret: string;
        expiresIn: string;
        refreshSecret: string;
        refreshExpiresIn: string;
    };
    razorpay: {
        keyId: string;
        keySecret: string;
        webhookSecret: string;
    };
    sendgrid: {
        apiKey: string;
        fromEmail: string;
        fromName: string;
    };
    twilio: {
        accountSid: string;
        authToken: string;
        phoneNumber: string;
    };
    redis: {
        host: string;
        port: number;
        password?: string;
    };
    rateLimit: {
        windowMs: number;
        maxRequests: number;
    };
    fileUpload: {
        maxFileSize: number;
        allowedTypes: string[];
    };
}

export const config: Config = {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '5000', 10),
    apiVersion: process.env.API_VERSION || 'v1',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',

    firebase: {
        projectId: process.env.FIREBASE_PROJECT_ID || '',
        privateKeyId: process.env.FIREBASE_PRIVATE_KEY_ID || '',
        privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
        clientId: process.env.FIREBASE_CLIENT_ID || '',
    },

    jwt: {
        secret: process.env.JWT_SECRET || 'your-secret-key',
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
        refreshSecret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret',
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
    },

    razorpay: {
        keyId: process.env.RAZORPAY_KEY_ID || '',
        keySecret: process.env.RAZORPAY_KEY_SECRET || '',
        webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || '',
    },

    sendgrid: {
        apiKey: process.env.SENDGRID_API_KEY || '',
        fromEmail: process.env.SENDGRID_FROM_EMAIL || 'noreply@gharbazaar.in',
        fromName: process.env.SENDGRID_FROM_NAME || 'GharBazaar',
    },

    twilio: {
        accountSid: process.env.TWILIO_ACCOUNT_SID || '',
        authToken: process.env.TWILIO_AUTH_TOKEN || '',
        phoneNumber: process.env.TWILIO_PHONE_NUMBER || '',
    },

    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD,
    },

    rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    },

    fileUpload: {
        maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10),
        allowedTypes: (process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/webp,application/pdf').split(','),
    },
};

// Validate required environment variables
const requiredEnvVars = [
    'FIREBASE_PROJECT_ID',
    'FIREBASE_PRIVATE_KEY',
    'FIREBASE_CLIENT_EMAIL',
    'JWT_SECRET',
];

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0 && process.env.NODE_ENV !== 'test') {
    throw new Error(
        `Missing required environment variables: ${missingEnvVars.join(', ')}`
    );
}
