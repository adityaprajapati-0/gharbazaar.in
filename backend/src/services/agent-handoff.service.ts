import { getFirestore } from '../config/firebase';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/errorHandler';
import * as admin from 'firebase-admin';

export interface AgentHandoffRequest {
    userId: string;
    userName: string;
    userEmail: string;
    conversationHistory: any[];
    reason?: string;
    priority: 'low' | 'normal' | 'high';
}

export interface Agent {
    id: string;
    name: string;
    email: string;
    status: 'available' | 'busy' | 'offline';
    currentChats: number;
    maxChats: number;
}

export class AgentHandoffService {
    private db = getFirestore();

    /**
     * Request human agent assistance
     */
    async requestAgent(request: AgentHandoffRequest): Promise<{
        success: boolean;
        queuePosition?: number;
        estimatedWaitTime?: number;
        message: string;
    }> {
        try {
            // Find available agent
            const agent = await this.findAvailableAgent();

            if (!agent) {
                // Add to queue
                const queuePosition = await this.addToQueue(request);
                return {
                    success: true,
                    queuePosition,
                    estimatedWaitTime: queuePosition * 5, // 5 minutes per position
                    message: `You are in queue. Position: ${queuePosition}. Estimated wait: ${queuePosition * 5} minutes.`,
                };
            }

            // Create handoff session
            const sessionRef = await this.db.collection('agent_sessions').add({
                userId: request.userId,
                userName: request.userName,
                userEmail: request.userEmail,
                agentId: agent.id,
                agentName: agent.name,
                conversationHistory: request.conversationHistory,
                reason: request.reason,
                priority: request.priority,
                status: 'active',
                startedAt: new Date().toISOString(),
                messages: [],
            });

            // Update agent status
            await this.db.collection('agents').doc(agent.id).update({
                currentChats: admin.firestore.FieldValue.increment(1),
                status: 'busy',
            });

            logger.info(`Agent ${agent.name} assigned to user ${request.userId}`);

            return {
                success: true,
                message: `Connected to ${agent.name}. They will assist you shortly.`,
            };
        } catch (error) {
            logger.error('Agent handoff error:', error);
            throw new AppError(500, 'Failed to connect to agent');
        }
    }

    /**
     * Find available agent
     */
    private async findAvailableAgent(): Promise<Agent | null> {
        try {
            const snapshot = await this.db
                .collection('agents')
                .where('status', 'in', ['available', 'busy'])
                .get();

            let bestAgent: Agent | null = null;

            snapshot.docs.forEach(doc => {
                const agent = { id: doc.id, ...doc.data() } as Agent;

                if (agent.status === 'available' || agent.currentChats < agent.maxChats) {
                    if (!bestAgent || agent.currentChats < bestAgent.currentChats) {
                        bestAgent = agent;
                    }
                }
            });

            return bestAgent;
        } catch (error) {
            logger.error('Find agent error:', error);
            return null;
        }
    }

    /**
     * Add request to queue
     */
    private async addToQueue(request: AgentHandoffRequest): Promise<number> {
        await this.db.collection('agent_queue').add({
            ...request,
            addedAt: new Date().toISOString(),
            status: 'waiting',
        });

        const queueSnapshot = await this.db
            .collection('agent_queue')
            .where('status', '==', 'waiting')
            .orderBy('addedAt', 'asc')
            .get();

        return queueSnapshot.size;
    }

    /**
     * End agent session
     */
    async endSession(sessionId: string, rating?: number, feedback?: string): Promise<void> {
        try {
            const sessionDoc = await this.db.collection('agent_sessions').doc(sessionId).get();

            if (!sessionDoc.exists) {
                throw new AppError(404, 'Session not found');
            }

            const sessionData = sessionDoc.data();

            // Update session
            await sessionDoc.ref.update({
                status: 'completed',
                endedAt: new Date().toISOString(),
                rating,
                feedback,
            });

            // Update agent status
            if (sessionData?.agentId) {
                const agentDoc = await this.db.collection('agents').doc(sessionData.agentId).get();
                const agentData = agentDoc.data();

                await agentDoc.ref.update({
                    currentChats: admin.firestore.FieldValue.increment(-1),
                    status: (agentData?.currentChats || 1) <= 1 ? 'available' : 'busy',
                    totalChats: admin.firestore.FieldValue.increment(1),
                    totalRating: admin.firestore.FieldValue.increment(rating || 0),
                });
            }

            logger.info(`Agent session ${sessionId} ended`);
        } catch (error) {
            logger.error('End session error:', error);
            throw new AppError(500, 'Failed to end session');
        }
    }

    /**
     * Get active session for user
     */
    async getActiveSession(userId: string): Promise<any> {
        try {
            const snapshot = await this.db
                .collection('agent_sessions')
                .where('userId', '==', userId)
                .where('status', '==', 'active')
                .limit(1)
                .get();

            if (snapshot.empty) {
                return null;
            }

            const doc = snapshot.docs[0];
            return {
                id: doc.id,
                ...doc.data(),
            };
        } catch (error) {
            logger.error('Get session error:', error);
            return null;
        }
    }

    /**
     * Save agent message
     */
    async saveAgentMessage(sessionId: string, message: any): Promise<void> {
        try {
            await this.db.collection('agent_sessions').doc(sessionId).update({
                messages: admin.firestore.FieldValue.arrayUnion(message),
            });
        } catch (error) {
            logger.error('Save message error:', error);
        }
    }
}

export const agentHandoffService = new AgentHandoffService();
