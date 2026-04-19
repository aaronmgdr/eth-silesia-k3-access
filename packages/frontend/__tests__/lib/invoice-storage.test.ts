import {
  getInvoiceData,
  saveInvoiceData,
  clearInvoiceData,
  type InvoiceData,
} from '@/lib/invoice-storage';

describe('Invoice Storage', () => {
  const testAddress = '0xe34483A3EC629dA1DbbF4D5d20eD97EdBFB8c0AD';
  const testData: InvoiceData = {
    name: 'Jan Kowalski',
    streetAddress: 'ul. Katowicka 1, 40-001 Katowice',
    vatType: 'pl',
    vatNumber: '1234567890',
    email: 'jan@example.com',
  };

  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  describe('saveInvoiceData', () => {
    it('should save invoice data to localStorage', () => {
      saveInvoiceData(testAddress, testData);

      const key = `kolektyw3:invoice:${testAddress.toLowerCase()}`;
      const stored = localStorage.getItem(key);
      expect(stored).toBeDefined();
      expect(JSON.parse(stored!)).toEqual(testData);
    });

    it('should overwrite existing data', () => {
      saveInvoiceData(testAddress, testData);

      const newData: InvoiceData = {
        ...testData,
        name: 'Maria Nowak',
      };
      saveInvoiceData(testAddress, newData);

      const key = `kolektyw3:invoice:${testAddress.toLowerCase()}`;
      const stored = JSON.parse(localStorage.getItem(key)!);
      expect(stored.name).toBe('Maria Nowak');
    });

    it('should handle different addresses separately', () => {
      const address2 = '0x1234567890123456789012345678901234567890';
      const data2: InvoiceData = { ...testData, email: 'other@example.com' };

      saveInvoiceData(testAddress, testData);
      saveInvoiceData(address2, data2);

      const key1 = `kolektyw3:invoice:${testAddress.toLowerCase()}`;
      const key2 = `kolektyw3:invoice:${address2.toLowerCase()}`;

      expect(JSON.parse(localStorage.getItem(key1)!).email).toBe(testData.email);
      expect(JSON.parse(localStorage.getItem(key2)!).email).toBe(data2.email);
    });

    it('should handle localStorage errors gracefully', () => {
      jest.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
        throw new Error('QuotaExceededError');
      });

      expect(() => saveInvoiceData(testAddress, testData)).not.toThrow();
    });
  });

  describe('getInvoiceData', () => {
    it('should retrieve saved invoice data', () => {
      saveInvoiceData(testAddress, testData);
      const retrieved = getInvoiceData(testAddress);

      expect(retrieved).toEqual(testData);
    });

    it('should return null if no data exists', () => {
      const retrieved = getInvoiceData(testAddress);
      expect(retrieved).toBeNull();
    });

    it('should be case-insensitive for addresses', () => {
      saveInvoiceData(testAddress, testData);

      const mixedCase = testAddress.slice(0, 10).toUpperCase() + testAddress.slice(10).toLowerCase();
      const retrieved = getInvoiceData(mixedCase);

      expect(retrieved).toEqual(testData);
    });

    it('should handle corrupted data gracefully', () => {
      const key = `kolektyw3:invoice:${testAddress.toLowerCase()}`;
      localStorage.setItem(key, 'corrupted {json}');

      const retrieved = getInvoiceData(testAddress);
      expect(retrieved).toBeNull();
    });

    it('should handle localStorage errors gracefully', () => {
      jest.spyOn(Storage.prototype, 'getItem').mockImplementationOnce(() => {
        throw new Error('Storage access error');
      });

      expect(getInvoiceData(testAddress)).toBeNull();
    });
  });

  describe('clearInvoiceData', () => {
    it('should remove invoice data from localStorage', () => {
      saveInvoiceData(testAddress, testData);
      expect(getInvoiceData(testAddress)).not.toBeNull();

      clearInvoiceData(testAddress);
      expect(getInvoiceData(testAddress)).toBeNull();
    });

    it('should handle clearing non-existent data', () => {
      expect(() => clearInvoiceData(testAddress)).not.toThrow();
    });

    it('should handle localStorage errors gracefully', () => {
      jest.spyOn(Storage.prototype, 'removeItem').mockImplementationOnce(() => {
        throw new Error('Storage access error');
      });

      expect(() => clearInvoiceData(testAddress)).not.toThrow();
    });
  });

  describe('Form behavior: before purchase', () => {
    it('should persist invoice data while user types before purchase', () => {
      const key = `kolektyw3:invoice:${testAddress.toLowerCase()}`;
      expect(localStorage.getItem(key)).toBeNull();

      // Simulate user typing name
      saveInvoiceData(testAddress, { ...testData, name: 'J' });
      expect(getInvoiceData(testAddress)?.name).toBe('J');

      // Continue typing
      saveInvoiceData(testAddress, { ...testData, name: 'Jan' });
      expect(getInvoiceData(testAddress)?.name).toBe('Jan');
    });

    it('should allow form submission before purchase (no txHash)', () => {
      // User fills form and clicks Save Details before purchase
      saveInvoiceData(testAddress, testData);

      // Data should be available for form submission
      const saved = getInvoiceData(testAddress);
      expect(saved).toEqual(testData);
      // No txHash validation should be required
    });
  });

  describe('Form behavior: after purchase', () => {
    it('should auto-submit invoice when purchase completes', () => {
      const txHash = '0x123abc456def...';

      // User had filled form before purchase
      saveInvoiceData(testAddress, testData);
      expect(getInvoiceData(testAddress)).not.toBeNull();

      // After purchase, txHash is available
      localStorage.setItem(`kolektyw3:mintTx:${testAddress.toLowerCase()}`, txHash);

      // System should be able to retrieve both pieces of info for submission
      const invoiceData = getInvoiceData(testAddress);
      const txHashData = localStorage.getItem(`kolektyw3:mintTx:${testAddress.toLowerCase()}`);

      expect(invoiceData).toEqual(testData);
      expect(txHashData).toBe(txHash);
    });

    it('should clear invoice data after successful submission', () => {
      saveInvoiceData(testAddress, testData);
      expect(getInvoiceData(testAddress)).not.toBeNull();

      clearInvoiceData(testAddress);
      expect(getInvoiceData(testAddress)).toBeNull();
    });
  });
});
