import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAdminSession } from '@/lib/auth';
import { assertValidOrderTransition } from '@/lib/order-state';
import { filterByStore } from '@/lib/db';
import { csrfGuard } from '@/lib/csrf';

export async function GET(req: NextRequest) {
  const session = await getAdminSession(req);
  if (!session.valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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

  return NextResponse.json({
    events: eventsRes.data || [],
    errors: errorsRes.data || [],
    paymobOrders: ordersRes.data || [],
  });
}

export async function POST(req: NextRequest) {
  const csrfResp = csrfGuard(req);
  if (csrfResp) return csrfResp;

  const session = await getAdminSession(req);
  if (!session.valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
            items: JSON.stringify(items),
          });
          if (stockErr) throw new Error(`Retry stock commit failed: ${stockErr.message}`);
        } else {
          try {
            await supabaseAdmin.rpc('release_order_stock', {
              order_id: orderId,
              items: JSON.stringify(items),
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

      return NextResponse.json({ success: true });
    }

    if (action === 'resolve_error' && errorId) {
      await supabaseAdmin.from('payment_errors')
        .update({ resolved_at: new Date().toISOString() })
        .eq('id', errorId);

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
      for (const event of failedEvents) {
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
            processed++;
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
            try {
              if (success) {
                await supabaseAdmin.rpc('commit_order_stock', {
                  order_id: event.order_id,
                  items: JSON.stringify(items),
                });
              } else {
                await supabaseAdmin.rpc('release_order_stock', {
                  order_id: event.order_id,
                  items: JSON.stringify(items),
                });
              }
            } catch (e) { console.error(`Reconciliation stock operation failed for ${event.order_id}:`, e); }
          }
        }

        await supabaseAdmin.from('payment_events')
          .update({ status: 'processed', processed_at: new Date().toISOString() })
          .eq('id', event.id);

        processed++;
      }

      return NextResponse.json({ success: true, processed });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
