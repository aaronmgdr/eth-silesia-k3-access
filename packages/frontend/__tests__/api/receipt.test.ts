import { POST } from '@/app/api/receipt/route';
import { NextRequest } from 'next/server';
import * as ksef from '@/lib/ksef';
import * as invoiceSender from '@/lib/invoice-sender';

jest.mock('@/lib/ksef');
jest.mock('@/lib/invoice-sender');
jest.mock('@/lib/redis', () => ({
  makeRedis: jest.fn(() => ({
    set: jest.fn().mockResolvedValue(undefined),
  })),
}));

describe('Receipt API Route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const validRequest = {
    address: '0xe34483A3EC629dA1DbbF4D5d20eD97EdBFB8c0AD',
    name: 'Jan Kowalski',
    streetAddress: 'ul. Katowicka 1, 40-001 Katowice',
    vatType: 'pl' as const,
    vatNumber: '1234567890',
    email: 'jan@example.com',
    txHash: '0x123abc456def...',
  };

  describe('Valid submissions', () => {
    it('should accept receipt with txHash (after purchase)', async () => {
      const req = new NextRequest('http://localhost/api/receipt', {
        method: 'POST',
        body: JSON.stringify(validRequest),
      });

      const response = await POST(req);
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ ok: true });
      expect(ksef.issueInvoice).toHaveBeenCalled();
    });

    it('should accept receipt without txHash (before purchase)', async () => {
      const { txHash, ...withoutTx } = validRequest;
      const req = new NextRequest('http://localhost/api/receipt', {
        method: 'POST',
        body: JSON.stringify(withoutTx),
      });

      const response = await POST(req);
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ ok: true });
    });

    it('should trigger KSeF for Polish VAT type', async () => {
      const req = new NextRequest('http://localhost/api/receipt', {
        method: 'POST',
        body: JSON.stringify(validRequest),
      });

      await POST(req);
      expect(ksef.issueInvoice).toHaveBeenCalledWith(
        expect.objectContaining({
          ethAddress: validRequest.address,
          name: validRequest.name,
          vatType: 'pl',
        })
      );
    });

    it('should trigger PDF invoice for non-Polish VAT type', async () => {
      const euRequest = {
        ...validRequest,
        vatType: 'other' as const,
        vatNumber: 'DE123456789',
      };
      const req = new NextRequest('http://localhost/api/receipt', {
        method: 'POST',
        body: JSON.stringify(euRequest),
      });

      await POST(req);
      expect(invoiceSender.sendPdfInvoice).toHaveBeenCalledWith(
        expect.objectContaining({
          ethAddress: euRequest.address,
          vatType: 'other',
        })
      );
      expect(ksef.issueInvoice).not.toHaveBeenCalled();
    });
  });

  describe('Validation errors', () => {
    it('should reject invalid address', async () => {
      const req = new NextRequest('http://localhost/api/receipt', {
        method: 'POST',
        body: JSON.stringify({ ...validRequest, address: 'invalid' }),
      });

      const response = await POST(req);
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: 'Invalid address' });
    });

    it('should reject missing name', async () => {
      const req = new NextRequest('http://localhost/api/receipt', {
        method: 'POST',
        body: JSON.stringify({ ...validRequest, name: '' }),
      });

      const response = await POST(req);
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: 'All fields are required' });
    });

    it('should reject missing streetAddress', async () => {
      const req = new NextRequest('http://localhost/api/receipt', {
        method: 'POST',
        body: JSON.stringify({ ...validRequest, streetAddress: '   ' }),
      });

      const response = await POST(req);
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: 'All fields are required' });
    });

    it('should reject invalid VAT type', async () => {
      const req = new NextRequest('http://localhost/api/receipt', {
        method: 'POST',
        body: JSON.stringify({ ...validRequest, vatType: 'invalid' }),
      });

      const response = await POST(req);
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: 'Invalid VAT type' });
    });

    it('should reject missing email', async () => {
      const req = new NextRequest('http://localhost/api/receipt', {
        method: 'POST',
        body: JSON.stringify({ ...validRequest, email: null }),
      });

      const response = await POST(req);
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: 'All fields are required' });
    });

    it('should reject missing vatNumber', async () => {
      const req = new NextRequest('http://localhost/api/receipt', {
        method: 'POST',
        body: JSON.stringify({ ...validRequest, vatNumber: '' }),
      });

      const response = await POST(req);
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: 'All fields are required' });
    });
  });

  describe('Error handling', () => {
    it('should handle malformed JSON gracefully', async () => {
      const req = new NextRequest('http://localhost/api/receipt', {
        method: 'POST',
        body: 'invalid json',
      });

      const response = await POST(req);
      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({ error: 'Failed to save' });
    });

    it('should handle missing address', async () => {
      const { address, ...noAddress } = validRequest;
      const req = new NextRequest('http://localhost/api/receipt', {
        method: 'POST',
        body: JSON.stringify(noAddress),
      });

      const response = await POST(req);
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: 'Invalid address' });
    });
  });

  describe('Data persistence', () => {
    it('should store receipt in Redis with TTL', async () => {
      const mockRedis = { set: jest.fn().mockResolvedValue(undefined) };
      const makeRedisMock = require('@/lib/redis').makeRedis;
      makeRedisMock.mockReturnValue(mockRedis);

      const req = new NextRequest('http://localhost/api/receipt', {
        method: 'POST',
        body: JSON.stringify(validRequest),
      });

      await POST(req);

      expect(mockRedis.set).toHaveBeenCalledWith(
        `kolektyw3:receipt:${validRequest.address.toLowerCase()}`,
        expect.stringContaining(validRequest.name),
        { ex: 30 * 24 * 60 * 60 }
      );
    });

    it('should include createdAt timestamp', async () => {
      const req = new NextRequest('http://localhost/api/receipt', {
        method: 'POST',
        body: JSON.stringify(validRequest),
      });

      const beforeTime = new Date();
      await POST(req);
      const afterTime = new Date();

      const mockRedis = require('@/lib/redis').makeRedis();
      const storedData = JSON.parse(
        mockRedis.set.mock.calls[0][1]
      );

      const createdAt = new Date(storedData.createdAt);
      expect(createdAt.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(createdAt.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });
  });
});
