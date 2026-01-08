import { Router } from 'express';
import { supportTicketController } from '../controllers/supportTicket.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Customer routes
router.post('/', supportTicketController.createTicket.bind(supportTicketController));
router.get('/my-tickets', supportTicketController.getUserTickets.bind(supportTicketController));
router.get('/:ticketId', supportTicketController.getTicket.bind(supportTicketController));
router.post('/:ticketId/messages', supportTicketController.sendMessage.bind(supportTicketController));
router.post(
    '/:ticketId/files',
    supportTicketController.getUploadMiddleware(),
    supportTicketController.uploadFile.bind(supportTicketController)
);
router.post('/:ticketId/feedback', supportTicketController.submitFeedback.bind(supportTicketController));

// Employee routes (for employee dashboard)
router.get('/employee/all', supportTicketController.getEmployeeTickets.bind(supportTicketController));
router.post('/:ticketId/assign', supportTicketController.assignTicket.bind(supportTicketController));
router.put('/:ticketId/close', supportTicketController.closeTicket.bind(supportTicketController));
router.get('/employee/stats', supportTicketController.getStats.bind(supportTicketController));

export default router;
