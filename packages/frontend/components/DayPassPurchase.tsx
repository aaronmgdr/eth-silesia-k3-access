'use client';

import { useEffect, useState } from 'react';
import { Address, formatUnits } from 'viem';
import { useWriteContract, useSignTypedData, useChainId } from 'wagmi';
import { useAppKitAccount } from '@reown/appkit/react';
import { useAuth } from '@/context/AuthContext';
import { CONTRACT_ADDRESS, NFT_ABI, checkMembership, publicClient, USDC_ADDRESS } from '@/lib/contract';
import { createPermitSingle, getPermit2Domain, getPermit2Types } from '@/lib/permit2';

const USDC_PRICE = 20_000_000n; // 20 USDC (6 decimals)

export function DayPassPurchase() {
  const chainId = useChainId();
  const { address } = useAppKitAccount();
  const { code, setCode, siweSession } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'info' | 'checking' | 'signing' | 'minting' | 'extending' | 'confirming' | 'verifying' | 'done'>('info');
  const [hasExistingNFT, setHasExistingNFT] = useState(false);
  const { writeContractAsync } = useWriteContract();
  const { signTypedDataAsync } = useSignTypedData();

  // Check for existing membership on mount and when address changes
  useEffect(() => {
    const checkExisting = async () => {
      if (!address) return;
      try {
        const hasMembership = await checkMembership(address as Address);
        setHasExistingNFT(hasMembership);
      } catch (err) {
        console.error('Error checking membership:', err);
      }
    };
    checkExisting();
  }, [address]);

  const handleGetCode = async () => {
    if (!address) {
      setError('Wallet not connected');
      return;
    }

    if (!CONTRACT_ADDRESS || CONTRACT_ADDRESS === '0x') {
      setError('Contract address not configured');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('Starting purchase flow for', address);

      // Step 0: Check USDC balance
      setStep('checking');
      const usdcBalance = await publicClient.readContract({
        address: USDC_ADDRESS,
        abi: [{ name: 'balanceOf', type: 'function', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' }],
        functionName: 'balanceOf',
        args: [address as Address],
      });
      if (usdcBalance < USDC_PRICE) {
        throw new Error(`Insufficient USDC balance. You need 20 USDC but have ${formatUnits(usdcBalance, 6)} USDC.`);
      }

      // Check current membership status
      const currentHasMembership = await checkMembership(address as Address);
      const actionStep = currentHasMembership ? 'extending' : 'minting';
      console.log('Membership check:', currentHasMembership, 'Action:', actionStep);

      // Step 1: Create permit and sign
      setStep('signing');
      const permitSingle = createPermitSingle(USDC_PRICE, CONTRACT_ADDRESS);
      console.log('Permit details:', permitSingle);

      const signature = await signTypedDataAsync({
        domain: getPermit2Domain(chainId),
        types: getPermit2Types(),
        primaryType: 'PermitSingle',
        message: {
          details: {
            token: permitSingle.details.token,
            amount: permitSingle.details.amount,
          },
          spender: permitSingle.spender,
          sigDeadline: permitSingle.sigDeadline,
        },
      });
      console.log('Signature received:', signature);

      // Step 2: Call mintWithPermit (or extend)
      setStep(actionStep as 'minting' | 'extending');
      console.log('Calling contract with:', { CONTRACT_ADDRESS, args: [address, signature, permitSingle] });

      const txHash = await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: NFT_ABI,
        functionName: 'mintWithPermit',
        args: [address as Address, signature as `0x${string}`, permitSingle],
      });
      console.log('Tx submitted:', txHash);

      setStep('confirming');
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
      if (receipt.status !== 'success') {
        throw new Error('Transaction reverted');
      }
      console.log('Tx confirmed:', receipt.transactionHash);

      if (!siweSession) throw new Error('Not authenticated — please reconnect your wallet');

      // Step 3: Verify membership and get code
      setStep('verifying');
      const response = await fetch('/api/verify-nft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, message: siweSession.message, signature: siweSession.signature }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to verify membership');
      }

      const data = await response.json();
      setCode(data.code);
      setStep('done');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Purchase flow error:', err);
      setError(errorMessage);
      setStep('info');
    } finally {
      setLoading(false);
    }
  };
    const textColor = '#ffffff' 

  if (step === 'done' && code) {
    return (
      <div className="w-full max-w-md">
        <div style={{ backgroundColor: '#E2E6E9', borderRadius: '12px', padding: '32px', textAlign: 'center' }}>
          <h3 className="text-24 font-satoshi font-bold mb-4" style={{ color: '#1F262E' }}>
            ✓ Access Granted!
          </h3>
          <p className="text-14 mb-6" style={{ color: '#1F262E' }}>
            Your membership is active. Use this code at the entrance:
          </p>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '24px', marginBottom: '24px', border: '2px solid #1F262E' }}>
            <p className="text-60 font-bold tracking-widest font-ui-monospace" style={{ color: textColor }}>
              {code}
            </p>
          </div>
          <p className="text-12" style={{ color: '#1F262E' }}>
            Valid for 24 hours from purchase
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md space-y-6">
      {/* Day Pass Card */}
      <div className='relative p-8 md:p-10 rounded-2xl bg-gradient-to-r from-[#8891C2] to-[#6F7FD7] shadow-[0_0_30px_rgba(111,127,215,0.25)] flex flex-col  justify-between gap-6'>
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-2xl font-bold text-white" style={{ color: '#ffffff' }}>
              {hasExistingNFT ? 'Extend Membership' : 'Day Pass'}
            </h3>
            <p style={{ fontFamily: 'Satoshi, system-ui, sans-serif', fontSize: '16px', fontWeight: 400, lineHeight: '24px', color: '#FFFFFF', margin: '0 0 16px', padding: 0 }}>
              {hasExistingNFT ? 'Extend your 24-hour access' : '24-hour access to the workspace'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-36 font-satoshi font-bold" style={{ color: textColor }}>
              {formatUnits(USDC_PRICE, 6)} USDC
            </p>
          </div>
        </div>

        <ul className="space-y-3 mb-8 pb-8" style={{ borderBottomColor: '#e2e2e2', borderBottomWidth: '1px' }}>
          <li style={{ fontFamily: 'Satoshi, system-ui, sans-serif', fontSize: '16px', fontWeight: 400, lineHeight: '26px', color: 'rgba(255, 255, 255, 0.8)', margin: 0, padding: 0, display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: '8px' }}>
            <span className="font-bold" style={{ color: textColor }}>✓</span>
            Full workspace access
          </li>
          <li style={{ fontFamily: 'Satoshi, system-ui, sans-serif', fontSize: '16px', fontWeight: 400, lineHeight: '26px', color: 'rgba(255, 255, 255, 0.8)', margin: 0, padding: 0, display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: '8px' }}>
            <span className="font-bold" style={{ color: textColor }}>✓</span>
            WiFi, power, meeting rooms
          </li>
          <li style={{ fontFamily: 'Satoshi, system-ui, sans-serif', fontSize: '16px', fontWeight: 400, lineHeight: '26px', color: 'rgba(255, 255, 255, 0.8)', margin: 0, padding: 0, display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: '8px' }}>
            <span className="font-bold" style={{ color: textColor }}>✓</span>
            Valid for 24 hours
          </li>
        </ul>


        {error && (
          <div style={{ backgroundColor: '#FFE5E5', borderRadius: '8px', padding: '16px', marginBottom: '24px', border: '1px solid #FF6B6B' }}>
            <p className="text-12" style={{ color: '#C92A2A' }}>{error}</p>
          </div>
        )}

        <button
          onClick={handleGetCode}
          disabled={loading || !address}
          style={{ width: '100%' }}
        >
          {!loading && !hasExistingNFT && 'Get Access Code'}
          {!loading && hasExistingNFT && 'Extend Access'}
          {loading && step === 'checking' && 'Checking membership...'}
          {loading && step === 'signing' && 'Signing...'}
          {loading && step === 'minting' && 'Minting NFT...'}
          {loading && step === 'extending' && 'Extending membership...'}
          {loading && step === 'confirming' && 'Confirming transaction...'}
          {loading && step === 'verifying' && 'Verifying...'}
        </button>

        <p style={{ fontFamily: 'Satoshi, system-ui, sans-serif', fontSize: '14px', fontWeight: 400, lineHeight: '20px', color: 'rgba(255, 255, 255, 0.9)', margin: '0 0 20px', padding: 0 }}>
          Access is tied to the wallet address that completes payment.
          <br />
          <br />
          "{address}"
        </p>
      </div>
    </div>
  );
}
