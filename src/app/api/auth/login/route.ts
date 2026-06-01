import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { verifyPassword } from '@/lib/password';
import { createSession } from '@/lib/auth';
import { checkRateLimit, clearRateLimit } from '@/lib/rate-limit';

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown';

  const isAllowed = await checkRateLimit(ip, 'store_login', MAX_ATTEMPTS, LOCKOUT_MS);
  if (!isAllowed) {
    return NextResponse.json({ error: 'Too many login attempts. Try again in 15 minutes.' }, { status: 429 });
  }

  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // ── Find user ──
    const { data: user, error: userErr } = await supabaseAdmin
      .from('store_users')
      .select('id, email, name, password_hash, role, store_id, is_active')
      .eq('email', normalizedEmail)
      .single();

    if (userErr || !user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // ── Check if account is active ──
    if (!user.is_active) {
      return NextResponse.json({ error: 'Account is deactivated. Contact support.' }, { status: 403 });
    }

    // ── Verify password ──
    if (!verifyPassword(password, user.password_hash)) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // Clear rate limit on success
    await clearRateLimit(ip, 'store_login');

    // ── Create session ──
    const { response } = await createSession({
      storeId: user.store_id,
      userId: user.id,
      userRole: user.role,
    });

    // ── Fetch store info for response ──
    const { data: store } = await supabaseAdmin
      .from('stores')
      .select('id, name, slug')
      .eq('id', user.store_id)
      .single();

    return NextResponse.json({
      success: true,
      store: store ? { id: store.id, name: store.name, slug: store.slug } : null,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('Login error:', msg);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
