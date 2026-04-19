import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { KSeFInvoice } from './ksef/types';
import { site } from './site';

// ─── number-to-words (English, up to 9 999) ──────────────────────────────────
const ONES = ['','one','two','three','four','five','six','seven','eight','nine',
  'ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
const TENS = ['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];

function n2w(n: number): string {
  if (n === 0) return 'zero';
  if (n < 20) return ONES[n];
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? '-' + ONES[n % 10] : '');
  if (n < 1000) return ONES[Math.floor(n / 100)] + ' hundred' + (n % 100 ? ' ' + n2w(n % 100) : '');
  return n2w(Math.floor(n / 1000)) + ' thousand' + (n % 1000 ? ' ' + n2w(n % 1000) : '');
}

function amountInWords(amount: number, currency: string): string {
  const whole = Math.floor(amount);
  const cents = Math.round((amount - whole) * 100);
  const label = currency === 'USD' ? 'US dollar' : currency.toLowerCase();
  return `${n2w(whole)} ${label}${whole !== 1 ? 's' : ''} and ${String(cents).padStart(2, '0')}/100`;
}

function fmt(n: number) { return n.toFixed(2); }
function paymentDue(issueDate: string) {
  const d = new Date(issueDate);
  d.setDate(d.getDate() + 14);
  return d.toISOString().slice(0, 10);
}

// ─── styles ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page:       { fontFamily: 'Helvetica', fontSize: 8.5, color: '#111', padding: '28 36 28 36' },
  row:        { flexDirection: 'row' },
  col:        { flex: 1 },

  // header
  title:      { fontSize: 13, fontFamily: 'Helvetica-Bold', textAlign: 'center', marginBottom: 6 },
  subLabel:   { fontSize: 7.5, color: '#555' },
  dateGrid:   { flexDirection: 'row', gap: 8, marginBottom: 14 },
  dateCell:   { flex: 1 },

  // party blocks
  partySection: { flexDirection: 'row', marginBottom: 14, gap: 20 },
  partyBox:   { flex: 1 },
  partyHead:  { fontSize: 8, fontFamily: 'Helvetica-Bold', marginBottom: 3, color: '#555' },
  partyName:  { fontFamily: 'Helvetica-Bold', marginBottom: 1 },

  // tables
  table:      { marginBottom: 10 },
  tableHead:  { flexDirection: 'row', backgroundColor: '#f0f0f0', borderTopWidth: 0.5, borderBottomWidth: 0.5, borderColor: '#aaa' },
  tableRow:   { flexDirection: 'row', borderBottomWidth: 0.5, borderColor: '#ddd' },
  th:         { fontFamily: 'Helvetica-Bold', fontSize: 7.5, padding: '3 4', textAlign: 'center' },
  td:         { fontSize: 8, padding: '3 4' },
  right:      { textAlign: 'right' },
  center:     { textAlign: 'center' },

  // col widths — line items
  cNo:        { width: 22 },
  cDesc:      { flex: 1 },
  cUnit:      { width: 28 },
  cQty:       { width: 24 },
  cPrice:     { width: 52 },
  cRate:      { width: 36 },
  cNet:       { width: 58 },
  cGross:     { width: 58 },

  // col widths — vat summary
  vRate:      { width: 60 },
  vNet:       { width: 80 },
  vTax:       { width: 80 },
  vGross:     { width: 80 },

  // totals
  totalsBox:  { alignItems: 'flex-end', marginBottom: 8 },
  totalLine:  { flexDirection: 'row', gap: 12, marginBottom: 2 },
  totalLabel: { width: 100, textAlign: 'right', color: '#555' },
  totalValue: { width: 72, textAlign: 'right' },
  totalDue:   { fontFamily: 'Helvetica-Bold', fontSize: 10 },

  inWords:    { fontSize: 8, color: '#555', marginBottom: 12 },

  sig:        { flexDirection: 'row', marginTop: 24 },
  sigBox:     { flex: 1, borderTopWidth: 0.5, borderColor: '#aaa', paddingTop: 4, fontSize: 7.5, color: '#555' },
});

