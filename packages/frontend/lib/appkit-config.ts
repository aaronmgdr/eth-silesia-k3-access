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
    name: 'Kolektyw3',
    description: 'Get instant access to Kolektyw3 community space',
    url: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001',
    icons: [],
  },
});

export { wagmiAdapter };
