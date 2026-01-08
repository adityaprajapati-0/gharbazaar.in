import { getFirestore } from '../config/firebase';
import { notificationService } from './notification.service';
import { logger } from '../utils/logger';

interface Lead {
    id?: string;
    propertyId: string;
    buyerId: string;
    sellerId: string;
    buyerName: string;
    buyerEmail: string;
    buyerPhone: string;
    message?: string;
    status: 'new' | 'assigned' | 'qualified' | 'in_progress' | 'closed' | 'lost';
    assignedTo?: string;
    assignedBy?: string;
    partnerId?: string;
    source: 'inquiry' | 'direct' | 'referral';
    createdAt: string;
    updatedAt: string;
}

export class LeadService {
    private db = getFirestore();

    /**
     * Create lead from buyer inquiry
     */
    async createFromInquiry(inquiry: {
        propertyId: string;
        userId: string;
        sellerId: string;
        name: string;
        email: string;
        phone: string;
        message?: string;
    }) {
        try {
            // 1. Create lead
            const leadData: Omit<Lead, 'id'> = {
                propertyId: inquiry.propertyId,
                buyerId: inquiry.userId,
                sellerId: inquiry.sellerId,
                buyerName: inquiry.name,
                buyerEmail: inquiry.email,
                buyerPhone: inquiry.phone,
                message: inquiry.message,
                status: 'new',
                source: 'inquiry',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };

            const leadRef = await this.db.collection('leads').add(leadData);

            // 2. Auto-assign to available employee
            const employee = await this.getAvailableEmployee();
            if (employee) {
                await this.assignToEmployee(leadRef.id, employee.id);
            }

            // 3. Notify seller
            await notificationService.create({
                userId: inquiry.sellerId,
                type: 'new_inquiry',
                title: 'New Inquiry Received!',
                message: `${inquiry.name} is interested in your property`,
                link: `/dashboard/inquiries/${leadRef.id}`,
            });

            // 4. Notify assigned employee
            if (employee) {
                await notificationService.create({
                    userId: employee.id,
                    type: 'new_lead',
                    title: 'New Lead Assigned',
                    message: `Lead from ${inquiry.name} for property`,
                    link: `/employee/leads/${leadRef.id}`,
                });
            }

            logger.info(`Lead created from inquiry: ${leadRef.id}`);

            return { id: leadRef.id, ...leadData };
        } catch (error) {
            logger.error('Error creating lead from inquiry:', error);
            throw error;
        }
    }

    /**
     * Get available employee with least active leads
     */
    private async getAvailableEmployee() {
        try {
            const employees = await this.db
                .collection('users')
                .where('role', '==', 'employee')
                .where('isActive', '==', true)
                .get();

            if (employees.empty) {
                return null;
            }

            // Get lead counts for each employee
            const employeeLeadCounts = await Promise.all(
                employees.docs.map(async (emp) => {
                    const leads = await this.db
                        .collection('leads')
                        .where('assignedTo', '==', emp.id)
                        .where('status', 'in', ['new', 'assigned', 'in_progress'])
                        .get();

                    return {
                        id: emp.id,
                        leadCount: leads.size,
                    };
                })
            );

            // Find employee with least leads
            const leastBusy = employeeLeadCounts.sort((a, b) => a.leadCount - b.leadCount)[0];

            return leastBusy;
        } catch (error) {
            logger.error('Error getting available employee:', error);
            return null;
        }
    }

    /**
     * Assign lead to employee
     */
    async assignToEmployee(leadId: string, employeeId: string, assignedBy?: string) {
        await this.db.collection('leads').doc(leadId).update({
            assignedTo: employeeId,
            assignedBy: assignedBy || 'system',
            assignedAt: new Date().toISOString(),
            status: 'assigned',
            updatedAt: new Date().toISOString(),
        });

        logger.info(`Lead ${leadId} assigned to employee ${employeeId}`);
    }

    /**
     * Update lead status (affects multiple dashboards)
     */
    async updateStatus(
        leadId: string,
        status: Lead['status'],
        updatedBy: string,
        notes?: string
    ) {
        const lead = await this.db.collection('leads').doc(leadId).get();
        if (!lead.exists) {
            throw new Error('Lead not found');
        }

        const leadData = lead.data() as Lead;

        // Update lead
        await this.db.collection('leads').doc(leadId).update({
            status,
            notes: notes || leadData.message,
            lastUpdatedBy: updatedBy,
            updatedAt: new Date().toISOString(),
        });

        // Notify seller if qualified
        if (status === 'qualified') {
            await notificationService.create({
                userId: leadData.sellerId,
                type: 'lead_update',
                title: 'Great News!',
                message: 'A qualified buyer is interested in your property',
                link: `/dashboard/inquiries/${leadId}`,
            });
        }

        // Notify buyer
        await notificationService.create({
            userId: leadData.buyerId,
            type: 'inquiry_update',
            title: 'Inquiry Status Update',
            message: `Your inquiry status: ${status}`,
            link: `/dashboard/proposals/${leadId}`,
        });

        logger.info(`Lead ${leadId} status updated to ${status}`);
    }
}

export const leadService = new LeadService();
