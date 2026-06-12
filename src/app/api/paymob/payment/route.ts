import { NextRequest, NextResponse } from 'next/server';
import { authenticate, createOrder, getPaymentKey } from '@/lib/paymob';
import { getStoreContext } from '@/lib/store-context';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { filterByStore } from '@/lib/db';
import { checkRateLimit } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  const step = (s: string) => console.log(`[Payment] Step: ${s}`);
  const errLog = (s: string, e: unknown) => console.error(`[Payment] ❌ ${s}:`, e instanceof Error ? e.message : String(e));

  try {
    step('1 — Rate limit check');
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
    const allowed = await checkRateLimit(ip, 'paymob_payment', 5, 60000);
    if (!allowed) {
      return NextResponse.json({ error: 'Too many payment attempts. Please try again later.' }, { status: 429 });
    }

    step('2 — Parse body');
    const body = await req.json();
    const { orderId, customer } = body;
    console.log('[Payment] orderId:', orderId, 'customer phone:', customer?.phone);

    if (!orderId || !customer) {
      console.error('[Payment] Missing fields:', { hasOrderId: !!orderId, hasCustomer: !!customer });
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    step('3 — Lookup order');
    const { storeId } = await getStoreContext(req);
    const { data: order } = await filterByStore(
      supabaseAdmin.from('orders').select('id, total, status, payment_method, user_id').eq('id', orderId),
      storeId,
    ).maybeSingle();

    if (!order) {
      console.error('[Payment] Order not found:', orderId);
      return NextResponse.json({ error: 'Order not found in this store' }, { status: 404 });
    }
    console.log('[Payment] Order found:', { id: order.id, total: order.total, status: order.status });

    if (order.status !== 'pending') {
      console.error('[Payment] Order not pending:', order.status);
      return NextResponse.json({ error: 'Order is not in a payable state' }, { status: 409 });
    }

    step('4 — Ownership check');
    if (order.user_id) {
      const supabase = await (await import('@/lib/supabase-server')).createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.id !== order.user_id) {
        return NextResponse.json({ error: 'Unauthorized — order does not belong to this user' }, { status: 403 });
      }
    }

    const amountCents = Math.round(order.total * 100);
    console.log('[Payment] amountCents:', amountCents);

    step('5 — Check iframeId');
    const iframeId = process.env.PAYMOB_IFRAME_ID;
    if (!iframeId) {
      return NextResponse.json({ error: 'Paymob iframe ID not configured' }, { status: 503 });
    }

    step('6 — Build callback URL');
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'localhost:3000';
    const proto = req.headers.get('x-forwarded-proto') || 'http';
    const baseUrl = `${proto}://${host}`;
    const callbackUrl = `${baseUrl}/api/paymob/callback`;
    console.log('[Payment] callbackUrl:', callbackUrl);

    const nameParts = (customer.name || 'Customer').split(' ');

    step('7 — authenticate()');
    const authToken = await authenticate();

    step('8 — createOrder()');
    const paymobOrder = await createOrder(authToken, amountCents, orderId);

    step('9 — getPaymentKey()');
    const billingData = {
      first_name: nameParts[0] || 'Customer',
      last_name: nameParts.slice(1).join(' ') || 'Name',
      email: customer.email || `${customer.phone || 'unknown'}@customer.og`,
      phone: customer.phone || '01000000000',
      city: customer.city || 'Alexandria',
      country: 'EG' as const,
      street: customer.address || 'N/A',
    };
    const paymentKey = await getPaymentKey(
      authToken,
      paymobOrder.id,
      amountCents,
      billingData,
      undefined,
      callbackUrl,
    );

    step('10 — Done, returning iframe URL');
    return NextResponse.json({
      paymentKey,
      iframeUrl: `https://accept.paymob.com/api/acceptance/iframes/${iframeId}?payment_token=${paymentKey}`,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    errLog('FATAL', msg);
    return NextResponse.json({ error: msg || 'Payment initiation failed' }, { status: 500 });
  }
}
