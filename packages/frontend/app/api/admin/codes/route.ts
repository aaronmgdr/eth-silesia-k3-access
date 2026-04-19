import { NextRequest, NextResponse } from 'next/server';
import { parseSiweMessage, verifySiweMessage } from 'viem/siwe';
import { publicClient } from '@/lib/contract';
import { codeService, CodeRecord, CODE_TYPES, CodeType } from '@/lib/code-service';

function getAdminAddresses(): string[] {
  return (process.env.ADMIN_CODE_SETTERS || '')
    .split(':')
    .map((a) => a.trim().toLowerCase())
    .filter(Boolean);
}

function isAdmin(address: string): boolean {
  return getAdminAddresses().includes(address.toLowerCase());
}

async function verifySiwe(message: string, signature: string): Promise<boolean> {
  const parsed = parseSiweMessage(message);
  if (!parsed.address) return false;
  if (!isAdmin(parsed.address)) return false;
  return verifySiweMessage(publicClient, { message, signature: signature as `0x${string}` });
}

async function authenticate(req: NextRequest): Promise<{ authed: boolean; status: number }> {
  const authHeader = req.headers.get('authorization') ?? '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const adminKey = process.env.CODE_ADMIN_KEY;

  if (bearerToken && adminKey && bearerToken === adminKey) {
    return { authed: true, status: 200 };
  }

  const siweMessageB64 = req.headers.get('x-siwe-message');
  const siweSignature = req.headers.get('x-siwe-signature');
  if (siweMessageB64 && siweSignature) {
    const siweMessage = Buffer.from(siweMessageB64, 'base64').toString('utf8');
    const valid = await verifySiwe(siweMessage, siweSignature).catch(() => false);
    return valid ? { authed: true, status: 200 } : { authed: false, status: 401 };
  }

  return { authed: false, status: 401 };
}

function parseCodes(raw: string): CodeRecord[] {
  const lines = raw.trim().split('\n');
  const codes: CodeRecord[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (/^\|[-\s|:]+\|$/.test(trimmed)) continue;

    let codeStr: string;
    let expiresStr: string;
    let typeStr: CodeType = 'DAY';

    if (trimmed.startsWith('|')) {
      const cells = trimmed.split('|').map((c) => c.trim()).filter(Boolean);
      if (cells.length < 2) continue;
      [codeStr, expiresStr] = cells;
      if (cells[2]) typeStr = cells[2].toUpperCase() as CodeType;
    } else if (trimmed.includes(',')) {
      const parts = trimmed.split(',').map((s) => s.trim());
      [codeStr, expiresStr] = parts;
      if (parts[2]) typeStr = parts[2].toUpperCase() as CodeType;
    } else if (trimmed.includes('|')) {
      const parts = trimmed.split('|').map((s) => s.trim());
      [codeStr, expiresStr] = parts;
      if (parts[2]) typeStr = parts[2].toUpperCase() as CodeType;
    } else {
      continue;
    }

    if (!CODE_TYPES.includes(typeStr)) typeStr = 'DAY';
    if (!codeStr || !expiresStr) continue;
    if (!/\d/.test(codeStr)) continue;

    const expiresDate = new Date(expiresStr);
    if (isNaN(expiresDate.getTime())) continue;

    codes.push({ code: codeStr.trim().padStart(6, '0'), expires: expiresDate.toISOString(), type: typeStr });
  }

  return codes;
}

export async function GET(req: NextRequest) {
  const { authed, status } = await authenticate(req);
  if (!authed) return NextResponse.json({ error: 'Unauthorized' }, { status });

  const codesStatus = await codeService.getStatus();
  return NextResponse.json({ available: codesStatus.available, claims: codesStatus.claims });
}

export async function POST(req: NextRequest) {
  const { authed, status } = await authenticate(req);
  if (!authed) return NextResponse.json({ error: 'Unauthorized' }, { status });

  const body = await req.json().catch(() => null);
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

    const codesStatus = await codeService.getStatus();
    return NextResponse.json({ success: true, codesLoaded: codes.length, available: codesStatus.available, claims: codesStatus.claims });
  } catch (err) {
    console.error('Error processing codes:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
