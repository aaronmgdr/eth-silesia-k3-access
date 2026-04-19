'use client';

import { useEffect, useState } from 'react';
import { useAppKit, useAppKitAccount, useDisconnect } from '@reown/appkit/react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ConnectButton } from '@/components/ConnectButton';
import type { CodeRecord } from '@/lib/code-service';

type PageState = 'loading' | 'unauthorized' | 'ready' | 'submitting' | 'success' | 'error';

interface CodesStatus {
  available: CodeRecord[];
  claims: Record<string, string>;
}

export default function AdminCodesPage() {
  const { address, isConnected, status } = useAppKitAccount();
  const { open, close } = useAppKit();
  const { disconnect } = useDisconnect();
  const { siweSession } = useAuth();
  const router = useRouter();

  const [pageState, setPageState] = useState<PageState>('loading');
  const [rawText, setRawText] = useState('');
  const [message, setMessage] = useState('');
  const [codesStatus, setCodesStatus] = useState<CodesStatus | null>(null);

  useEffect(() => {
    if (status === 'reconnecting' || status === 'connecting') return;
    if (isConnected && address) {
      close();
    } else {
      open();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, address, status]);

  const siweHeaders = () => ({
    'x-siwe-message': btoa(siweSession!.message),
    'x-siwe-signature': siweSession!.signature,
  });

  const fetchStatus = async () => {
    if (!address || !isConnected || !siweSession) return;
    const r = await fetch('/api/admin/codes', { headers: siweHeaders() });
    if (r.status === 401 || r.status === 403) {
      setPageState('unauthorized');
      return;
    }
    const data = await r.json();
    setCodesStatus({ available: data.available ?? [], claims: data.claims ?? {} });
    setPageState('ready');
  };

  useEffect(() => {
    if (!address || !isConnected || !siweSession) return;
    setPageState('loading');
    fetchStatus().catch(() => setPageState('unauthorized'));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, isConnected, siweSession]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!siweSession || !address) {
      setMessage('Wallet not authenticated — please reconnect.');
      setPageState('error');
      return;
    }

    setPageState('submitting');
    setMessage('');

    try {
      const res = await fetch('/api/admin/codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...siweHeaders() },
        body: JSON.stringify({ rawText }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.error || 'Upload failed');
        setPageState('error');
        return;
      }

      setCodesStatus({ available: data.available ?? [], claims: data.claims ?? {} });
      setRawText('');
      setPageState('success');
    } catch {
      setMessage('Network error');
      setPageState('error');
    }
  };

  if (!address) return null;

  const cardStyle: React.CSSProperties = {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '32px',
    width: '100%',
    maxWidth: '680px',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '13px',
    fontWeight: 500,
    color: '#374151',
    marginBottom: '6px',
    fontFamily: 'Satoshi, system-ui, sans-serif',
  };

  const hint: React.CSSProperties = {
    fontSize: '12px',
    color: '#9ca3af',
    fontFamily: 'Satoshi, system-ui, sans-serif',
    marginTop: '6px',
  };

  const thStyle: React.CSSProperties = {
    textAlign: 'left',
    fontSize: '12px',
    fontWeight: 600,
    color: '#6b7280',
    padding: '8px 12px',
    borderBottom: '1px solid #e5e7eb',
    fontFamily: 'Satoshi, system-ui, sans-serif',
  };

  const tdStyle: React.CSSProperties = {
    padding: '8px 12px',
    fontSize: '13px',
    color: '#111827',
    fontFamily: 'ui-monospace, monospace',
    borderBottom: '1px solid #f3f4f6',
  };

  const sectionTitle: React.CSSProperties = {
    fontFamily: 'Satoshi, system-ui, sans-serif',
    fontWeight: 600,
    fontSize: '14px',
    color: '#374151',
    margin: '24px 0 10px',
  };

  const badgeStyle = (color: string): React.CSSProperties => ({
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: '99px',
    fontSize: '11px',
    fontWeight: 600,
    fontFamily: 'Satoshi, system-ui, sans-serif',
    background: color === 'green' ? '#dcfce7' : color === 'blue' ? '#dbeafe' : '#f3f4f6',
    color: color === 'green' ? '#15803d' : color === 'blue' ? '#1d4ed8' : '#374151',
  });

  const typeColor = (type: string) =>
    type === 'HACKER' ? 'blue' : type === 'VIBER' ? 'green' : 'gray';

  const claimEntries = codesStatus ? Object.entries(codesStatus.claims) : [];

  const CodesPanel = () => (
    <div style={{ marginBottom: '32px' }}>
      {/* Summary */}
      <div style={{
        display: 'flex',
        gap: '16px',
        marginBottom: '20px',
      }}>
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '12px 20px', flex: 1 }}>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#15803d', fontFamily: 'Satoshi, system-ui, sans-serif' }}>
            {codesStatus?.available.length ?? 0}
          </div>
          <div style={{ fontSize: '12px', color: '#166534', fontFamily: 'Satoshi, system-ui, sans-serif', marginTop: '2px' }}>
            Available
          </div>
        </div>
        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '12px 20px', flex: 1 }}>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#1d4ed8', fontFamily: 'Satoshi, system-ui, sans-serif' }}>
            {claimEntries.length}
          </div>
          <div style={{ fontSize: '12px', color: '#1e40af', fontFamily: 'Satoshi, system-ui, sans-serif', marginTop: '2px' }}>
            Claimed
          </div>
        </div>
        <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '12px 20px', flex: 1 }}>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#111827', fontFamily: 'Satoshi, system-ui, sans-serif' }}>
            {(codesStatus?.available.length ?? 0) + claimEntries.length}
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280', fontFamily: 'Satoshi, system-ui, sans-serif', marginTop: '2px' }}>
            Total
          </div>
        </div>
      </div>

      {/* Available codes */}
      {(codesStatus?.available.length ?? 0) > 0 && (
        <>
          <p style={sectionTitle}>Available codes</p>
          <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  <th style={thStyle}>#</th>
                  <th style={thStyle}>Code</th>
                  <th style={thStyle}>Expires</th>
                  <th style={thStyle}>Type</th>
                </tr>
              </thead>
              <tbody>
                {codesStatus!.available.map((c, i) => (
                  <tr key={i}>
                    <td style={{ ...tdStyle, color: '#9ca3af' }}>{i + 1}</td>
                    <td style={{ ...tdStyle, fontWeight: 600, letterSpacing: '0.05em' }}>{c.code}</td>
                    <td style={tdStyle}>{c.expires.slice(0, 10)}</td>
                    <td style={tdStyle}><span style={badgeStyle(typeColor(c.type))}>{c.type}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Claimed codes */}
      {claimEntries.length > 0 && (
        <>
          <p style={sectionTitle}>Claimed codes</p>
          <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  <th style={thStyle}>Identifier</th>
                  <th style={thStyle}>Code</th>
                </tr>
              </thead>
              <tbody>
                {claimEntries.map(([id, code]) => (
                  <tr key={id}>
                    <td style={{ ...tdStyle, color: '#6b7280', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{id}</td>
                    <td style={{ ...tdStyle, fontWeight: 600, letterSpacing: '0.05em' }}>{code}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {codesStatus && codesStatus.available.length === 0 && claimEntries.length === 0 && (
        <p style={{ fontSize: '13px', color: '#9ca3af', fontFamily: 'Satoshi, system-ui, sans-serif' }}>No codes loaded yet.</p>
      )}
    </div>
  );

  return (
    <div style={{ backgroundColor: '#2D3266', minHeight: '100vh', padding: '20px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 24px', marginBottom: '32px' }}>
        <button
          onClick={() => router.push('/')}
          style={{ color: '#ffffff', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', fontFamily: 'Satoshi, system-ui, sans-serif' }}
        >
          ← Back
        </button>
        {address ? (
          <button
            onClick={() => disconnect()}
            style={{ fontSize: '14px', padding: '10px 20px' }}
          >
            {address.slice(0, 6)}...{address.slice(-4)}
          </button>
        ) : (
          <ConnectButton />
        )}
      </header>

      <main style={{ display: 'flex', justifyContent: 'center', paddingTop: '16px' }}>
        {pageState === 'loading' && (
          <p style={{ color: 'rgba(255,255,255,0.6)', fontFamily: 'Satoshi, system-ui, sans-serif' }}>Checking authorization…</p>
        )}

        {pageState === 'unauthorized' && (
          <div style={cardStyle}>
            <p style={{ fontFamily: 'Satoshi, system-ui, sans-serif', color: '#dc2626', fontWeight: 600 }}>Not authorized.</p>
            <p style={{ fontFamily: 'Satoshi, system-ui, sans-serif', fontSize: '14px', color: '#6b7280', marginTop: '8px' }}>
              This address ({address}) is not in the admin allowlist.
            </p>
          </div>
        )}

        {(pageState === 'ready' || pageState === 'submitting' || pageState === 'error') && (
          <div style={cardStyle}>
            <h2 style={{ fontFamily: 'Satoshi, system-ui, sans-serif', fontWeight: 700, fontSize: '20px', color: '#111827', marginBottom: '20px' }}>
              Access Codes
            </h2>

            <CodesPanel />

            <form onSubmit={handleSubmit}>
              <h3 style={{ fontFamily: 'Satoshi, system-ui, sans-serif', fontWeight: 600, fontSize: '15px', color: '#374151', marginBottom: '8px' }}>
                Upload codes
              </h3>
              <p style={{ fontFamily: 'Satoshi, system-ui, sans-serif', fontSize: '13px', color: '#6b7280', marginBottom: '16px' }}>
                Paste CSV or markdown table with columns: <strong>code, expires, type</strong>. Replaces all queued codes.
              </p>

              <div style={{ marginBottom: '20px' }}>
                <label style={labelStyle}>Codes</label>
                <textarea
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  required
                  rows={10}
                  style={{
                    width: '100%',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '12px',
                    fontSize: '13px',
                    fontFamily: 'ui-monospace, monospace',
                    color: '#111827',
                    resize: 'vertical',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                  placeholder={`CSV (type optional, defaults to DAY):\n123456,2026-06-01,DAY\n789012,2026-06-01,VIBER\n\nMarkdown:\n| code   | expires    | type   |\n|--------|------------|--------|\n| 123456 | 2026-06-01 | HACKER |`}
                />
                <p style={hint}>
                  <strong>code</strong> — 4–8 digits{' · '}
                  <strong>expires</strong> — <code>YYYY-MM-DD</code>{' · '}
                  <strong>type</strong> — <code>DAY</code>, <code>VIBER</code>, or <code>HACKER</code>; defaults to <code>DAY</code>
                </p>
              </div>

              {pageState === 'error' && message && (
                <p style={{ fontSize: '13px', color: '#dc2626', marginBottom: '16px', fontFamily: 'Satoshi, system-ui, sans-serif' }}>
                  {message}
                </p>
              )}

              <button
                type="submit"
                disabled={pageState === 'submitting' || !rawText.trim()}
                style={{ width: '100%', padding: '12px' }}
              >
                {pageState === 'submitting' ? 'Uploading…' : 'Upload Codes'}
              </button>
            </form>
          </div>
        )}

        {pageState === 'success' && (
          <div style={cardStyle}>
            <h2 style={{ fontFamily: 'Satoshi, system-ui, sans-serif', fontWeight: 700, fontSize: '20px', color: '#111827', marginBottom: '20px' }}>
              Access Codes
            </h2>

            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '14px 18px', marginBottom: '24px' }}>
              <p style={{ fontFamily: 'Satoshi, system-ui, sans-serif', fontSize: '14px', color: '#15803d', fontWeight: 600 }}>
                {codesStatus?.available.length ?? 0} code{(codesStatus?.available.length ?? 0) !== 1 ? 's' : ''} loaded successfully.
              </p>
            </div>

            <CodesPanel />

            <button
              onClick={() => setPageState('ready')}
              style={{ background: 'transparent', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', color: '#6b7280', cursor: 'pointer', fontFamily: 'Satoshi, system-ui, sans-serif' }}
            >
              Upload more
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
