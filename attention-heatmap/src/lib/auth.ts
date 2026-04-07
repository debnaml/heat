import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from './rateLimit';

/**
 * Validates both access code and rate limit for an API route.
 * Returns null if OK, or a NextResponse error to return immediately.
 */
export function validateRequest(req: NextRequest): NextResponse | null {
  // 1. Check access code
  const accessCode = req.headers.get('x-access-code');
  const validCode = process.env.ACCESS_CODE;

  if (!validCode) {
    // If no ACCESS_CODE is set, skip auth (local dev)
  } else if (accessCode !== validCode) {
    return NextResponse.json(
      { error: 'Invalid access code' },
      { status: 401 }
    );
  }

  // 2. Rate limit by IP
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';

  const { allowed, remaining, resetAt } = checkRateLimit(ip);

  if (!allowed) {
    const retryAfter = Math.ceil((resetAt - Date.now()) / 1000);
    const res = NextResponse.json(
      { error: `Rate limit exceeded. Try again in ${Math.ceil(retryAfter / 60)} minutes.` },
      { status: 429 }
    );
    res.headers.set('Retry-After', String(retryAfter));
    res.headers.set('X-RateLimit-Remaining', '0');
    return res;
  }

  // Attach rate limit headers (will be added by the route itself)
  // We can't add headers to a "pass" signal, so we just return null
  return null;
}
