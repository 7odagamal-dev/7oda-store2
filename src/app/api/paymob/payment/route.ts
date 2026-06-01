import { NextRequest, NextResponse } from 'next/server';
import { getAuthToken, createOrder, getPaymentKey } from '@/lib/paymob';
import { getStoreContext } from '@/lib/store-context';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { filterByStore } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { amount, orderId, customer } = body;

    if (!amount || !orderId || !customer) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify the order belongs to the current store context
    const { storeId } = await getStoreContext(req);
    const { data: order } = await filterByStore(
      supabaseAdmin.from('orders').select('id').eq('id', orderId),
      storeId,
    ).maybeSingle();

    if (!order) {
      return NextResponse.json({ error: 'Order not found in this store' }, { status: 404 });
    }

    const amountCents = Math.round(amount * 100);

    const token = await getAuthToken();
    const paymobOrderId = await createOrder(token, amountCents, orderId);

    const nameParts = (customer.name || 'Customer').split(' ');
    const paymentKey = await getPaymentKey(token, paymobOrderId, amountCents, {
      first_name: nameParts[0] || 'Customer',
      last_name: nameParts.slice(1).join(' ') || 'Name',
      email: customer.email || `${customer.phone}@customer.og`,
      phone: customer.phone || '01000000000',
      city: customer.city || 'Alexandria',
      country: 'EG',
      street: customer.address || 'N/A',
    });

    return NextResponse.json({
      paymentKey,
      iframeUrl: `https://accept.paymob.com/api/acceptance/iframes/${process.env.PAYMOB_IFRAME_ID || 'YOUR_IFRAME_ID'}?payment_token=${paymentKey}`,
    });
  } catch (error) {
    console.error('Paymob payment error:', error);
    return NextResponse.json({ error: 'Payment initiation failed' }, { status: 500 });
  }
}
