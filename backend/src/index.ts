import express, { Application } from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { config } from './config';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFoundHandler';
import { initializeFirebase } from './config/firebase';
import { requestMonitor, securityHeaders, requestId } from './middleware/monitoring';
import { sanitize } from './middleware/sanitizer';
import { ddosProtection, rateLimitHeaders } from './middleware/rateLimiter';
import { cacheService } from './services/cache.service';
import { apmMiddleware } from './services/apm.service';
import routes from './routes';
import initializeSocketIO from './socket';

// Initialize Express app
const app: Application = express();
const httpServer = createServer(app);

// Initialize Firebase Admin SDK
initializeFirebase();

// Initialize Socket.IO (async)
let io: any;
(async () => {
    io = await initializeSocketIO(httpServer);
    app.set('io', io); // Make io accessible to controllers
    logger.info('✅ Socket.IO initialized');
})();

// ============================================
// PERFORMANCE & SECURITY MIDDLEWARE
// ============================================

// Trust proxy for production (behind nginx/load balancer)
if (config.nodeEnv === 'production') {
    app.set('trust proxy', 1);
}

// Request ID for tracking
app.use(requestId);

// DDoS protection (very permissive, just prevents abuse)
app.use(ddosProtection);

// Security headers
app.use(helmet({
    contentSecurityPolicy: config.nodeEnv === 'production' ? undefined : false,
    crossOriginEmbedderPolicy: false,
}));
app.use(securityHeaders);

// CORS configuration
app.use(cors({
    origin: config.frontendUrl,
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
}));

// Compression (gzip responses for smaller payloads)
app.use(compression({
    level: 6, // Balanced compression
    threshold: 1024, // Only compress responses > 1KB
    filter: (req, res) => {
        if (req.headers['x-no-compression']) {
            return false;
        }
        return compression.filter(req, res);
    },
}));

// Body parsing middleware with size limits
app.use(express.json({
    limit: '10mb',
    strict: true,
}));
app.use(express.urlencoded({
    extended: true,
    limit: '10mb',
    parameterLimit: 1000,
}));

// Input sanitization
app.use(sanitize());

// APM - Performance tracking
app.use(apmMiddleware);

// Request monitoring
app.use(requestMonitor);

// Rate limit headers
app.use(rateLimitHeaders);

// Logging
if (config.nodeEnv === 'development') {
    app.use(morgan('dev'));
} else {
    app.use(morgan('combined', {
        stream: { write: (message) => logger.info(message.trim()) },
        skip: (req) => req.url === '/health' || req.url === '/api/v1/health',
    }));
}

// ============================================
// ROUTES
// ============================================

// Health check endpoint (no prefix, for load balancers)
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        environment: config.nodeEnv,
        version: config.apiVersion,
        uptime: process.uptime(),
    });
});

// API routes
app.use(`/api/${config.apiVersion}`, routes);

// 404 handler
app.use(notFoundHandler);

// Error handling middleware (must be last)
app.use(errorHandler);

// ============================================
// SERVER STARTUP
// ============================================

const PORT = config.port;

httpServer.listen(PORT, () => {
    logger.info(`🚀 Server running in ${config.nodeEnv} mode on port ${PORT}`);
    logger.info(`📡 API endpoint: http://localhost:${PORT}/api/${config.apiVersion}`);
    logger.info(`🏥 Health check: http://localhost:${PORT}/health`);
    logger.info(`💬 Socket.IO ready for real-time chat`);
    logger.info(`⚡ Performance optimizations enabled`);
});

// ============================================
// GRACEFUL SHUTDOWN
// ============================================

const gracefulShutdown = async (signal: string) => {
    logger.info(`${signal} signal received: starting graceful shutdown`);

    // Stop accepting new connections
    httpServer.close(async () => {
        logger.info('HTTP server closed');

        try {
            // Disconnect cache service
            await cacheService.disconnect();
            logger.info('Cache service disconnected');

            // Close Socket.IO connections
            io.close();
            logger.info('Socket.IO connections closed');

            logger.info('Graceful shutdown completed');
            process.exit(0);
        } catch (error) {
            logger.error('Error during shutdown:', error);
            process.exit(1);
        }
    });

    // Force shutdown after 30 seconds
    setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
    }, 30000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Don't exit in production, let the error handler deal with it
    if (config.nodeEnv === 'development') {
        process.exit(1);
    }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    gracefulShutdown('UNCAUGHT_EXCEPTION');
});

export default app;

