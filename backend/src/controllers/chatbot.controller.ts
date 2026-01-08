import { Request, Response, NextFunction } from 'express';
import { aiChatbotService, ChatContext } from '../services/ai-chatbot.service';
import { agentHandoffService } from '../services/agent-handoff.service';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

export class ChatbotController {
    /**
     * Ask a question to AI chatbot
     */
    async askQuestion(req: Request, res: Response, next: NextFunction) {
        try {
            const { question, conversationHistory, currentPage, propertyId } = req.body;
            const userId = req.user?.uid;

            if (!userId) {
                throw new AppError(401, 'Unauthorized');
            }

            if (!question || question.length === 0) {
                throw new AppError(400, 'Question is required');
            }

            if (question.length > 1000) {
                throw new AppError(400, 'Question too long (max 1000 characters)');
            }

            // Get user data to determine role
            const userDoc = await (await import('../config/firebase')).getFirestore()
                .collection('users')
                .doc(userId)
                .get();

            const userData = userDoc.data();
            const userRole = userData?.role || 'buyer';

            const context: ChatContext = {
                userId,
                userRole: userRole as 'buyer' | 'seller' | 'admin',
                currentPage,
                propertyId,
                conversationHistory: (conversationHistory || []).map((msg: any) => ({
                    role: msg.role === 'assistant' || msg.role === 'agent' ? 'assistant' : 'user',
                    content: msg.content,
                })),
            };

            // Check for escalation
            const needsEscalation = aiChatbotService.detectEscalation(
                conversationHistory || []
            );

            if (needsEscalation) {
                res.json({
                    success: true,
                    data: {
                        answer: 'I understand you need more specialized help. Let me connect you with a human agent who can better assist you.',
                        needsEscalation: true,
                    },
                });
                return;
            }

            const answer = await aiChatbotService.askQuestion(question, context);

            res.json({
                success: true,
                data: {
                    answer,
                    needsEscalation: false,
                },
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Request human agent assistance
     */
    async requestHumanAgent(req: Request, res: Response, next: NextFunction) {
        try {
            const { conversationHistory, reason } = req.body;
            const userId = req.user?.uid;
            const userEmail = req.user?.email;

            if (!userId) {
                throw new AppError(401, 'Unauthorized');
            }

            // Get user name
            const userDoc = await (await import('../config/firebase')).getFirestore()
                .collection('users')
                .doc(userId)
                .get();

            const userData = userDoc.data();

            const result = await agentHandoffService.requestAgent({
                userId,
                userName: userData?.name || 'User',
                userEmail: userEmail || '',
                conversationHistory: conversationHistory || [],
                reason,
                priority: 'normal',
            });

            res.json({
                success: true,
                data: result,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Submit rating for chatbot or agent
     */
    async submitRating(req: Request, res: Response, next: NextFunction) {
        try {
            const { sessionId, rating, feedback, type } = req.body;
            const userId = req.user?.uid;

            if (!userId) {
                throw new AppError(401, 'Unauthorized');
            }

            if (!rating || rating < 1 || rating > 5) {
                throw new AppError(400, 'Rating must be between 1 and 5');
            }

            if (type === 'agent' && sessionId) {
                // End agent session with rating
                await agentHandoffService.endSession(sessionId, rating, feedback);
            } else {
                // Save AI chatbot rating
                await (await import('../config/firebase')).getFirestore()
                    .collection('chatbot_ratings')
                    .add({
                        userId,
                        rating,
                        feedback,
                        type: 'ai',
                        createdAt: new Date().toISOString(),
                    });
            }

            res.json({
                success: true,
                message: 'Thank you for your feedback!',
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get conversation history
     */
    async getHistory(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user?.uid;
            const limit = parseInt(req.query.limit as string) || 10;

            if (!userId) {
                throw new AppError(401, 'Unauthorized');
            }

            const history = await aiChatbotService.getConversationHistory(userId, limit);

            res.json({
                success: true,
                data: { history },
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get active agent session
     */
    async getActiveSession(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user?.uid;

            if (!userId) {
                throw new AppError(401, 'Unauthorized');
            }

            const session = await agentHandoffService.getActiveSession(userId);

            res.json({
                success: true,
                data: { session },
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Clear conversation history
     */
    async clearHistory(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user?.uid;

            if (!userId) {
                throw new AppError(401, 'Unauthorized');
            }

            // Delete all conversations for user
            const snapshot = await (await import('../config/firebase')).getFirestore()
                .collection('chatbot_conversations')
                .where('userId', '==', userId)
                .get();

            const batch = (await import('../config/firebase')).getFirestore().batch();
            snapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();

            res.json({
                success: true,
                message: 'Conversation history cleared',
            });
        } catch (error) {
            next(error);
        }
    }
}

export const chatbotController = new ChatbotController();
