import { NextRequest, NextResponse } from 'next/server';
import { isAddress } from 'viem';
import { parseSiweMessage, verifySiweMessage } from 'viem/siwe';
import { publicClient, CONTRACT_ADDRESS, NFT_ABI } from '@/lib/contract';
import { codeService } from '@/lib/code-service';
import { nonceStore } from '@/lib/nonce-store';

export async function POST(req: NextRequest) {
  try {
    const { address, message, signature } = await req.json();

    if (!address || !isAddress(address)) {
      return NextResponse.json({ error: 'Invalid address' }, { status: 400 });
    }

    if (!message || !signature) {
      return NextResponse.json({ error: 'Missing SIWE message or signature' }, { status: 400 });
    }

    const parsed = parseSiweMessage(message);
    const nonce = parsed.nonce;
    const valid_nonce = nonce ? await nonceStore.exists(nonce) : false;

    if (!valid_nonce) {
      return NextResponse.json({ error: 'Invalid or expired nonce' }, { status: 401 });
    }
    if (nonce) {
      await nonceStore.delete(nonce); // one-time use
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

    // Check on-chain membership (time-aware)
    const hasValid = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: NFT_ABI,
      functionName: 'hasValidMembership',
      args: [address],
    });

    if (!hasValid) {
      return NextResponse.json({ error: 'No active membership found' }, { status: 403 });
    }

    const code = await codeService.dequeueCode(address.toLowerCase());
    return NextResponse.json({ code });
  } catch (err) {
    console.error('verify-nft error:', err);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
