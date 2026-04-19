import { site } from '@/lib/site';

export const metadata = {
  title: 'Privacy Policy — Kolektyw3',
};

export default function PrivacyPage() {
  return (
    <div style={{ backgroundColor: '#2D3266', minHeight: '100vh', padding: '48px 20px' }}>
      <div style={{ maxWidth: '680px', margin: '0 auto', backgroundColor: '#ffffff', borderRadius: '16px', padding: '40px 48px', fontFamily: 'Satoshi, system-ui, sans-serif', color: '#1f2937' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>Privacy Policy</h1>
        <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: site.demoMode ? '16px' : '32px' }}>Last updated: April 2026</p>
        {site.demoMode && (
          <div style={{ backgroundColor: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '8px', padding: '12px 16px', marginBottom: '24px', fontSize: '13px', color: '#92400e' }}>
            <strong>Demo mode:</strong> this is a hackathon demonstration. No personal data is processed for legal invoicing purposes and this policy is not legally operative.
          </div>
        )}

        <Section title="Who we are">
          <p style={{ marginBottom: '12px' }}>
            {site.legalName} (<strong>we</strong>, <strong>us</strong>) operates Kolektyw3, a community space
            in the heart of Warsaw, and its online platform at{' '}
            <a href={site.appUrl} style={{ color: '#4f46e5' }}>{site.appUrl}</a>.
            We are the data controller for personal data collected through this service.
          </p>
          <p style={{ fontFamily: 'monospace', fontSize: '13px', lineHeight: '1.9', color: '#374151' }}>
            {site.legalName}<br />
            {site.address}<br />
            NIP: {site.nip}<br />
            <a href={`mailto:${site.contactEmail}`} style={{ color: '#4f46e5' }}>{site.contactEmail}</a>
          </p>
        </Section>

        <Section title="What data we collect and why">
          <p>When you request an invoice or receipt we collect:</p>
          <ul style={{ paddingLeft: '20px', marginTop: '12px', lineHeight: '1.8' }}>
            <li><strong>Name or company name</strong></li>
            <li><strong>Billing address</strong></li>
            <li><strong>VAT / tax identification number</strong> (NIP, EU VAT, or TIN)</li>
            <li><strong>Email address</strong> — to deliver the invoice</li>
            <li><strong>Ethereum wallet address</strong> — to link the invoice to the on-chain transaction</li>
            <li><strong>Transaction hash</strong> — as proof of payment for tax purposes</li>
          </ul>
          <p style={{ marginTop: '12px' }}>
            We collect this data solely to issue a VAT-compliant invoice. The legal basis is
            <strong> Article 6(1)(c) GDPR</strong> — processing necessary to comply with a legal
            obligation (Polish VAT Act / EU VAT Directive 2006/112/EC).
          </p>
          <p style={{ marginTop: '12px' }}>
            We do not use this data for marketing, profiling, or any purpose other than invoice issuance and the tax record-keeping obligations that follow.
          </p>
        </Section>

        <Section title="How long we keep it">
          <p>
            Tax records must be retained for <strong>5 years</strong> from the end of the tax year in
            which the transaction occurred, as required by Polish and EU tax law. After that period
            your invoice data is deleted.
          </p>
        </Section>

        <Section title="Who we share it with">
          <p>
            We share your email address with <strong>Resend</strong> (resend.com) solely to deliver
            your invoice. We do not sell or share your personal data with any other third party.
          </p>
          <p style={{ marginTop: '12px' }}>
            Note: your Ethereum address and the transaction hash are public on the blockchain. We
            have no control over that data — it is outside the scope of this policy.
          </p>
        </Section>

        <Section title="Your rights">
          <p>Under GDPR you have the right to:</p>
          <ul style={{ paddingLeft: '20px', marginTop: '12px', lineHeight: '1.8' }}>
            <li><strong>Access</strong> the personal data we hold about you</li>
            <li><strong>Correct</strong> inaccurate data</li>
            <li><strong>Request deletion</strong> — subject to our legal retention obligations above</li>
            <li><strong>Object</strong> to processing or request restriction</li>
            <li><strong>Lodge a complaint</strong> with the Polish supervisory authority (UODO, uodo.gov.pl)</li>
          </ul>
          <p style={{ marginTop: '12px' }}>
            To exercise any of these rights, email us at{' '}
            <a href={`mailto:${site.contactEmail}`} style={{ color: '#4f46e5' }}>{site.contactEmail}</a>.
            We will respond within 30 days.
          </p>
        </Section>

        <Section title="Cookies and on-chain data">
          <p>
            This site uses <strong>localStorage</strong> to temporarily cache your access code and
            transaction hash in your own browser. No tracking cookies are set. We do not use
            analytics or advertising scripts.
          </p>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '28px' }}>
      <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '10px', color: '#111827' }}>{title}</h2>
      <div style={{ fontSize: '14px', lineHeight: '1.7', color: '#374151' }}>{children}</div>
    </div>
  );
}
