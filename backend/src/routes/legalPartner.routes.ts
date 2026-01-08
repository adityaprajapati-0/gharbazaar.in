import { Router } from 'express';
import { LegalPartnerController } from '../controllers/legalPartner.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
const legalPartnerController = new LegalPartnerController();

router.use(authenticate);
router.use(authorize('legal_partner'));

router.get('/cases', legalPartnerController.getCases);
router.get('/cases/:id', legalPartnerController.getCaseById);
router.post('/cases', legalPartnerController.createCase);
router.put('/cases/:id', legalPartnerController.updateCase);
router.get('/documents', legalPartnerController.getDocuments);
router.post('/documents', legalPartnerController.uploadDocument);
router.get('/due-diligence', legalPartnerController.getDueDiligenceRequests);
router.put('/due-diligence/:id', legalPartnerController.updateDueDiligence);
router.get('/earnings', legalPartnerController.getEarnings);

export default router;
