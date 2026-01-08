import { Request, Response, NextFunction } from 'express';
import { getFirestore } from '../config/firebase';
import { AppError } from '../middleware/errorHandler';

export class ChatController {
    /**
     * Get or create conversation between two users
     */
    async getOrCreateConversation(req: Request, res: Response, next: NextFunction) {
        try {
            const { otherUserId, type, propertyId } = req.body;
            const userId = req.user?.uid;

            if (!userId) {
                throw new AppError(401, 'Unauthorized');
            }

            const db = getFirestore();

            // Check if conversation already exists
            const existingConv = await db.collection('conversations')
                .where('participants', 'array-contains', userId)
                .get();

            let conversation = null;

            for (const doc of existingConv.docs) {
                const data = doc.data();
                if (data.participants.includes(otherUserId)) {
                    conversation = { id: doc.id, ...data };
                    break;
                }
            }

            // Create new conversation if doesn't exist
            if (!conversation) {
                const conversationData = {
                    participants: [userId, otherUserId],
                    type: type || 'chat', // 'buyer-seller', 'buyer-employee', 'seller-employee'
                    propertyId: propertyId || null,
                    lastMessage: '',
                    lastMessageAt: new Date().toISOString(),
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                };

                const convRef = await db.collection('conversations').add(conversationData);
                conversation = { id: convRef.id, ...conversationData };
            }

            res.json({
                success: true,
                data: { conversation },
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get all conversations for current user
     */
    async getUserConversations(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user?.uid;

            if (!userId) {
                throw new AppError(401, 'Unauthorized');
            }

            const db = getFirestore();

            const snapshot = await db.collection('conversations')
                .where('participants', 'array-contains', userId)
                .orderBy('lastMessageAt', 'desc')
                .limit(50)
                .get();

            const conversations = await Promise.all(
                snapshot.docs.map(async (doc: any) => {
                    const data = doc.data();
                    const otherUserId = data.participants.find((p: string) => p !== userId);

                    // Get other user details
                    const otherUserDoc = await db.collection('users').doc(otherUserId).get();
                    const otherUser = otherUserDoc.data();

                    // Get unread count
                    const unreadSnapshot = await db.collection('messages')
                        .where('conversationId', '==', doc.id)
                        .where('senderId', '!=', userId)
                        .where('read', '==', false)
                        .get();

                    return {
                        id: doc.id,
                        ...data,
                        otherUser: {
                            id: otherUserId,
                            name: otherUser?.displayName || otherUser?.email || 'Unknown',
                            email: otherUser?.email,
                            avatar: otherUser?.photoURL,
                            onlineStatus: otherUser?.onlineStatus || 'offline',
                        },
                        unreadCount: unreadSnapshot.size,
                    };
                })
            );

            res.json({
                success: true,
                data: { conversations },
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get messages for a conversation
     */
    async getMessages(req: Request, res: Response, next: NextFunction) {
        try {
            const { conversationId } = req.params;
            const { limit = '50', before } = req.query;
            const userId = req.user?.uid;

            if (!userId) {
                throw new AppError(401, 'Unauthorized');
            }

            const db = getFirestore();

            // Verify user is participant
            const convDoc = await db.collection('conversations').doc(conversationId).get();
            if (!convDoc.exists) {
                throw new AppError(404, 'Conversation not found');
            }

            const convData = convDoc.data();
            if (!convData?.participants.includes(userId)) {
                throw new AppError(403, 'Unauthorized access to conversation');
            }

            // Build query
            let query = db.collection('messages')
                .where('conversationId', '==', conversationId)
                .orderBy('createdAt', 'desc')
                .limit(parseInt(limit as string));

            // Pagination
            if (before) {
                const beforeDoc = await db.collection('messages').doc(before as string).get();
                if (beforeDoc.exists) {
                    query = query.startAfter(beforeDoc);
                }
            }

            const snapshot = await query.get();
            const messages = snapshot.docs.map((doc: any) => ({
                id: doc.id,
                ...doc.data(),
            })).reverse(); // Reverse to show oldest first

            res.json({
                success: true,
                data: { messages },
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Send a message (also handled via Socket.IO)
     */
    async sendMessage(req: Request, res: Response, next: NextFunction) {
        try {
            const { conversationId } = req.params;
            const { content, type = 'text' } = req.body;
            const userId = req.user?.uid;
            const userEmail = req.user?.email;

            if (!userId) {
                throw new AppError(401, 'Unauthorized');
            }

            const db = getFirestore();

            // Verify conversation exists and user is participant
            const convDoc = await db.collection('conversations').doc(conversationId).get();
            if (!convDoc.exists) {
                throw new AppError(404, 'Conversation not found');
            }

            const convData = convDoc.data();
            if (!convData?.participants.includes(userId)) {
                throw new AppError(403, 'Unauthorized');
            }

            // Create message
            const messageData = {
                conversationId,
                senderId: userId,
                senderEmail: userEmail,
                content,
                type,
                read: false,
                createdAt: new Date().toISOString(),
            };

            const messageRef = await db.collection('messages').add(messageData);

            // Update conversation
            await db.collection('conversations').doc(conversationId).update({
                lastMessage: content,
                lastMessageAt: messageData.createdAt,
                updatedAt: messageData.createdAt,
            });

            const message = { id: messageRef.id, ...messageData };

            res.json({
                success: true,
                data: { message },
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Delete conversation
     */
    async deleteConversation(req: Request, res: Response, next: NextFunction) {
        try {
            const { conversationId } = req.params;
            const userId = req.user?.uid;

            if (!userId) {
                throw new AppError(401, 'Unauthorized');
            }

            const db = getFirestore();

            // Verify user is participant
            const convDoc = await db.collection('conversations').doc(conversationId).get();
            if (!convDoc.exists) {
                throw new AppError(404, 'Conversation not found');
            }

            const convData = convDoc.data();
            if (!convData?.participants.includes(userId)) {
                throw new AppError(403, 'Unauthorized');
            }

            // Delete all messages
            const messagesSnapshot = await db.collection('messages')
                .where('conversationId', '==', conversationId)
                .get();

            const batch = db.batch();
            messagesSnapshot.docs.forEach((doc) => {
                batch.delete(doc.ref);
            });

            // Delete conversation
            batch.delete(convDoc.ref);
            await batch.commit();

            res.json({
                success: true,
                message: 'Conversation deleted',
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Upload file attachment
     */
    async uploadAttachment(req: Request, res: Response, next: NextFunction) {
        try {
            const { conversationId } = req.body;
            const userId = req.user?.uid;
            const file = req.file;

            if (!userId) {
                throw new AppError(401, 'Unauthorized');
            }

            if (!file) {
                throw new AppError(400, 'No file provided');
            }

            const db = getFirestore();

            // Verify user is participant
            const convDoc = await db.collection('conversations').doc(conversationId).get();
            if (!convDoc.exists) {
                throw new AppError(404, 'Conversation not found');
            }

            const convData = convDoc.data();
            if (!convData?.participants.includes(userId)) {
                throw new AppError(403, 'Unauthorized');
            }

            // Upload file using file upload service
            const { fileUploadService } = await import('../services/file-upload.service');
            fileUploadService.validateFile(file);
            const uploadResult = await fileUploadService.uploadFile(file, userId, conversationId);

            res.json({
                success: true,
                data: uploadResult,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Edit message
     */
    async editMessage(req: Request, res: Response, next: NextFunction) {
        try {
            const { messageId } = req.params;
            const { content } = req.body;
            const userId = req.user?.uid;

            if (!userId) {
                throw new AppError(401, 'Unauthorized');
            }

            if (!content || content.length > 5000) {
                throw new AppError(400, 'Invalid message content');
            }

            const db = getFirestore();

            // Get message
            const messageDoc = await db.collection('messages').doc(messageId).get();
            if (!messageDoc.exists) {
                throw new AppError(404, 'Message not found');
            }

            const messageData = messageDoc.data();

            // Verify user is sender
            if (messageData?.senderId !== userId) {
                throw new AppError(403, 'Can only edit your own messages');
            }

            // Update message
            await messageDoc.ref.update({
                content,
                edited: true,
                editedAt: new Date().toISOString(),
            });

            const updatedMessage = {
                id: messageId,
                ...messageData,
                content,
                edited: true,
                editedAt: new Date().toISOString(),
            };

            res.json({
                success: true,
                data: { message: updatedMessage },
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Delete message
     */
    async deleteMessage(req: Request, res: Response, next: NextFunction) {
        try {
            const { messageId } = req.params;
            const userId = req.user?.uid;

            if (!userId) {
                throw new AppError(401, 'Unauthorized');
            }

            const db = getFirestore();

            // Get message
            const messageDoc = await db.collection('messages').doc(messageId).get();
            if (!messageDoc.exists) {
                throw new AppError(404, 'Message not found');
            }

            const messageData = messageDoc.data();

            // Verify user is sender
            if (messageData?.senderId !== userId) {
                throw new AppError(403, 'Can only delete your own messages');
            }

            // Soft delete - update message to show as deleted
            await messageDoc.ref.update({
                content: '[Message deleted]',
                deleted: true,
                deletedAt: new Date().toISOString(),
            });

            res.json({
                success: true,
                message: 'Message deleted',
            });
        } catch (error) {
            next(error);
        }
    }
}

export const chatController = new ChatController();
