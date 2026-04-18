import { NextRequest, NextResponse } from 'next/server';
import { isAddress } from 'viem';
import { parseSiweMessage, verifySiweMessage } from 'viem/siwe';
import { publicClient, CONTRACT_ADDRESS, NFT_ABI } from '@/lib/contract';
import { getAccessCode } from '@/lib/code-service';
import { nonceStore } from '@/app/api/nonce/route';

const NONCE_TTL_MS = 5 * 60 * 1000;

export async function POST(req: NextRequest) {
  try {
    const { address, message, signature } = await req.json();

    if (!address || !isAddress(address)) {
      return NextResponse.json({ error: 'Invalid address' }, { status: 400 });
    }

    if (!message || !signature) {
      return NextResponse.json({ error: 'Missing SIWE message or signature' }, { status: 400 });
    }

    // Verify nonce was issued by us and hasn't expired
    const parsed = parseSiweMessage(message);
    const nonce = parsed.nonce;
    const issuedAt = nonce ? nonceStore.get(nonce) : undefined;

    if (!issuedAt || Date.now() - issuedAt > NONCE_TTL_MS) {
      return NextResponse.json({ error: 'Invalid or expired nonce' }, { status: 401 });
    }
    if (nonce) {
      nonceStore.delete(nonce); // one-time use
    }
    

    // Verify the signature proves ownership of the address
    const valid = await verifySiweMessage(publicClient, {
      message,
      signature,
    });

    if (!valid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Confirm the signed address matches what was passed
    if (! parsed.address || parsed.address.toLowerCase() !== address.toLowerCase()) {
      return NextResponse.json({ error: 'Address mismatch' }, { status: 401 });
    }

    if (!CONTRACT_ADDRESS || CONTRACT_ADDRESS === '0x') {
      return NextResponse.json({ error: 'Contract not configured' }, { status: 500 });
    }

    // Check on-chain membership
    const balance = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: NFT_ABI,
      functionName: 'balanceOf',
      args: [address],
    });

    if (balance === 0n) {
      return NextResponse.json({ error: 'No active membership found' }, { status: 403 });
    }

    const { code } = await getAccessCode(address);
    return NextResponse.json({ code });
  } catch (err) {
    console.error('verify-nft error:', err);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
