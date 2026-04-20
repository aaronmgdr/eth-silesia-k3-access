'use client';

import { useAppKit, useAppKitAccount } from '@reown/appkit/react';
import { useAuth } from '@/context/AuthContext';

export function ConnectButton() {
  const { open } = useAppKit();
  const { address, isConnected } = useAppKitAccount();
  const { logout } = useAuth();

  if (isConnected && address) {
    return (
      <button
        onClick={logout}
        style={{ fontSize: '14px', padding: '12px 24px' }}
      >
        {address.slice(0, 6)}...{address.slice(-4)}
      </button>
    );
  }

  return (
    <button
      onClick={() => open()}
      style={{ fontSize: '14px', padding: '12px 24px' }}
    >
      Sign-In with Ethereum
    </button>
  );
}
