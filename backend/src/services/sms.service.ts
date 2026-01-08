import twilio from 'twilio';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/errorHandler';

export class SMSService {
    private client: any;
    private fromNumber: string;

    constructor() {
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        this.fromNumber = process.env.TWILIO_PHONE_NUMBER || '';

        if (accountSid && authToken) {
            this.client = twilio(accountSid, authToken);
        } else {
            logger.warn('Twilio credentials not configured');
        }
    }

    /**
      * Send SMS
      */
    async sendSMS(to: string, message: string) {
        try {
            if (!this.client) {
                logger.warn('SMS not sent - Twilio not configured');
                return { success: false, message: 'SMS service not configured' };
            }

            // Ensure phone number has country code
            const phoneNumber = to.startsWith('+') ? to : `+91${to}`;

            await this.client.messages.create({
                body: message,
                from: this.fromNumber,
                to: phoneNumber,
            });

            logger.info(`SMS sent to: ${phoneNumber}`);

            return { success: true };
        } catch (error) {
            logger.error('Send SMS error:', error);
            throw new AppError(500, 'Failed to send SMS');
        }
    }

    /**
     * Send OTP
     */
    async sendOTP(phoneNumber: string, otp: string) {
        const message = `Your GharBazaar verification code is: ${otp}. Valid for 10 minutes. Do not share this code with anyone.`;
        return await this.sendSMS(phoneNumber, message);
    }

    /**
     * Send property approved notification
     */
    async sendPropertyApprovedSMS(phoneNumber: string, propertyTitle: string) {
        const message = `GharBazaar: Your property "${propertyTitle}" has been approved and is now live! Start receiving inquiries from buyers.`;
        return await this.sendSMS(phoneNumber, message);
    }

    /**
     * Send new inquiry notification
     */
    async sendInquiryNotificationSMS(phoneNumber: string, propertyTitle: string) {
        const message = `GharBazaar: You have a new inquiry on "${propertyTitle}". Check your dashboard to respond.`;
        return await this.sendSMS(phoneNumber, message);
    }

    /**
     * Send bid notification
     */
    async sendBidNotificationSMS(phoneNumber: string, bidAmount: number) {
        const message = `GharBazaar: New bid received - ₹${bidAmount.toLocaleString('en-IN')}. Review in your dashboard.`;
        return await this.sendSMS(phoneNumber, message);
    }

    /**
     * Send payment success notification
     */
    async sendPaymentSuccessSMS(phoneNumber: string, amount: number, transactionId: string) {
        const message = `GharBazaar: Payment of ₹${amount.toLocaleString('en-IN')} successful. Transaction ID: ${transactionId}`;
        return await this.sendSMS(phoneNumber, message);
    }

    /**
     * Send welcome SMS
     */
    async sendWelcomeSMS(phoneNumber: string, name: string) {
        const message = `Welcome to GharBazaar, ${name}! Start exploring verified properties and find your dream home today.`;
        return await this.sendSMS(phoneNumber, message);
    }

    /**
     * Send property visit reminder
     */
    async sendVisitReminderSMS(phoneNumber: string, propertyTitle: string, visitDate: string) {
        const message = `GharBazaar: Reminder - Property visit scheduled for "${propertyTitle}" on ${visitDate}.`;
        return await this.sendSMS(phoneNumber, message);
    }
}

export const smsService = new SMSService();
