import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAdminSession } from '@/lib/auth';
import { csrfGuard, safeJson } from '@/lib/csrf';
import { checkRateLimit } from '@/lib/rate-limit';
import { log, newCorrelationId } from '@/lib/logger';

export async function POST(req: NextRequest) {
  const correlationId = newCorrelationId();
  const startMs = Date.now();

  const csrfResp = csrfGuard(req);
  if (csrfResp) return csrfResp;
  const session = await getAdminSession(req);
  if (!session.valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
  const allowed = await checkRateLimit(ip, 'auth_confirm', 5, 60000);
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
  }

  try {
    const { userId } = await req.json();
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      email_confirm: true,
    });

    if (error) {
      log('error', { correlationId, durationMs: Date.now() - startMs, route: '/api/auth/confirm', method: 'POST', statusCode: 500, level: 'error', message: 'Failed to confirm user', error: error.message });
      console.error('Auto-confirm error:', error.message);
      return NextResponse.json({ error: 'Failed to confirm user' }, { status: 500 });
    }

    log('info', { correlationId, durationMs: Date.now() - startMs, route: '/api/auth/confirm', method: 'POST', statusCode: 200, level: 'info', message: 'User confirmed', metadata: { userId } });
    return safeJson({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    log('error', { correlationId, durationMs: Date.now() - startMs, route: '/api/auth/confirm', method: 'POST', statusCode: 500, level: 'error', message: 'Confirm route error', error: msg });
    console.error('Auto-confirm route error:', msg);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
