import sgMail from '@sendgrid/mail';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/errorHandler';

export class EmailService {
    constructor() {
        const apiKey = process.env.SENDGRID_API_KEY;
        if (apiKey) {
            sgMail.setApiKey(apiKey);
        } else {
            logger.warn('SendGrid API key not configured');
        }
    }

    /**
     * Send email
     */
    async sendEmail(to: string, subject: string, html: string, text?: string) {
        try {
            const msg = {
                to,
                from: process.env.SENDGRID_FROM_EMAIL || 'noreply@gharbazaar.in',
                subject,
                text: text || '',
                html,
            };

            await sgMail.send(msg);
            logger.info(`Email sent to: ${to}`);

            return { success: true };
        } catch (error) {
            logger.error('Send email error:', error);
            throw new AppError(500, 'Failed to send email');
        }
    }

    /**
     * Send welcome email
     */
    async sendWelcomeEmail(email: string, name: string) {
        const subject = 'Welcome to GharBazaar!';
        const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🏠 Welcome to GharBazaar!</h1>
            </div>
            <div class="content">
              <h2>Hello ${name},</h2>
              <p>Thank you for joining GharBazaar - India's premier real estate marketplace!</p>
              <p>We're excited to have you as part of our community. With GharBazaar, you can:</p>
              <ul>
                <li>✅ Browse thousands of verified properties</li>
                <li>✅ Connect directly with sellers</li>
                <li>✅ Get instant property updates</li>
                <li>✅ Schedule property visits</li>
                <li>✅ Track your favorite properties</li>
              </ul>
              <a href="${process.env.FRONTEND_URL}/dashboard" class="button">Explore Properties</a>
              <p>If you have any questions, our support team is here to help!</p>
            </div>
            <div class="footer">
              <p>© 2024 GharBazaar. All rights reserved.</p>
              <p>You're receiving this email because you signed up for GharBazaar.</p>
            </div>
          </div>
        </body>
      </html>
    `;

        return await this.sendEmail(email, subject, html);
    }

    /**
     * Send email verification
     */
    async sendVerificationEmail(email: string, verificationLink: string) {
        const subject = 'Verify Your Email - GharBazaar';
        const html = `
      <!DOCTYPE html>
      <html>
        <body style="font-family: Arial, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2>Verify Your Email</h2>
            <p>Please click the button below to verify your email address:</p>
            <a href="${verificationLink}" style="display: inline-block; background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0;">
              Verify Email
            </a>
            <p>If you didn't sign up for GharBazaar, please ignore this email.</p>
            <p>This link will expire in 24 hours.</p>
          </div>
        </body>
      </html>
    `;

        return await this.sendEmail(email, subject, html);
    }

    /**
     * Send password reset email
     */
    async sendPasswordResetEmail(email: string, resetLink: string) {
        const subject = 'Reset Your Password - GharBazaar';
        const html = `
      <!DOCTYPE html>
      <html>
        <body style="font-family: Arial, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2>Reset Your Password</h2>
            <p>We received a request to reset your password. Click the button below to proceed:</p>
            <a href="${resetLink}" style="display: inline-block; background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0;">
              Reset Password
            </a>
            <p>If you didn't request a password reset, please ignore this email.</p>
            <p>This link will expire in 1 hour.</p>
          </div>
        </body>
      </html>
    `;

        return await this.sendEmail(email, subject, html);
    }

    /**
     * Send property approved notification
     */
    async sendPropertyApprovedEmail(email: string, propertyTitle: string, propertyId: string) {
        const subject = 'Property Approved - GharBazaar';
        const html = `
      <!DOCTYPE html>
      <html>
        <body style="font-family: Arial, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2>🎉 Your Property is Live!</h2>
            <p>Great news! Your property "${propertyTitle}" has been approved and is now visible to buyers.</p>
            <a href="${process.env.FRONTEND_URL}/properties/${propertyId}" style="display: inline-block; background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0;">
              View Property
            </a>
            <p>You'll start receiving inquiries soon. Make sure to respond promptly to interested buyers!</p>
          </div>
        </body>
      </html>
    `;

        return await this.sendEmail(email, subject, html);
    }

    /**
     * Send new inquiry notification
     */
    async sendInquiryNotificationEmail(email: string, propertyTitle: string, buyerMessage: string) {
        const subject = 'New Inquiry on Your Property - GharBazaar';
        const html = `
      <!DOCTYPE html>
      <html>
        <body style="font-family: Arial, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2>📩 New Inquiry Received</h2>
            <p>You have a new inquiry on your property: <strong>${propertyTitle}</strong></p>
            <div style="background: #f9fafb; padding: 15px; border-left: 4px solid #10b981; margin: 20px 0;">
              <p>${buyerMessage}</p>
            </div>
            <a href="${process.env.FRONTEND_URL}/dashboard/chat" style="display: inline-block; background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0;">
              Reply to Inquiry
            </a>
          </div>
        </body>
      </html>
    `;

        return await this.sendEmail(email, subject, html);
    }

    /**
     * Send bid notification
     */
    async sendBidNotificationEmail(email: string, propertyTitle: string, bidAmount: number) {
        const subject = 'New Bid on Your Property - GharBazaar';
        const html = `
      <!DOCTYPE html>
      <html>
        <body style="font-family: Arial, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2>💰 New Bid Received</h2>
            <p>You've received a bid on your property: <strong>${propertyTitle}</strong></p>
            <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
              <p style="font-size: 24px; color: #10b981; margin: 0;">₹${bidAmount.toLocaleString('en-IN')}</p>
            </div>
            <a href="${process.env.FRONTEND_URL}/dashboard/bids" style="display: inline-block; background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0;">
              Review Bid
            </a>
          </div>
        </body>
      </html>
    `;

        return await this.sendEmail(email, subject, html);
    }

    /**
     * Send payment success email
     */
    async sendPaymentSuccessEmail(email: string, amount: number, purpose: string, transactionId: string) {
        const subject = 'Payment Successful - GharBazaar';
        const html = `
      <!DOCTYPE html>
      <html>
        <body style="font-family: Arial, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2>✅ Payment Successful</h2>
            <p>Your payment has been processed successfully.</p>
            <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Amount:</strong> ₹${amount.toLocaleString('en-IN')}</p>
              <p><strong>Purpose:</strong> ${purpose}</p>
              <p><strong>Transaction ID:</strong> ${transactionId}</p>
            </div>
            <a href="${process.env.FRONTEND_URL}/dashboard/transactions" style="display: inline-block; background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0;">
              View Transaction
            </a>
          </div>
        </body>
      </html>
    `;

        return await this.sendEmail(email, subject, html);
    }
}

export const emailService = new EmailService();
