import { NextRequest, NextResponse } from 'next/server';
import { parseSiweMessage, verifySiweMessage } from 'viem/siwe';
import { publicClient } from '@/lib/contract';
import { codeService, CodeRecord } from '@/lib/code-service';

function getAdminAddresses(): string[] {
  return (process.env.ADMIN_CODE_SETTERS || '')
    .split(':')
    .map((a) => a.trim().toLowerCase())
    .filter(Boolean);
}

function isAdmin(address: string): boolean {
  return getAdminAddresses().includes(address.toLowerCase());
}

function parseCodes(raw: string): CodeRecord[] {
  const lines = raw.trim().split('\n');
  const codes: CodeRecord[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    // Skip markdown separator rows like |---|---|
    if (/^\|[-\s|:]+\|$/.test(trimmed)) continue;

    let codeStr: string;
    let expiresStr: string;

    if (trimmed.startsWith('|')) {
      // Markdown table row
      const cells = trimmed.split('|').map((c) => c.trim()).filter(Boolean);
      if (cells.length < 2) continue;
      [codeStr, expiresStr] = cells;
    } else if (trimmed.includes(',')) {
      [codeStr, expiresStr] = trimmed.split(',').map((s) => s.trim());
    } else if (trimmed.includes('|')) {
      [codeStr, expiresStr] = trimmed.split('|').map((s) => s.trim());
    } else {
      continue;
    }

    if (!codeStr || !expiresStr) continue;
    // Skip header rows (no digits in code column)
    if (!/\d/.test(codeStr)) continue;

    const expiresDate = new Date(expiresStr);
    if (isNaN(expiresDate.getTime())) continue;

    codes.push({ code: codeStr.trim().padStart(6, '0'), expires: expiresDate.toISOString() });
  }

  return codes;
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization') ?? '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const adminKey = process.env.CODE_ADMIN_KEY;

  let authed = false;

  // Path A: Bearer token
  if (bearerToken && adminKey && bearerToken === adminKey) {
    authed = true;
  }

  // Path B: SIWE — extract address from message, check ADMIN_CODE_SETTERS, verify sig
  const body = await req.json().catch(() => null);
  if (!authed) {
    if (!body?.message || !body?.signature) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Address comes from the SIWE message, not trusted client input
    const parsed = parseSiweMessage(body.message);
    if (!parsed.address) {
      return NextResponse.json({ error: 'Invalid SIWE message' }, { status: 401 });
    }

    if (!isAdmin(parsed.address)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const valid = await verifySiweMessage(publicClient, {
      message: body.message,
      signature: body.signature,
    });

    if (!valid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    authed = true;
  }

  if (!authed) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rawText: string = body?.rawText ?? '';
  if (!rawText.trim()) {
    return NextResponse.json({ error: 'No codes provided' }, { status: 400 });
  }

  try {
    const codes = parseCodes(rawText);

    if (codes.length === 0) {
      return NextResponse.json({ error: 'No valid codes found. Expected format: code,expires or markdown table.' }, { status: 400 });
    }

    await codeService.setCodes(codes);

    return NextResponse.json({ success: true, codesLoaded: codes.length });
  } catch (err) {
    console.error('Error processing codes:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
