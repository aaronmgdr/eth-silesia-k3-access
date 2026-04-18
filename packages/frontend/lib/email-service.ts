/**
 * Email Service - Abstracts email sending
 *
 * This service handles sending emails.
 * Implementation can be swapped when needed.
 */

import { resend } from './resend';

interface EmailServiceInterface {
  /**
   * Send access code email
   * @param email - Recipient email address
   * @param code - Access code to send
   */
  sendAccessCode(email: string, code: string): Promise<void>;
}

class ResendEmailService implements EmailServiceInterface {
  async sendAccessCode(email: string, code: string): Promise<void> {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'kolektyw3@resend.dev',
      to: email,
      subject: `Access Code ${code} Kolektyw3`,
      html: `
        <p>Your Access Code for Kolektyw3 Coworking in Warsaw is ${code}</p>
        <p>The Team at Kolektyw3</p>
      `,
    });
  }
}

// Export singleton instance
export const emailService: EmailServiceInterface = new ResendEmailService();
