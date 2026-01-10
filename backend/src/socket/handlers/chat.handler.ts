/**
 * 💬 CHAT EVENT HANDLER
 * 
 * Handles all Socket.IO events for buyer-seller chat.
 * Manages conversations, messages, typing indicators, and read receipts.
 * 
 * @author GharBazaar Backend Team
 */

import { Server, Socket } from 'socket.io';
import { getSocketUser } from '../auth.middleware';
import Conversation from '../../models/conversation.model';
import Message from '../../models/message.model';
import { isMongoDBAvailable, memoryConversations, memoryMessages } from '../../utils/memoryStore';
import { v4 as uuidv4 } from 'uuid';

/**
 * 📨 REGISTER CHAT EVENT HANDLERS
 * 
 * Sets up all chat-related socket events for a connected user.
 * Called when a user successfully connects to Socket.IO.
 * 
 * @param io - Socket.IO server instance
 * @param socket - Individual user's socket connection
 */
export const registerChatHandlers = (io: Server, socket: Socket) => {
    const user = getSocketUser(socket);

    console.log(`💬 Chat handlers registered for: ${user.email}`);

    /**
     * 🚪 JOIN CONVERSATION
     * 
     * User joins a conversation room to receive real-time messages.
     * Frontend calls: socket.emit('join_conversation', conversationId)
     */
    socket.on('join_conversation', async (conversationId: string) => {
        try {
            console.log(`📨 ${user.email} joining conversation: ${conversationId}`);

            // Verify this conversation exists and user is a participant
            let conversation;
            if (isMongoDBAvailable()) {
                conversation = await Conversation.findById(conversationId);
            } else {
                conversation = memoryConversations.get(conversationId);
            }

            if (!conversation) {
                socket.emit('error', { message: 'Conversation not found' });
                return;
            }

            // Check if user is actually part of this conversation
            const participants = isMongoDBAvailable() ? conversation.participants : conversation.participants;
            if (!participants.includes(user.userId)) {
                console.warn(`⚠️  Unauthorized: ${user.email} not in conversation ${conversationId}`);
                socket.emit('error', { message: 'Not authorized for this conversation' });
                return;
            }

            // Join the Socket.IO room
            // Now this user will receive all events in this conversation
            await socket.join(conversationId);

            console.log(`✅ ${user.email} joined conversation room: ${conversationId}${!isMongoDBAvailable() ? ' (Memory Mode)' : ''}`);

        } catch (error) {
            console.error('❌ Error joining conversation:', error);
            socket.emit('error', { message: 'Failed to join conversation' });
        }
    });

    /**
     * 🚶 LEAVE CONVERSATION
     * 
     * User leaves a conversation room (won't receive more messages).
     * Frontend calls: socket.emit('leave_conversation', conversationId)
     */
    socket.on('leave_conversation', (conversationId: string) => {
        socket.leave(conversationId);
        console.log(`📤 ${user.email} left conversation: ${conversationId}`);
    });

    /**
     * 📤 SEND MESSAGE
     * 
     * User sends a message in a conversation.
     * Message is saved to database and broadcast to all participants.
     * 
     * Frontend calls: socket.emit('send_message', { conversationId, content, type })
     */
    socket.on('send_message', async (data: {
        conversationId: string;
        content: string;
        type?: 'text' | 'image' | 'file';
        fileUrl?: string;
        thumbnailUrl?: string;
        fileName?: string;
        fileSize?: number;
    }) => {
        try {
            const { conversationId, content, type = 'text', fileUrl, thumbnailUrl, fileName, fileSize } = data;

            console.log(`📨 Message from ${user.email} in ${conversationId}`);

            let messageData;
            if (isMongoDBAvailable()) {
                // Create the message in database
                const message = await Message.create({
                    conversationId,
                    senderId: user.userId,
                    senderEmail: user.email,
                    content,
                    type,
                    fileUrl,
                    thumbnailUrl,
                    fileName,
                    fileSize,
                    read: false,
                    edited: false,
                    deleted: false,
                });

                // Update conversation's last message
                await Conversation.findByIdAndUpdate(conversationId, {
                    lastMessage: content.substring(0, 100),  // Preview (max 100 chars)
                    lastMessageAt: new Date(),
                });

                messageData = {
                    id: message._id.toString(),
                    conversationId,
                    senderId: user.userId,
                    senderEmail: user.email,
                    content,
                    type,
                    fileUrl,
                    thumbnailUrl,
                    fileName,
                    fileSize,
                    read: false,
                    edited: false,
                    deleted: false,
                    createdAt: message.createdAt.toISOString(),
                };
            } else {
                // In-memory message creation
                const messageId = uuidv4();
                const createdAt = new Date();
                messageData = {
                    id: messageId,
                    conversationId,
                    senderId: user.userId,
                    senderEmail: user.email,
                    content,
                    type,
                    fileUrl,
                    thumbnailUrl,
                    fileName,
                    fileSize,
                    read: false,
                    edited: false,
                    deleted: false,
                    createdAt: createdAt.toISOString(),
                };

                // Store in memory
                if (!memoryMessages.has(conversationId)) {
                    memoryMessages.set(conversationId, []);
                }
                memoryMessages.get(conversationId).push(messageData);

                // Update conversation in memory
                const conversation = memoryConversations.get(conversationId);
                if (conversation) {
                    conversation.lastMessage = content.substring(0, 100);
                    conversation.lastMessageAt = createdAt;
                }
            }

            // Broadcast to ALL users in this conversation room
            // This includes the sender (for confirmation) and receiver
            io.to(conversationId).emit('new_message', messageData);

            console.log(`✅ Message sent in conversation: ${conversationId}${!isMongoDBAvailable() ? ' (Memory Mode)' : ''}`);

        } catch (error) {
            console.error('❌ Error sending message:', error);
            socket.emit('error', { message: 'Failed to send message' });
        }
    });

    /**
     * ⌨️  TYPING INDICATOR
     * 
     * User is typing a message (shows "..." to other user).
     * Frontend calls: socket.emit('typing', { conversationId, isTyping: true/false })
     */
    socket.on('typing', (data: { conversationId: string; isTyping: boolean }) => {
        const { conversationId, isTyping } = data;

        // Broadcast typing status to everyone in the room EXCEPT the sender
        socket.to(conversationId).emit('user_typing', {
            userId: user.userId,
            isTyping,
        });

        // Note: We don't log typing events to avoid console spam
    });

    /**
     * ✅ MARK MESSAGES AS READ
     * 
     * User has read messages in a conversation (shows double checkmark ✓✓).
     * Frontend calls: socket.emit('mark_as_read', { conversationId })
     */
    socket.on('mark_as_read', async (data: { conversationId: string }) => {
        try {
            const { conversationId } = data;

            // Mark all unread messages from OTHER users as read
            await Message.updateMany(
                {
                    conversationId,
                    senderId: { $ne: user.userId },  // Not sent by current user
                    read: false,
                },
                {
                    read: true,
                }
            );

            // Notify the sender that their messages were read
            socket.to(conversationId).emit('messages_read', {
                conversationId,
                userId: user.userId,
            });

            console.log(`✅ Messages marked as read in ${conversationId} by ${user.email}`);

        } catch (error) {
            console.error('❌ Error marking messages as read:', error);
        }
    });

    /**
     * ✏️  EDIT MESSAGE
     * 
     * User edits a previously sent message.
     * Frontend calls: socket.emit('edit_message', { messageId, content })
     */
    socket.on('edit_message', async (data: { messageId: string; content: string }) => {
        try {
            const { messageId, content } = data;

            // Find and update the message
            const message = await Message.findById(messageId);

            if (!message) {
                socket.emit('error', { message: 'Message not found' });
                return;
            }

            // Verify the user owns this message
            if (message.senderId !== user.userId) {
                socket.emit('error', { message: 'Not authorized to edit this message' });
                return;
            }

            // Update the message
            message.content = content;
            message.edited = true;
            await message.save();

            // Broadcast the edit to all users in the conversation
            io.to(message.conversationId.toString()).emit('message_edited', {
                id: message._id.toString(),
                content,
                edited: true,
            });

            console.log(`✏️  Message edited: ${messageId}`);

        } catch (error) {
            console.error('❌ Error editing message:', error);
            socket.emit('error', { message: 'Failed to edit message' });
        }
    });

    /**
     * 🗑️  DELETE MESSAGE
     * 
     * User deletes a message (marks as deleted, doesn't actually remove).
     * Frontend calls: socket.emit('delete_message', { messageId })
     */
    socket.on('delete_message', async (data: { messageId: string }) => {
        try {
            const { messageId } = data;

            // Find the message
            const message = await Message.findById(messageId);

            if (!message) {
                socket.emit('error', { message: 'Message not found' });
                return;
            }

            // Verify ownership
            if (message.senderId !== user.userId) {
                socket.emit('error', { message: 'Not authorized to delete this message' });
                return;
            }

            // Mark as deleted (soft delete - we keep the record)
            message.deleted = true;
            message.content = '[Message deleted]';
            await message.save();

            // Broadcast deletion to all users
            io.to(message.conversationId.toString()).emit('message_deleted', {
                id: message._id.toString(),
                conversationId: message.conversationId.toString(),
            });

            console.log(`🗑️  Message deleted: ${messageId}`);

        } catch (error) {
            console.error('❌ Error deleting message:', error);
            socket.emit('error', { message: 'Failed to delete message' });
        }
    });
};
