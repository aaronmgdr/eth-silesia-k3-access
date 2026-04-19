'use client';

import { useAppKitAccount } from '@reown/appkit/react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/PageHeader';
import { useAuth } from '@/context/AuthContext';

export default function Home() {
  const { isConnected } = useAppKitAccount();
  const { hasValidMembership } = useAuth();

  const router = useRouter();

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#2D3266' }}>
      <PageHeader />

      {/* Main CTA */}
      <main className="flex items-center justify-center min-h-[calc(100vh-120px)] px-8pac">
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
            onClick={() => router.push('/access')}
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
