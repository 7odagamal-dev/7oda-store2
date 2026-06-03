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

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 });
  }

  const { storeId } = await getStoreContext(req);

  const { data: existing } = await supabaseAdmin
    .from('subscribers')
    .select('id, discount_code')
    .eq('email', email)
    .eq('store_id', storeId)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({
      message: 'You are already subscribed!',
      discountCode: existing.discount_code,
    });
  }

  const discountCode = generateDiscountCode();

  const { error } = await supabaseAdmin.from('subscribers').insert([
    { email, name, discount_code: discountCode, store_id: storeId },
  ]);

  if (error) {
    console.error('Newsletter subscribe error:', error.message);
    return NextResponse.json({ error: 'Failed to subscribe. Please try again.' }, { status: 500 });
  }

  return NextResponse.json({
    message: 'You are subscribed! Use the code below for 10% OFF.',
    discountCode,
  });
}
