import { NextResponse } from 'next/server';
import { generateSiweNonce } from 'viem/siwe';

// In-memory nonce store — fine for single-instance hackathon demo
// Replace with Redis/DB for multi-instance production
export const nonceStore = new Map<string, number>();

const NONCE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function GET() {
  const nonce = generateSiweNonce();
  nonceStore.set(nonce, Date.now());
  return NextResponse.json({ nonce });
}
