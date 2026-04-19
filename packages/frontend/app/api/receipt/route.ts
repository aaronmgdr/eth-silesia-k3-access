import { NextRequest, NextResponse } from 'next/server';
import { isAddress } from 'viem';
import { issueInvoice } from '@/lib/ksef';
import { sendPdfInvoice } from '@/lib/invoice-sender';
import { makeRedis } from '@/lib/redis';

const TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days

export async function POST(req: NextRequest) {
  const redis = makeRedis();
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

    const receipt = { ethAddress: address, txHash: txHash ?? null, name, streetAddress, vatType, vatNumber, email, createdAt: new Date().toISOString() };

    const key = `kolektyw3:receipt:${address.toLowerCase()}`;
    await redis.set(key, JSON.stringify(receipt), { ex: TTL_SECONDS });

    if (vatType === 'pl') {
      // KSeF e-invoice — no-ops unless KSEF_ENABLED=true
      issueInvoice(receipt).catch((err) => console.error('KSeF issue failed:', err));
    } else {
      // PDF invoice via Resend for non-Polish companies
      sendPdfInvoice(receipt).catch((err) => console.error('PDF invoice failed:', err));
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('receipt route error:', err);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}
