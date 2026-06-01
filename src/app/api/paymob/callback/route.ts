import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { assertValidOrderTransition } from '@/lib/order-state';
import crypto from 'crypto';

const PAYMOB_TXN_WINDOW_MS = 5 * 60 * 1000; // 5 min

type ErrType = 'hmac_failure' | 'order_not_found' | 'amount_mismatch' | 'stock_decrement_failed' | 'db_error' | 'unknown';

async function getOrderStoreId(orderId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from('orders')
    .select('store_id')
    .eq('id', orderId)
    .single();
  return data?.store_id || null;
}

async function writeEvent(params: {
  paymobTxnId: string; orderId: string; eventType: 'transaction.succeeded' | 'transaction.failed';
  rawPayload: unknown; correlationId: string; createdAt: string | null; storeId: string;
}) {
  const { error } = await supabaseAdmin.from('payment_events').insert({
    store_id: params.storeId,
    paymob_txn_id: params.paymobTxnId,
    order_id: params.orderId,
    event_type: params.eventType,
    status: 'received',
    raw_payload: params.rawPayload,
    correlation_id: params.correlationId,
    created_at: params.createdAt || new Date().toISOString(),
  });
  if (error) console.error('Failed to write payment_event:', error);
}

async function writeError(params: {
  eventId?: string; orderId?: string; errorType: ErrType;
  message: string; rawPayload?: unknown; correlationId?: string; storeId?: string;
}) {
  try {
    await supabaseAdmin.from('payment_errors').insert({
      store_id: params.storeId || null,
      event_id: params.eventId, order_id: params.orderId, error_type: params.errorType,
      error_message: params.message, raw_payload: params.rawPayload,
      correlation_id: params.correlationId,
    });
  } catch (e) { console.error('Failed to write payment_error:', e); }
}

async function markEventProcessed(paymobTxnId: string) {
  try {
    await supabaseAdmin.from('payment_events')
      .update({ status: 'processed', processed_at: new Date().toISOString() })
      .eq('paymob_txn_id', paymobTxnId);
  } catch (e) { console.error('Failed to mark event processed:', e); }
}

async function markEventFailed(paymobTxnId: string, errorMessage: string) {
  try {
    await supabaseAdmin.from('payment_events')
      .update({ status: 'failed', processed_at: new Date().toISOString(), error_message: errorMessage })
      .eq('paymob_txn_id', paymobTxnId);
  } catch (e) { console.error('Failed to mark event failed:', e); }
}

async function commitOrderStock(orderId: string): Promise<void> {
  const { data: order } = await supabaseAdmin
    .from('orders')
    .select('items')
    .eq('id', orderId)
    .single();
  if (!order?.items) return;
  const items = (order.items as Array<{ product_id: string; quantity: number }>)
    .map(i => ({ product_id: i.product_id, quantity: i.quantity }));
  const { error } = await supabaseAdmin.rpc('commit_order_stock', {
    order_id: orderId,
    items: JSON.stringify(items),
  });
  if (error) throw new Error(`Stock commit failed: ${error.message}`);
}

async function releaseOrderStock(orderId: string): Promise<void> {
  const { data: order } = await supabaseAdmin
    .from('orders')
    .select('items')
    .eq('id', orderId)
    .single();
  if (!order?.items) return;
  const items = (order.items as Array<{ product_id: string; quantity: number }>)
    .map(i => ({ product_id: i.product_id, quantity: i.quantity }));
  const { error } = await supabaseAdmin.rpc('release_order_stock', {
    order_id: orderId,
    items: JSON.stringify(items),
  });
  if (error) console.error(`Stock release failed for order ${orderId}:`, error.message);
}

function buildHmacMessage(body: Record<string, unknown>): string {
  const { hmac: _, ...rest } = body;
  const sortedKeys = Object.keys(rest).sort();
  return sortedKeys.map(k => {
    const val = rest[k];
    if (val !== null && typeof val === 'object') {
      return `${k}=${JSON.stringify(val)}`;
    }
    return `${k}=${val}`;
  }).join('&');
}

