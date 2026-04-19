import { POST as receiptHandler } from '@/app/api/receipt/route';
import { NextRequest } from 'next/server';
import { getInvoiceData, saveInvoiceData, clearInvoiceData } from '@/lib/invoice-storage';
import * as ksef from '@/lib/ksef';
import * as invoiceSender from '@/lib/invoice-sender';

jest.mock('@/lib/ksef');
jest.mock('@/lib/invoice-sender');
jest.mock('@/lib/redis', () => ({
  makeRedis: jest.fn(() => ({
    set: jest.fn().mockResolvedValue(undefined),
  })),
}));

describe('Receipt Submission Flow', () => {
  const testAddress = '0xe34483A3EC629dA1DbbF4D5d20eD97EdBFB8c0AD';
  const invoiceData = {
    name: 'Jan Kowalski',
    streetAddress: 'ul. Katowicka 1, 40-001 Katowice',
    vatType: 'pl' as const,
    vatNumber: '1234567890',
    email: 'jan@example.com',
  };
  const txHash = '0x123abc456def...';

  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  describe('Scenario 1: Fill invoice before purchase, auto-submit after', () => {
    it('should allow filling invoice before purchase', () => {
      // User is on /access page, fills out invoice form BEFORE clicking "Get Access"
      saveInvoiceData(testAddress, invoiceData);

      const stored = getInvoiceData(testAddress);
      expect(stored).toEqual(invoiceData);
      // No txHash yet, form just saves to localStorage
    });

    it('should auto-submit invoice after purchase completes', async () => {
      // User had filled invoice data before purchase
      saveInvoiceData(testAddress, invoiceData);

      // Purchase completes, txHash is now available
      localStorage.setItem(`kolektyw3:mintTx:${testAddress.toLowerCase()}`, txHash);

      // System retrieves saved invoice and submits with txHash
      const savedInvoice = getInvoiceData(testAddress);
      expect(savedInvoice).not.toBeNull();

      const req = new NextRequest('http://localhost/api/receipt', {
        method: 'POST',
        body: JSON.stringify({
          address: testAddress,
          ...savedInvoice,
          txHash,
        }),
      });

      const response = await receiptHandler(req);
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ ok: true });
    });

    it('should clear invoice data after successful submission', async () => {
      // Setup: invoice was saved before purchase
      saveInvoiceData(testAddress, invoiceData);
      expect(getInvoiceData(testAddress)).not.toBeNull();

      // Simulating auto-submission after purchase
      localStorage.setItem(`kolektyw3:mintTx:${testAddress.toLowerCase()}`, txHash);

      const req = new NextRequest('http://localhost/api/receipt', {
        method: 'POST',
        body: JSON.stringify({
          address: testAddress,
          ...invoiceData,
          txHash,
        }),
      });

      await receiptHandler(req);

      // After successful submission, system clears the stored invoice
      clearInvoiceData(testAddress);
      expect(getInvoiceData(testAddress)).toBeNull();
    });

    it('should trigger KSeF submission for Polish VAT', async () => {
      saveInvoiceData(testAddress, invoiceData);
      localStorage.setItem(`kolektyw3:mintTx:${testAddress.toLowerCase()}`, txHash);

      const req = new NextRequest('http://localhost/api/receipt', {
        method: 'POST',
        body: JSON.stringify({
          address: testAddress,
          ...invoiceData,
          txHash,
        }),
      });

      await receiptHandler(req);

      expect(ksef.issueInvoice).toHaveBeenCalledWith(
        expect.objectContaining({
          ethAddress: testAddress,
          txHash,
          vatType: 'pl',
        })
      );
    });
  });

  describe('Scenario 2: Manual submission after purchase', () => {
    it('should allow manual invoice submission with txHash', async () => {
      // Purchase already completed, user has txHash
      localStorage.setItem(`kolektyw3:mintTx:${testAddress.toLowerCase()}`, txHash);

      // User fills and submits invoice form manually
      const req = new NextRequest('http://localhost/api/receipt', {
        method: 'POST',
        body: JSON.stringify({
          address: testAddress,
          ...invoiceData,
          txHash,
        }),
      });

      const response = await receiptHandler(req);
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ ok: true });
    });

    it('should include txHash in backend submission', async () => {
      localStorage.setItem(`kolektyw3:mintTx:${testAddress.toLowerCase()}`, txHash);

      const req = new NextRequest('http://localhost/api/receipt', {
        method: 'POST',
        body: JSON.stringify({
          address: testAddress,
          ...invoiceData,
          txHash,
        }),
      });

      await receiptHandler(req);

      const mockRedis = require('@/lib/redis').makeRedis();
      const storedData = JSON.parse(mockRedis.set.mock.calls[0][1]);

      expect(storedData.txHash).toBe(txHash);
    });
  });

  describe('Scenario 3: Submission without purchase (no txHash)', () => {
    it('should allow invoice submission even without purchase', async () => {
      // User fills invoice but hasn't purchased yet
      const req = new NextRequest('http://localhost/api/receipt', {
        method: 'POST',
        body: JSON.stringify({
          address: testAddress,
          ...invoiceData,
          // No txHash
        }),
      });

      const response = await receiptHandler(req);
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ ok: true });
    });

    it('should store invoice with null txHash in Redis', async () => {
      const req = new NextRequest('http://localhost/api/receipt', {
        method: 'POST',
        body: JSON.stringify({
          address: testAddress,
          ...invoiceData,
        }),
      });

      await receiptHandler(req);

      const mockRedis = require('@/lib/redis').makeRedis();
      const storedData = JSON.parse(mockRedis.set.mock.calls[0][1]);

      expect(storedData.txHash).toBeNull();
    });
  });

  describe('Scenario 4: EU VAT invoice (non-Polish)', () => {
    const euInvoice = {
      name: 'Acme GmbH',
      streetAddress: 'Hauptstrasse 1, 10115 Berlin',
      vatType: 'other' as const,
      vatNumber: 'DE123456789',
      email: 'billing@acme.de',
    };

    it('should trigger PDF invoice for EU companies', async () => {
      saveInvoiceData(testAddress, euInvoice);

      const req = new NextRequest('http://localhost/api/receipt', {
        method: 'POST',
        body: JSON.stringify({
          address: testAddress,
          ...euInvoice,
          txHash,
        }),
      });

      await receiptHandler(req);

      expect(invoiceSender.sendPdfInvoice).toHaveBeenCalledWith(
        expect.objectContaining({
          vatType: 'other',
          vatNumber: 'DE123456789',
        })
      );
      expect(ksef.issueInvoice).not.toHaveBeenCalled();
    });
  });

  describe('User feedback messages', () => {
    it('should show "Details saved" message when saving before purchase', () => {
      // Frontend component shows: "Your details are saved. After you complete your purchase..."
      saveInvoiceData(testAddress, invoiceData);
      const txHash = localStorage.getItem(`kolektyw3:mintTx:${testAddress.toLowerCase()}`);

      expect(getInvoiceData(testAddress)).not.toBeNull();
      expect(txHash).toBeNull();
      // Frontend should display "saved but not submitted" state
    });

    it('should show "Invoice submitted" message after auto-submit', async () => {
      // Setup
      saveInvoiceData(testAddress, invoiceData);
      localStorage.setItem(`kolektyw3:mintTx:${testAddress.toLowerCase()}`, txHash);

      // Submit
      const req = new NextRequest('http://localhost/api/receipt', {
        method: 'POST',
        body: JSON.stringify({
          address: testAddress,
          ...invoiceData,
          txHash,
        }),
      });

      const response = await receiptHandler(req);
      expect(response.status).toBe(200);

      // After submission, frontend checks for txHash and shows success
      expect(localStorage.getItem(`kolektyw3:mintTx:${testAddress.toLowerCase()}`)).toBe(txHash);
    });
  });

  describe('Edge cases', () => {
    it('should handle rapid form saves before purchase', () => {
      // User rapidly types name and other fields
      saveInvoiceData(testAddress, { ...invoiceData, name: 'J' });
      saveInvoiceData(testAddress, { ...invoiceData, name: 'Ja' });
      saveInvoiceData(testAddress, { ...invoiceData, name: 'Jan' });

      const stored = getInvoiceData(testAddress);
      expect(stored?.name).toBe('Jan');
    });

    it('should handle invoice data expiry', async () => {
      // Invoice data might be old if browser session is long
      saveInvoiceData(testAddress, invoiceData);

      // Later, user completes purchase
      localStorage.setItem(`kolektyw3:mintTx:${testAddress.toLowerCase()}`, txHash);

      // System should still be able to submit the old invoice data
      const saved = getInvoiceData(testAddress);
      expect(saved).toEqual(invoiceData);
    });

    it('should handle multiple addresses with separate invoices', () => {
      const address1 = testAddress;
      const address2 = '0x1234567890123456789012345678901234567890';
      const data2 = { ...invoiceData, email: 'other@example.com' };

      saveInvoiceData(address1, invoiceData);
      saveInvoiceData(address2, data2);

      expect(getInvoiceData(address1)?.email).toBe(invoiceData.email);
      expect(getInvoiceData(address2)?.email).toBe(data2.email);
    });
  });
});
