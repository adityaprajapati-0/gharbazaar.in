import { Request, Response } from 'express';
import { supportTicketService } from '../services/supportTicket.service';
import multer from 'multer';

// Configure multer for file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 100 * 1024 * 1024, // 100MB max
    },
    fileFilter: (req, file, cb) => {
        // Allow images, videos, and documents
        const allowedMimes = [
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/webp',
            'video/mp4',
            'video/quicktime',
            'video/x-msvideo',
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];

        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type'));
        }
    }
});

export class SupportTicketController {
    // Create new support ticket
    async createTicket(req: Request, res: Response) {
        try {
            const userId = (req as any).user.uid;
            const { categoryId, subCategoryId, categoryTitle, subCategoryTitle, problem, userRole } = req.body;

            if (!categoryId || !subCategoryId || !problem) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing required fields'
                });
            }

            const ticketId = await supportTicketService.createTicket({
                userId,
                userRole: userRole || 'buyer',
                categoryId,
                subCategoryId,
                categoryTitle,
                subCategoryTitle,
                problem
            });

            // Emit Socket.IO event to notify employees
            const io = (req.app as any).get('io');
            if (io) {
                io.to('employees').emit('ticket:created', {
                    ticketId,
                    categoryTitle,
                    subCategoryTitle,
                    userId,
                    userRole
                });
            }

            res.json({
                success: true,
                ticketId
            });
        } catch (error) {
            console.error('Error creating ticket:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to create ticket'
            });
        }
    }

    // Get ticket details
    async getTicket(req: Request, res: Response) {
        try {
            const { ticketId } = req.params;
            const userId = (req as any).user.uid;
            const userRole = (req as any).user.role;

            const ticket = await supportTicketService.getTicketById(ticketId);

            if (!ticket) {
                return res.status(404).json({
                    success: false,
                    error: 'Ticket not found'
                });
            }

            // Check permissions
            if (userRole !== 'employee' && ticket.userId !== userId) {
                return res.status(403).json({
                    success: false,
                    error: 'Unauthorized'
                });
            }

            const messages = await supportTicketService.getMessages(ticketId);

            res.json({
                success: true,
                ticket,
                messages
            });
        } catch (error) {
            console.error('Error getting ticket:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get ticket'
            });
        }
    }

    // Get user's tickets
    async getUserTickets(req: Request, res: Response) {
        try {
            const userId = (req as any).user.uid;
            const { status } = req.query;

            const tickets = await supportTicketService.getTicketsByUserId(userId, status as string);

            res.json({
                success: true,
                tickets
            });
        } catch (error) {
            console.error('Error getting user tickets:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get tickets'
            });
        }
    }

    // Get employee tickets
    async getEmployeeTickets(req: Request, res: Response) {
        try {
            const employeeId = (req as any).user.uid;
            const { status, all } = req.query;

            // If 'all' query param is present, get all tickets; otherwise get assigned to this employee
            const tickets = await supportTicketService.getTicketsForEmployee(
                all === 'true' ? undefined : employeeId,
                status as string
            );

            res.json({
                success: true,
                tickets
            });
        } catch (error) {
            console.error('Error getting employee tickets:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get tickets'
            });
        }
    }

    // Assign ticket to employee
    async assignTicket(req: Request, res: Response) {
        try {
            const { ticketId } = req.params;
            const employeeId = (req as any).user.uid;
            const employeeName = (req as any).user.displayName || 'Support Agent';

            const ticket = await supportTicketService.getTicketById(ticketId);

            if (!ticket) {
                return res.status(404).json({
                    success: false,
                    error: 'Ticket not found'
                });
            }

            if (ticket.status !== 'open') {
                return res.status(400).json({
                    success: false,
                    error: 'Ticket already assigned'
                });
            }

            await supportTicketService.assignTicket(ticketId, employeeId, employeeName);

            // Notify customer via Socket.IO
            const io = (req.app as any).get('io');
            if (io) {
                io.to(ticket.userId).emit('ticket:assigned', {
                    ticketId,
                    agentName: employeeName,
                    userId: ticket.userId
                });
            }

            res.json({
                success: true,
                message: 'Ticket assigned successfully'
            });
        } catch (error) {
            console.error('Error assigning ticket:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to assign ticket'
            });
        }
    }

    // Send message
    async sendMessage(req: Request, res: Response) {
        try {
            const { ticketId } = req.params;
            const userId = (req as any).user.uid;
            const userRole = (req as any).user.role;
            const { message } = req.body;

            if (!message) {
                return res.status(400).json({
                    success: false,
                    error: 'Message is required'
                });
            }

            const ticket = await supportTicketService.getTicketById(ticketId);

            if (!ticket) {
                return res.status(404).json({
                    success: false,
                    error: 'Ticket not found'
                });
            }

            // Check permissions
            const isCustomer = ticket.userId === userId;
            const isAssignedEmployee = ticket.assignedTo === userId;

            if (!isCustomer && !isAssignedEmployee) {
                return res.status(403).json({
                    success: false,
                    error: 'Unauthorized'
                });
            }

            const messageId = await supportTicketService.addMessage(
                ticketId,
                userId,
                userRole === 'employee' ? 'employee' : 'customer',
                message
            );

            // Emit real-time message
            const io = (req.app as any).get('io');
            if (io) {
                const event = isCustomer ? 'ticket:customer-message' : 'ticket:message';
                const room = isCustomer ? `ticket:${ticketId}` : ticket.userId;

                io.to(room).emit(event, {
                    ticketId,
                    messageId,
                    message,
                    senderId: userId,
                    senderType: userRole === 'employee' ? 'employee' : 'customer',
                    timestamp: new Date()
                });
            }

            res.json({
                success: true,
                messageId
            });
        } catch (error) {
            console.error('Error sending message:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to send message'
            });
        }
    }

    // Upload file
    async uploadFile(req: Request, res: Response) {
        try {
            const { ticketId } = req.params;
            const userId = (req as any).user.uid;
            const file = req.file;

            if (!file) {
                return res.status(400).json({
                    success: false,
                    error: 'No file provided'
                });
            }

            const ticket = await supportTicketService.getTicketById(ticketId);

            if (!ticket) {
                return res.status(404).json({
                    success: false,
                    error: 'Ticket not found'
                });
            }

            // Only customer can upload files
            if (ticket.userId !== userId) {
                return res.status(403).json({
                    success: false,
                    error: 'Unauthorized'
                });
            }

            const { url, filename } = await supportTicketService.uploadFile(ticketId, file);

            // Add message with file
            await supportTicketService.addMessage(
                ticketId,
                userId,
                'customer',
                `Uploaded file: ${filename}`,
                url,
                filename
            );

            // Emit real-time notification
            const io = (req.app as any).get('io');
            if (io) {
                io.to(`ticket:${ticketId}`).emit('ticket:file-upload', {
                    ticketId,
                    fileUrl: url,
                    fileName: filename,
                    userId
                });
            }

            res.json({
                success: true,
                fileUrl: url,
                fileName: filename
            });
        } catch (error) {
            console.error('Error uploading file:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to upload file'
            });
        }
    }

    // Close ticket
    async closeTicket(req: Request, res: Response) {
        try {
            const { ticketId } = req.params;
            const userId = (req as any).user.uid;
            const userRole = (req as any).user.role;

            const ticket = await supportTicketService.getTicketById(ticketId);

            if (!ticket) {
                return res.status(404).json({
                    success: false,
                    error: 'Ticket not found'
                });
            }

            // Only assigned employee can close
            if (userRole !== 'employee' || ticket.assignedTo !== userId) {
                return res.status(403).json({
                    success: false,
                    error: 'Unauthorized'
                });
            }

            await supportTicketService.closeTicket(ticketId);

            // Notify customer
            const io = (req.app as any).get('io');
            if (io) {
                io.to(ticket.userId).emit('ticket:closed', {
                    ticketId,
                    userId: ticket.userId
                });
            }

            res.json({
                success: true,
                message: 'Ticket closed successfully'
            });
        } catch (error) {
            console.error('Error closing ticket:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to close ticket'
            });
        }
    }

    // Submit feedback
    async submitFeedback(req: Request, res: Response) {
        try {
            const { ticketId } = req.params;
            const userId = (req as any).user.uid;
            const { rating } = req.body;

            if (!rating || rating < 1 || rating > 5) {
                return res.status(400).json({
                    success: false,
                    error: 'Valid rating (1-5) is required'
                });
            }

            const ticket = await supportTicketService.getTicketById(ticketId);

            if (!ticket) {
                return res.status(404).json({
                    success: false,
                    error: 'Ticket not found'
                });
            }

            if (ticket.userId !== userId) {
                return res.status(403).json({
                    success: false,
                    error: 'Unauthorized'
                });
            }

            if (ticket.status !== 'closed') {
                return res.status(400).json({
                    success: false,
                    error: 'Can only rate closed tickets'
                });
            }

            await supportTicketService.submitFeedback(ticketId, rating);

            res.json({
                success: true,
                message: 'Feedback submitted successfully'
            });
        } catch (error) {
            console.error('Error submitting feedback:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to submit feedback'
            });
        }
    }

    // Get ticket statistics
    async getStats(req: Request, res: Response) {
        try {
            const userRole = (req as any).user.role;
            const employeeId = userRole === 'employee' ? (req as any).user.uid : undefined;

            const stats = await supportTicketService.getTicketStats(employeeId);

            res.json({
                success: true,
                stats
            });
        } catch (error) {
            console.error('Error getting stats:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get stats'
            });
        }
    }

    // Multer upload middleware
    getUploadMiddleware() {
        return upload.single('file');
    }
}

export const supportTicketController = new SupportTicketController();
