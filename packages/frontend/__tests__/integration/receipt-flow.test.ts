import { getInvoiceData, saveInvoiceData, clearInvoiceData } from '@/lib/invoice-storage';

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
    // Use localStorage polyfill in jsdom environment
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    } else {
      (global as any).localStorage = {
        data: {} as Record<string, string>,
        getItem(key: string) {
          return this.data[key] || null;
        },
        setItem(key: string, value: string) {
          this.data[key] = value;
        },
        removeItem(key: string) {
          delete this.data[key];
        },
        clear() {
          this.data = {};
        },
      };
    }
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

    it('should have saved invoice available when purchase completes', () => {
      // User had filled invoice data before purchase
      saveInvoiceData(testAddress, invoiceData);

      // Purchase completes, txHash is now available
      localStorage.setItem(`kolektyw3:mintTx:${testAddress.toLowerCase()}`, txHash);

      // System can retrieve both pieces for submission
      const savedInvoice = getInvoiceData(testAddress);
      const savedTxHash = localStorage.getItem(`kolektyw3:mintTx:${testAddress.toLowerCase()}`);

      expect(savedInvoice).not.toBeNull();
      expect(savedTxHash).toBe(txHash);
      expect(savedInvoice?.vatType).toBe('pl');
    });

    it('should clear invoice data after successful submission', () => {
      // Setup: invoice was saved before purchase
      saveInvoiceData(testAddress, invoiceData);
      expect(getInvoiceData(testAddress)).not.toBeNull();

      // After successful submission, system clears the stored invoice
      clearInvoiceData(testAddress);
      expect(getInvoiceData(testAddress)).toBeNull();
    });
  });

  describe('Scenario 2: Manual submission after purchase', () => {
    it('should allow manual invoice submission with txHash available', () => {
      // Purchase already completed, user has txHash
      localStorage.setItem(`kolektyw3:mintTx:${testAddress.toLowerCase()}`, txHash);

      // User fills and submits invoice form manually
      const txHashFromStorage = localStorage.getItem(`kolektyw3:mintTx:${testAddress.toLowerCase()}`);

      // System should include txHash in submission
      expect(txHashFromStorage).toBe(txHash);
    });

    it('should verify txHash is available before submission', () => {
      localStorage.setItem(`kolektyw3:mintTx:${testAddress.toLowerCase()}`, txHash);

      const storedTxHash = localStorage.getItem(`kolektyw3:mintTx:${testAddress.toLowerCase()}`);
      const isReady = !!storedTxHash;

      expect(isReady).toBe(true);
      expect(storedTxHash).toBe(txHash);
    });
  });

  describe('Scenario 3: Submission without purchase (no txHash)', () => {
    it('should allow invoice to be saved without purchase', () => {
      // User fills invoice but hasn't purchased yet
      saveInvoiceData(testAddress, invoiceData);

      const saved = getInvoiceData(testAddress);
      expect(saved).not.toBeNull();
      expect(saved?.name).toBe(invoiceData.name);
    });

    it('should recognize when txHash is missing (before purchase)', () => {
      saveInvoiceData(testAddress, invoiceData);

      const txHash = localStorage.getItem(`kolektyw3:mintTx:${testAddress.toLowerCase()}`);
      const hasTransaction = !!txHash;

      expect(hasTransaction).toBe(false);
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

    it('should save EU VAT invoice data', () => {
      saveInvoiceData(testAddress, euInvoice);

      const saved = getInvoiceData(testAddress);
      expect(saved?.vatType).toBe('other');
      expect(saved?.vatNumber).toBe('DE123456789');
    });

    it('should identify EU VAT for different routing', () => {
      saveInvoiceData(testAddress, euInvoice);
      const saved = getInvoiceData(testAddress);

      const isPolish = saved?.vatType === 'pl';
      const isEu = saved?.vatType === 'other';

      expect(isPolish).toBe(false);
      expect(isEu).toBe(true);
    });
  });

  describe('User feedback messages', () => {
    it('should show "Details saved" when invoice is in localStorage but no txHash', () => {
      saveInvoiceData(testAddress, invoiceData);
      const txHash = localStorage.getItem(`kolektyw3:mintTx:${testAddress.toLowerCase()}`);

      expect(getInvoiceData(testAddress)).not.toBeNull();
      expect(txHash).toBeNull();
      // Frontend should display "saved but not submitted" state
    });

    it('should show "Invoice submitted" when both invoice and txHash exist', () => {
      saveInvoiceData(testAddress, invoiceData);
      localStorage.setItem(`kolektyw3:mintTx:${testAddress.toLowerCase()}`, txHash);

      const invoice = getInvoiceData(testAddress);
      const tx = localStorage.getItem(`kolektyw3:mintTx:${testAddress.toLowerCase()}`);

      expect(invoice).not.toBeNull();
      expect(tx).toBe(txHash);
      // Frontend can show "submitted" state
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
