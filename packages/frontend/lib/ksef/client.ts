import type { KSeFInvoice, KSeFSubmitResult } from './types';

const BASE_URL = process.env.KSEF_API_URL ?? 'https://ksef-test.mf.gov.pl/api'; // test env default
const NIP = process.env.KSEF_NIP ?? '';

// ---------------------------------------------------------------------------
// Authentication
// KSeF requires a qualified electronic signature (X.509 certificate issued by
// a Polish trusted certification authority) to open a session.
//
// TODO: Implement one of these auth flows:
//   A) Token-based  — pre-generated API token from KSeF portal (simplest)
//   B) Certificate  — sign the auth challenge with a PKCS#12 certificate
//
// Env vars needed:
//   KSEF_API_URL   — override for prod (https://api.ksef.mf.gov.pl/api)
//   KSEF_NIP       — seller NIP (10 digits, no dashes)
//   KSEF_TOKEN     — pre-generated token (path A)
//   KSEF_CERT_P12  — base64-encoded PKCS#12 certificate (path B)
//   KSEF_CERT_PASS — certificate passphrase (path B)
// ---------------------------------------------------------------------------

async function openSession(): Promise<string> {
  const token = process.env.KSEF_TOKEN;
  if (token) {
    // TODO: POST /sessions/token — exchange KSEF_TOKEN for a session token
    // https://ksef-test.mf.gov.pl/api/sessions/token
    throw new Error('KSeF token auth not yet implemented');
  }

  // TODO: POST /sessions/challenge → sign challenge with cert → POST /sessions/init
  throw new Error('KSeF certificate auth not yet implemented');
}

async function closeSession(sessionToken: string): Promise<void> {
  // TODO: DELETE /sessions/{sessionToken}
  void sessionToken;
}

// ---------------------------------------------------------------------------
// Invoice serialisation
// KSeF expects FA(2) XML (schema: https://github.com/CIRFMF/ksef-docs)
// TODO: convert KSeFInvoice → valid FA2 XML string
// ---------------------------------------------------------------------------

function invoiceToXml(_invoice: KSeFInvoice): string {
  // TODO: build FA2-compliant XML
  // Libraries to consider: fast-xml-parser, xmlbuilder2
  throw new Error('KSeF XML serialisation not yet implemented');
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function submitInvoice(invoice: KSeFInvoice): Promise<KSeFSubmitResult> {
  const sessionToken = await openSession();
  try {
    const xml = invoiceToXml(invoice);

    // TODO: POST /invoices/send — multipart or base64-encoded XML body
    const res = await fetch(`${BASE_URL}/invoices/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'SessionToken': sessionToken,
      },
      body: xml,
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`KSeF submission failed (${res.status}): ${err}`);
    }

    return res.json() as Promise<KSeFSubmitResult>;
  } finally {
    await closeSession(sessionToken).catch(() => {});
  }
}
