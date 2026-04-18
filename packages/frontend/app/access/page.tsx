'use client';

import { useAppKit, useAppKitAccount, useDisconnect } from '@reown/appkit/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { DayPassPurchase } from '@/components/DayPassPurchase';
import { ConnectButton } from '@/components/ConnectButton';
import { ReceiptForm } from '@/components/ReceiptForm';

export default function AccessPage() {
  const { address, isConnected } = useAppKitAccount();
  const router = useRouter();
  const {open} = useAppKit(); // Initialize AppKit to get access to the open function
  const {disconnect} = useDisconnect();
  const [showReceipt, setShowReceipt] = useState(false);
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
      <main className="flex flex-col items-center justify-center gap-4">
        <DayPassPurchase />
        <div className="w-full max-w-md">
          {showReceipt ? (
            <ReceiptForm address={address} onClose={() => setShowReceipt(false)} />
          ) : (
            <button
              onClick={() => setShowReceipt(true)}
              style={{
                width: '100%',
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.35)',
                color: 'rgba(255,255,255,0.7)',
                padding: '10px 20px',
                borderRadius: '8px',
                fontSize: '14px',
                fontFamily: 'Satoshi, system-ui, sans-serif',
                cursor: 'pointer',
              }}
            >
              I need a receipt
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
