import { NextRequest, NextResponse } from 'next/server';
import { codeService, CodeRecord } from '@/lib/code-service';

export async function POST(req: NextRequest) {
  const adminKey = process.env.CODE_ADMIN_KEY;

  if (!adminKey) {
    return NextResponse.json(
      { error: 'CODE_ADMIN_KEY not configured' },
      { status: 500 }
    );
  }

  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: 'Missing or invalid authorization header' },
      { status: 401 }
    );
  }

  const providedKey = authHeader.slice(7);
  if (providedKey !== adminKey) {
    return NextResponse.json(
      { error: 'Invalid CODE_ADMIN_KEY' },
      { status: 403 }
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    const csv = await file.text();
    const lines = csv.trim().split('\n');

    if (lines.length === 0) {
      return NextResponse.json(
        { error: 'Empty CSV file' },
        { status: 400 }
      );
    }

    const codes: CodeRecord[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const [codeStr, expiresStr] = line.split('|').map((s) => s.trim());

      if (!codeStr || !expiresStr) {
        return NextResponse.json(
          { error: `Invalid CSV format at line ${i + 1}. Expected: CODE|EXPIRES` },
          { status: 400 }
        );
      }

      const code = codeStr.padStart(6, '0');
      const expiresDate = new Date(expiresStr);

      if (isNaN(expiresDate.getTime())) {
        return NextResponse.json(
          { error: `Invalid date format at line ${i + 1}: ${expiresStr}` },
          { status: 400 }
        );
      }

      codes.push({
        code,
        expires: expiresDate.toISOString(),
      });
    }

    if (codes.length === 0) {
      return NextResponse.json(
        { error: 'No valid codes found in CSV' },
        { status: 400 }
      );
    }

    await codeService.setCodes(codes);

    return NextResponse.json({
      success: true,
      codesLoaded: codes.length,
      message: `Successfully loaded ${codes.length} codes`,
    });
  } catch (err) {
    console.error('Error processing codes CSV:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
