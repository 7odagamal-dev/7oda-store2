import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { checkRateLimit } from '@/lib/rate-limit';
import { getStoreContext } from '@/lib/store-context';
import { normalizeEmail, stripHtml } from '@/lib/email-utils';
import { log, newCorrelationId } from '@/lib/logger';
import { randomBytes } from 'crypto';

const MAX_SUBSCRIBES = 20;
const WINDOW_MS = 60 * 60 * 1000;

function generateDiscountCode(): string {
  const suffix = randomBytes(8).toString('hex').toUpperCase();
  return `WELCOME-${suffix}`;
}

async function verifyTurnstile(token: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    console.warn('TURNSTILE_SECRET_KEY not set — skipping verification');
    return true;
  }
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret, response: token }),
    });
    const data = await res.json();
    return data.success === true;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const correlationId = newCorrelationId();
  const startMs = Date.now();
  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown';

  const isAllowed = await checkRateLimit(ip, 'newsletter', MAX_SUBSCRIBES, WINDOW_MS);
  if (!isAllowed) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
  }

  let body: { email?: string; name?: string; turnstileToken?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const rawEmail = stripHtml(body.email ?? '').trim();
  const name = body.name ? stripHtml(body.name.trim()).slice(0, 200) : null;

  if (!rawEmail) {
    return NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 });
  }

  const normalizedEmail = normalizeEmail(rawEmail);

  if (!normalizedEmail) {
    return NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 });
  }

  if (body.turnstileToken) {
    const valid = await verifyTurnstile(body.turnstileToken);
    if (!valid) {
      return NextResponse.json({ error: 'Bot verification failed. Please try again.' }, { status: 403 });
    }
  }

  const { storeId } = await getStoreContext(req);

  const { data: existing } = await supabaseAdmin
    .from('subscribers')
    .select('id, discount_code')
    .eq('email', normalizedEmail)
    .eq('store_id', storeId)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({
      message: 'You are already subscribed!',
      discountCode: existing.discount_code,
    });
  }

  const discountCode = generateDiscountCode();
  const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

  const { data: subscriber, error: subErr } = await supabaseAdmin
    .from('subscribers')
    .insert([{ email: normalizedEmail, name, discount_code: discountCode, store_id: storeId }])
    .select('id')
    .single();

  if (subErr) {
    log('error', { correlationId, durationMs: Date.now() - startMs, route: '/api/newsletter/subscribe', method: 'POST', statusCode: 500, level: 'error', message: 'Subscriber insert failed', error: subErr.message });
    return NextResponse.json({ error: 'Failed to subscribe. Please try again.' }, { status: 500 });
  }

  const { error: couponErr } = await supabaseAdmin.from('coupons').insert([{
    store_id: storeId,
    code: discountCode,
    discount_type: 'percentage',
    discount_value: 10,
    min_order: 0,
    max_uses: 1,
    used_count: 0,
    expires_at: expiresAt,
    is_active: true,
    coupon_type: 'newsletter',
    linked_email: normalizedEmail,
    subscriber_id: subscriber.id,
  }]);

  if (couponErr) {
    log('error', { correlationId, durationMs: Date.now() - startMs, route: '/api/newsletter/subscribe', method: 'POST', statusCode: 500, level: 'error', message: 'Coupon create failed for new subscriber', error: couponErr.message });
    await supabaseAdmin.from('subscribers').delete().eq('id', subscriber.id);
    return NextResponse.json({ error: 'Failed to subscribe. Please try again.' }, { status: 500 });
  }

  log('info', { correlationId, durationMs: Date.now() - startMs, route: '/api/newsletter/subscribe', method: 'POST', statusCode: 200, level: 'info', message: 'Subscriber created with coupon', metadata: { subscriberId: subscriber.id } });

  return NextResponse.json({
    message: 'Welcome! Use the code below for 10% OFF your first order.',
    discountCode,
  });
}
