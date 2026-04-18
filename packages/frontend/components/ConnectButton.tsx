'use client';

import { useEffect, useRef, useState } from 'react';
import { Address } from 'viem';
import { createSiweMessage } from 'viem/siwe';
import { useAppKit, useAppKitAccount } from '@reown/appkit/react';
import { useDisconnect, useSignMessage } from 'wagmi';
import { useAuth } from '@/context/AuthContext';

export function ConnectButton() {
  const { open } = useAppKit();
  const { address, isConnected } = useAppKitAccount();
  const { disconnect } = useDisconnect();
  const { signMessageAsync } = useSignMessage();
  const { siweSession, setSiweSession, logout } = useAuth();
  const authAttempted = useRef(false);
  const [siweError, setSiweError] = useState<string | null>(null);

  const authenticate = async () => {
    if (!address || authAttempted.current) return;
    authAttempted.current = true;
    setSiweError(null);

    try {
      const nonceRes = await fetch('/api/nonce');
      const { nonce } = await nonceRes.json();

      const message = createSiweMessage({
        domain: window.location.host,
        address: address as Address,
        statement: 'Sign in to Kolektyw3 Access.',
        uri: window.location.origin,
        version: '1',
        chainId: 84532,
        nonce,
      });

      const signature = await signMessageAsync({ message });
      setSiweSession({ message, signature });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Signature rejected';
      setSiweError(msg.includes('rejected') || msg.includes('denied') ? 'Signature rejected. Please sign to continue.' : msg);
    } finally {
      authAttempted.current = false;
    }
  };

  useEffect(() => {
    if (!isConnected || !address || siweSession || authAttempted.current) return;
    authenticate();
  }, [isConnected, address, siweSession]);

  if (isConnected && address) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
        {siweError && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
            <p style={{ fontSize: '12px', color: '#C92A2A', margin: 0 }}>{siweError}</p>
            <button
              onClick={authenticate}
              style={{ fontSize: '12px', padding: '6px 12px', backgroundColor: 'transparent', border: '1px solid #C92A2A', color: '#C92A2A' }}
            >
              Sign again
            </button>
          </div>
        )}
        <button
          onClick={() => { setSiweError(null); logout(); }}
          style={{ fontSize: '14px', padding: '12px 24px' }}
        >
          {address.slice(0, 6)}...{address.slice(-4)}
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => open()}
      style={{ fontSize: '14px', padding: '12px 24px' }}
    >
      Sign with Ethereum
    </button>
  );
}
