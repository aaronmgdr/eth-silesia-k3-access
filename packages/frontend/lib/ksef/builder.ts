import { site } from '@/lib/site';
import type { KSeFInvoice, KSeFBuyer, ReceiptData } from './types';

const DAY_PASS_NET_USD = 20.00; // matches USDC_PRICE on-chain
const VAT_RATE = 0.23;

interface NbpRate {
  mid: number;
  tableNumber: string;
  effectiveDate: string; // ISO date
}

async function fetchNbpRate(currency: string): Promise<NbpRate> {
  // NBP publishes the previous business day's rate by ~morning
  const res = await fetch(
    `https://api.nbp.pl/api/exchangerates/rates/a/${currency.toLowerCase()}/?format=json`,
    { next: { revalidate: 3600 } } // cache 1 h — rate changes once per day
  );
  if (!res.ok) throw new Error(`NBP rate fetch failed for ${currency}: ${res.status}`);
  const data = await res.json();
  const latest = data.rates[data.rates.length - 1];
  return {
    mid: latest.mid,
    tableNumber: latest.no,
    effectiveDate: latest.effectiveDate,
  };
}

function nextInvoiceNumber(): string {
  const now = new Date();
  const yyyymm = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}`;
  // TODO: replace timestamp suffix with a persistent atomic counter in Redis
  const seq = Date.now().toString().slice(-6);
  return `KOLEKTYW3/${yyyymm}/${seq}`;
}

function buildBuyer(receipt: ReceiptData): KSeFBuyer {
  return {
    fullName: receipt.name,
    address: receipt.streetAddress,
    nip: receipt.vatType === 'pl' ? receipt.vatNumber : '',
    taxIdType: receipt.vatType === 'pl' ? 'PL' : 'EU',
    email: receipt.email,
  };
}

export async function buildInvoice(receipt: ReceiptData): Promise<KSeFInvoice> {
  const nbp = await fetchNbpRate('USD');

  const vatAmountUsd = DAY_PASS_NET_USD * VAT_RATE;
  const vatAmountPln = parseFloat((vatAmountUsd * nbp.mid).toFixed(2));

  return {
    issueDate: new Date().toISOString().slice(0, 10),
    invoiceNumber: nextInvoiceNumber(),
    currency: 'USD',
    seller: {
      nip: site.nip,
      fullName: site.legalName,
      address: site.address,
    },
    buyer: buildBuyer(receipt),
    items: [
      {
        name: 'Kolektyw3 — Day Pass (24h community space access)',
        netUnit: DAY_PASS_NET_USD,
        quantity: 1,
        vatRate: VAT_RATE,
      },
    ],
    plnConversion: {
      rate: nbp.mid,
      tableNumber: nbp.tableNumber,
      rateDate: nbp.effectiveDate,
      vatAmountPln,
    },
    paymentReference: receipt.txHash ?? undefined,
  };
}
