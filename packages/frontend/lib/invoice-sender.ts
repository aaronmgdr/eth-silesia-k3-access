import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import { InvoiceDocument } from './invoice-pdf';
import { buildInvoice } from './ksef/builder';
import { resend } from './resend';
import { site } from './site';
import type { ReceiptData } from './ksef/types';

export async function sendPdfInvoice(receipt: ReceiptData): Promise<void> {
  const invoice = await buildInvoice(receipt);
  const buffer = await renderToBuffer(React.createElement(InvoiceDocument, { invoice }));

  await resend.emails.send({
    from: `${site.legalName} <invoices@ethwarsaw.dev>`,
    to: receipt.email,
    subject: `Invoice ${invoice.invoiceNumber} — Kolektyw3`,
    text: [
      `Dear ${receipt.name},`,
      '',
      'Please find your invoice attached.',
      '',
      `Invoice No.: ${invoice.invoiceNumber}`,
      `Date: ${invoice.issueDate}`,
      `Amount: ${invoice.items.reduce((s, i) => s + i.netUnit * i.quantity * (1 + i.vatRate), 0).toFixed(2)} ${invoice.currency}`,
      '',
      'Thank you for visiting Kolektyw3!',
      '',
      `${site.legalName}`,
    ].join('\n'),
    attachments: [
      {
        filename: `invoice-${invoice.invoiceNumber.replace(/\//g, '-')}.pdf`,
        content: buffer,
      },
    ],
  });
}
