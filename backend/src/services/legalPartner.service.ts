import { getFirestore } from '../config/firebase';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { notificationService } from './notification.service';

export class LegalPartnerService {
    private db = getFirestore();

    /**
     * Get legal partner's cases
     */
    async getCases(partnerId: string, status?: string) {
        try {
            let query = this.db
                .collection('legalCases')
                .where('legalPartnerId', '==', partnerId)
                .orderBy('createdAt', 'desc');

            if (status) {
                query = query.where('status', '==', status);
            }

            const snapshot = await query.get();

            const cases = snapshot.docs.map((doc: any) => ({
                id: doc.id,
                ...doc.data(),
            }));

            return {
                success: true,
                cases,
                count: cases.length,
            };
        } catch (error) {
            logger.error('Get cases error:', error);
            throw new AppError(500, 'Failed to get cases');
        }
    }

    /**
     * Get case by ID
     */
    async getCaseById(caseId: string, partnerId: string) {
        try {
            const doc = await this.db.collection('legalCases').doc(caseId).get();

            if (!doc.exists) {
                throw new AppError(404, 'Case not found');
            }

            const caseData = doc.data();

            if (caseData?.legalPartnerId !== partnerId) {
                throw new AppError(403, 'Access denied');
            }

            return {
                success: true,
                case: { id: doc.id, ...caseData },
            };
        } catch (error) {
            logger.error('Get case error:', error);
            throw error;
        }
    }

    /**
     * Create new case
     */
    async createCase(partnerId: string, caseData: any) {
        try {
            const { propertyId, clientId, caseType, description, priority } = caseData;

            const caseRef = await this.db.collection('legalCases').add({
                legalPartnerId: partnerId,
                propertyId,
                clientId,
                caseType, // title_verification, documentation, property_dispute, due_diligence
                description,
                priority: priority || 'medium',
                status: 'open',
                documents: [],
                milestones: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            });

            // Notify client
            await notificationService.create({
                userId: clientId,
                type: 'legal_case_created',
                title: 'Legal Case Assigned',
                message: `Your ${caseType} case has been assigned to a legal partner`,
                data: { caseId: caseRef.id, caseType },
            });

            logger.info(`Legal case created: ${caseRef.id}`);

            return {
                success: true,
                case: {
                    id: caseRef.id,
                    ...caseData,
                },
            };
        } catch (error) {
            logger.error('Create case error:', error);
            throw new AppError(500, 'Failed to create case');
        }
    }

    /**
     * Update case
     */
    async updateCase(caseId: string, partnerId: string, updates: any) {
        try {
            const caseRef = this.db.collection('legalCases').doc(caseId);
            const caseDoc = await caseRef.get();

            if (!caseDoc.exists) {
                throw new AppError(404, 'Case not found');
            }

            if (caseDoc.data()?.legalPartnerId !== partnerId) {
                throw new AppError(403, 'Access denied');
            }

            await caseRef.update({
                ...updates,
                updatedAt: new Date().toISOString(),
            });

            // If case closed, calculate fees
            if (updates.status === 'closed') {
                await this.calculateFees(caseId, partnerId);
            }

            logger.info(`Case updated: ${caseId}`);

            return {
                success: true,
                message: 'Case updated successfully',
            };
        } catch (error) {
            logger.error('Update case error:', error);
            throw error;
        }
    }

    /**
     * Get case documents
     */
    async getDocuments(partnerId: string, caseId?: string) {
        try {
            let query = this.db
                .collection('legalDocuments')
                .where('legalPartnerId', '==', partnerId)
                .orderBy('uploadedAt', 'desc');

            if (caseId) {
                query = query.where('caseId', '==', caseId);
            }

            const snapshot = await query.get();

            const documents = snapshot.docs.map((doc: any) => ({
                id: doc.id,
                ...doc.data(),
            }));

            return {
                success: true,
                documents,
                count: documents.length,
            };
        } catch (error) {
            logger.error('Get documents error:', error);
            throw new AppError(500, 'Failed to get documents');
        }
    }

