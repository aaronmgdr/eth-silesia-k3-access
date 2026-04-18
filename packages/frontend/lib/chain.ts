import { base, baseSepolia } from '@reown/appkit/networks';
import type { AppKitNetwork } from '@reown/appkit/networks';

export const activeChainId = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID ?? '84532', 10);

const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL;

function withRpc(chain: AppKitNetwork): AppKitNetwork {
  if (!rpcUrl) return chain;
  return { ...chain, rpcUrls: { default: { http: [rpcUrl] } } };
}

const localChain: AppKitNetwork = {
  ...baseSepolia,
  id: 31337,
  name: 'Local Anvil',
  rpcUrls: { default: { http: [rpcUrl ?? 'http://127.0.0.1:8545'] } },
  testnet: true,
};

const chainMap: Record<number, AppKitNetwork> = {
  31337: localChain,
  84532: withRpc(baseSepolia),
  8453:  withRpc(base),
};

export const activeChain: AppKitNetwork = chainMap[activeChainId] ?? withRpc(baseSepolia);
