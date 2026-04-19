'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAppKitAccount, useDisconnect } from '@reown/appkit/react';
import { ConnectButton } from '@/components/ConnectButton';

interface PageHeaderProps {
  backHref?: string;
}

export function PageHeader({ backHref }: PageHeaderProps) {
  const router = useRouter();
  const { address } = useAppKitAccount();
  const { disconnect } = useDisconnect();

  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '24px 24px',
    }}>
      <div style={{ width: '120px' }}>
        {backHref ? (
          <button
            onClick={() => router.push(backHref)}
            style={{ color: '#ffffff', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', fontFamily: 'Satoshi, system-ui, sans-serif', padding: 0 }}
          >
            ← Back
          </button>
        ) : (
          <Image src="/logo.png" alt="Kolektyw3" width={120} height={40} style={{ objectFit: 'contain', filter: 'invert(1)' }} />
        )}
      </div>

      <div>
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
      </div>
    </header>
  );
}