    /**
     * Upload document
     */
    async uploadDocument(partnerId: string, documentData: any) {
        try {
            const { caseId, fileName, fileUrl, fileType, description } = documentData;

            const docRef = await this.db.collection('legalDocuments').add({
                legalPartnerId: partnerId,
                caseId,
                fileName,
                fileUrl,
                fileType,
                description,
                uploadedAt: new Date().toISOString(),
            });

            // Update case with document reference
            if (caseId) {
                const caseRef = this.db.collection('legalCases').doc(caseId);
                const caseDoc = await caseRef.get();
                const documents = caseDoc.data()?.documents || [];

                await caseRef.update({
                    documents: [...documents, docRef.id],
                    updatedAt: new Date().toISOString(),
                });
            }

            logger.info(`Document uploaded: ${docRef.id}`);

            return {
                success: true,
                document: {
                    id: docRef.id,
                    ...documentData,
                },
            };
        } catch (error) {
            logger.error('Upload document error:', error);
            throw new AppError(500, 'Failed to upload document');
        }
    }

    /**
     * Get due diligence requests
     */
    async getDueDiligenceRequests(partnerId: string) {
        try {
            const snapshot = await this.db
                .collection('dueDiligenceRequests')
                .where('assignedTo', '==', partnerId)
                .orderBy('createdAt', 'desc')
                .get();

            const requests = snapshot.docs.map((doc: any) => ({
                id: doc.id,
                ...doc.data(),
            }));

            return {
                success: true,
                requests,
                count: requests.length,
            };
        } catch (error) {
            logger.error('Get due diligence requests error:', error);
            throw new AppError(500, 'Failed to get requests');
        }
    }

    /**
     * Update due diligence status
     */
    async updateDueDiligence(requestId: string, partnerId: string, updates: any) {
        try {
            const requestRef = this.db.collection('dueDiligenceRequests').doc(requestId);
            const requestDoc = await requestRef.get();

            if (!requestDoc.exists) {
                throw new AppError(404, 'Request not found');
            }

            if (requestDoc.data()?.assignedTo !== partnerId) {
                throw new AppError(403, 'Access denied');
            }

            await requestRef.update({
                ...updates,
                updatedAt: new Date().toISOString(),
            });

            logger.info(`Due diligence updated: ${requestId}`);

            return {
                success: true,
                message: 'Due diligence updated successfully',
            };
        } catch (error) {
            logger.error('Update due diligence error:', error);
            throw error;
        }
    }

    /**
     * Calculate legal fees
     */
    async calculateFees(caseId: string, partnerId: string) {
        try {
            const caseDoc = await this.db.collection('legalCases').doc(caseId).get();
            const caseData = caseDoc.data();

            // Fee structure based on case type
            const feeStructure: any = {
                title_verification: 5000,
                documentation: 10000,
                property_dispute: 25000,
                due_diligence: 15000,
            };

            const feeAmount = feeStructure[caseData?.caseType] || 10000;

            // Create fee record
            await this.db.collection('legalFees').add({
                legalPartnerId: partnerId,
                caseId,
                amount: feeAmount,
                caseType: caseData?.caseType,
                status: 'pending',
                createdAt: new Date().toISOString(),
            });

            await notificationService.create({
                userId: partnerId,
                type: 'fee_earned',
                title: 'Fee Earned',
                message: `You earned ₹${feeAmount.toLocaleString('en-IN')} for case completion`,
                data: { caseId, amount: feeAmount },
            });

            logger.info(`Legal fees calculated for case ${caseId}: ₹${feeAmount}`);
        } catch (error) {
            logger.error('Calculate fees error:', error);
        }
    }

    /**
     * Get earnings
     */
    async getEarnings(partnerId: string) {
        try {
            const snapshot = await this.db
                .collection('legalFees')
                .where('legalPartnerId', '==', partnerId)
                .get();

            const fees = snapshot.docs.map((doc: any) => ({
                id: doc.id,
                ...doc.data(),
            }));

            const totalEarnings = fees.reduce((sum: number, f: any) => sum + (f.amount || 0), 0);
            const paidEarnings = fees
                .filter((f: any) => f.status === 'paid')
                .reduce((sum: number, f: any) => sum + (f.amount || 0), 0);
            const pendingEarnings = fees
                .filter((f: any) => f.status === 'pending')
                .reduce((sum: number, f: any) => sum + (f.amount || 0), 0);

            return {
                success: true,
                earnings: {
                    total: totalEarnings,
                    paid: paidEarnings,
                    pending: pendingEarnings,
                    currency: 'INR',
                    fees: fees.slice(0, 10),
                },
            };
        } catch (error) {
            logger.error('Get legal earnings error:', error);
            throw new AppError(500, 'Failed to get earnings');
        }
    }
}

export const legalPartnerService = new LegalPartnerService();
