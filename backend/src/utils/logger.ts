import winston from 'winston';
import path from 'path';
import { config } from '../config';

// Define log format
const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
);

// Define log transports
const transports: winston.transport[] = [
    // Console transport
    new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.printf(({ timestamp, level, message, ...meta }) => {
                let msg = `${timestamp} [${level}]: ${message}`;
                if (Object.keys(meta).length > 0) {
                    msg += ` ${JSON.stringify(meta)}`;
                }
                return msg;
            })
        ),
    }),
];

// Add file transports in production
if (config.nodeEnv === 'production') {
    transports.push(
        new winston.transports.File({
            filename: path.join(process.env.LOG_FILE_PATH || './logs', 'error.log'),
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        }),
        new winston.transports.File({
            filename: path.join(process.env.LOG_FILE_PATH || './logs', 'combined.log'),
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        })
    );
}

// Create logger
export const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    transports,
    exitOnError: false,
});

// Stream for Morgan
logger.stream = {
    write: (message: string) => {
        logger.info(message.trim());
    },
} as any;
