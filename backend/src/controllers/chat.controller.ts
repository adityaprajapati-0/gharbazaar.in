/**
 * 💬 CHAT REST API CONTROLLER
 * 
 * AJAX endpoints for chat functionality.
 * These serve as fallback/complement to Socket.IO real-time chat.
 * 
 * Used for:
 * - Fetching conversation history
 * - Loading old messages
 * - Creating new conversations
 * - File uploads
 * 
 * @author GharBazaar Backend Team
 */

import { Request, Response } from 'express';
import Conversation from '../models/conversation.model';
import Message from '../models/message.model';
import { isMongoDBAvailable, memoryConversations, memoryMessages } from '../utils/memoryStore';
import { v4 as uuidv4 } from 'uuid';

/**
 * 📋 GET ALL CONVERSATIONS
 * 
 * Fetch all conversations for the authenticated user.
 * Returns list of conversations sorted by most recent activity.
 * 
 * GET /api/v1/chat/conversations
 */
export const getConversations = async (req: Request, res: Response) => {
    try {
        // User ID comes from auth middleware
        const userId = (req as any).user.userId;

        let conversations = [];
        if (isMongoDBAvailable()) {
            // Find all conversations where user is a participant
            conversations = await Conversation.find({
                participants: userId
            })
                .sort({ lastMessageAt: -1 })  // Most recent first
                .limit(50);  // Limit to last 50 conversations
        } else {
            // In-memory fetching
            conversations = Array.from(memoryConversations.values())
                .filter((c: any) => c.participants.includes(userId))
                .sort((a: any, b: any) => b.lastMessageAt - a.lastMessageAt)
                .slice(0, 50);
        }

        console.log(`📋 Fetched ${conversations.length} conversations for user ${userId}${!isMongoDBAvailable() ? ' (Memory Mode)' : ''}`);

        res.json({
            success: true,
            data: { conversations }
        });

    } catch (error) {
        console.error('❌ Error fetching conversations:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch conversations'
        });
    }
};

/**
 * 💬 GET CONVERSATION MESSAGES
 * 
 * Fetch all messages in a specific conversation.
 * Supports pagination for long conversations.
 * 
 * GET /api/v1/chat/conversations/:id/messages?limit=50&skip=0
 */
export const getMessages = async (req: Request, res: Response) => {
    try {
        const { id: conversationId } = req.params;
        const limit = parseInt(req.query.limit as string) || 50;
        const skip = parseInt(req.query.skip as string) || 0;
        const userId = (req as any).user.userId;

        // Verify user is part of this conversation
        let conversation;
        if (isMongoDBAvailable()) {
            conversation = await Conversation.findById(conversationId);
        } else {
            conversation = memoryConversations.get(conversationId);
        }

        if (!conversation) {
            return res.status(404).json({
                success: false,
                error: 'Conversation not found'
            });
        }

        if (!conversation.participants.includes(userId)) {
            return res.status(403).json({
                success: false,
                error: 'Not authorized to view this conversation'
            });
        }

        // Fetch messages with pagination
        let messages = [];
        if (isMongoDBAvailable()) {
            messages = await Message.find({
                conversationId,
                deleted: false  // Don't include deleted messages
            })
                .sort({ createdAt: 1 })  // Oldest first (chronological order)
                .skip(skip)
                .limit(limit);
        } else {
            // In-memory fetching
            messages = (memoryMessages.get(conversationId) || [])
                .filter((m: any) => !m.deleted)
                .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                .slice(skip, skip + limit);
        }

        console.log(`💬 Fetched ${messages.length} messages from conversation ${conversationId}${!isMongoDBAvailable() ? ' (Memory Mode)' : ''}`);

        res.json({
            success: true,
            data: { messages }
        });

    } catch (error) {
        console.error('❌ Error fetching messages:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch messages'
        });
    }
};

/**
 * ➕ CREATE CONVERSATION
 * 
 * Create a new conversation (e.g., buyer contacting seller about property).
 * 
 * POST /api/v1/chat/conversations
 * Body: { otherUserId, propertyId, propertyTitle, initialMessage }
 */
