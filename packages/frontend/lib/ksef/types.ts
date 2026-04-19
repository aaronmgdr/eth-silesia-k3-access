// KSeF FA(2) invoice types — Polish e-invoicing standard
// Spec: https://github.com/CIRFMF/ksef-docs
// API:  https://api.ksef.mf.gov.pl/docs/v2/openapi.json

export interface KSeFParty {
  nip: string;
  fullName: string;
  address: string;
}

export interface KSeFBuyer extends KSeFParty {
  /** 'PL' for Polish NIP, 'EU' for EU VAT / TIN */
  taxIdType: 'PL' | 'EU' | 'OTHER';
  email?: string;
}

export interface KSeFLineItem {
  name: string;
  /** net unit price in invoice currency */
  netUnit: number;
  quantity: number;
  vatRate: number; // e.g. 0.23
}

export interface KSeFInvoice {
  /** ISO date string */
  issueDate: string;
  /** Sequential invoice number — must match KSeF numbering scheme */
  invoiceNumber: string;
  /** ISO 4217 currency code, e.g. 'PLN' or 'USD' */
  currency: string;
  seller: KSeFParty;
  buyer: KSeFBuyer;
  items: KSeFLineItem[];
  /**
   * Required when currency !== 'PLN'.
   * Polish VAT law (art. 106e ust. 11) requires VAT to also be stated in PLN
   * using the NBP mid-rate from the previous business day.
   */
  plnConversion?: {
    /** NBP mid-rate: 1 foreign unit = X PLN */
    rate: number;
    /** NBP table number, e.g. "079/A/NBP/2026" */
    tableNumber: string;
    rateDate: string; // ISO date
    /** Total VAT expressed in PLN */
    vatAmountPln: number;
  };
  /** Reference to on-chain payment */
  paymentReference?: string;
}

/** Shape returned by the KSeF API after successful submission */
export interface KSeFSubmitResult {
  ksefReferenceNumber: string;
  processingCode: number;
  processingDescription: string;
  elementReferenceNumber: string;
  timestamp: string;
}

/** Internal receipt data saved to Redis (from /api/receipt) */
export interface ReceiptData {
  ethAddress: string;
  txHash: string | null;
  name: string;
  streetAddress: string;
  vatType: 'pl' | 'other';
  vatNumber: string;
  email: string;
  createdAt: string;
}
