import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { assertValidOrderTransition } from '@/lib/order-state';
import { checkRateLimit } from '@/lib/rate-limit';
import crypto from 'crypto';
import { log } from '@/lib/logger';

const PAYMOB_TXN_WINDOW_MS = 5 * 60 * 1000; // 5 min

type ErrType = 'hmac_failure' | 'order_not_found' | 'amount_mismatch' | 'stock_decrement_failed' | 'db_error' | 'unknown';

interface PaymobObj {
  id: number;
  success: boolean;
  created_at: string;
  amount_cents?: number;
  order: {
    merchant_order_id: string;
  };
  payment_key_claims?: {
    amount_cents: number;
  };
}

async function getOrderStoreId(orderId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from('orders')
    .select('store_id')
    .eq('id', orderId)
    .single();
  return data?.store_id || null;
}

async function writeEvent(params: {
  paymobTxnId: string; orderId: string;   eventType: 'payment.success' | 'payment.failed';
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
    items: items,
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
    items: items,
  });
  if (error) console.error(`Stock release failed for order ${orderId}:`, error.message);
}

function buildHmacMessage(body: Record<string, unknown>): string {
  const sortedKeys = Object.keys(body).filter(k => k !== 'hmac').sort();
  return sortedKeys.map(k => {
    const val = body[k];
    if (val !== null && typeof val === 'object') {
      return `${k}=${JSON.stringify(val)}`;
    }
    return `${k}=${val}`;
  }).join('&');
}

