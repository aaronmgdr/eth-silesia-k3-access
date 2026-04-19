import { buildInvoice } from './builder';
import { submitInvoice } from './client';
import type { ReceiptData, KSeFSubmitResult } from './types';

const enabled = process.env.KSEF_ENABLED === 'true';

/**
 * Issue a KSeF e-invoice for a receipt.
 * No-ops when KSEF_ENABLED is not 'true' — safe to call unconditionally.
 */
export async function issueInvoice(receipt: ReceiptData): Promise<KSeFSubmitResult | null> {
  if (!enabled) return null;
  const invoice = await buildInvoice(receipt);
  return submitInvoice(invoice);
}
