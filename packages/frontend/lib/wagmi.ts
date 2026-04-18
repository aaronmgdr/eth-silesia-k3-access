import { createConfig, http } from 'wagmi';
import { activeChain } from './chain';

export const config = createConfig({
  chains: [activeChain as any],
  transports: {
    [activeChain.id]: http(process.env.NEXT_PUBLIC_RPC_URL),
  },
  ssr: true,
});
