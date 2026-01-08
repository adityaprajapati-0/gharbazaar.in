import { Router } from 'express';
import { chatbotController } from '../controllers/chatbot.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

/**
 * @route   POST /api/v1/chatbot/ask
 * @desc    Ask a question to AI chatbot
 * @access  Private
 */
router.post('/ask', authenticate, chatbotController.askQuestion);

/**
 * @route   POST /api/v1/chatbot/handoff
 * @desc    Request human agent assistance
 * @access  Private
 */
router.post('/handoff', authenticate, chatbotController.requestHumanAgent);

/**
 * @route   POST /api/v1/chatbot/rate
 * @desc    Submit rating for chatbot or agent
 * @access  Private
 */
router.post('/rate', authenticate, chatbotController.submitRating);

/**
 * @route   GET /api/v1/chatbot/history
 * @desc    Get conversation history
 * @access  Private
 */
router.get('/history', authenticate, chatbotController.getHistory);

/**
 * @route   GET /api/v1/chatbot/session
 * @desc    Get active agent session
 * @access  Private
 */
router.get('/session', authenticate, chatbotController.getActiveSession);

/**
 * @route   DELETE /api/v1/chatbot/history
 * @desc    Clear conversation history
 * @access  Private
 */
router.delete('/history', authenticate, chatbotController.clearHistory);

export default router;