export async function POST(req: NextRequest) {
  const correlationId = req.headers.get('x-paymob-hmac')?.slice(0, 12) || crypto.randomUUID().slice(0, 8);
  const startTime = Date.now();

  // ── Origin check (defense-in-depth — HMAC below is the real protection) ──
  // Paymob webhook is server-to-server; Origin may be absent. Only reject if
  // Origin is present AND doesn't match Paymob's domain.
  const origin = req.headers.get('origin');
  if (origin && !origin.startsWith('https://accept.paymob.com')) {
    return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
  }

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
    const paymob = obj as PaymobObj | undefined;
    if (!paymob || !paymob.order?.merchant_order_id || !paymob.id) {
      await writeError({ errorType: 'unknown', message: 'Invalid payload structure', rawPayload: body, correlationId });
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const orderId = paymob.order.merchant_order_id;
    const paymobTxnId = String(paymob.id);
    const success = paymob.success === true;
    const eventType = success ? 'payment.success' : 'payment.failed';

    // ── 3. Anti-replay: reject if timestamp is too old (BEFORE event write) ──
    if (paymob.created_at) {
      const txnTime = new Date(paymob.created_at).getTime();
      if (isNaN(txnTime) || Date.now() - txnTime > PAYMOB_TXN_WINDOW_MS) {
        return NextResponse.json({ error: 'Transaction timestamp too old' }, { status: 400 });
      }
    }

    // ── 4. Resolve store_id from the order ──
    const storeId = await getOrderStoreId(orderId) || '00000000-0000-0000-0000-000000000001';

    // ── 5. Persist event to append-only log BEFORE processing ──
    await writeEvent({
      paymobTxnId, orderId, eventType, rawPayload: body,
      correlationId, createdAt: paymob.created_at || null, storeId,
    });

    // ── 6. Verify order exists + amount match + validate state transition ──
    const amountCents = paymob.amount_cents || paymob.payment_key_claims?.amount_cents;
    const { data: order, error: orderErr } = await supabaseAdmin
      .from('orders').select('total, status, items, store_id').eq('id', orderId).single();

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
      log('warn', { correlationId, route: '/api/paymob/callback', method: 'POST', durationMs: Date.now() - startTime, statusCode: 422, level: 'warn', message: `Invalid transition: ${order.status} → ${success ? 'confirmed' : 'cancelled'}`, metadata: { paymobTxnId, orderId }});
      await markEventFailed(paymobTxnId, msg);
      return NextResponse.json({ error: msg }, { status: 422 });
    }

    // ── 7. Commit or release stock BEFORE status update ──
    // (stock operation must succeed before confirming the order to avoid stranding)
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

    // ── 8. Atomic idempotency lock (only after stock is committed) ──
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
      if (success) { await releaseOrderStock(orderId); }
      log('info', { correlationId, route: '/api/paymob/callback', method: 'POST', durationMs: Date.now() - startTime, statusCode: 200, level: 'info', message: 'Idempotency skip — already processed', metadata: { paymobTxnId, orderId }});
      return NextResponse.json({ success: true, skipped: true });
    }

    // ── Coupon lifecycle ──
    // Coupon was already incremented atomically at checkout (checkout/route.ts).
    // No further coupon action needed here. If payment fails, the coupon
    // decrement is handled by the admin order cancellation flow.

    // ── Flash sale re-check (warning only — price already locked at checkout) ──
    if (success && order.items && Array.isArray(order.items)) {
      try {
        const productIds = (order.items as Array<{ product_id: string }>).map(i => i.product_id);
        const { data: activeFlashSales } = await supabaseAdmin
          .from('flash_sales')
          .select('product_id, ends_at')
          .in('product_id', productIds)
          .eq('store_id', order.store_id)
          .gt('ends_at', new Date().toISOString());
        const activeSet = new Set((activeFlashSales || []).map(fs => fs.product_id));
        for (const item of (order.items as Array<{ product_id: string; name: string }>)) {
          if (!activeSet.has(item.product_id)) {
            log('warn', { correlationId, route: '/api/paymob/callback', method: 'POST', durationMs: Date.now() - startTime, statusCode: 200, level: 'warn', message: `Flash sale expired for "${item.name}" — discount already applied at checkout`, metadata: { orderId, productId: item.product_id }});
          }
        }
      } catch {
        // Flash sale table may not exist yet — non-critical
      }
    }

    await markEventProcessed(paymobTxnId);
    log('info', { correlationId, route: '/api/paymob/callback', method: 'POST', durationMs: Date.now() - startTime, statusCode: 200, level: 'info', message: `${success ? 'Payment confirmed' : 'Payment failed'}`, metadata: { paymobTxnId, orderId, success }});
    return NextResponse.json({ success: true, processingMs: Date.now() - startTime });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal error';
    log('error', { correlationId, route: '/api/paymob/callback', method: 'POST', durationMs: Date.now() - startTime, statusCode: 500, level: 'error', message: 'Callback error', error: msg });
    await writeError({ errorType: 'unknown', message: msg, correlationId });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
  const allowed = await checkRateLimit(ip, 'paymob_callback_get', 30, 60000);
  if (!allowed) {
    return NextResponse.redirect(getCheckoutUrl(req, 'too_many_requests'));
  }

  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get('merchant_order_id') || '';

  if (!orderId) {
    return NextResponse.redirect(getCheckoutUrl(req, 'missing_order'));
  }

  // READ-ONLY redirect handler — NO mutations of any kind.
  //
  // Why this is safe:
  //   - No HMAC verification (GET cannot carry HMAC headers from browser redirect)
  //   - No stock commit/release (prevent overselling via forged GET requests)
  //   - No order status changes (prevent unauthorized confirmation/cancellation)
  //   - No coupon increment (prevent financial integrity bypass)
  //
  // The POST webhook (with HMAC SHA-512 verification at line 152) is the
  // authoritative handler. It arrives within 1-5 seconds of the redirect.
  // If the webhook never arrives (dev mode / network issue), the order stays
  // 'pending' and the admin can confirm it manually via the admin panel.
  //
  // UX flow after Paymob redirect:
  //   1. User pays on Paymob iframe
  //   2. Paymob redirects browser to this GET handler
  //   3. GET redirects to /order-success (user sees "Order Placed — Processing")
  //   4. POST webhook arrives → confirms order, commits stock, increments coupon
  //   5. User can refresh /order-success to see updated status

  // Verify order exists before redirect (informational — doesn't block redirect)
  try {
    await supabaseAdmin
      .from('orders')
      .select('id')
      .eq('id', orderId)
      .maybeSingle();
  } catch {
    // Silent — redirect handles display
  }

  return NextResponse.redirect(redirectUrl(req, orderId));
}

// ── Helper: builds redirect URL using the real public host ──
function getBaseUrl(req: NextRequest): string {
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'localhost:3000';
  const protocol = req.headers.get('x-forwarded-proto') || 'http';
  return `${protocol}://${host}`;
}

function redirectUrl(req: NextRequest, orderId: string): URL {
  return new URL(`/order-success?order_id=${orderId}&success=true`, getBaseUrl(req));
}

function getCheckoutUrl(req: NextRequest, error: string): URL {
  return new URL(`/checkout?error=${error}`, getBaseUrl(req));
}
