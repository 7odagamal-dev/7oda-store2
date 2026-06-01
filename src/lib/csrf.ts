import { NextRequest, NextResponse } from 'next/server';

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
