import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAdminSession } from '@/lib/auth';
import { isValidOrderStatus } from '@/lib/order-state';
import { filterByStore } from '@/lib/db';
import { csrfGuard } from '@/lib/csrf';

export async function GET(req: NextRequest) {
  const session = await getAdminSession(req);
  if (!session.valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let query = supabaseAdmin.from('orders').select('*');
  if (session.storeId) query = filterByStore(query, session.storeId);
  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PUT(req: NextRequest) {
  const csrfResp = csrfGuard(req);
  if (csrfResp) return csrfResp;

  const session = await getAdminSession(req);
  if (!session.valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, status, delivery_status } = await req.json();
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  let query = supabaseAdmin.from('orders').select('status, items, paymob_txn_id, store_id').eq('id', id);
  if (session.storeId) query = filterByStore(query, session.storeId);
  const { data: current, error: fetchErr } = await query.single();
  if (fetchErr || !current) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

  if (status && !isValidOrderStatus(status)) {
    return NextResponse.json({ error: `Invalid status: "${status}"` }, { status: 422 });
  }
  if (delivery_status && !isValidOrderStatus(delivery_status)) {
    return NextResponse.json({ error: `Invalid delivery_status: "${delivery_status}"` }, { status: 422 });
  }

  const updates: Record<string, string> = {};
  if (status) updates.status = status;
  if (delivery_status) updates.delivery_status = delivery_status;

  let updateQuery = supabaseAdmin.from('orders').update(updates).eq('id', id);
  if (session.storeId) updateQuery = filterByStore(updateQuery, session.storeId);
  const { data, error } = await updateQuery.select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (status === 'cancelled' && current.items) {
    const items = (current.items as Array<{ product_id: string; quantity: number }>)
      .map(i => ({ product_id: i.product_id, quantity: i.quantity }));
    try {
      await supabaseAdmin.rpc('release_order_stock', {
        order_id: id,
        items: JSON.stringify(items),
      });
    } catch (e) { console.error(`Failed to release stock for cancelled order ${id}:`, e); }
  }

  if (current.status === 'pending' && status && status !== 'cancelled' && !current.paymob_txn_id && current.items) {
    const items = (current.items as Array<{ product_id: string; quantity: number }>)
      .map(i => ({ product_id: i.product_id, quantity: i.quantity }));
    try {
      await supabaseAdmin.rpc('commit_order_stock', {
        order_id: id,
        items: JSON.stringify(items),
      });
    } catch (e) { console.error(`Failed to commit stock for confirmed order ${id}:`, e); }
  }

  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  const csrfResp = csrfGuard(req);
  if (csrfResp) return csrfResp;

  const session = await getAdminSession(req);
  if (!session.valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    let deleteQuery = supabaseAdmin.from('orders').delete().eq('id', id);
    if (session.storeId) deleteQuery = filterByStore(deleteQuery, session.storeId);
    const { error } = await deleteQuery;

    if (error) throw error;

    return NextResponse.json({ 
      success: true, 
      message: 'Order deleted successfully' 
    }, { status: 200 });

  } catch (err: any) {
    console.error('Error deleting order:', err);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
