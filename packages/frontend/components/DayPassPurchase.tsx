'use client';

import { useEffect, useState } from 'react';
import { Address, formatUnits } from 'viem';
import { useWriteContract, useChainId } from 'wagmi';
import { useAppKitAccount } from '@reown/appkit/react';
import { useAuth } from '@/context/AuthContext';
import { CONTRACT_ADDRESS, NFT_ABI, ERC20_ABI, checkMembership, publicClient, USDC_ADDRESS } from '@/lib/contract';
import { site } from '@/lib/site';
import { getInvoiceData, clearInvoiceData } from '@/lib/invoice-storage';

const USDC_PRICE = 20_000_000n; // 20 USDC (6 decimals)

interface DayPassPurchaseProps {
  onMintComplete?: (txHash: string) => void;
}

export function DayPassPurchase({ onMintComplete }: DayPassPurchaseProps = {}) {
  const { address } = useAppKitAccount();
  const { code, setCode, siweSession, hasValidMembership, checkValidMembership } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'info' | 'checking' | 'approving' | 'minting' | 'confirming' | 'verifying' | 'done'>('info');
  const [hasExistingNFT, setHasExistingNFT] = useState(false);
  const { writeContractAsync } = useWriteContract();

  // Check for existing membership on mount and when address changes
  useEffect(() => {
    const checkExisting = async () => {
      if (!address) return;
      try {
        const hasMembership = await checkMembership(address as Address);
        setHasExistingNFT(hasMembership);

        // Check if membership is still valid
        if (hasMembership) {
          await checkValidMembership(address as Address);

          // Get code for existing valid membership
          if (hasValidMembership && siweSession) {
            try {
              await getCode();
            } catch (err) {
              console.error('Error getting code:', err);
            }
          }
        }
      } catch (err) {
        console.error('Error checking membership:', err);
      }
    };
    checkExisting();
  }, [address, siweSession, hasValidMembership, checkValidMembership]);


  const lsKey = address ? `kolektyw3:code:${address.toLowerCase()}` : null;

  async function getCode() {
    if (!siweSession) throw new Error('Not authenticated — please reconnect your wallet');
    const response = await fetch('/api/verify-nft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address, message: siweSession.message, signature: siweSession.signature }),
    });

    if (!response.ok) {
      if (hasValidMembership && lsKey) {
        const cached = localStorage.getItem(lsKey);
        if (cached) { setCode(cached); return; }
      }
      const data = await response.json();
      throw new Error(data.error || 'Failed to verify membership');
    }

    const data = await response.json();
    setCode(data.code);
    if (lsKey) {
      try { localStorage.setItem(lsKey, data.code); } catch {}
    }
  }

  async function autoSubmitInvoiceIfSaved(mintTxHash: string) {
    if (!address) return;
    const invoiceData = getInvoiceData(address);
    if (!invoiceData) return;

    try {
      const res = await fetch('/api/receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address,
          name: invoiceData.name,
          streetAddress: invoiceData.streetAddress,
          vatType: invoiceData.vatType,
          vatNumber: invoiceData.vatNumber,
          email: invoiceData.email,
          txHash: mintTxHash,
        }),
      });
      if (res.ok) {
        clearInvoiceData(address);
      }
    } catch (err) {
      console.error('Failed to auto-submit invoice:', err);
    }
  }


  const intentToPurchase = async () => {
    // If they already have valid membership and code, just show it
    if (hasValidMembership && code) {
      return;
    } else if (hasValidMembership) {
      await getCode()
      return;
    }

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

      // Step 1: Check USDC balance
      setStep('checking');
      const usdcBalance = await publicClient.readContract({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [address as Address],
      });
      if (usdcBalance < USDC_PRICE) {
        throw new Error(`Insufficient USDC. You have ${formatUnits(usdcBalance, 6)} USDC but need 20.`);
      }

      // Step 2: Check and request approval
      setStep('approving');
   

      console.log('Requesting USDC approval...');
      const approveTx = await writeContractAsync({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [CONTRACT_ADDRESS, USDC_PRICE],
      });
      console.log('Approval tx submitted:', approveTx);

      await publicClient.waitForTransactionReceipt({ hash: approveTx });
      console.log('Approval confirmed');

        const allowance = await publicClient.readContract({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [address as Address, CONTRACT_ADDRESS],
      });
      console.log('Current allowance after approval:', formatUnits(allowance, 6), 'USDC');
      if (allowance < USDC_PRICE) {
        throw new Error('Approval failed or not sufficient');
      }
      // Step 3: Mint NFT
      setStep('minting');
      console.log('Calling mint...');
      const mintTx = await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: NFT_ABI,
        functionName: 'mint',
        args: [address as Address],
      });
      console.log('Mint tx submitted:', mintTx);

      setStep('confirming');
      const receipt = await publicClient.waitForTransactionReceipt({ hash: mintTx });
      if (receipt.status !== 'success') {
        throw new Error('Mint transaction failed');
      }
      console.log('Mint confirmed');
      try { localStorage.setItem(`kolektyw3:mintTx:${address.toLowerCase()}`, mintTx); } catch {}

      // Step 4: Auto-submit invoice if user saved one
      await autoSubmitInvoiceIfSaved(mintTx);
      onMintComplete?.(mintTx);

      // Step 5: Verify membership and get code
      setStep('verifying');
      await getCode();
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


  if ((step === 'done' && code) || (hasValidMembership && code)) {
    return (
      <div className="w-full max-w-md">
        <div  className='bg-gradient-to-r from-[#8891C255] to-[#6F7FD799] shadow-[0_0_30px_rgba(111,127,215,0.1)]' style={{ borderRadius: '12px', padding: '32px', textAlign: 'center' }}>
          <h3 className="text-2xl font-bold text-white  mb-4 "style={{ color: '#ffffff' }}>
            Kolektyw3
          </h3>
          <p className="text-20 font-sat mb-6 centered" style={{ fontFamily: 'Satoshi, system-ui, sans-serif', fontSize: '16px', fontWeight: 400, lineHeight: '26px', color: 'rgba(255, 255, 255, 0.8)'} }>
            Your membership is active.<br/> Use this code at the entrance:
          </p>
          <div style={{ borderRadius: '12px', padding: '16px', marginBottom: '16px', border: '2px solid #dfdfdf' }}>
            <code className="text-2xl font-bold tracking-widest font-ui-monospace" style={{ color: textColor, letterSpacing: '0.8ch' }}>
              {code === 'undefined' && site.demoMode ?  '123456' :  (code  || (site.demoMode ? '123456' : '—'))}
            </code>
          </div>
          <p className="text-12" style={{ fontFamily: 'Satoshi, system-ui, sans-serif', fontSize: '16px', fontWeight: 400, lineHeight: '26px', color: 'rgba(255, 255, 255, 0.8)'}}>
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
              {hasValidMembership ? 'My Access' : hasExistingNFT ? 'New Day Pass' : 'Day Pass'}
            </h3>
            <p style={{ fontFamily: 'Satoshi, system-ui, sans-serif', fontSize: '16px', fontWeight: 400, lineHeight: '24px', color: '#FFFFFF', margin: '0 0 16px', padding: 0 }}>
              {hasValidMembership ? 'Your membership is active' : hasExistingNFT ? 'Renew your 24-hour access' : '24-hour access to Kolektyw3 community space'}
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
          onClick={intentToPurchase}
          disabled={loading || !address || hasValidMembership}
          style={{ width: '100%' }}
        >
          {!loading && !siweSession && hasValidMembership  && 'Approve Sign-In in wallet to view Access Code'}
          {!loading && !hasValidMembership && !hasExistingNFT && 'Get Access Code'}
          {!loading && !hasValidMembership && hasExistingNFT && 'Extend Access'}
          {loading && step === 'checking' && 'Checking balance...'}
          {loading && step === 'approving' && 'Approving USDC...'}
          {loading && step === 'minting' && 'Minting NFT...'}
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
