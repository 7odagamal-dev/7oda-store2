import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { checkRateLimit } from '@/lib/rate-limit';
import { log, newCorrelationId } from '@/lib/logger';

const MAX_REGISTRATIONS = 5;
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  const correlationId = newCorrelationId();
  const startMs = Date.now();

  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown';

  const isAllowed = await checkRateLimit(ip, 'customer_register', MAX_REGISTRATIONS, WINDOW_MS);
  if (!isAllowed) {
    return NextResponse.json({ error: 'Too many registration attempts. Try again later.' }, { status: 429 });
  }

  try {
    const body = await req.json();
    const { email, password, name } = body;

    // ── Validation ──
    if (!email || !EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: 'A valid email is required' }, { status: 400 });
    }
    if (!password || password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }
    if (!name || name.trim().length < 1) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // ── Create user in Supabase Auth (auto-confirmed, no email sent) ──
    const { data: authUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: { name: name.trim(), full_name: name.trim() },
    });

    if (createErr) {
      if (createErr.message?.includes('already registered') || createErr.message?.includes('already exists')) {
        return NextResponse.json({ error: 'This email is already registered' }, { status: 409 });
      }
      console.error('Auth create user error:', createErr.message);
      return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
    }

    // ── Return success ──
    log('info', { correlationId, durationMs: Date.now() - startMs, route: '/api/auth/register', method: 'POST', statusCode: 201, level: 'info', message: 'Registration successful', metadata: { email: normalizedEmail } });
    return NextResponse.json({
      success: true,
      user: {
        id: authUser.user?.id,
        email: authUser.user?.email,
        name: authUser.user?.user_metadata?.name || name,
      },
    }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    log('error', { correlationId, durationMs: Date.now() - startMs, route: '/api/auth/register', method: 'POST', statusCode: 500, level: 'error', message: 'Registration failed', error: msg });
    console.error('Registration error:', msg);
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}
