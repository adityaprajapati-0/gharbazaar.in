import { Router } from 'express';
import { GroundPartnerController } from '../controllers/groundPartner.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
const groundPartnerController = new GroundPartnerController();

router.use(authenticate);
router.use(authorize('ground_partner'));

router.get('/tasks', groundPartnerController.getTasks);
router.get('/tasks/:id', groundPartnerController.getTaskById);
router.put('/tasks/:id', groundPartnerController.updateTask);
router.post('/reports', groundPartnerController.submitReport);
router.get('/visits', groundPartnerController.getVisits);
router.post('/visits', groundPartnerController.scheduleVisit);
router.get('/earnings', groundPartnerController.getEarnings);
router.get('/performance', groundPartnerController.getPerformance);

export default router;
