import { Resend } from 'resend';

let resendInstance: Resend | null = null;

function getResend(): Resend {
  if (!resendInstance) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY environment variable is required');
    }
    resendInstance = new Resend(apiKey);
  }
  return resendInstance;
}

export const resend: Resend = {
  emails: {
    send: async (data: any) => getResend().emails.send(data),
  },
} as any;
