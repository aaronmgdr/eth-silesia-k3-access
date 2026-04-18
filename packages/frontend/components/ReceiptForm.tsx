'use client';

import { useState } from 'react';

interface ReceiptFormProps {
  address: string;
  onClose: () => void;
}

export function ReceiptForm({ address, onClose }: ReceiptFormProps) {
  const [name, setName] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [vatType, setVatType] = useState<'pl' | 'other'>('pl');
  const [vatNumber, setVatNumber] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, name, streetAddress, vatType, vatNumber, email }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save');
      }
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '10px 12px',
    fontSize: '14px',
    fontFamily: 'Satoshi, system-ui, sans-serif',
    outline: 'none',
    color: '#1f2937',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '13px',
    fontWeight: 500,
    color: '#374151',
    marginBottom: '6px',
    fontFamily: 'Satoshi, system-ui, sans-serif',
  };

  if (saved) {
    return (
      <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '32px', textAlign: 'center' }}>
        <p style={{ fontSize: '16px', fontWeight: 600, color: '#1f2937', fontFamily: 'Satoshi, system-ui, sans-serif' }}>
          Details saved.
        </p>
        <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '8px', fontFamily: 'Satoshi, system-ui, sans-serif' }}>
          We'll send your invoice to {email}.
        </p>
        <button
          onClick={onClose}
          style={{ marginTop: '20px', background: 'none', border: 'none', fontSize: '13px', color: '#9ca3af', cursor: 'pointer', textDecoration: 'underline' }}
        >
          Close
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '28px' }}>
      <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#1f2937', marginBottom: '20px', fontFamily: 'Satoshi, system-ui, sans-serif' }}>
        Invoice Details
      </h3>

      <div style={{ marginBottom: '16px' }}>
        <label style={labelStyle}>Name or Company</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          required
          style={inputStyle}
          placeholder="Jan Kowalski or Acme Sp. z o.o."
        />
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={labelStyle}>Address</label>
        <input
          type="text"
          value={streetAddress}
          onChange={e => setStreetAddress(e.target.value)}
          required
          style={inputStyle}
          placeholder="ul. Katowicka 1, 40-001 Katowice"
        />
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={labelStyle}>Tax ID</label>
        <div style={{ display: 'flex', gap: '20px', marginBottom: '8px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#374151', cursor: 'pointer', fontFamily: 'Satoshi, system-ui, sans-serif' }}>
            <input type="radio" checked={vatType === 'pl'} onChange={() => setVatType('pl')} />
            Polish NIP
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#374151', cursor: 'pointer', fontFamily: 'Satoshi, system-ui, sans-serif' }}>
            <input type="radio" checked={vatType === 'other'} onChange={() => setVatType('other')} />
            EU VAT / TIN
          </label>
        </div>
        <input
          type="text"
          value={vatNumber}
          onChange={e => setVatNumber(e.target.value)}
          required
          style={inputStyle}
          placeholder={vatType === 'pl' ? '1234567890' : 'DE123456789'}
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={labelStyle}>Email</label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          style={inputStyle}
          placeholder="you@example.com"
        />
      </div>

      {error && (
        <p style={{ fontSize: '13px', color: '#dc2626', marginBottom: '12px', fontFamily: 'Satoshi, system-ui, sans-serif' }}>
          {error}
        </p>
      )}

      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          type="submit"
          disabled={loading}
          style={{ flex: 1, padding: '11px 0', fontSize: '14px' }}
        >
          {loading ? 'Saving...' : 'Save Details'}
        </button>
        <button
          type="button"
          onClick={onClose}
          style={{
            padding: '11px 18px',
            fontSize: '14px',
            background: 'transparent',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            color: '#6b7280',
            cursor: 'pointer',
          }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
