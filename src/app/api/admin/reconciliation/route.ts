import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAdminSession } from '@/lib/auth';
import { assertValidOrderTransition } from '@/lib/order-state';
import { filterByStore } from '@/lib/db';
import { csrfGuard } from '@/lib/csrf';
import { requireRole } from '@/lib/admin-guards';
import { checkRateLimit } from '@/lib/rate-limit';
import { log, newCorrelationId } from '@/lib/logger';

export async function GET(req: NextRequest) {
  const correlationId = newCorrelationId();
  const startMs = Date.now();

  const roleResp = await requireRole(req, ['superadmin']);
  if (roleResp) return roleResp;

  const session = await getAdminSession(req);

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
  const allowed = await checkRateLimit(ip, 'admin_reconciliation', 5, 60000);
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
  }

  const { searchParams } = new URL(req.url);
  const tab = searchParams.get('tab');
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  // Tab-specific paginated fetch
  if (tab === 'events') {
    let query = supabaseAdmin.from('payment_events').select('*', { count: 'exact', head: false });
    if (session.storeId) query = filterByStore(query, session.storeId);
    const { data, error, count } = await query.order('received_at', { ascending: false }).range(from, to);
    const eventCount = (data || []).length;
    log('info', { correlationId, durationMs: Date.now() - startMs, route: '/api/admin/reconciliation', method: 'GET', statusCode: 200, level: 'info', message: 'Reconciliation events fetched', metadata: { events: eventCount, total: count ?? 0 } });
    return NextResponse.json({ data: data || [], total: count ?? 0, page, totalPages: Math.ceil((count ?? 0) / limit) });
  }

  if (tab === 'errors') {
    let query = supabaseAdmin.from('payment_errors').select('*', { count: 'exact', head: false });
    if (session.storeId) query = filterByStore(query, session.storeId);
    const { data, error, count } = await query.order('created_at', { ascending: false }).range(from, to);
    const errorCount = (data || []).length;
    log('info', { correlationId, durationMs: Date.now() - startMs, route: '/api/admin/reconciliation', method: 'GET', statusCode: 200, level: 'info', message: 'Reconciliation errors fetched', metadata: { errors: errorCount, total: count ?? 0 } });
    return NextResponse.json({ data: data || [], total: count ?? 0, page, totalPages: Math.ceil((count ?? 0) / limit) });
  }

  if (tab === 'orders') {
    let query = supabaseAdmin.from('orders').select('id, status, paymob_txn_id, total, created_at', { count: 'exact', head: false }).is('paymob_txn_id', 'not.null');
    if (session.storeId) query = filterByStore(query, session.storeId);
    const { data, error, count } = await query.order('created_at', { ascending: false }).range(from, to);
    const orderCount = (data || []).length;
    log('info', { correlationId, durationMs: Date.now() - startMs, route: '/api/admin/reconciliation', method: 'GET', statusCode: 200, level: 'info', message: 'Reconciliation orders fetched', metadata: { orders: orderCount, total: count ?? 0 } });
    return NextResponse.json({ data: data || [], total: count ?? 0, page, totalPages: Math.ceil((count ?? 0) / limit) });
  }

  // Legacy: fetch all 3 (limited)
  let eventsQuery = supabaseAdmin.from('payment_events').select('*');
  let errorsQuery = supabaseAdmin.from('payment_errors').select('*');
  let ordersQuery = supabaseAdmin.from('orders').select('id, status, paymob_txn_id, total, created_at').is('paymob_txn_id', 'not.null');

  if (session.storeId) {
    eventsQuery = filterByStore(eventsQuery, session.storeId);
    errorsQuery = filterByStore(errorsQuery, session.storeId);
    ordersQuery = filterByStore(ordersQuery, session.storeId);
  }

  const [eventsRes, errorsRes, ordersRes] = await Promise.all([
    eventsQuery.order('received_at', { ascending: false }).limit(100),
    errorsQuery.order('created_at', { ascending: false }).limit(100),
    ordersQuery.order('created_at', { ascending: false }).limit(50),
  ]);

  const eventCount = (eventsRes.data || []).length;
  const errorCount = (errorsRes.data || []).length;
  const orderCount = (ordersRes.data || []).length;
  log('info', { correlationId, durationMs: Date.now() - startMs, route: '/api/admin/reconciliation', method: 'GET', statusCode: 200, level: 'info', message: 'Reconciliation data fetched', metadata: { events: eventCount, errors: errorCount, orders: orderCount } });
  return NextResponse.json({
    events: eventsRes.data || [],
    errors: errorsRes.data || [],
    paymobOrders: ordersRes.data || [],
  });
}export async function POST(req: NextRequest) {
  const correlationId = newCorrelationId();
  const startMs = Date.now();

  const csrfResp = csrfGuard(req);
  if (csrfResp) return csrfResp;

  const roleResp = await requireRole(req, ['superadmin']);
  if (roleResp) return roleResp;

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
  const allowed = await checkRateLimit(ip, 'admin_reconciliation', 5, 60000);
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
  }

  try {
    const { action, eventId, errorId } = await req.json();

    if (action === 'retry_event' && eventId) {
      const { data: event } = await supabaseAdmin
        .from('payment_events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (!event) {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 });
      }

      const paymobTxnId = event.paymob_txn_id;
      const orderId = event.order_id;
      const success = event.event_type === 'payment.success';
      const newStatus = success ? 'confirmed' : 'cancelled';

      const { data: orderForTransition } = await supabaseAdmin
        .from('orders')
        .select('status')
        .eq('id', orderId)
        .single();
      if (orderForTransition) {
        try {
          assertValidOrderTransition(orderForTransition.status, newStatus);
        } catch {
          return NextResponse.json({ success: false, skipped: true, message: `Cannot transition from "${orderForTransition.status}" to "${newStatus}"` });
        }
      }

      const { data: updated } = await supabaseAdmin
        .from('orders')
        .update({
          payment_method: 'paymob',
          paymob_txn_id: paymobTxnId,
          status: newStatus,
          delivery_status: success ? 'pending' : 'cancelled',
          notes: `Paymob txn: ${paymobTxnId} - ${success ? 'Paid' : 'Failed'} (reconciled)`,
        })
        .eq('id', orderId)
        .is('paymob_txn_id', null)
        .select('id')
        .maybeSingle();

      if (!updated) {
        return NextResponse.json({ success: true, skipped: true, message: 'Order already processed' });
      }

      const { data: order } = await supabaseAdmin
        .from('orders')
        .select('items')
        .eq('id', orderId)
        .single();

      if (order?.items) {
        const items = (order.items as Array<{ product_id: string; quantity: number }>)
          .map(i => ({ product_id: i.product_id, quantity: i.quantity }));
        if (success) {
          const { error: stockErr } = await supabaseAdmin.rpc('commit_order_stock', {
            order_id: orderId,
            items: items,
          });
          if (stockErr) throw new Error(`Retry stock commit failed: ${stockErr.message}`);
        } else {
          try {
            await supabaseAdmin.rpc('release_order_stock', {
              order_id: orderId,
              items: items,
            });
          } catch (e) { console.error(`Release during retry failed for ${orderId}:`, e); }
        }
      }

      await supabaseAdmin.from('payment_events')
        .update({ status: 'processed', processed_at: new Date().toISOString() })
        .eq('id', eventId);

      await supabaseAdmin.from('payment_errors')
        .update({ resolved_at: new Date().toISOString() })
        .eq('event_id', eventId);

      log('info', { correlationId, durationMs: Date.now() - startMs, route: '/api/admin/reconciliation', method: 'POST', statusCode: 200, level: 'info', message: 'Retry event processed', metadata: { action: 'retry_event', eventId, orderId, newStatus: success ? 'confirmed' : 'cancelled' } });
      return NextResponse.json({ success: true });
    }

    if (action === 'resolve_error' && errorId) {
      await supabaseAdmin.from('payment_errors')
        .update({ resolved_at: new Date().toISOString() })
        .eq('id', errorId);

      log('info', { correlationId, durationMs: Date.now() - startMs, route: '/api/admin/reconciliation', method: 'POST', statusCode: 200, level: 'info', message: 'Error resolved', metadata: { action: 'resolve_error', errorId } });
      return NextResponse.json({ success: true });
    }

    if (action === 'retry_all_failed') {
      const { data: failedEvents } = await supabaseAdmin
        .from('payment_events')
        .select('*')
        .eq('status', 'failed');

      if (!failedEvents) {
        return NextResponse.json({ success: true, processed: 0 });
      }

      let processed = 0;
      let failures = 0;
      const errorDetails: string[] = [];
      for (const event of failedEvents) {
        try {
          const { data: existing } = await supabaseAdmin
            .from('orders')
            .select('paymob_txn_id')
            .eq('id', event.order_id)
            .single();

          if (existing?.paymob_txn_id) {
            await supabaseAdmin.from('payment_events')
              .update({ status: 'processed', processed_at: new Date().toISOString() })
              .eq('id', event.id);
            processed++;
            continue;
          }

          const success = event.event_type === 'payment.success';
          const newStatus = success ? 'confirmed' : 'cancelled';

          const { data: orderForTransition } = await supabaseAdmin
            .from('orders')
            .select('status')
            .eq('id', event.order_id)
            .single();
          if (orderForTransition) {
            try {
              assertValidOrderTransition(orderForTransition.status, newStatus);
            } catch {
              errorDetails.push(`Event ${event.id}: invalid transition ${orderForTransition.status} -> ${newStatus}`);
              failures++;
              continue;
            }
          }

          const { data: updated } = await supabaseAdmin
            .from('orders')
            .update({
              payment_method: 'paymob',
              paymob_txn_id: event.paymob_txn_id,
              status: newStatus,
              delivery_status: success ? 'pending' : 'cancelled',
              notes: `Paymob txn: ${event.paymob_txn_id} - ${success ? 'Paid' : 'Failed'} (reconciled)`,
            })
            .eq('id', event.order_id)
            .is('paymob_txn_id', null)
            .select('id')
            .maybeSingle();

          if (updated) {
            const { data: order } = await supabaseAdmin
              .from('orders')
              .select('items')
              .eq('id', event.order_id)
              .single();

            if (order?.items) {
              const items = (order.items as Array<{ product_id: string; quantity: number }>)
                .map(i => ({ product_id: i.product_id, quantity: i.quantity }));
              const stockResult = success
                ? await supabaseAdmin.rpc('commit_order_stock', { order_id: event.order_id, items })
                : await supabaseAdmin.rpc('release_order_stock', { order_id: event.order_id, items });
              if (stockResult.error) {
                errorDetails.push(`Event ${event.id}: stock operation failed (${stockResult.error.message}) â€” manual fix needed`);
                failures++;
                continue;
              }
            }
          } else {
            errorDetails.push(`Event ${event.id}: order already has paymob_txn_id â€” skipped`);
            failures++;
            continue;
          }

          await supabaseAdmin.from('payment_events')
            .update({ status: 'processed', processed_at: new Date().toISOString() })
            .eq('id', event.id);

          processed++;
        } catch (e) {
          const msg = e instanceof Error ? e.message : 'Unknown error';
          errorDetails.push(`Event ${event.id}: unexpected error (${msg})`);
          failures++;
        }
      }

      const partial = failures > 0;
      log('info', { correlationId, durationMs: Date.now() - startMs, route: '/api/admin/reconciliation', method: 'POST', statusCode: 200, level: 'info', message: 'Retry all failed processed', metadata: { action: 'retry_all_failed', processed, failures } });
      return NextResponse.json({
        success: !partial,
        processed,
        ...(partial ? { partial: true, failures, errorDetails } : {}),
      });
    }

    log('warn', { correlationId, durationMs: Date.now() - startMs, route: '/api/admin/reconciliation', method: 'POST', statusCode: 400, level: 'warn', message: 'Invalid reconciliation action' });
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal error';
    log('error', { correlationId, durationMs: Date.now() - startMs, route: '/api/admin/reconciliation', method: 'POST', statusCode: 500, level: 'error', message: 'Reconciliation POST failed', error: msg });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
