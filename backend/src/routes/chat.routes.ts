import { Router } from 'express';
import { chatController } from '../controllers/chat.controller';
import { authenticate } from '../middleware/auth';
import { chatValidation } from '../middleware/validation.middleware';
import multer from 'multer';

const router = Router();

// Configure multer for file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 25 * 1024 * 1024, // 25MB max
    },
});

/**
 * @route   POST /api/v1/chat/conversations
 * @desc    Get or create conversation with another user
 * @access  Private
 */
router.post('/conversations', authenticate, chatValidation.createConversation, chatController.getOrCreateConversation);

/**
 * @route   GET /api/v1/chat/conversations
 * @desc    Get all user's conversations
 * @access  Private
 */
router.get('/conversations', authenticate, chatController.getUserConversations);

/**
 * @route   GET /api/v1/chat/conversations/:conversationId/messages
 * @desc    Get messages for a conversation
 * @access  Private
 */
router.get('/conversations/:conversationId/messages', authenticate, chatValidation.getMessages, chatController.getMessages);

/**
 * @route   POST /api/v1/chat/conversations/:conversationId/messages
 * @desc    Send a message (also via Socket.IO)
 * @access  Private
 */
router.post('/conversations/:conversationId/messages', authenticate, chatValidation.sendMessage, chatController.sendMessage);

/**
 * @route   DELETE /api/v1/chat/conversations/:conversationId
 * @desc    Delete conversation
 * @access  Private
 */
router.delete('/conversations/:conversationId', authenticate, chatController.deleteConversation);

/**
 * @route   POST /api/v1/chat/upload
 * @desc    Upload file attachment
 * @access  Private
 */
router.post('/upload', authenticate, upload.single('file'), chatController.uploadAttachment);

/**
 * @route   PUT /api/v1/chat/messages/:messageId
 * @desc    Edit a message
 * @access  Private
 */
router.put('/messages/:messageId', authenticate, chatController.editMessage);

/**
 * @route   DELETE /api/v1/chat/messages/:messageId
 * @desc    Delete a message
 * @access  Private
 */
router.delete('/messages/:messageId', authenticate, chatController.deleteMessage);

export default router;
