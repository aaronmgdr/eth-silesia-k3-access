import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { isAddress } from 'viem';

const TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days

function getRedis() {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    throw new Error('Redis environment variables not configured');
  }
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
}

export async function POST(req: NextRequest) {
  const redis = getRedis();
  try {
    const { address, name, streetAddress, vatType, vatNumber, email, txHash } = await req.json();

    if (!address || !isAddress(address)) {
      return NextResponse.json({ error: 'Invalid address' }, { status: 400 });
    }
    if (!name?.trim() || !streetAddress?.trim() || !vatNumber?.trim() || !email?.trim()) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }
    if (!['pl', 'other'].includes(vatType)) {
      return NextResponse.json({ error: 'Invalid VAT type' }, { status: 400 });
    }

    const key = `kolektyw3:receipt:${address.toLowerCase()}`;
    await redis.set(
      key,
      JSON.stringify({ ethAddress: address, txHash: txHash ?? null, name, streetAddress, vatType, vatNumber, email, createdAt: new Date().toISOString() }),
      { ex: TTL_SECONDS }
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('receipt route error:', err);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}