export async function POST(req: NextRequest) {
  const correlationId = req.headers.get('x-paymob-hmac')?.slice(0, 12) || crypto.randomUUID().slice(0, 8);
  const startTime = Date.now();

  try {
    // ── 0. Read raw body for HMAC, parse for field access ──
    const rawBody = await req.text();
    const body: Record<string, unknown> = JSON.parse(rawBody);
    const obj = body.obj as Record<string, unknown> | undefined;

    // ── 1. HMAC — fail fast, no DB yet ──
    const hmacSecret = process.env.PAYMOB_HMAC_SECRET;
    if (!hmacSecret) {
      await writeError({ errorType: 'unknown', message: 'HMAC secret not configured', correlationId });
      return NextResponse.json({ error: 'HMAC secret not configured' }, { status: 500 });
    }
    if (!body.hmac || typeof body.hmac !== 'string') {
      await writeError({ errorType: 'hmac_failure', message: 'Missing HMAC signature', rawPayload: body, correlationId });
      return NextResponse.json({ error: 'Missing HMAC signature' }, { status: 401 });
    }
    const message = buildHmacMessage(body);
    const computed = crypto.createHmac('sha512', hmacSecret).update(message).digest('hex');
    if (computed !== body.hmac) {
      await writeError({ errorType: 'hmac_failure', message: 'HMAC signature mismatch', rawPayload: body, correlationId });
      return NextResponse.json({ error: 'Invalid HMAC signature' }, { status: 401 });
    }

    // ── 2. Validate payload ──
    if (!obj || !(obj as any).order?.merchant_order_id || !(obj as any).id) {
      await writeError({ errorType: 'unknown', message: 'Invalid payload structure', rawPayload: body, correlationId });
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const orderId = (obj as any).order.merchant_order_id as string;
    const paymobTxnId = String((obj as any).id);
    const success = (obj as any).success === true;
    const eventType = success ? 'transaction.succeeded' : 'transaction.failed';

    // ── 3. Anti-replay: reject if timestamp is too old (BEFORE event write) ──
    if ((obj as any).created_at) {
      const txnTime = new Date((obj as any).created_at).getTime();
      if (isNaN(txnTime) || Date.now() - txnTime > PAYMOB_TXN_WINDOW_MS) {
        return NextResponse.json({ error: 'Transaction timestamp too old' }, { status: 400 });
      }
    }

    // ── 4. Resolve store_id from the order ──
    const storeId = await getOrderStoreId(orderId) || '00000000-0000-0000-0000-000000000001';

    // ── 5. Persist event to append-only log BEFORE processing ──
    await writeEvent({
      paymobTxnId, orderId, eventType, rawPayload: body,
      correlationId, createdAt: (obj as any).created_at || null, storeId,
    });

    // ── 6. Verify order exists + amount match + validate state transition ──
    const amountCents = (obj as any).amount_cents || (obj as any).payment_key_claims?.amount_cents;
    const { data: order, error: orderErr } = await supabaseAdmin
      .from('orders').select('total, status').eq('id', orderId).single();

    if (orderErr || !order) {
      await markEventFailed(paymobTxnId, 'Order not found');
      await writeError({ eventId: undefined, orderId, errorType: 'order_not_found', message: 'Order not found', rawPayload: body, correlationId, storeId });
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    if (amountCents && Math.round(order.total * 100) !== amountCents) {
      await markEventFailed(paymobTxnId, `Amount mismatch: ${amountCents} vs ${order.total * 100}`);
      await writeError({ eventId: undefined, orderId, errorType: 'amount_mismatch', message: `Amount ${amountCents} != ${order.total * 100}`, rawPayload: body, correlationId, storeId });
      return NextResponse.json({ error: 'Amount mismatch' }, { status: 400 });
    }

    try {
      assertValidOrderTransition(order.status, success ? 'confirmed' : 'cancelled');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid transition';
      await markEventFailed(paymobTxnId, msg);
      return NextResponse.json({ error: msg }, { status: 422 });
    }

    // ── 7. Atomic idempotency lock ──
    const { data: updated } = await supabaseAdmin
      .from('orders')
      .update({
        payment_method: 'paymob',
        paymob_txn_id: paymobTxnId,
        status: success ? 'confirmed' : 'cancelled',
        delivery_status: success ? 'pending' : 'cancelled',
        notes: `Paymob txn: ${paymobTxnId} - ${success ? 'Paid' : 'Failed'}`,
      })
      .eq('id', orderId)
      .is('paymob_txn_id', null)
      .select('id')
      .maybeSingle();

    if (!updated) {
      return NextResponse.json({ success: true, skipped: true });
    }

    // ── 8. Commit or release stock based on payment result ──
    if (success) {
      try {
        await commitOrderStock(orderId);
      } catch (stockErr) {
        const msg = stockErr instanceof Error ? stockErr.message : 'Stock commit failed';
        await markEventFailed(paymobTxnId, msg);
        await writeError({ eventId: undefined, orderId, errorType: 'stock_decrement_failed', message: msg, rawPayload: body, correlationId, storeId });
        return NextResponse.json({ error: msg }, { status: 500 });
      }
    } else {
      await releaseOrderStock(orderId);
    }

    await markEventProcessed(paymobTxnId);
    return NextResponse.json({ success: true, processingMs: Date.now() - startTime });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal error';
    console.error(`[${correlationId}] Paymob callback error:`, msg);
    await writeError({ errorType: 'unknown', message: msg, correlationId });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const success = searchParams.get('success');
  const orderId = searchParams.get('merchant_order_id');

  // Redirect only — state mutations happen server-side via POST webhook (HMAC-verified)
  return NextResponse.redirect(
    new URL(`/order-success?order_id=${orderId}&success=${success}`, req.url)
  );
}
