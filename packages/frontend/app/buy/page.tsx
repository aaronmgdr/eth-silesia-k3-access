'use client';

import { useAppKit, useAppKitAccount, useDisconnect } from '@reown/appkit/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { DayPassPurchase } from '@/components/DayPassPurchase';
import { ConnectButton } from '@/components/ConnectButton';

export default function BuyPage() {
  const { address, isConnected } = useAppKitAccount();
  const router = useRouter();
  const {open} = useAppKit(); // Initialize AppKit to get access to the open function
  const {disconnect} = useDisconnect();
  // Redirect to home if not connected
  useEffect(() => {
    if (!isConnected || !address) {
      open()
    }
  }, [isConnected, address, router, open]);

  if (!address) {
    return null;
  }

  return (
    <div style={{ backgroundColor: '#2D3266', padding: '20px 20px' }}>
      {/* Header */}
      <header className="px-6 py-8 mb-8 flex items-center justify-between">
        <div className="">
          <button
            onClick={() => router.push('/')}
            className="text-18"
            style={{ color: '#FFFFFF', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            ← Back
          </button>
        </div>
        {address ? (
                    <button
                      onClick={() => disconnect()}
                      style={{
                        fontSize: '14px',
                        padding: '12px 24px',
                      }}
                    >
                      {address.slice(0, 6)}...{address.slice(-4)}
                    </button>
                  ) : (
                    <ConnectButton />
                  )}
      </header>

      {/* Main Content */}
      <main className="flex items-center justify-center">
        <DayPassPurchase />
      </main>
    </div>
  );
}
