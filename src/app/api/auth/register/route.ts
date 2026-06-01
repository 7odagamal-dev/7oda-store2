import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { hashPassword } from '@/lib/password';
import { checkRateLimit } from '@/lib/rate-limit';

const MAX_REGISTRATIONS = 3;
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

const SLUG_REGEX = /^[a-z0-9-]{3,50}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown';

  const isAllowed = await checkRateLimit(ip, 'store_register', MAX_REGISTRATIONS, WINDOW_MS);
  if (!isAllowed) {
    return NextResponse.json({ error: 'Too many registration attempts. Try again later.' }, { status: 429 });
  }

  try {
    const body = await req.json();
    const { email, password, name, store_name, store_slug } = body;

    // ── Validation ──
    if (!email || !EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: 'A valid email is required' }, { status: 400 });
    }
    if (!password || password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }
    if (!name || name.trim().length < 2) {
      return NextResponse.json({ error: 'Name must be at least 2 characters' }, { status: 400 });
    }
    if (!store_name || store_name.trim().length < 2) {
      return NextResponse.json({ error: 'Store name must be at least 2 characters' }, { status: 400 });
    }
    if (!store_slug || !SLUG_REGEX.test(store_slug)) {
      return NextResponse.json({
        error: 'Store slug must be 3-50 characters, lowercase, letters/numbers/hyphens only',
      }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const cleanSlug = store_slug.toLowerCase().trim();

    // ── Check slug uniqueness ──
    const { data: existingSlug } = await supabaseAdmin
      .from('stores')
      .select('id')
      .eq('slug', cleanSlug)
      .maybeSingle();
    if (existingSlug) {
      return NextResponse.json({ error: 'This store slug is already taken' }, { status: 409 });
    }

    // ── Check email uniqueness ──
    const { data: existingEmail } = await supabaseAdmin
      .from('store_users')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle();
    if (existingEmail) {
      return NextResponse.json({ error: 'This email is already registered' }, { status: 409 });
    }

    // ── Hash password ──
    const passwordHash = hashPassword(password);

    // ── Create store ──
    const { data: store, error: storeErr } = await supabaseAdmin
      .from('stores')
      .insert({
        name: store_name.trim(),
        slug: cleanSlug,
        is_active: true,
        settings: {
          currency: 'EGP',
          language: 'ar',
          theme: 'default',
          payment_methods: ['cash_on_delivery', 'online_transfer'],
        },
      })
      .select('id')
      .single();

    if (storeErr) {
      return NextResponse.json({ error: 'Failed to create store' }, { status: 500 });
    }

    // ── Create store owner user ──
    const { data: user, error: userErr } = await supabaseAdmin
      .from('store_users')
      .insert({
        email: normalizedEmail,
        password_hash: passwordHash,
        name: name.trim(),
        role: 'owner',
        store_id: store.id,
        is_active: true,
      })
      .select('id, email, name, role')
      .single();

    if (userErr) {
      // Rollback: delete the store if user creation fails
      await supabaseAdmin.from('stores').delete().eq('id', store.id);
      return NextResponse.json({ error: 'Failed to create user account' }, { status: 500 });
    }

    // ── Return success without auto-login ──
    return NextResponse.json({
      success: true,
      store: { id: store.id, name: store_name.trim(), slug: cleanSlug },
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('Registration error:', msg);
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}
