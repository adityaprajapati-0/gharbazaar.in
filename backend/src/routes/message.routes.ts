/**
 * Message Routes - Compatibility Layer
 * Redirects to chat routes for backward compatibility
 * @deprecated Use /chat routes instead
 */
import { Router } from 'express';
import { chatController } from '../controllers/chat.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// Add deprecation warning middleware
router.use((req, res, next) => {
    res.setHeader('X-Deprecated', 'true');
    res.setHeader('X-Deprecation-Message', 'Use /api/v1/chat endpoints instead of /api/v1/messages');
    next();
});

/**
 * @route   POST /api/v1/messages/conversations
 * @desc    Create or get conversation (redirects to chat)
 * @access  Private
 * @deprecated Use POST /api/v1/chat/conversations
 */
router.post('/conversations', authenticate, chatController.getOrCreateConversation);

/**
 * @route   GET /api/v1/messages/conversations
 * @desc    Get all conversations (redirects to chat)
 * @access  Private
 * @deprecated Use GET /api/v1/chat/conversations
 */
router.get('/conversations', authenticate, chatController.getUserConversations);

/**
 * @route   GET /api/v1/messages/conversations/:conversationId/messages
 * @desc    Get messages (redirects to chat)
 * @access  Private
 * @deprecated Use GET /api/v1/chat/conversations/:conversationId/messages
 */
router.get('/conversations/:conversationId/messages', authenticate, chatController.getMessages);

/**
 * @route   POST /api/v1/messages/conversations/:conversationId/messages
 * @desc    Send message (redirects to chat)
 * @access  Private
 * @deprecated Use POST /api/v1/chat/conversations/:conversationId/messages
 */
router.post('/conversations/:conversationId/messages', authenticate, chatController.sendMessage);

export default router;
