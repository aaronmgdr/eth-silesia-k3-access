'use client';

import { useEffect, useState } from 'react';
import { useConnect } from 'wagmi';

export function WalletConnect() {
  const { connectors, connect, isPending } = useConnect();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-20 font-satoshi font-bold text-dark-gray mb-2">
            Connect Your Wallet
          </h3>
          <p className="text-14 text-dark-gray/70">
            Choose a wallet to get started. Supports Uniswap, MetaMask, Rainbow, and more.
          </p>
        </div>
        <div className="space-y-3">
          <div className="w-full bg-light-gray-100 text-white font-satoshi font-semibold py-3 px-4 rounded-md text-16 text-center">
            Loading wallets...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-20 font-satoshi font-bold text-dark-gray mb-2">
          Connect Your Wallet
        </h3>
        <p className="text-14 text-dark-gray/70">
          Choose a wallet to get started. Supports Uniswap, MetaMask, Rainbow, and more.
        </p>
      </div>

      <div className="space-y-3">
        {connectors.map((connector) => (
          <button
            key={connector.uid}
            onClick={() => connect({ connector })}
            disabled={isPending}
            className="w-full bg-blue-400 hover:bg-blue-600 disabled:bg-light-gray-100 text-white font-satoshi font-semibold py-3 px-4 rounded-md transition duration-200 text-16"
          >
            {isPending ? 'Connecting...' : `Connect ${connector.name}`}
          </button>
        ))}
      </div>
    </div>
  );
}
