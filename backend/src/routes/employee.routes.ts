import { Router } from 'express';
import { EmployeeController } from '../controllers/employee.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
const employeeController = new EmployeeController();

router.use(authenticate);
router.use(authorize('employee'));

router.post('/apply', employeeController.submitApplication);
router.get('/leads', employeeController.getLeads);
router.put('/leads/:id', employeeController.updateLead);
router.get('/verification', employeeController.getVerificationRequests);
router.put('/verification/:id', employeeController.processVerification);
router.get('/support', employeeController.getSupportTickets);
router.post('/support', employeeController.createSupportTicket);
router.put('/support/:id', employeeController.updateSupportTicket);

export default router;
