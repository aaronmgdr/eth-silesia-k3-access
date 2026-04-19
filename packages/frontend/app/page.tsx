'use client';

import { useDisconnect } from 'wagmi';
import { useAppKit, useAppKitAccount } from '@reown/appkit/react';
import { useRouter } from 'next/navigation';
import { ConnectButton } from '@/components/ConnectButton';
import { useAuth } from '@/context/AuthContext';

export default function Home() {
  const { address, isConnected } = useAppKitAccount();
  const { disconnect } = useDisconnect();
  const { hasValidMembership } = useAuth();

  const router = useRouter();

  const handleAccessClick = () => {
    router.push('/access');
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#2D3266' }}>
      {/* Header with Sign In Button */}
      <header className="px-6 py-8">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-24 font-satoshi font-bold" style={{ color: '#FFFFFF' }}>
            Kolektyw3
          </h1>
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
        </div>
      </header>

      {/* Main CTA */}
      <main className="flex items-center justify-center min-h-[calc(100vh-120px)]">
        <div className="text-center space-y-12">
          <div className="space-y-4">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-satoshi font-bold tracking-tight mb-5" style={{ color: '#FFFFFF' }}>
              Kolektyw3
            </h2>
            <h3 className="text-xl font-satoshi max-w-xl mx-auto" style={{ color: 'rgba(226, 230, 233, 0.6)' }}>
              Get instant access to Kolektyw3 community space with 20 USDC
            </h3>
          </div>
          <button
            onClick={handleAccessClick}
            style={{
              fontSize: '28px',
              padding: '24px 60px',
              margin: '0 auto',
            }}
          >
            {isConnected && hasValidMembership ? 'My Access' : 'Buy Day Pass'}
          </button>
        </div>
      </main>
    </div>
  );
}
