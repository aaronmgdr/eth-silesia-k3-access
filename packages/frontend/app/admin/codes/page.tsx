'use client';

import { useEffect, useState } from 'react';
import { useAppKit, useAppKitAccount, useDisconnect } from '@reown/appkit/react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ConnectButton } from '@/components/ConnectButton';

type PageState = 'loading' | 'unauthorized' | 'ready' | 'submitting' | 'success' | 'error';

export default function AdminCodesPage() {
  const { address, isConnected, status } = useAppKitAccount();
  const { open, close } = useAppKit();
  const { disconnect } = useDisconnect();
  const { siweSession } = useAuth();
  const router = useRouter();

  const [pageState, setPageState] = useState<PageState>('loading');
  const [rawText, setRawText] = useState('');
  const [message, setMessage] = useState('');
  const [codesLoaded, setCodesLoaded] = useState<number | null>(null);

  // Handle wallet connection modal
  useEffect(() => {
    if (status === 'reconnecting' || status === 'connecting') return;
    if (isConnected && address) {
      close();
    } else {
      open();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, address, status]);

  // Check admin authorization once connected and SIWE session is available.
  // POST with no rawText: 400 = auth passed (show form), 401/403 = not authorized.
  useEffect(() => {
    if (!address || !isConnected || !siweSession) return;
    setPageState('loading');
    fetch('/api/admin/codes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address, message: siweSession.message, signature: siweSession.signature }),
    })
      .then((r) => {
        if (r.status === 401 || r.status === 403) return setPageState('unauthorized');
        setPageState('ready');
      })
      .catch(() => setPageState('unauthorized'));
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address,
          message: siweSession.message,
          signature: siweSession.signature,
          rawText,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.error || 'Upload failed');
        setPageState('error');
        return;
      }

      setCodesLoaded(data.codesLoaded);
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
    maxWidth: '600px',
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

  return (
    <div style={{ backgroundColor: '#2D3266', minHeight: '100vh', padding: '20px' }}>
      {/* Header */}
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
          <form onSubmit={handleSubmit} style={cardStyle}>
            <h2 style={{ fontFamily: 'Satoshi, system-ui, sans-serif', fontWeight: 700, fontSize: '20px', color: '#111827', marginBottom: '8px' }}>
              Upload Access Codes
            </h2>
            <p style={{ fontFamily: 'Satoshi, system-ui, sans-serif', fontSize: '14px', color: '#6b7280', marginBottom: '24px' }}>
              Paste a CSV or markdown table. Replaces all existing codes.
            </p>

            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>Codes</label>
              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                required
                rows={12}
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
                placeholder={`CSV:\n123456,2025-12-31\n789012,2025-12-31\n\nMarkdown:\n| code | expires |\n|------|------|\n| 123456 | 2025-12-31 |`}
              />
              <p style={hint}>Accepts comma-separated, pipe-separated, or markdown table. First column: code. Second column: expiry date.</p>
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
        )}

        {pageState === 'success' && (
          <div style={cardStyle}>
            <h2 style={{ fontFamily: 'Satoshi, system-ui, sans-serif', fontWeight: 700, fontSize: '20px', color: '#111827', marginBottom: '8px' }}>
              Done
            </h2>
            <p style={{ fontFamily: 'Satoshi, system-ui, sans-serif', fontSize: '15px', color: '#374151' }}>
              {codesLoaded} code{codesLoaded !== 1 ? 's' : ''} loaded successfully.
            </p>
            <button
              onClick={() => setPageState('ready')}
              style={{ marginTop: '20px', background: 'transparent', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', color: '#6b7280', cursor: 'pointer', fontFamily: 'Satoshi, system-ui, sans-serif' }}
            >
              Upload more
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
