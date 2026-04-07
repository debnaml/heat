import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const accessCode = req.headers.get('x-access-code');
  const validCode = process.env.ACCESS_CODE;

  if (!validCode) {
    // No code configured = open access (local dev)
    return NextResponse.json({ ok: true });
  }

  if (accessCode === validCode) {
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Invalid access code' }, { status: 401 });
}
