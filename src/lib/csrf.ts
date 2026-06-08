import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export function validateCsrf(req: NextRequest): boolean {
  const tokenFromCookie = req.cookies.get('csrf-token')?.value;
  const tokenFromHeader = req.headers.get('x-csrf-token');
  if (!tokenFromCookie || !tokenFromHeader) return false;
  return tokenFromCookie === tokenFromHeader;
}

export function csrfGuard(req: NextRequest): NextResponse | null {
  if (req.method !== 'GET' && !validateCsrf(req)) {
    return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
  }
  return null;
}

/**
 * Rotate the CSRF token on a NextResponse after a successful mutation.
 * Generates a new random token, sets it as a cookie (non-HttpOnly so
 * client-side JS can read it for the next request header) and also
 * returns it in the x-csrf-token response header for immediate use.
 *
 * SECURITY: Token rotation limits the window of exposure. Even if an
 * XSS attacker steals the csrf-token cookie, it becomes invalid after
 * the next successful mutation request.
 */
export function rotateCsrfToken(response: NextResponse): void {
  const newToken = crypto.randomBytes(16).toString('hex');
  response.cookies.set('csrf-token', newToken, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 8 * 60 * 60, // 8 hours (matches session duration)
    path: '/',
  });
  response.headers.set('x-csrf-token', newToken);
}

/**
 * safeJson — wraps NextResponse.json with automatic CSRF token rotation.
 * Use for SUCCESS responses from mutation endpoints (POST, PUT, DELETE).
 * Error responses should still use NextResponse.json directly.
 *
 * Example:
 *   return safeJson({ data: updatedRecord });
 */
export function safeJson(data: unknown, init?: ResponseInit): NextResponse {
  const res = NextResponse.json(data, init);
  rotateCsrfToken(res);
  return res;
}
