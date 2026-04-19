import { NextResponse } from 'next/server';
import { generateSiweNonce } from 'viem/siwe';
import { nonceStore } from '@/lib/nonce-store';

export async function GET() {
  const nonce = generateSiweNonce();
  await nonceStore.set(nonce);
  return NextResponse.json({ nonce });
}