// ─── component ───────────────────────────────────────────────────────────────
export function InvoiceDocument({ invoice }: { invoice: KSeFInvoice }) {
  const cur = invoice.currency;
  const items = invoice.items;

  const netTotal  = items.reduce((s, i) => s + i.netUnit * i.quantity, 0);
  const vatTotal  = items.reduce((s, i) => s + i.netUnit * i.quantity * i.vatRate, 0);
  const grossTotal = netTotal + vatTotal;

  const vatRate = items[0]?.vatRate ?? 0.23;
  const vatPct  = `${Math.round(vatRate * 100)}%`;

  const due = paymentDue(invoice.issueDate);

  const buyerTaxLabel = invoice.buyer.taxIdType === 'PL' ? 'NIP' : 'VAT';

  return (
    <Document>
      <Page size="A4" style={s.page}>

        {/* ── Header ── */}
        <View style={s.row}>
          {/* left: logo placeholder */}
          <View style={{ width: 90, height: 70, backgroundColor: '#eee', alignItems: 'center', justifyContent: 'center', marginRight: 20, borderRadius: 4 }}>
            <Text style={{ fontSize: 7, color: '#888', textAlign: 'center' }}>ETH WARSAW{'\n'}LOGO</Text>
          </View>
          {/* right: invoice meta */}
          <View style={{ flex: 1 }}>
            <Text style={s.title}>Faktura nr / Invoice No.: {invoice.invoiceNumber}</Text>
            <View style={s.dateGrid}>
              <View style={s.dateCell}>
                <Text style={s.subLabel}>Data wystawienia / Invoice Date:</Text>
                <Text>{invoice.issueDate}</Text>
              </View>
              <View style={s.dateCell}>
                <Text style={s.subLabel}>Data sprzedaży / Sale date:</Text>
                <Text>{invoice.issueDate}</Text>
              </View>
              <View style={s.dateCell}>
                <Text style={s.subLabel}>Termin płatności / Payment Due By:</Text>
                <Text>{due}</Text>
              </View>
              <View style={s.dateCell}>
                <Text style={s.subLabel}>Metoda płatności / Payment Method:</Text>
                <Text>przelew / transfer</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Parties ── */}
        <View style={s.partySection}>
          <View style={s.partyBox}>
            <Text style={s.partyHead}>Sprzedawca (Seller)</Text>
            <Text style={s.partyName}>{site.legalName}</Text>
            <Text>{site.address}</Text>
            <Text>NIP: {site.nip}</Text>
            <Text style={{ marginTop: 3 }}>{site.bank}</Text>
            <Text>{site.iban}</Text>
            <Text>SWIFT: {site.swift}</Text>
          </View>
          <View style={s.partyBox}>
            <Text style={s.partyHead}>Nabywca (Bill to)</Text>
            <Text style={s.partyName}>{invoice.buyer.fullName}</Text>
            <Text>{invoice.buyer.address}</Text>
            {invoice.buyer.nip
              ? <Text>{buyerTaxLabel}: {invoice.buyer.nip}</Text>
              : null}
          </View>
        </View>

        {/* ── Line items ── */}
        <View style={s.table}>
          <View style={s.tableHead}>
            <Text style={[s.th, s.cNo,   s.center]}>Lp{'\n'}No</Text>
            <Text style={[s.th, s.cDesc]}>Nazwa{'\n'}Description</Text>
            <Text style={[s.th, s.cUnit, s.center]}>Jedn.{'\n'}Unit</Text>
            <Text style={[s.th, s.cQty,  s.center]}>Ilość{'\n'}Qty</Text>
            <Text style={[s.th, s.cPrice, s.right]}>Cena netto{'\n'}Unit price</Text>
            <Text style={[s.th, s.cRate, s.center]}>Stawka{'\n'}Tax Rate</Text>
            <Text style={[s.th, s.cNet,  s.right]}>Wartość netto{'\n'}Total Excl. Tax</Text>
            <Text style={[s.th, s.cGross, s.right]}>Wartość brutto{'\n'}Total Incl. Tax</Text>
          </View>
          {items.map((item, i) => {
            const net   = item.netUnit * item.quantity;
            const gross = net * (1 + item.vatRate);
            return (
              <View key={i} style={s.tableRow}>
                <Text style={[s.td, s.cNo,   s.center]}>{i + 1}</Text>
                <Text style={[s.td, s.cDesc]}>{item.name}</Text>
                <Text style={[s.td, s.cUnit, s.center]}>usł.</Text>
                <Text style={[s.td, s.cQty,  s.center]}>{item.quantity}</Text>
                <Text style={[s.td, s.cPrice, s.right]}>{fmt(item.netUnit)}</Text>
                <Text style={[s.td, s.cRate, s.center]}>{Math.round(item.vatRate * 100)}%</Text>
                <Text style={[s.td, s.cNet,  s.right]}>{fmt(net)}</Text>
                <Text style={[s.td, s.cGross, s.right]}>{fmt(gross)}</Text>
              </View>
            );
          })}
        </View>

        {/* ── VAT summary + totals ── */}
        <View style={s.row}>
          {/* VAT summary */}
          <View style={{ flex: 1, marginRight: 20 }}>
            <View style={s.table}>
              <View style={s.tableHead}>
                <Text style={[s.th, s.vRate]}>Stawka VAT / Tax Rate</Text>
                <Text style={[s.th, s.vNet,  s.right]}>Wartość netto / Total Excl. Tax</Text>
                <Text style={[s.th, s.vTax,  s.right]}>Kwota VAT / Tax</Text>
                <Text style={[s.th, s.vGross, s.right]}>Wartość brutto / Total Incl. Tax</Text>
              </View>
              <View style={s.tableRow}>
                <Text style={[s.td, s.vRate, s.center]}>{vatPct}</Text>
                <Text style={[s.td, s.vNet,  s.right]}>{fmt(netTotal)}</Text>
                <Text style={[s.td, s.vTax,  s.right]}>{fmt(vatTotal)}</Text>
                <Text style={[s.td, s.vGross, s.right]}>{fmt(grossTotal)}</Text>
              </View>
              <View style={[s.tableRow, { backgroundColor: '#f0f0f0' }]}>
                <Text style={[s.td, s.vRate, s.center, { fontFamily: 'Helvetica-Bold' }]}>Razem / Total</Text>
                <Text style={[s.td, s.vNet,  s.right, { fontFamily: 'Helvetica-Bold' }]}>{fmt(netTotal)}</Text>
                <Text style={[s.td, s.vTax,  s.right, { fontFamily: 'Helvetica-Bold' }]}>{fmt(vatTotal)}</Text>
                <Text style={[s.td, s.vGross, s.right, { fontFamily: 'Helvetica-Bold' }]}>{fmt(grossTotal)}</Text>
              </View>
            </View>
            {/* PLN conversion note */}
            {invoice.plnConversion && (
              <Text style={{ fontSize: 7, color: '#666' }}>
                VAT in PLN: {fmt(invoice.plnConversion.vatAmountPln)} PLN
                {' '}(NBP {invoice.plnConversion.tableNumber}, rate {invoice.plnConversion.rate} from {invoice.plnConversion.rateDate})
              </Text>
            )}
          </View>

          {/* Payment totals */}
          <View style={{ width: 180 }}>
            <View style={s.totalLine}>
              <Text style={s.totalLabel}>Zapłacono / Already Paid</Text>
              <Text style={s.totalValue}>0.00 {cur}</Text>
            </View>
            <View style={s.totalLine}>
              <Text style={[s.totalLabel, s.totalDue]}>Do zapłaty / Total Due</Text>
              <Text style={[s.totalValue, s.totalDue]}>{fmt(grossTotal)} {cur}</Text>
            </View>
            <View style={s.totalLine}>
              <Text style={s.totalLabel}>Razem / Total</Text>
              <Text style={s.totalValue}>{fmt(grossTotal)} {cur}</Text>
            </View>
            <Text style={{ fontSize: 7.5, color: '#555', textAlign: 'right', marginTop: 2 }}>Słownie / In words</Text>
            <Text style={{ fontSize: 7.5, textAlign: 'right' }}>{amountInWords(grossTotal, cur)}</Text>
          </View>
        </View>

        {/* ── Payment reference ── */}
        {invoice.paymentReference && (
          <Text style={{ fontSize: 7.5, color: '#666', marginTop: 6 }}>
            On-chain payment reference: {invoice.paymentReference}
          </Text>
        )}

        {/* ── Signatures ── */}
        <View style={s.sig}>
          <View style={[s.sigBox, { marginRight: 40 }]}>
            <Text>Paweł Zaremba</Text>
            <Text>Imię i nazwisko osoby uprawnionej do wystawiania faktury</Text>
            <Text style={{ fontStyle: 'italic' }}>seller's signature</Text>
          </View>
          <View style={s.sigBox}>
            <Text> </Text>
            <Text>Imię i nazwisko osoby uprawnionej do odbioru faktury</Text>
            <Text style={{ fontStyle: 'italic' }}>buyer's signature</Text>
          </View>
        </View>

      </Page>
    </Document>
  );
}
