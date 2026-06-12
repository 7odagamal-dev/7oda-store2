import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAdminSession } from '@/lib/auth';
import { isValidOrderStatus, assertValidOrderTransition } from '@/lib/order-state';
import { filterByStore } from '@/lib/db';
import { csrfGuard, safeJson } from '@/lib/csrf';
import { checkRateLimit } from '@/lib/rate-limit';
import { log, newCorrelationId } from '@/lib/logger';
import { requireRole } from '@/lib/admin-guards';
export async function GET(req: NextRequest) {
  const correlationId = newCorrelationId();
  const startMs = Date.now();
  const roleResp = await requireRole(req, ['superadmin', 'admin']);
  if (roleResp) return roleResp;

  const session = await getAdminSession(req);

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
  const search = searchParams.get('search') || '';
  const status = searchParams.get('status') || '';
  const orderIdFilter = searchParams.get('id') || '';
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  try {
    let query = supabaseAdmin
      .from('orders')
      .select('*', { count: 'exact', head: false });
    if (session.storeId) query = filterByStore(query, session.storeId);
    if (orderIdFilter) {
      query = query.eq('id', orderIdFilter);
    }
    if (search) {
      query = query.or(`customer_name.ilike.%${search}%,phone.ilike.%${search}%,display_id.ilike.%${search}%,id.ilike.%${search}%`);
    }
    if (status) {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;
    log('info', { correlationId, durationMs: Date.now() - startMs, route: '/api/admin/orders', method: 'GET', statusCode: 200, level: 'info', message: 'Orders fetched', metadata: { total: count ?? 0, page, limit } });
    return NextResponse.json({
      data: data || [],
      total: count ?? 0,
      page,
      limit,
      totalPages: Math.ceil((count ?? 0) / limit),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    log('error', { correlationId, durationMs: Date.now() - startMs, route: '/api/admin/orders', method: 'GET', statusCode: 500, level: 'error', message: 'Orders fetch failed', error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const correlationId = newCorrelationId();
  const startMs = Date.now();
  const csrfResp = csrfGuard(req);
  if (csrfResp) return csrfResp;

  const roleResp = await requireRole(req, ['superadmin', 'admin']);
  if (roleResp) return roleResp;

  const session = await getAdminSession(req);

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
  const rlAllowed = await checkRateLimit(ip, 'admin_update_order', 30, 60000);
  if (!rlAllowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  const { id, status, delivery_status } = await req.json();
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  let query = supabaseAdmin.from('orders').select('status, items, paymob_txn_id, store_id').eq('id', id);
  if (session.storeId) query = filterByStore(query, session.storeId);
  const { data: current, error: fetchErr } = await query.single();
  if (fetchErr || !current) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

  if (status) {
    if (!isValidOrderStatus(status)) {
      return NextResponse.json({ error: `Invalid status: "${status}"` }, { status: 422 });
    }
    try {
      assertValidOrderTransition(current.status, status);
    } catch {
      return NextResponse.json({ error: `Invalid transition: "${current.status}" → "${status}"` }, { status: 422 });
    }
  }
  if (delivery_status && !isValidOrderStatus(delivery_status)) {
    return NextResponse.json({ error: `Invalid delivery_status: "${delivery_status}"` }, { status: 422 });
  }

  const updates: Record<string, string> = {};
  if (status) updates.status = status;
  if (delivery_status) updates.delivery_status = delivery_status;
  if (current.status === 'pending' && status && status !== 'cancelled') {
    updates.paymob_txn_id = 'admin::' + Date.now();
  }

  let updateQuery = supabaseAdmin.from('orders').update(updates).eq('id', id);
  if (session.storeId) updateQuery = filterByStore(updateQuery, session.storeId);
  const { data, error } = await updateQuery.select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // ── Coupon lifecycle: decrement on cancel ──
  // Coupon was already incremented atomically at checkout (checkout/route.ts).
  if (['confirmed', 'pending'].includes(current.status) && status === 'cancelled') {
    const { data: couponOrder } = await supabaseAdmin
      .from('orders')
      .select('coupon_id')
      .eq('id', id)
      .single();
    if (couponOrder?.coupon_id) {
      await supabaseAdmin.rpc('atomic_decrement_coupon', { p_coupon_id: couponOrder.coupon_id });
    }
  }

  if (status === 'cancelled' && current.items) {
    const items = (current.items as Array<{ product_id: string; quantity: number }>)
      .map(i => ({ product_id: i.product_id, quantity: i.quantity }));
    const { error: releaseErr } = await supabaseAdmin.rpc('release_order_stock', {
      order_id: id,
      items: items,
    });
    if (releaseErr) {
      console.error(`[Orders] Failed to release stock for cancelled order ${id}:`, releaseErr);
      return NextResponse.json({ error: `Failed to release stock: ${releaseErr.message}` }, { status: 500 });
    }
  }

  if (current.status === 'pending' && status && status !== 'cancelled' && !current.paymob_txn_id && current.items) {
    const items = (current.items as Array<{ product_id: string; quantity: number }>)
      .map(i => ({ product_id: i.product_id, quantity: i.quantity }));
    const { error: commitErr } = await supabaseAdmin.rpc('commit_order_stock', {
      order_id: id,
      items: items,
    });
    if (commitErr) {
      console.error(`[Orders] Failed to commit stock for confirmed order ${id}:`, commitErr);
      return NextResponse.json({ error: `Failed to commit stock: ${commitErr.message}` }, { status: 500 });
    }
  }

  log('info', { correlationId, durationMs: Date.now() - startMs, route: '/api/admin/orders', method: 'PUT', statusCode: 200, level: 'info', message: 'Order updated', metadata: { orderId: data?.id, newStatus: status || delivery_status } });
  return safeJson(data);
}

export async function DELETE(req: NextRequest) {
  const correlationId = newCorrelationId();
  const startMs = Date.now();
  const csrfResp = csrfGuard(req);
  if (csrfResp) return csrfResp;

  const roleResp = await requireRole(req, ['superadmin', 'admin']);
  if (roleResp) return roleResp;

  const session = await getAdminSession(req);

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
  const rlAllowed = await checkRateLimit(ip, 'admin_delete_order', 15, 60000);
  if (!rlAllowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    // ── Release reserved stock before delete ──
    let fetchQuery = supabaseAdmin.from('orders').select('status, items').eq('id', id);
    if (session.storeId) fetchQuery = filterByStore(fetchQuery, session.storeId);
    const { data: orderToDelete, error: fetchErr } = await fetchQuery.single();

    if (fetchErr || !orderToDelete) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (['confirmed', 'pending'].includes(orderToDelete.status) && orderToDelete.items) {
      const items = (orderToDelete.items as Array<{ product_id: string; quantity: number }>)
        .map(i => ({ product_id: i.product_id, quantity: i.quantity }));
      const { error: releaseErr } = await supabaseAdmin.rpc('release_order_stock', {
        order_id: id,
        items: items,
      });
      if (releaseErr) {
        console.error(`[Orders] Failed to release stock before delete for ${id}:`, releaseErr);
        return NextResponse.json({ error: `Failed to release stock: ${releaseErr.message}` }, { status: 500 });
      }
    }

    let deleteQuery = supabaseAdmin.from('orders').delete().eq('id', id);
    if (session.storeId) deleteQuery = filterByStore(deleteQuery, session.storeId);
    const { error } = await deleteQuery;

    if (error) throw error;

    log('info', { correlationId, durationMs: Date.now() - startMs, route: '/api/admin/orders', method: 'DELETE', statusCode: 200, level: 'info', message: 'Order deleted', metadata: { orderId: id } });
    return safeJson({ 
      success: true, 
      message: 'Order deleted successfully' 
    }, { status: 200 });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    log('error', { correlationId, durationMs: Date.now() - startMs, route: '/api/admin/orders', method: 'DELETE', statusCode: 500, level: 'error', message: 'Order deletion failed', error: msg });
    console.error('Error deleting order:', err);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
