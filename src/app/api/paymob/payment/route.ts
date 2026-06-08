import { NextRequest, NextResponse } from 'next/server';
import { getAuthToken, createOrder, getPaymentKey } from '@/lib/paymob';
import { getStoreContext } from '@/lib/store-context';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { filterByStore } from '@/lib/db';
import { checkRateLimit } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  try {
    // Rate-limit payment initiation per IP (5 per minute)
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
    const allowed = await checkRateLimit(ip, 'paymob_payment', 5, 60000);
    if (!allowed) {
      return NextResponse.json({ error: 'Too many payment attempts. Please try again later.' }, { status: 429 });
    }

    const body = await req.json();
    const { amount, orderId, customer } = body;

    if (!amount || !orderId || !customer) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // SECURITY CRITICAL: Never trust client-supplied amount.
    // We fetch the real total from DB and verify the client's amount matches.
    const { storeId } = await getStoreContext(req);
    const { data: order } = await filterByStore(
      supabaseAdmin.from('orders').select('id, total, status, payment_method, user_id').eq('id', orderId),
      storeId,
    ).maybeSingle();

    if (!order) {
      return NextResponse.json({ error: 'Order not found in this store' }, { status: 404 });
    }

    // Verify order status allows payment
    if (order.status !== 'pending') {
      return NextResponse.json({ error: 'Order is not in a payable state' }, { status: 409 });
    }

    // Ownership check: if order has a user_id, verify the logged-in user matches
    if (order.user_id) {
      const supabase = await (await import('@/lib/supabase-server')).createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.id !== order.user_id) {
        return NextResponse.json({ error: 'Unauthorized — order does not belong to this user' }, { status: 403 });
      }
    }

    // Verify client-supplied amount matches DB total (within 1 piastre rounding tolerance)
    const dbTotalCents = Math.round(order.total * 100);
    const clientAmountCents = Math.round(amount * 100);
    if (Math.abs(clientAmountCents - dbTotalCents) > 1) {
      return NextResponse.json({ error: 'Amount mismatch' }, { status: 400 });
    }

    const amountCents = dbTotalCents;

    const token = await getAuthToken();
    const paymobOrderId = await createOrder(token, amountCents, orderId);

    const iframeId = process.env.PAYMOB_IFRAME_ID;
    if (!iframeId) {
      return NextResponse.json({ error: 'Paymob iframe ID not configured' }, { status: 503 });
    }

    const nameParts = (customer.name || 'Customer').split(' ');
    const paymentKey = await getPaymentKey(token, paymobOrderId, amountCents, {
      first_name: nameParts[0] || 'Customer',
      last_name: nameParts.slice(1).join(' ') || 'Name',
      email: customer.email || `${customer.phone || 'unknown'}@customer.og`,
      phone: customer.phone || '01000000000',
      city: customer.city || 'Alexandria',
      country: 'EG',
      street: customer.address || 'N/A',
    });

    return NextResponse.json({
      paymentKey,
      iframeUrl: `https://accept.paymob.com/api/acceptance/iframes/${iframeId}?payment_token=${paymentKey}`,
    });
  } catch (error) {
    console.error('Paymob payment error:', error);
    return NextResponse.json({ error: 'Payment initiation failed' }, { status: 500 });
  }
}
