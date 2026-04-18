import { createAppKit } from '@reown/appkit/react';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { AppKitNetwork, baseSepolia, Chain } from '@reown/appkit/networks';

const projectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || '';


const localChain: AppKitNetwork = {
  ...baseSepolia,
  id: 84532,
  name: 'Localhost',
    rpcUrls: {
      default: { http: ['localhost:8545'] },
  },
  testnet: true,
};

const networks: [AppKitNetwork] = [localChain];

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
