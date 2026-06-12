import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { checkRateLimit } from '@/lib/rate-limit';
import { log, newCorrelationId } from '@/lib/logger';

export async function POST(req: NextRequest) {
  const correlationId = newCorrelationId();
  const startMs = Date.now();

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
  const allowed = await checkRateLimit(ip, 'auth_logout', 10, 60000);
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
  }

  const token = req.cookies.get('og-admin-auth')?.value;

  if (token) {
    await supabaseAdmin.from('admin_sessions').delete().eq('token', token);
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set('og-admin-auth', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });
  response.cookies.set('csrf-token', '', {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
  });

  log('info', { correlationId, durationMs: Date.now() - startMs, route: '/api/auth/logout', method: 'POST', statusCode: 200, level: 'info', message: 'Auth logout successful', metadata: { hadToken: !!token } });
  return response;
}