export const createConversation = async (req: Request, res: Response) => {
    try {
        const { otherUserId, propertyId, propertyTitle, initialMessage } = req.body;
        const userId = (req as any).user.userId;
        const userEmail = (req as any).user.email;

        // Check if conversation already exists between these users for this property
        let conversation;
        if (isMongoDBAvailable()) {
            conversation = await Conversation.findOne({
                participants: { $all: [userId, otherUserId] },
                propertyId
            });
        } else {
            conversation = Array.from(memoryConversations.values()).find((c: any) =>
                c.participants.includes(userId) &&
                c.participants.includes(otherUserId) &&
                c.propertyId === propertyId
            );
        }

        // If conversation doesn't exist, create it
        if (!conversation) {
            if (isMongoDBAvailable()) {
                conversation = await Conversation.create({
                    participants: [userId, otherUserId],
                    propertyId,
                    propertyTitle,
                    lastMessage: initialMessage || '',
                    lastMessageAt: new Date(),
                });
            } else {
                const conversationId = uuidv4();
                conversation = {
                    _id: conversationId,
                    participants: [userId, otherUserId],
                    propertyId,
                    propertyTitle,
                    lastMessage: initialMessage || '',
                    lastMessageAt: new Date(),
                };
                memoryConversations.set(conversationId, conversation);
            }

            console.log(`✅ New conversation created: ${isMongoDBAvailable() ? conversation._id : conversation._id}${!isMongoDBAvailable() ? ' (Memory Mode)' : ''}`);
        }

        // If there's an initial message, save it
        if (initialMessage) {
            if (isMongoDBAvailable()) {
                await Message.create({
                    conversationId: conversation._id,
                    senderId: userId,
                    senderEmail: userEmail,
                    content: initialMessage,
                    type: 'text',
                    read: false,
                });
            } else {
                const messageId = uuidv4();
                const createdAt = new Date();
                const message = {
                    _id: messageId,
                    conversationId: conversation._id,
                    senderId: userId,
                    senderEmail: userEmail,
                    content: initialMessage,
                    type: 'text',
                    read: false,
                    createdAt: createdAt.toISOString()
                };
                if (!memoryMessages.has(conversation._id)) {
                    memoryMessages.set(conversation._id, []);
                }
                memoryMessages.get(conversation._id).push(message);
            }
        }

        res.status(201).json({
            success: true,
            data: { conversation }
        });

    } catch (error) {
        console.error('❌ Error creating conversation:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create conversation'
        });
    }
};

/**
 * 📨 SEND MESSAGE (AJAX Fallback)
 * 
 * Send a message via REST API instead of Socket.IO.
 * Useful when socket connection is unavailable.
 * 
 * POST /api/v1/chat/conversations/:id/messages
 * Body: { content, type }
 */
export const sendMessage = async (req: Request, res: Response) => {
    try {
        const { id: conversationId } = req.params;
        const { content, type = 'text' } = req.body;
        const userId = (req as any).user.userId;
        const userEmail = (req as any).user.email;

        // Verify conversation exists and user is participant
        let conversation;
        if (isMongoDBAvailable()) {
            conversation = await Conversation.findById(conversationId);
        } else {
            conversation = memoryConversations.get(conversationId);
        }

        if (!conversation) {
            return res.status(404).json({
                success: false,
                error: 'Conversation not found'
            });
        }

        if (!conversation.participants.includes(userId)) {
            return res.status(403).json({
                success: false,
                error: 'Not authorized'
            });
        }

        let message;
        if (isMongoDBAvailable()) {
            // Create the message
            message = await Message.create({
                conversationId,
                senderId: userId,
                senderEmail: userEmail,
                content,
                type,
                read: false,
            });

            // Update conversation
            await Conversation.findByIdAndUpdate(conversationId, {
                lastMessage: content.substring(0, 100),
                lastMessageAt: new Date(),
            });
        } else {
            // In-memory message
            const messageId = uuidv4();
            const createdAt = new Date();
            message = {
                _id: messageId,
                conversationId,
                senderId: userId,
                senderEmail: userEmail,
                content,
                type,
                read: false,
                createdAt: createdAt.toISOString()
            };

            if (!memoryMessages.has(conversationId)) {
                memoryMessages.set(conversationId, []);
            }
            memoryMessages.get(conversationId).push(message);

            // Update conversation in memory
            conversation.lastMessage = content.substring(0, 100);
            conversation.lastMessageAt = createdAt;
        }

        res.status(201).json({
            success: true,
            data: { message }
        });

    } catch (error) {
        console.error('❌ Error sending message:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to send message'
        });
    }
};
