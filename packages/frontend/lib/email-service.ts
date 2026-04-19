import { resend } from './resend';
import { site } from './site';

interface EmailServiceInterface {
  sendAccessCode(email: string, code: string): Promise<void>;
}

class ResendEmailService implements EmailServiceInterface {
  async sendAccessCode(email: string, code: string): Promise<void> {
    const from = process.env.RESEND_FROM_EMAIL || 'kolektyw3@resend.dev';

    if (site.demoMode) {
      await resend.emails.send({
        from,
        to: email,
        subject: `[DEMO] Access Code ${code} — Kolektyw3`,
        html: `
          <p style="background:#fef3c7;border:1px solid #f59e0b;padding:10px;border-radius:6px;font-size:13px;color:#92400e;">
            <strong>Demo build</strong> — this is a hackathon demonstration. This code may not grant real physical access.
          </p>
          <p>Your demo access code for Kolektyw3 community space in Warsaw is: <strong>${code}</strong></p>
          <p>— The ETH Warsaw team</p>
        `,
      });
      return;
    }

    await resend.emails.send({
      from,
      to: email,
      subject: `Access Code ${code} — Kolektyw3`,
      html: `
        <p>Your access code for Kolektyw3 community space in Warsaw is: <strong>${code}</strong></p>
        <p>— ${site.legalName}</p>
      `,
    });
  }
}

let instance: EmailServiceInterface | null = null;

export const emailService: EmailServiceInterface = {
  async sendAccessCode(email, code) {
    if (!instance) instance = new ResendEmailService();
    return instance.sendAccessCode(email, code);
  },
};
