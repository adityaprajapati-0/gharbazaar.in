import { db, admin } from '../config/firebase';
import { getStorage } from 'firebase-admin/storage';

export interface CreateTicketData {
    userId: string;
    userRole: 'buyer' | 'seller';
    categoryId: string;
    subCategoryId: string;
    categoryTitle: string;
    subCategoryTitle: string;
    problem: string;
}

export interface TicketMessage {
    id: string;
    ticketId: string;
    senderId: string;
    senderType: 'customer' | 'employee';
    message: string;
    fileUrl?: string;
    fileName?: string;
    timestamp: FirebaseFirestore.Timestamp;
}

export interface Ticket {
    id: string;
    userId: string;
    userRole: 'buyer' | 'seller';
    categoryId: string;
    subCategoryId: string;
    categoryTitle: string;
    subCategoryTitle: string;
    problem: string;
    status: 'open' | 'assigned' | 'in_progress' | 'resolved' | 'closed';
    assignedTo?: string; // Employee ID
    assignedToName?: string;
    createdAt: FirebaseFirestore.Timestamp;
    updatedAt: FirebaseFirestore.Timestamp;
    resolvedAt?: FirebaseFirestore.Timestamp;
    rating?: number;
}

export class SupportTicketService {
    private ticketsCollection = db.collection('supportTickets');
    private messagesCollection = db.collection('ticketMessages');
    private storage = getStorage();

    async createTicket(data: CreateTicketData): Promise<string> {
        const ticketData: Omit<Ticket, 'id'> = {
            userId: data.userId,
            userRole: data.userRole,
            categoryId: data.categoryId,
            subCategoryId: data.subCategoryId,
            categoryTitle: data.categoryTitle,
            subCategoryTitle: data.subCategoryTitle,
            problem: data.problem,
            status: 'open',
            createdAt: admin.firestore.Timestamp.now(),
            updatedAt: admin.firestore.Timestamp.now()
        };

        const ticketRef = await this.ticketsCollection.add(ticketData);
        return ticketRef.id;
    }

    async getTicketById(ticketId: string): Promise<Ticket | null> {
        const ticketDoc = await this.ticketsCollection.doc(ticketId).get();

        if (!ticketDoc.exists) {
            return null;
        }

        return {
            id: ticketDoc.id,
            ...ticketDoc.data()
        } as Ticket;
    }

    async getTicketsByUserId(userId: string, status?: string): Promise<Ticket[]> {
        let query: FirebaseFirestore.Query = this.ticketsCollection
            .where('userId', '==', userId)
            .orderBy('createdAt', 'desc');

        if (status) {
            query = query.where('status', '==', status);
        }

        const snapshot = await query.get();
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Ticket));
    }

    async getTicketsForEmployee(employeeId?: string, status?: string): Promise<Ticket[]> {
        let query: FirebaseFirestore.Query = this.ticketsCollection;

        if (employeeId) {
            query = query.where('assignedTo', '==', employeeId);
        } else if (status === 'open') {
            // Unassigned tickets
            query = query.where('status', '==', 'open');
        }

        if (status && status !== 'open') {
            query = query.where('status', '==', status);
        }

        query = query.orderBy('createdAt', 'desc').limit(50);

        const snapshot = await query.get();
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Ticket));
    }

    async assignTicket(ticketId: string, employeeId: string, employeeName: string): Promise<void> {
        await this.ticketsCollection.doc(ticketId).update({
            assignedTo: employeeId,
            assignedToName: employeeName,
            status: 'assigned',
            updatedAt: admin.firestore.Timestamp.now()
        });
    }

    async updateTicketStatus(ticketId: string, status: Ticket['status']): Promise<void> {
        const updateData: any = {
            status,
            updatedAt: admin.firestore.Timestamp.now()
        };

        if (status === 'resolved' || status === 'closed') {
            updateData.resolvedAt = admin.firestore.Timestamp.now();
        }

        await this.ticketsCollection.doc(ticketId).update(updateData);
    }

    async closeTicket(ticketId: string): Promise<void> {
        await this.updateTicketStatus(ticketId, 'closed');
    }

    async addMessage(
        ticketId: string,
        senderId: string,
        senderType: 'customer' | 'employee',
        message: string,
        fileUrl?: string,
        fileName?: string
    ): Promise<string> {
        const messageData = {
            ticketId,
            senderId,
            senderType,
            message,
            timestamp: admin.firestore.Timestamp.now(),
            ...(fileUrl && { fileUrl }),
            ...(fileName && { fileName })
        };

        const messageRef = await this.messagesCollection.add(messageData);

        // Update ticket's updatedAt timestamp
        await this.ticketsCollection.doc(ticketId).update({
            updatedAt: admin.firestore.Timestamp.now()
        });

        return messageRef.id;
    }

    async getMessages(ticketId: string): Promise<TicketMessage[]> {
        const snapshot = await this.messagesCollection
            .where('ticketId', '==', ticketId)
            .orderBy('timestamp', 'asc')
            .get();

        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as TicketMessage));
    }

    async uploadFile(ticketId: string, file: Express.Multer.File): Promise<{ url: string; filename: string }> {
        const bucket = this.storage.bucket();
        const fileName = `tickets/${ticketId}/${Date.now()}_${file.originalname}`;
        const fileUpload = bucket.file(fileName);

        await fileUpload.save(file.buffer, {
            metadata: {
                contentType: file.mimetype,
            },
        });

        await fileUpload.makePublic();
        const url = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

        return {
            url,
            filename: file.originalname
        };
    }

    async submitFeedback(ticketId: string, rating: number): Promise<void> {
        await this.ticketsCollection.doc(ticketId).update({
            rating,
            updatedAt: admin.firestore.Timestamp.now()
        });
    }

    async getTicketStats(employeeId?: string): Promise<{
        total: number;
        open: number;
        assigned: number;
        resolved: number;
        averageRating: number;
    }> {
        let baseQuery: FirebaseFirestore.Query = this.ticketsCollection;

        if (employeeId) {
            baseQuery = baseQuery.where('assignedTo', '==', employeeId);
        }

        const [totalSnap, openSnap, assignedSnap, resolvedSnap] = await Promise.all([
            baseQuery.get(),
            baseQuery.where('status', '==', 'open').get(),
            baseQuery.where('status', '==', 'assigned').get(),
            baseQuery.where('status', '==', 'resolved').get()
        ]);

        const total = totalSnap.size;
        const open = openSnap.size;
        const assigned = assignedSnap.size;
        const resolved = resolvedSnap.size;

        // Calculate average rating
        const ratedTickets = totalSnap.docs.filter(doc => doc.data().rating !== undefined);
        const averageRating = ratedTickets.length > 0
            ? ratedTickets.reduce((sum, doc) => sum + (doc.data().rating || 0), 0) / ratedTickets.length
            : 0;

        return {
            total,
            open,
            assigned,
            resolved,
            averageRating: Math.round(averageRating * 10) / 10
        };
    }
}

export const supportTicketService = new SupportTicketService();
