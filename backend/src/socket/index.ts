import { Server, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { getAuth } from '../config/firebase';
import { getFirestore } from '../config/firebase';
import { logger } from '../utils/logger';
import { config } from '../config';

interface AuthenticatedSocket extends Socket {
    userId?: string;
    userEmail?: string;
    rateLimitCount?: number;
    rateLimitReset?: number;
}

// Connection stats for monitoring
const connectionStats = {
    totalConnections: 0,
    activeConnections: 0,
    messagesPerSecond: 0,
    peakConnections: 0,
    lastMinuteMessages: [] as number[],
};

// Rate limiting config
const RATE_LIMIT = {
    MESSAGES_PER_MINUTE: 60,
    EVENTS_PER_SECOND: 10,
};

export async function initializeSocketIO(httpServer: HTTPServer) {
    const io = new Server(httpServer, {
        cors: {
            origin: process.env.FRONTEND_URL || 'http://localhost:3000',
            methods: ['GET', 'POST'],
            credentials: true,
        },
        // Performance optimizations
        pingTimeout: 30000, // Faster timeout detection
        pingInterval: 25000,
        upgradeTimeout: 10000,
        maxHttpBufferSize: 1e6, // 1MB max message size
        transports: ['websocket', 'polling'], // Prefer WebSocket
        allowUpgrades: true,
        // Compression
        perMessageDeflate: {
            threshold: 1024, // Only compress messages > 1KB
            zlibDeflateOptions: {
                chunkSize: 16 * 1024,
            },
        },
        // Connection pooling
        connectTimeout: 45000,
    });

    // Redis adapter for horizontal scaling
    // To enable: npm install @socket.io/redis-adapter redis
    // Then uncomment and configure the code below:
    /*
    try {
        if (config.redis.host) {
            const { createClient } = await import('redis');
            const { createAdapter } = await import('@socket.io/redis-adapter');
            const pubClient = createClient({
                socket: { host: config.redis.host, port: config.redis.port },
                password: config.redis.password,
            });
            const subClient = pubClient.duplicate();
            await Promise.all([pubClient.connect(), subClient.connect()]);
            io.adapter(createAdapter(pubClient, subClient));
            logger.info('Socket.IO Redis adapter connected');
        }
    } catch (error) {
        logger.warn('Socket.IO Redis adapter not available');
    }
    */

    // Authentication middleware with caching
    const authCache = new Map<string, { userId: string; email: string; expires: number }>();

    io.use(async (socket: AuthenticatedSocket, next) => {
        try {
            const token = socket.handshake.auth.token;

            if (!token) {
                return next(new Error('Authentication token required'));
            }

            // Check auth cache first
            const cached = authCache.get(token);
            if (cached && cached.expires > Date.now()) {
                socket.userId = cached.userId;
                socket.userEmail = cached.email;
                socket.rateLimitCount = 0;
                socket.rateLimitReset = Date.now() + 60000;
                return next();
            }

            // Verify Firebase token
            const decodedToken = await getAuth().verifyIdToken(token);
            socket.userId = decodedToken.uid;
            socket.userEmail = decodedToken.email || '';
            socket.rateLimitCount = 0;
            socket.rateLimitReset = Date.now() + 60000;

            // Cache auth for 5 minutes
            authCache.set(token, {
                userId: decodedToken.uid,
                email: decodedToken.email || '',
                expires: Date.now() + 5 * 60 * 1000,
            });

            logger.debug(`Socket authenticated for user: ${socket.userId}`);
            next();
        } catch (error) {
            logger.error('Socket authentication failed:', error);
            next(new Error('Authentication failed'));
        }
    });

    // Rate limiting middleware
    io.use((socket: AuthenticatedSocket, next) => {
        const now = Date.now();

        if (!socket.rateLimitReset || now > socket.rateLimitReset) {
            socket.rateLimitCount = 0;
            socket.rateLimitReset = now + 60000;
        }

        next();
    });

    // Connection handler
    io.on('connection', (socket: AuthenticatedSocket) => {
        const userId = socket.userId!;

        // Update stats
        connectionStats.totalConnections++;
        connectionStats.activeConnections++;
        connectionStats.peakConnections = Math.max(
            connectionStats.peakConnections,
            connectionStats.activeConnections
        );

        logger.debug(`User connected: ${userId} (active: ${connectionStats.activeConnections})`);

        // Join user's personal room for notifications
        socket.join(`user:${userId}`);
        socket.join(userId); // Also join with just userId for backward compatibility

        // If user is an employee, join employees room for ticket notifications
        // (This would typically check user role from auth token)
        // For now, employees can emit a 'join_employee_room' event to join

        // Set user online status (debounced)
        updateUserStatusDebounced(userId, 'online');

        // Rate limit check helper
        const checkRateLimit = (): boolean => {
            if (!socket.rateLimitCount) socket.rateLimitCount = 0;
            socket.rateLimitCount++;

            if (socket.rateLimitCount > RATE_LIMIT.MESSAGES_PER_MINUTE) {
                socket.emit('error', {
                    code: 'RATE_LIMITED',
                    message: 'Too many messages. Please slow down.',
                });
                return false;
            }
            return true;
        };

        // Join conversation room
        socket.on('join_conversation', async (conversationId: string) => {
            if (!checkRateLimit()) return;

            try {
                const db = getFirestore();
                const convDoc = await db.collection('conversations').doc(conversationId).get();

                if (!convDoc.exists) {
                    socket.emit('error', { message: 'Conversation not found' });
                    return;
                }

                const convData = convDoc.data();
                if (!convData?.participants.includes(userId)) {
                    socket.emit('error', { message: 'Unauthorized' });
                    return;
                }

                socket.join(`conversation:${conversationId}`);
                logger.debug(`User ${userId} joined conversation ${conversationId}`);
            } catch (error) {
                logger.error('Error joining conversation:', error);
                socket.emit('error', { message: 'Failed to join conversation' });
            }
        });

        // Leave conversation room
        socket.on('leave_conversation', (conversationId: string) => {
            socket.leave(`conversation:${conversationId}`);
        });

        // Send message (optimized with batching)
        socket.on('send_message', async (data: {
            conversationId: string;
            content: string;
            type?: 'text' | 'image' | 'file';
        }) => {
            if (!checkRateLimit()) return;

            try {
                const { conversationId, content, type = 'text' } = data;

                // Content validation
                if (!content || content.length > 5000) {
                    socket.emit('error', { message: 'Invalid message content' });
                    return;
                }

                const db = getFirestore();

                // Verify and create message atomically
                const convRef = db.collection('conversations').doc(conversationId);
                const convDoc = await convRef.get();

                if (!convDoc.exists) {
                    socket.emit('error', { message: 'Conversation not found' });
                    return;
                }

                const convData = convDoc.data();
                if (!convData?.participants.includes(userId)) {
                    socket.emit('error', { message: 'Unauthorized' });
                    return;
                }

                const now = new Date().toISOString();
                const messageData = {
                    conversationId,
                    senderId: userId,
                    senderEmail: socket.userEmail,
                    content,
                    type,
                    read: false,
                    createdAt: now,
                };

                // Batch write for atomicity
                const batch = db.batch();
                const messageRef = db.collection('messages').doc();
                batch.set(messageRef, messageData);
                batch.update(convRef, {
                    lastMessage: content.substring(0, 100), // Truncate for preview
                    lastMessageAt: now,
                    updatedAt: now,
                });
                await batch.commit();

                const message = { id: messageRef.id, ...messageData };

                // Emit to conversation room
                io.to(`conversation:${conversationId}`).emit('new_message', message);

                // Track message rate
                connectionStats.lastMinuteMessages.push(Date.now());

                // Send notification to other participants
                const otherParticipants = convData.participants.filter((p: string) => p !== userId);
                for (const participantId of otherParticipants) {
                    io.to(`user:${participantId}`).emit('message_notification', {
                        conversationId,
                        message,
                    });
                }
            } catch (error) {
                logger.error('Error sending message:', error);
                socket.emit('error', { message: 'Failed to send message' });
            }
        });

        // Typing indicator (throttled on client)
        socket.on('typing', (data: { conversationId: string; isTyping: boolean }) => {
            const { conversationId, isTyping } = data;
            socket.to(`conversation:${conversationId}`).emit('user_typing', {
                userId,
                isTyping,
            });
        });

        // Mark messages as read (batched)
        socket.on('mark_as_read', async (data: { conversationId: string }) => {
            if (!checkRateLimit()) return;

            try {
                const { conversationId } = data;
                const db = getFirestore();

                const snapshot = await db.collection('messages')
                    .where('conversationId', '==', conversationId)
                    .where('read', '==', false)
                    .where('senderId', '!=', userId)
                    .limit(100) // Limit batch size
                    .get();

                if (snapshot.empty) return;

                const batch = db.batch();
                snapshot.docs.forEach((doc: any) => {
                    batch.update(doc.ref, { read: true });
                });
                await batch.commit();

                socket.to(`conversation:${conversationId}`).emit('messages_read', {
                    conversationId,
                    userId,
                    count: snapshot.size,
                });
            } catch (error) {
                logger.error('Error marking messages as read:', error);
            }
        });

        // Edit message
        socket.on('edit_message', async (data: { messageId: string; content: string }) => {
            if (!checkRateLimit()) return;

            try {
                const { messageId, content } = data;

                if (!content || content.length > 5000) {
                    socket.emit('error', { message: 'Invalid message content' });
                    return;
                }

                const db = getFirestore();
                const messageDoc = await db.collection('messages').doc(messageId).get();

                if (!messageDoc.exists) {
                    socket.emit('error', { message: 'Message not found' });
                    return;
                }

                const messageData = messageDoc.data();

                // Verify user is sender
                if (messageData?.senderId !== userId) {
                    socket.emit('error', { message: 'Can only edit your own messages' });
                    return;
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

                // Emit to conversation room
                io.to(`conversation:${messageData.conversationId}`).emit('message_edited', updatedMessage);

                logger.debug(`Message edited: ${messageId} by user ${userId}`);
            } catch (error) {
                logger.error('Error editing message:', error);
                socket.emit('error', { message: 'Failed to edit message' });
            }
        });

        // Delete message
        socket.on('delete_message', async (data: { messageId: string }) => {
            if (!checkRateLimit()) return;

            try {
                const { messageId } = data;
                const db = getFirestore();
                const messageDoc = await db.collection('messages').doc(messageId).get();

                if (!messageDoc.exists) {
                    socket.emit('error', { message: 'Message not found' });
                    return;
                }

                const messageData = messageDoc.data();

                // Verify user is sender
                if (messageData?.senderId !== userId) {
                    socket.emit('error', { message: 'Can only delete your own messages' });
                    return;
                }

                // Soft delete
                await messageDoc.ref.update({
                    content: '[Message deleted]',
                    deleted: true,
                    deletedAt: new Date().toISOString(),
                });

                const deletedMessage = {
                    id: messageId,
                    conversationId: messageData.conversationId,
                    content: '[Message deleted]',
                    deleted: true,
                    deletedAt: new Date().toISOString(),
                };

                // Emit to conversation room
                io.to(`conversation:${messageData.conversationId}`).emit('message_deleted', deletedMessage);

                logger.debug(`Message deleted: ${messageId} by user ${userId}`);
            } catch (error) {
                logger.error('Error deleting message:', error);
                socket.emit('error', { message: 'Failed to delete message' });
            }
        });

        // ============================================
        // AGENT CHAT EVENTS (Live Employee Support)
        // ============================================

        /**
         * Agent authentication and connection
         */
        socket.on('agent_connect', async (data: { agentId: string; agentName: string; agentEmail: string }) => {
            try {
                const { agentId, agentName, agentEmail } = data;
                const db = getFirestore();

                // Update agent status to online
                await db.collection('agents').doc(agentId).set({
                    id: agentId,
                    name: agentName,
                    email: agentEmail,
                    status: 'available',
                    socketId: socket.id,
                    currentChats: 0,
                    maxChats: 5,
                    lastOnline: new Date().toISOString(),
                }, { merge: true });

                // Join agent room for broadcasts
                socket.join('agents');
                socket.data.agentId = agentId;
                socket.data.agentName = agentName;

                logger.info(`Agent ${agentName} connected`);

                // Send current queue status
                const queueSnapshot = await db.collection('agent_queue')
                    .where('status', '==', 'waiting')
                    .orderBy('addedAt', 'asc')
                    .get();

                socket.emit('queue_status', {
                    queueLength: queueSnapshot.size,
                });

                socket.emit('agent_connected', { success: true });
            } catch (error) {
                logger.error('Agent connect error:', error);
                socket.emit('error', { message: 'Failed to connect agent' });
            }
        });

        /**
         * Agent sets availability status
         */
        socket.on('agent_set_status', async (data: { status: 'available' | 'busy' | 'offline' }) => {
            try {
                const db = getFirestore();
                const agentId = socket.data.agentId;
                if (!agentId) return;

                await db.collection('agents').doc(agentId).update({
                    status: data.status,
                    lastStatusChange: new Date().toISOString(),
                });

                // Notify other agents
                io.to('agents').emit('agent_status_changed', {
                    agentId,
                    status: data.status,
                });

                logger.info(`Agent ${agentId} status changed to ${data.status}`);
            } catch (error) {
                logger.error('Agent status change error:', error);
            }
        });

        /**
         * Agent accepts chat from queue
         */
        socket.on('agent_accept_chat', async (data: { sessionId: string }) => {
            try {
                const db = getFirestore();
                const admin = await import('firebase-admin');
                const agentId = socket.data.agentId;
                const agentName = socket.data.agentName;
                const { sessionId } = data;

                const sessionDoc = await db.collection('agent_sessions').doc(sessionId).get();
                if (!sessionDoc.exists) {
                    socket.emit('error', { message: 'Session not found' });
                    return;
                }

                const sessionData = sessionDoc.data();

                // Update session with agent info
                await sessionDoc.ref.update({
                    agentId,
                    agentName,
                    status: 'active',
                    acceptedAt: new Date().toISOString(),
                });

                // Update agent's active chats count
                await db.collection('agents').doc(agentId).update({
                    currentChats: admin.firestore.FieldValue.increment(1),
                    status: 'busy',
                });

                // Create room for this chat
                const roomName = `agent_session_${sessionId}`;
                socket.join(roomName);

                // Notify customer that agent joined
                io.emit('agent_joined', {
                    sessionId,
                    userId: sessionData?.userId,
                    agentName,
                    message: `${agentName} has joined the chat. How can I help you today?`,
                });

                logger.info(`Agent ${agentName} accepted session ${sessionId}`);

                socket.emit('chat_accepted', {
                    sessionId,
                    customer: {
                        userId: sessionData?.userId,
                        userName: sessionData?.userName,
                        userEmail: sessionData?.userEmail,
                    },
                    conversationHistory: sessionData?.conversationHistory || [],
                });
            } catch (error) {
                logger.error('Agent accept chat error:', error);
                socket.emit('error', { message: 'Failed to accept chat' });
            }
        });

        /**
         * Agent sends message to customer
         */
        socket.on('agent_send_message', async (data: { sessionId: string; message: string }) => {
            if (!checkRateLimit()) return;

            try {
                const db = getFirestore();
                const admin = await import('firebase-admin');
                const agentId = socket.data.agentId;
                const agentName = socket.data.agentName;
                const { sessionId, message } = data;

                const messageData = {
                    role: 'agent',
                    content: message,
                    timestamp: new Date().toISOString(),
                    agentId,
                    agentName,
                };

                // Save message to session
                await db.collection('agent_sessions').doc(sessionId).update({
                    messages: admin.firestore.FieldValue.arrayUnion(messageData),
                    lastMessageAt: new Date().toISOString(),
                });

                // Broadcast to customer
                io.emit('agent_message', {
                    sessionId,
                    message: messageData,
                });

                logger.debug(`Agent ${agentName} sent message in session ${sessionId}`);
            } catch (error) {
                logger.error('Agent send message error:', error);
                socket.emit('error', { message: 'Failed to send message' });
            }
        });

        /**
         * Customer sends message to agent
         */
        socket.on('customer_send_message', async (data: { sessionId: string; message: string }) => {
            if (!checkRateLimit()) return;

            try {
                const db = getFirestore();
                const admin = await import('firebase-admin');
                const { sessionId, message } = data;

                const messageData = {
                    role: 'user',
                    content: message,
                    timestamp: new Date().toISOString(),
                    userId,
                };

                // Save message to session
                await db.collection('agent_sessions').doc(sessionId).update({
                    messages: admin.firestore.FieldValue.arrayUnion(messageData),
                    lastMessageAt: new Date().toISOString(),
                });

                // Broadcast to agent
                io.emit('customer_message', {
                    sessionId,
                    message: messageData,
                });
            } catch (error) {
                logger.error('Customer send message error:', error);
                socket.emit('error', { message: 'Failed to send message' });
            }
        });

        /**
         * Typing indicator for agent
         */
        socket.on('agent_typing', (data: { sessionId: string; isTyping: boolean }) => {
            io.emit('agent_typing_status', {
                sessionId: data.sessionId,
                isTyping: data.isTyping,
            });
        });

        /**
         * Typing indicator for customer
         */
        socket.on('customer_typing', (data: { sessionId: string; isTyping: boolean }) => {
            io.emit('customer_typing_status', {
                sessionId: data.sessionId,
                isTyping: data.isTyping,
            });
        });

        /**
         * Agent ends chat session
         */
        socket.on('agent_end_session', async (data: { sessionId: string; resolved: boolean }) => {
            try {
                const db = getFirestore();
                const admin = await import('firebase-admin');
                const agentId = socket.data.agentId;
                const { sessionId, resolved } = data;

                // Update session status
                await db.collection('agent_sessions').doc(sessionId).update({
                    status: 'completed',
                    endedAt: new Date().toISOString(),
                    resolved,
                });

                // Update agent's active chats count
                const agentDoc = await db.collection('agents').doc(agentId).get();
                const currentChats = agentDoc.data()?.currentChats || 1;

                await db.collection('agents').doc(agentId).update({
                    currentChats: admin.firestore.FieldValue.increment(-1),
                    status: currentChats <= 1 ? 'available' : 'busy',
                    totalChats: admin.firestore.FieldValue.increment(1),
                });

                // Notify customer to rate
                io.emit('session_ended', {
                    sessionId,
                    message: 'Chat session has ended. Please rate your experience.',
                });

                logger.info(`Agent ended session ${sessionId}`);
            } catch (error) {
                logger.error('Agent end session error:', error);
                socket.emit('error', { message: 'Failed to end session' });
            }
        });

        /**
         * Get all active agent sessions
         */
        socket.on('agent_get_sessions', async () => {
            try {
                const db = getFirestore();
                const agentId = socket.data.agentId;

                const sessionsSnapshot = await db.collection('agent_sessions')
                    .where('agentId', '==', agentId)
                    .where('status', '==', 'active')
                    .get();

                const sessions = sessionsSnapshot.docs.map((doc: any) => ({
                    id: doc.id,
                    ...doc.data(),
                }));

                socket.emit('active_sessions', { sessions });
            } catch (error) {
                logger.error('Get sessions error:', error);
                socket.emit('error', { message: 'Failed to get sessions' });
            }
        });

        /**
         * Get queue status
         */
        socket.on('agent_get_queue', async () => {
            try {
                const db = getFirestore();
                const queueSnapshot = await db.collection('agent_queue')
                    .where('status', '==', 'waiting')
                    .orderBy('addedAt', 'asc')
                    .get();

                const queue = queueSnapshot.docs.map((doc: any) => ({
                    id: doc.id,
                    ...doc.data(),
                }));

                socket.emit('queue_data', { queue });
            } catch (error) {
                logger.error('Get queue error:', error);
            }
        });

        // ============================================
        // SUPPORT TICKET EVENTS (New FAQ-based System)
        // ============================================

        /**
         * Employee joins employees room to receive ticket notifications
         */
        socket.on('join_employee_room', () => {
            socket.join('employees');
            logger.debug(`User ${userId} joined employees room`);
        });

        /**
         * Join ticket room for real-time communication
         */
        socket.on('join_ticket', (data: { ticketId: string }) => {
            const { ticketId } = data;
            socket.join(`ticket:${ticketId}`);
            logger.debug(`User ${userId} joined ticket room: ${ticketId}`);
        });

        /**
         * Leave ticket room
         */
        socket.on('leave_ticket', (data: { ticketId: string }) => {
            const { ticketId } = data;
            socket.leave(`ticket:${ticketId}`);
            logger.debug(`User ${userId} left ticket room: ${ticketId}`);
        });

        // Disconnect handler
        socket.on('disconnect', () => {
            connectionStats.activeConnections--;
            updateUserStatusDebounced(userId, 'offline');
            logger.debug(`User disconnected: ${userId} (active: ${connectionStats.activeConnections})`);
        });
    });

    // Clean up auth cache periodically
    setInterval(() => {
        const now = Date.now();
        for (const [token, data] of authCache.entries()) {
            if (data.expires < now) {
                authCache.delete(token);
            }
        }

        // Clean up message rate tracking
        connectionStats.lastMinuteMessages = connectionStats.lastMinuteMessages.filter(
            t => t > now - 60000
        );
        connectionStats.messagesPerSecond = connectionStats.lastMinuteMessages.length / 60;
    }, 60000);

    return io;
}

// Debounced user status update to reduce database writes
const statusUpdateQueue = new Map<string, { status: string; timeout: NodeJS.Timeout }>();

function updateUserStatusDebounced(userId: string, status: 'online' | 'offline') {
    const existing = statusUpdateQueue.get(userId);
    if (existing) {
        clearTimeout(existing.timeout);
    }

    const timeout = setTimeout(async () => {
        statusUpdateQueue.delete(userId);
        try {
            const db = getFirestore();
            await db.collection('users').doc(userId).update({
                onlineStatus: status,
                lastSeen: new Date().toISOString(),
            });
        } catch (error) {
            logger.error('Error updating user status:', error);
        }
    }, status === 'offline' ? 5000 : 1000); // Delay offline status by 5s

    statusUpdateQueue.set(userId, { status, timeout });
}

/**
 * Get Socket.IO connection statistics
 */
export function getSocketStats() {
    return {
        ...connectionStats,
        messagesPerMinute: connectionStats.lastMinuteMessages.length,
    };
}

export default initializeSocketIO;

