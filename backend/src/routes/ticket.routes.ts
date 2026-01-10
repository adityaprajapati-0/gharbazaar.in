/**
 * 🎫 TICKET ROUTES
 * 
 * Express routes for ticket REST API endpoints.
 * 
 * @author GharBazaar Backend Team
 */

import express from 'express';
import {
    getUserTickets,
    getAllTickets,
    getTicketDetails,
    createTicket,
    assignTicket,
    sendTicketMessage,
    closeTicket,
} from '../controllers/ticket.controller';
import { authenticateRequest } from '../middleware/auth.middleware';

const router = express.Router();

// All routes require authentication
router.use(authenticateRequest);

// Ticket CRUD
router.get('/', getUserTickets);
router.get('/employee/all', getAllTickets);
router.get('/:id', getTicketDetails);
router.post('/', createTicket);

// Ticket actions
router.post('/:id/assign', assignTicket);
router.post('/:id/messages', sendTicketMessage);
router.put('/:id/close', closeTicket);

export default router;
