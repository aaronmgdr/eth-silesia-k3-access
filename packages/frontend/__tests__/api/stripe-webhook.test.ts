import { POST } from '@/app/api/stripe-webhook/route';
import { NextRequest } from 'next/server';
import Stripe from 'stripe';
import * as codeService from '@/lib/code-service';
import * as emailService from '@/lib/email-service';

jest.mock('stripe');
jest.mock('@/lib/code-service');
jest.mock('@/lib/email-service');

describe('Stripe Webhook Route', () => {
  const mockStripe = new Stripe('test_key');
  const validEmail = 'customer@example.com';
  const validIdentifier = 'customer@example.com';
  const validCode = '123456';

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret';
    process.env.STRIPE_SECRET_KEY = 'sk_test_key';
  });

  describe('Valid Stripe events', () => {
    it('should process charge.succeeded event', async () => {
      const chargeEvent: Stripe.Event = {
        id: 'evt_test_001',
        object: 'event',
        type: 'charge.succeeded',
        data: {
          object: {
            id: 'ch_test_001',
            object: 'charge',
            metadata: {
              email: validEmail,
              identifier: validIdentifier,
            },
            receipt_email: validEmail,
          } as Stripe.Charge,
        },
      } as Stripe.Event;

      (codeService.dequeueCode as jest.Mock).mockResolvedValue(validCode);
      (emailService.sendAccessCode as jest.Mock).mockResolvedValue(undefined);
      (mockStripe.webhooks.constructEvent as jest.Mock).mockReturnValue(chargeEvent);

      const body = JSON.stringify(chargeEvent);
      const req = new NextRequest('http://localhost/api/stripe-webhook', {
        method: 'POST',
        body,
        headers: {
          'stripe-signature': 'test_signature',
        },
      });

      const response = await POST(req);
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ received: true });
    });

    it('should dequeue code for the identifier', async () => {
      const chargeEvent: Stripe.Event = {
        id: 'evt_test_002',
        object: 'event',
        type: 'charge.succeeded',
        data: {
          object: {
            id: 'ch_test_002',
            object: 'charge',
            metadata: {
              email: validEmail,
              identifier: validIdentifier,
            },
            receipt_email: validEmail,
          } as Stripe.Charge,
        },
      } as Stripe.Event;

      (codeService.dequeueCode as jest.Mock).mockResolvedValue(validCode);
      (emailService.sendAccessCode as jest.Mock).mockResolvedValue(undefined);
      (mockStripe.webhooks.constructEvent as jest.Mock).mockReturnValue(chargeEvent);

      const body = JSON.stringify(chargeEvent);
      const req = new NextRequest('http://localhost/api/stripe-webhook', {
        method: 'POST',
        body,
        headers: {
          'stripe-signature': 'test_signature',
        },
      });

      await POST(req);
      expect(codeService.dequeueCode).toHaveBeenCalledWith(validIdentifier);
    });

    it('should send code via email after dequeue', async () => {
      const chargeEvent: Stripe.Event = {
        id: 'evt_test_003',
        object: 'event',
        type: 'charge.succeeded',
        data: {
          object: {
            id: 'ch_test_003',
            object: 'charge',
            metadata: {
              email: validEmail,
              identifier: validIdentifier,
            },
            receipt_email: validEmail,
          } as Stripe.Charge,
        },
      } as Stripe.Event;

      (codeService.dequeueCode as jest.Mock).mockResolvedValue(validCode);
      (emailService.sendAccessCode as jest.Mock).mockResolvedValue(undefined);
      (mockStripe.webhooks.constructEvent as jest.Mock).mockReturnValue(chargeEvent);

      const body = JSON.stringify(chargeEvent);
      const req = new NextRequest('http://localhost/api/stripe-webhook', {
        method: 'POST',
        body,
        headers: {
          'stripe-signature': 'test_signature',
        },
      });

      await POST(req);
      expect(emailService.sendAccessCode).toHaveBeenCalledWith(validEmail, validCode);
    });
  });

  describe('Missing or invalid data', () => {
    it('should reject charge without email or identifier', async () => {
      const chargeEvent: Stripe.Event = {
        id: 'evt_test_004',
        object: 'event',
        type: 'charge.succeeded',
        data: {
          object: {
            id: 'ch_test_004',
            object: 'charge',
            metadata: {},
          } as Stripe.Charge,
        },
      } as Stripe.Event;

      (mockStripe.webhooks.constructEvent as jest.Mock).mockReturnValue(chargeEvent);

      const body = JSON.stringify(chargeEvent);
      const req = new NextRequest('http://localhost/api/stripe-webhook', {
        method: 'POST',
        body,
        headers: {
          'stripe-signature': 'test_signature',
        },
      });

      const response = await POST(req);
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: 'No customer email or identifier' });
    });

    it('should handle case where no codes are available', async () => {
      const chargeEvent: Stripe.Event = {
        id: 'evt_test_005',
        object: 'event',
        type: 'charge.succeeded',
        data: {
          object: {
            id: 'ch_test_005',
            object: 'charge',
            metadata: {
              email: validEmail,
              identifier: validIdentifier,
            },
            receipt_email: validEmail,
          } as Stripe.Charge,
        },
      } as Stripe.Event;

      (codeService.dequeueCode as jest.Mock).mockResolvedValue(null);
      (mockStripe.webhooks.constructEvent as jest.Mock).mockReturnValue(chargeEvent);

      const body = JSON.stringify(chargeEvent);
      const req = new NextRequest('http://localhost/api/stripe-webhook', {
        method: 'POST',
        body,
        headers: {
          'stripe-signature': 'test_signature',
        },
      });

      const response = await POST(req);
      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({ error: 'No available codes' });
    });

    it('should fallback to receipt_email if metadata.email missing', async () => {
      const chargeEvent: Stripe.Event = {
        id: 'evt_test_006',
        object: 'event',
        type: 'charge.succeeded',
        data: {
          object: {
            id: 'ch_test_006',
            object: 'charge',
            metadata: {
              identifier: validIdentifier,
            },
            receipt_email: validEmail,
          } as Stripe.Charge,
        },
      } as Stripe.Event;

      (codeService.dequeueCode as jest.Mock).mockResolvedValue(validCode);
      (emailService.sendAccessCode as jest.Mock).mockResolvedValue(undefined);
      (mockStripe.webhooks.constructEvent as jest.Mock).mockReturnValue(chargeEvent);

      const body = JSON.stringify(chargeEvent);
      const req = new NextRequest('http://localhost/api/stripe-webhook', {
        method: 'POST',
        body,
        headers: {
          'stripe-signature': 'test_signature',
        },
      });

      await POST(req);
      expect(emailService.sendAccessCode).toHaveBeenCalledWith(validEmail, validCode);
    });
  });

  describe('Webhook signature validation', () => {
    it('should reject missing signature', async () => {
      const req = new NextRequest('http://localhost/api/stripe-webhook', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(req);
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: 'Missing signature or webhook secret' });
    });

    it('should reject invalid signature', async () => {
      (mockStripe.webhooks.constructEvent as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      const req = new NextRequest('http://localhost/api/stripe-webhook', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: {
          'stripe-signature': 'invalid_signature',
        },
      });

      const response = await POST(req);
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: 'Invalid signature' });
    });
  });

  describe('Ignored event types', () => {
    it('should ignore charge.failed events', async () => {
      const chargeEvent: Stripe.Event = {
        id: 'evt_test_007',
        object: 'event',
        type: 'charge.failed',
        data: {
          object: {
            id: 'ch_test_007',
            object: 'charge',
          } as Stripe.Charge,
        },
      } as Stripe.Event;

      (mockStripe.webhooks.constructEvent as jest.Mock).mockReturnValue(chargeEvent);

      const body = JSON.stringify(chargeEvent);
      const req = new NextRequest('http://localhost/api/stripe-webhook', {
        method: 'POST',
        body,
        headers: {
          'stripe-signature': 'test_signature',
        },
      });

      const response = await POST(req);
      expect(response.status).toBe(200);
      expect(codeService.dequeueCode).not.toHaveBeenCalled();
    });
  });

  describe('Error resilience', () => {
    it('should handle email service failures gracefully', async () => {
      const chargeEvent: Stripe.Event = {
        id: 'evt_test_008',
        object: 'event',
        type: 'charge.succeeded',
        data: {
          object: {
            id: 'ch_test_008',
            object: 'charge',
            metadata: {
              email: validEmail,
              identifier: validIdentifier,
            },
            receipt_email: validEmail,
          } as Stripe.Charge,
        },
      } as Stripe.Event;

      (codeService.dequeueCode as jest.Mock).mockResolvedValue(validCode);
      (emailService.sendAccessCode as jest.Mock).mockRejectedValue(new Error('Email failed'));
      (mockStripe.webhooks.constructEvent as jest.Mock).mockReturnValue(chargeEvent);

      const body = JSON.stringify(chargeEvent);
      const req = new NextRequest('http://localhost/api/stripe-webhook', {
        method: 'POST',
        body,
        headers: {
          'stripe-signature': 'test_signature',
        },
      });

      const response = await POST(req);
      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({ error: 'Internal server error' });
    });
  });
});
