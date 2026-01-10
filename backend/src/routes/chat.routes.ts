/**
 * 💬 CHAT ROUTES
 * 
 * Express routes for chat REST API endpoints.
 * 
 * @author GharBazaar Backend Team
 */

import express from 'express';
import {
    getConversations,
    getMessages,
    createConversation,
    sendMessage,
} from '../controllers/chat.controller';
import { authenticateRequest } from '../middleware/auth.middleware';

const router = express.Router();

// All routes require authentication
router.use(authenticateRequest);

// Conversation routes
router.get('/conversations', getConversations);
router.post('/conversations', createConversation);

// Message routes
router.get('/conversations/:id/messages', getMessages);
router.post('/conversations/:id/messages', sendMessage);

export default router;
