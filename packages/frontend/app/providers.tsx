'use client';

import React from 'react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// Import to initialize AppKit at module level
import '@/lib/appkit-config';
import { wagmiAdapter } from '@/lib/appkit-config';
import { AuthProvider } from '@/context/AuthContext';

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={wagmiAdapter.wagmiConfig}>
        <AuthProvider>{children}</AuthProvider>
      </WagmiProvider>
    </QueryClientProvider>
  );
}
