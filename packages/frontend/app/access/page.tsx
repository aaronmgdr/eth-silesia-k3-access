'use client';

import { useAppKit, useAppKitAccount } from '@reown/appkit/react';
import { useEffect, useState } from 'react';
import { DayPassPurchase } from '@/components/DayPassPurchase';
import { PageHeader } from '@/components/PageHeader';
import { ReceiptForm } from '@/components/ReceiptForm';

export default function AccessPage() {
  const { address, isConnected, status } = useAppKitAccount();
  const { open, close } = useAppKit();
  const [showReceipt, setShowReceipt] = useState(false);
  const [mintTxHash, setMintTxHash] = useState<string | undefined>();

  useEffect(() => {
    if (status === 'reconnecting' || status === 'connecting') return;
    if (isConnected && address) {
      close();
    } else {
      open();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, address, status]);

  if (!address) {
    return null;
  }

  return (
    <div style={{ backgroundColor: '#2D3266', minHeight: '100vh' }}>
      <PageHeader backHref="/" />

      {/* Main Content */}
      <main className="flex flex-col items-center justify-center gap-4">
        <DayPassPurchase onMintComplete={setMintTxHash} />
        <div className="w-full max-w-md">
          {showReceipt ? (
            <ReceiptForm address={address} mintTxHash={mintTxHash} onClose={() => setShowReceipt(false)} />
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
