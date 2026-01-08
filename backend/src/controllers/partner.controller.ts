import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { partnerService } from '../services/partner.service';
import { legalPartnerService } from '../services/legalPartner.service';
import { groundPartnerService } from '../services/groundPartner.service';

/**
 * Promotion Partner Controller
 */
export class PartnerController {
    async getLeads(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const partnerId = req.user?.uid!;
            const { status, limit } = req.query;

            const result = await partnerService.getLeads(
                partnerId,
                status as string,
                limit ? parseInt(limit as string) : undefined
            );

            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    async getLeadById(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const partnerId = req.user?.uid!;
            const { id } = req.params;

            const result = await partnerService.getLeadById(id, partnerId);

            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    async updateLead(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const partnerId = req.user?.uid!;
            const { id } = req.params;

            const result = await partnerService.updateLead(id, partnerId, req.body);

            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    async getEarnings(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const partnerId = req.user?.uid!;

            const result = await partnerService.getEarnings(partnerId);

            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    async getReferrals(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const partnerId = req.user?.uid!;

            const result = await partnerService.getReferrals(partnerId);

            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    async createReferral(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const partnerId = req.user?.uid!;

            const result = await partnerService.createReferral(partnerId, req.body);

            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    async getPayments(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const partnerId = req.user?.uid!;

            const result = await partnerService.getPayments(partnerId);

            res.json(result);
        } catch (error) {
            next(error);
        }
    }
}

/**
 * Legal Partner Controller
 */
export class LegalPartnerController {
    async getCases(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const partnerId = req.user?.uid!;
            const { status } = req.query;

            const result = await legalPartnerService.getCases(partnerId, status as string);

            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    async getCaseById(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const partnerId = req.user?.uid!;
            const { id } = req.params;

            const result = await legalPartnerService.getCaseById(id, partnerId);

            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    async createCase(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const partnerId = req.user?.uid!;

            const result = await legalPartnerService.createCase(partnerId, req.body);

            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    async updateCase(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const partnerId = req.user?.uid!;
            const { id } = req.params;

            const result = await legalPartnerService.updateCase(id, partnerId, req.body);

            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    async getDocuments(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const partnerId = req.user?.uid!;
            const { caseId } = req.query;

            const result = await legalPartnerService.getDocuments(partnerId, caseId as string);

            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    async uploadDocument(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const partnerId = req.user?.uid!;

            const result = await legalPartnerService.uploadDocument(partnerId, req.body);

            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    async getDueDiligenceRequests(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const partnerId = req.user?.uid!;

            const result = await legalPartnerService.getDueDiligenceRequests(partnerId);

            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    async updateDueDiligence(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const partnerId = req.user?.uid!;
            const { id } = req.params;

            const result = await legalPartnerService.updateDueDiligence(id, partnerId, req.body);

            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    async getEarnings(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const partnerId = req.user?.uid!;

            const result = await legalPartnerService.getEarnings(partnerId);

            res.json(result);
        } catch (error) {
            next(error);
        }
    }
}

/**
 * Ground Partner Controller
 */
export class GroundPartnerController {
    async getTasks(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const partnerId = req.user?.uid!;
            const { status } = req.query;

            const result = await groundPartnerService.getTasks(partnerId, status as string);

            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    async getTaskById(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const partnerId = req.user?.uid!;
            const { id } = req.params;

            const result = await groundPartnerService.getTaskById(id, partnerId);

            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    async updateTask(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const partnerId = req.user?.uid!;
            const { id } = req.params;

            const result = await groundPartnerService.updateTask(id, partnerId, req.body);

            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    async submitReport(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const partnerId = req.user?.uid!;

            const result = await groundPartnerService.submitReport(partnerId, req.body);

            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    async getVisits(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const partnerId = req.user?.uid!;

            const result = await groundPartnerService.getVisits(partnerId);

            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    async scheduleVisit(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const partnerId = req.user?.uid!;

            const result = await groundPartnerService.scheduleVisit(partnerId, req.body);

            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    async getEarnings(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const partnerId = req.user?.uid!;

            const result = await groundPartnerService.getEarnings(partnerId);

            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    async getPerformance(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const partnerId = req.user?.uid!;

            const result = await groundPartnerService.getPerformance(partnerId);

            res.json(result);
        } catch (error) {
            next(error);
        }
    }
}

/**
 * Employee Controller (placeholder for future implementation)
 */
export class EmployeeController {
    async submitApplication(req: AuthRequest, res: Response) {
        res.json({ success: true, message: 'Implementation pending' });
    }
    async getLeads(req: AuthRequest, res: Response) {
        res.json({ success: true, message: 'Implementation pending' });
    }
    async updateLead(req: AuthRequest, res: Response) {
        res.json({ success: true, message: 'Implementation pending' });
    }
    async getVerificationRequests(req: AuthRequest, res: Response) {
        res.json({ success: true, message: 'Implementation pending' });
    }
    async processVerification(req: AuthRequest, res: Response) {
        res.json({ success: true, message: 'Implementation pending' });
    }
    async getSupportTickets(req: AuthRequest, res: Response) {
        res.json({ success: true, message: 'Implementation pending' });
    }
    async createSupportTicket(req: AuthRequest, res: Response) {
        res.json({ success: true, message: 'Implementation pending' });
    }
    async updateSupportTicket(req: AuthRequest, res: Response) {
        res.json({ success: true, message: 'Implementation pending' });
    }
}
