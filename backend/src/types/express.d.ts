import { Request } from 'express';

declare global {
    namespace Express {
        interface Request {
            user?: {
                uid: string;
                email: string | null;
                role: string;
                emailVerified: boolean;
            };
            requestId?: string;
            rateLimit?: {
                limit: number;
                remaining: number;
            };
        }
    }
}

export { };
