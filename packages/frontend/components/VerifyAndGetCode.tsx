'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { useAuth } from '@/context/AuthContext';

export function VerifyAndGetCode() {
  const { address } = useAccount();
  const { code, setCode } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async () => {
    if (!address) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/verify-nft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
      });

      if (!response.ok) {
        const data = await response.json();
        const errorMsg = data.error || 'Failed to verify NFT';
        // Special handling for rate limit error
        if (errorMsg.includes('already claimed') || response.status === 429) {
          throw new Error('You have already claimed a code for this address');
        }
        throw new Error(errorMsg);
      }

      const data = await response.json();
      setCode(data.code);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (code) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-green-800 mb-2">Access Granted!</h3>
        <p className="text-green-600 mb-4">Your membership code:</p>
        <div className="bg-white border-2 border-green-400 rounded p-4 text-center mb-4">
          <p className="text-4xl font-bold tracking-widest text-green-700">{code}</p>
        </div>
        <p className="text-sm text-green-600">Use this code to access Kolektyw3 community space</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <button
        onClick={handleVerify}
        disabled={loading || !address}
        className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition"
      >
        {loading ? 'Verifying...' : 'Get My Code'}
      </button>
      {error && <p className="text-red-600 text-sm">{error}</p>}
    </div>
  );
}
