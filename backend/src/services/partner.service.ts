import { getFirestore } from '../config/firebase';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { notificationService } from './notification.service';

export class PartnerService {
    private db = getFirestore();

    /**
     * Get partner's leads with filters
     */
    async getLeads(partnerId: string, status?: string, limit: number = 50) {
        try {
            let query = this.db
                .collection('partnerLeads')
                .where('partnerId', '==', partnerId)
                .orderBy('createdAt', 'desc');

            if (status) {
                query = query.where('status', '==', status);
            }

            const snapshot = await query.limit(limit).get();

            const leads = snapshot.docs.map((doc: any) => ({
                id: doc.id,
                ...doc.data(),
            }));

            return {
                success: true,
                leads,
                count: leads.length,
            };
        } catch (error) {
            logger.error('Get partner leads error:', error);
            throw new AppError(500, 'Failed to get leads');
        }
    }

    /**
     * Get lead by ID
     */
    async getLeadById(leadId: string, partnerId: string) {
        try {
            const doc = await this.db.collection('partnerLeads').doc(leadId).get();

            if (!doc.exists) {
                throw new AppError(404, 'Lead not found');
            }

            const lead = doc.data();

            // Verify ownership
            if (lead?.partnerId !== partnerId) {
                throw new AppError(403, 'Access denied');
            }

            return {
                success: true,
                lead: { id: doc.id, ...lead },
            };
        } catch (error) {
            logger.error('Get lead error:', error);
            throw error;
        }
    }

    /**
     * Update lead status
     */
    async updateLead(leadId: string, partnerId: string, updates: any) {
        try {
            const leadRef = this.db.collection('partnerLeads').doc(leadId);
            const lead = await leadRef.get();

            if (!lead.exists) {
                throw new AppError(404, 'Lead not found');
            }

            if (lead.data()?.partnerId !== partnerId) {
                throw new AppError(403, 'Access denied');
            }

            await leadRef.update({
                ...updates,
                updatedAt: new Date().toISOString(),
            });

            // If lead converted, calculate commission
            if (updates.status === 'converted') {
                await this.calculateCommission(leadId, partnerId);
            }

            logger.info(`Lead updated: ${leadId}`);

            return {
                success: true,
                message: 'Lead updated successfully',
            };
        } catch (error) {
            logger.error('Update lead error:', error);
            throw error;
        }
    }

    /**
     * Calculate and record commission
     */
    async calculateCommission(leadId: string, partnerId: string) {
        try {
            const leadDoc = await this.db.collection('partnerLeads').doc(leadId).get();
            const lead = leadDoc.data();

            // Commission: 2% of property value
            const commissionRate = 0.02;
            const commissionAmount = (lead?.propertyValue || 0) * commissionRate;

            // Create commission record
            await this.db.collection('partnerCommissions').add({
                partnerId,
                leadId,
                amount: commissionAmount,
                propertyValue: lead?.propertyValue,
                rate: commissionRate,
                status: 'pending',
                createdAt: new Date().toISOString(),
            });

            // Notify partner
            await notificationService.create({
                userId: partnerId,
                type: 'commission_earned',
                title: 'Commission Earned!',
                message: `You earned ₹${commissionAmount.toLocaleString('en-IN')} from lead conversion`,
                data: { leadId, amount: commissionAmount },
            });

            logger.info(`Commission calculated for lead ${leadId}: ₹${commissionAmount}`);
        } catch (error) {
            logger.error('Calculate commission error:', error);
        }
    }

    /**
     * Get partner earnings
     */
    async getEarnings(partnerId: string) {
        try {
            const snapshot = await this.db
                .collection('partnerCommissions')
                .where('partnerId', '==', partnerId)
                .get();

            const commissions = snapshot.docs.map((doc: any) => ({
                id: doc.id,
                ...doc.data(),
            }));

            const totalEarnings = commissions.reduce((sum: number, c: any) => sum + (c.amount || 0), 0);
            const paidEarnings = commissions
                .filter((c: any) => c.status === 'paid')
                .reduce((sum: number, c: any) => sum + (c.amount || 0), 0);
            const pendingEarnings = commissions
                .filter((c: any) => c.status === 'pending')
                .reduce((sum: number, c: any) => sum + (c.amount || 0), 0);

            return {
                success: true,
                earnings: {
                    total: totalEarnings,
                    paid: paidEarnings,
                    pending: pendingEarnings,
                    currency: 'INR',
                    commissions: commissions.slice(0, 10), // Latest 10
                },
            };
        } catch (error) {
            logger.error('Get earnings error:', error);
            throw new AppError(500, 'Failed to get earnings');
        }
    }

    /**
     * Get partner referrals
     */
    async getReferrals(partnerId: string) {
        try {
            const snapshot = await this.db
                .collection('partnerReferrals')
                .where('partnerId', '==', partnerId)
                .orderBy('createdAt', 'desc')
                .get();

            const referrals = snapshot.docs.map((doc: any) => ({
                id: doc.id,
                ...doc.data(),
            }));

            return {
                success: true,
                referrals,
                count: referrals.length,
            };
        } catch (error) {
            logger.error('Get referrals error:', error);
            throw new AppError(500, 'Failed to get referrals');
        }
    }

    /**
     * Create referral
     */
    async createReferral(partnerId: string, referralData: any) {
        try {
            const { name, email, phone, propertyType, budget, notes } = referralData;

            // Create referral
            const referralRef = await this.db.collection('partnerReferrals').add({
                partnerId,
                name,
                email,
                phone,
                propertyType,
                budget,
                notes,
                status: 'new',
                createdAt: new Date().toISOString(),
            });

            // Create lead from referral
            await this.db.collection('partnerLeads').add({
                partnerId,
                referralId: referralRef.id,
                customerName: name,
                customerEmail: email,
                customerPhone: phone,
                propertyType,
                budget,
                status: 'new',
                source: 'referral',
                createdAt: new Date().toISOString(),
            });

            logger.info(`Referral created: ${referralRef.id}`);

            return {
                success: true,
                referral: {
                    id: referralRef.id,
                    ...referralData,
                },
            };
        } catch (error) {
            logger.error('Create referral error:', error);
            throw new AppError(500, 'Failed to create referral');
        }
    }

    /**
     * Get payment history
     */
    async getPayments(partnerId: string) {
        try {
            const snapshot = await this.db
                .collection('partnerPayments')
                .where('partnerId', '==', partnerId)
                .orderBy('paidAt', 'desc')
                .get();

            const payments = snapshot.docs.map((doc: any) => ({
                id: doc.id,
                ...doc.data(),
            }));

            return {
                success: true,
                payments,
                count: payments.length,
            };
        } catch (error) {
            logger.error('Get payments error:', error);
            throw new AppError(500, 'Failed to get payments');
        }
    }
}

export const partnerService = new PartnerService();
