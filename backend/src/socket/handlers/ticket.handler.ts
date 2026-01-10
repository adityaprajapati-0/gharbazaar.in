/**
 * 🎫 TICKET EVENT HANDLER
 * 
 * Handles all Socket.IO events for employee-customer support ticketing.
 * Manages ticket creation, assignment, messaging, and status updates.
 * 
 * @author GharBazaar Backend Team
 */

import { Server, Socket } from 'socket.io';
import { getSocketUser } from '../auth.middleware';
import Ticket from '../../models/ticket.model';
import TicketMessage from '../../models/ticketMessage.model';
import { isMongoDBAvailable, memoryTickets, memoryTicketMessages } from '../../utils/memoryStore';
import { v4 as uuidv4 } from 'uuid';

/**
 * 🎫 REGISTER TICKET EVENT HANDLERS
 * 
 * Sets up all ticketing events for employees and customers.
 * Called when a user successfully connects to Socket.IO.
 * 
 * @param io - Socket.IO server instance
 * @param socket - Individual user's socket connection
 */
export const registerTicketHandlers = (io: Server, socket: Socket) => {
    const user = getSocketUser(socket);

    console.log(`🎫 Ticket handlers registered for: ${user.email}`);

    /**
     * 👥 JOIN EMPLOYEE ROOM
     * 
     * Employees join a broadcast room to receive ALL new ticket notifications.
     * This allows real-time dashboard updates for all support staff.
     * 
     * Frontend (employee only): socket.emit('join_employee_room')
     */
    socket.on('join_employee_room', () => {
        // Only employees can join this room
        if (user.role !== 'employee' && user.role !== 'admin') {
            socket.emit('error', { message: 'Only employees can join employee room' });
            return;
        }

        const employeeRoom = 'employees';
        socket.join(employeeRoom);

        console.log(`👔 Employee ${user.email} joined employee broadcast room`);
    });

    /**
     * 🎫 JOIN SPECIFIC TICKET
     * 
     * Join a specific ticket room to receive real-time updates for that ticket.
     * Both customers and assigned employees can join.
     * 
     * Frontend: socket.emit('join_ticket', { ticketId })
     */
    socket.on('join_ticket', async (data: { ticketId: string }) => {
        try {
            const { ticketId } = data;

            // Verify ticket exists
            let ticket;
            if (isMongoDBAvailable()) {
                ticket = await Ticket.findById(ticketId);
            } else {
                ticket = memoryTickets.get(ticketId);
            }

            if (!ticket) {
                socket.emit('error', { message: 'Ticket not found' });
                return;
            }

            // Authorization: Customer must own ticket, or be assigned employee
            const isOwner = ticket.userId === user.userId;
            const isAssignedEmployee = ticket.assignedTo === user.userId;
            const isEmployee = user.role === 'employee' || user.role === 'admin';

            if (!isOwner && !isAssignedEmployee && !isEmployee) {
                socket.emit('error', { message: 'Not authorized for this ticket' });
                return;
            }

            // Join the ticket room
            await socket.join(ticketId);

            console.log(`✅ ${user.email} joined ticket: ${ticketId}${!isMongoDBAvailable() ? ' (Memory Mode)' : ''}`);

        } catch (error) {
            console.error('❌ Error joining ticket:', error);
            socket.emit('error', { message: 'Failed to join ticket' });
        }
    });

    /**
     * 🚶 LEAVE TICKET
     * 
     * Leave a ticket room (stop receiving updates).
     * Frontend: socket.emit('leave_ticket', { ticketId })
     */
    socket.on('leave_ticket', (data: { ticketId: string }) => {
        const { ticketId } = data;
        socket.leave(ticketId);
        console.log(`📤 ${user.email} left ticket: ${ticketId}`);
    });

    /**
     * 📨 SEND TICKET MESSAGE
     * 
     * Send a message in a support ticket (customer or employee).
     * Message is saved and broadcast to all participants.
     * 
     * Frontend: socket.emit('ticket_message', { ticketId, message })
     */
    socket.on('ticket_message', async (data: {
        ticketId: string;
        message: string;
        fileUrl?: string;
        fileName?: string;
    }) => {
        try {
            const { ticketId, message, fileUrl, fileName } = data;

            // Verify ticket exists
            let ticket;
            if (isMongoDBAvailable()) {
                ticket = await Ticket.findById(ticketId);
            } else {
                ticket = memoryTickets.get(ticketId);
            }

            if (!ticket) {
                socket.emit('error', { message: 'Ticket not found' });
                return;
            }

            // Determine sender type
            const isEmployee = user.role === 'employee' || user.role === 'admin';
            const senderType = isEmployee ? 'employee' : 'customer';

            let ticketMessage;
            if (isMongoDBAvailable()) {
                // Create the ticket message
                ticketMessage = await TicketMessage.create({
                    ticketId,
                    senderId: user.userId,
                    senderType,
                    message,
                    fileUrl,
                    fileName,
                    timestamp: new Date(),
                });

                // Update ticket status if employee responds
                if (isEmployee && ticket.status === 'assigned') {
                    ticket.status = 'in_progress';
                    await ticket.save();
                }
            } else {
                // In-memory ticket message creation
                const messageId = uuidv4();
                const timestamp = new Date();
                ticketMessage = {
                    _id: messageId,
                    ticketId,
                    senderId: user.userId,
                    senderType,
                    message,
                    fileUrl,
                    fileName,
                    timestamp,
                };

                // Store in memory
                if (!memoryTicketMessages.has(ticketId)) {
                    memoryTicketMessages.set(ticketId, []);
                }
                memoryTicketMessages.get(ticketId).push(ticketMessage);

                // Update ticket status if employee responds
                if (isEmployee && ticket.status === 'assigned') {
                    ticket.status = 'in_progress';
                }
            }

            // Prepare message data for broadcast
            const messageData = {
                id: isMongoDBAvailable() ? ticketMessage._id.toString() : ticketMessage._id,
                ticketId,
                senderId: user.userId,
                senderType,
                message,
                fileUrl,
                fileName,
                timestamp: isMongoDBAvailable() ? ticketMessage.timestamp.toISOString() : ticketMessage.timestamp.toISOString(),
            };

            // Broadcast to everyone in the ticket room
            io.to(ticketId).emit('ticket:customer-message', messageData);

            // If customer sent message, notify all employees
            if (senderType === 'customer') {
                io.to('employees').emit('ticket:new-message', {
                    ticketId,
                    userId: user.userId,
                    preview: message.substring(0, 50),
                });
            }

            console.log(`✅ Ticket message sent: ${ticketId} by ${senderType}`);

        } catch (error) {
            console.error('❌ Error sending ticket message:', error);
            socket.emit('error', { message: 'Failed to send message' });
        }
    });

    /**
     * 👔 ASSIGN TICKET
     * 
     * Employee assigns a ticket to themselves.
     * Frontend (employee): socket.emit('assign_ticket', { ticketId })
     */
    socket.on('assign_ticket', async (data: { ticketId: string }) => {
        try {
            const { ticketId } = data;

            // Only employees can assign tickets
            if (user.role !== 'employee' && user.role !== 'admin') {
                socket.emit('error', { message: 'Only employees can assign tickets' });
                return;
            }

            let ticket;
            if (isMongoDBAvailable()) {
                // Update the ticket
                ticket = await Ticket.findByIdAndUpdate(
                    ticketId,
                    {
                        assignedTo: user.userId,
                        assignedToName: user.email.split('@')[0], // Simple name from email
                        status: 'assigned',
                    },
                    { new: true }
                );
            } else {
                // Update in memory
                ticket = memoryTickets.get(ticketId);
                if (ticket) {
                    ticket.assignedTo = user.userId;
                    ticket.assignedToName = user.email.split('@')[0];
                    ticket.status = 'assigned';
                }
            }

            if (!ticket) {
                socket.emit('error', { message: 'Ticket not found' });
                return;
            }

            // Notify everyone in the ticket room
            io.to(ticketId).emit('ticket:assigned', {
                ticketId,
                assignedTo: user.userId,
                assignedToName: user.email.split('@')[0],
                status: 'assigned',
            });

            // Notify all employees
            io.to('employees').emit('ticket:status-changed', {
                ticketId,
                status: 'assigned',
                assignedTo: user.userId,
            });

            console.log(`✅ Ticket ${ticketId} assigned to ${user.email}`);

        } catch (error) {
            console.error('❌ Error assigning ticket:', error);
            socket.emit('error', { message: 'Failed to assign ticket' });
        }
    });

    /**
     * ✅ CLOSE TICKET
     * 
     * Employee closes a resolved ticket.
     * Frontend (employee): socket.emit('close_ticket', { ticketId })
     */
    socket.on('close_ticket', async (data: { ticketId: string }) => {
        try {
            const { ticketId } = data;

            // Only assigned employee can close
            const ticket = await Ticket.findById(ticketId);

            if (!ticket) {
                socket.emit('error', { message: 'Ticket not found' });
                return;
            }

            if (ticket.assignedTo !== user.userId) {
                socket.emit('error', { message: 'Only assigned employee can close this ticket' });
                return;
            }

            // Update ticket status
            ticket.status = 'closed';
            ticket.closedAt = new Date();
            await ticket.save();

            // Notify everyone
            io.to(ticketId).emit('ticket:closed', {
                ticketId,
                status: 'closed',
                closedAt: ticket.closedAt.toISOString(),
            });

            console.log(`✅ Ticket ${ticketId} closed by ${user.email}`);

        } catch (error) {
            console.error('❌ Error closing ticket:', error);
            socket.emit('error', { message: 'Failed to close ticket' });
        }
    });
};
