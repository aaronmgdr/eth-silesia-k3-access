import Link from 'next/link';
import { site } from '@/lib/site';

export function Footer() {
  return (
    <footer style={{
      backgroundColor: '#1e2347',
      borderTop: '1px solid rgba(255,255,255,0.08)',
      fontFamily: 'Satoshi, system-ui, sans-serif',
    }}>
      {site.demoMode && (
        <div style={{
          backgroundColor: '#92400e',
          color: '#fef3c7',
          textAlign: 'center',
          padding: '8px 24px',
          fontSize: '13px',
          fontWeight: 500,
        }}>
          Demo build — for hackathon purposes only. No legally binding transactions or invoices are issued.
        </div>
      )}
      <div style={{
        padding: '20px 24px',
        textAlign: 'center',
        fontSize: '13px',
        color: 'rgba(255,255,255,0.4)',
      }}>
        <span>{site.legalName}</span>
        <span style={{ margin: '0 12px' }}>·</span>
        <Link href="/privacy" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'underline' }}>
          Privacy Policy
        </Link>
        <span style={{ margin: '0 12px' }}>·</span>
        <a href={`${site.sourceUrl}/blob/main/LICENSE`} target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'underline' }}>
          GPL-3.0
        </a>
        <span style={{ margin: '0 12px' }}>·</span>
        <a href={site.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'underline' }}>
          Source
        </a>
        <span style={{ margin: '0 12px' }}>·</span>
        <a href={`mailto:${site.contactEmail}`} style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'underline' }}>
          {site.contactEmail}
        </a>
      </div>
    </footer>
  );
}
