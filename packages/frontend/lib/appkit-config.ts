import { createAppKit } from '@reown/appkit/react';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import type { AppKitNetwork } from '@reown/appkit/networks';
import { activeChain } from './chain';

const projectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || '';

const networks: [AppKitNetwork] = [activeChain];

const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId,
  ssr: true,
});

createAppKit({
  adapters: [wagmiAdapter],
  networks,
  projectId,
  metadata: {
    name: 'Kolektyw3 Access',
    description: 'Get instant access to kolektyw3 coworking',
    url: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001',
    icons: [],
  },
});

export { wagmiAdapter };
