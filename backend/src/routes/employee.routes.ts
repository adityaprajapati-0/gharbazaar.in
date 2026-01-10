import express from 'express';
import * as employeeController from '../controllers/employee.controller';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

router.use(authenticateToken);

router.get('/tickets', employeeController.getTickets);
router.get('/active-conversations', employeeController.getActiveConversations);
router.post('/quick-response', employeeController.sendQuickResponse);
router.get('/user-history/:userId', employeeController.getUserHistory);
router.get('/stats', employeeController.getEmployeeStats);

export default router;
