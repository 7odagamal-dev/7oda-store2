import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { checkRateLimit } from '@/lib/rate-limit';
import { getStoreContext } from '@/lib/store-context';
import { randomBytes } from 'crypto';

const MAX_SUBSCRIBES = 5;
const WINDOW_MS = 60 * 60 * 1000;

function generateDiscountCode(): string {
  const suffix = randomBytes(3).toString('hex').toUpperCase();
  return `WELCOME-${suffix}`;
}

function sanitize(str: string): string {
  return str.trim().slice(0, 200);
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown';

  const isAllowed = await checkRateLimit(ip, 'newsletter', MAX_SUBSCRIBES, WINDOW_MS);
  if (!isAllowed) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
  }

  let body: { email?: string; name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const email = sanitize(body.email ?? '');
  const name = body.name ? sanitize(body.name) : null;

  if (!email || !EMAIL_REGEX.test(email)) {
    return NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 });
  }

  const { storeId } = await getStoreContext(req);
  const normalizedEmail = email.toLowerCase().trim();

  // Check for existing subscriber
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

  // 1. Generate discount code and create coupon
  const discountCode = generateDiscountCode();
  const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

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
  }]);

  if (couponErr) {
    console.error('Coupon create error:', couponErr.message);
  }

  // 2. Subscribe (record in subscribers for newsletter)
  const { error: subErr } = await supabaseAdmin.from('subscribers').insert([
    { email: normalizedEmail, name, discount_code: discountCode, store_id: storeId },
  ]);

  if (subErr) {
    console.error('Newsletter subscribe error:', subErr.message);
  }

  return NextResponse.json({
    message: 'Welcome! Use the code below for 10% OFF your first order.',
    discountCode,
  });
}
