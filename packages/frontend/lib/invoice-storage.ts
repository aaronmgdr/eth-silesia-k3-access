export interface InvoiceData {
  name: string;
  streetAddress: string;
  vatType: 'pl' | 'other';
  vatNumber: string;
  email: string;
}

export function getInvoiceData(address: string): InvoiceData | null {
  try {
    const stored = localStorage.getItem(`kolektyw3:invoice:${address.toLowerCase()}`);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export function saveInvoiceData(address: string, data: InvoiceData): void {
  try {
    localStorage.setItem(`kolektyw3:invoice:${address.toLowerCase()}`, JSON.stringify(data));
  } catch {
    console.warn('Failed to save invoice data to localStorage');
  }
}

export function clearInvoiceData(address: string): void {
  try {
    localStorage.removeItem(`kolektyw3:invoice:${address.toLowerCase()}`);
  } catch {
    console.warn('Failed to clear invoice data from localStorage');
  }
}
