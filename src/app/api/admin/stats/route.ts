import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAdminSession } from '@/lib/auth';
import { filterByStore } from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await getAdminSession(req);
  if (!session.valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    let productsQuery = supabaseAdmin.from('products').select('id', { count: 'exact' });
    let ordersQuery = supabaseAdmin.from('orders').select('total, status');
    if (session.storeId) {
      productsQuery = filterByStore(productsQuery, session.storeId);
      ordersQuery = filterByStore(ordersQuery, session.storeId);
    }

    const [productsRes, ordersRes] = await Promise.all([
      productsQuery,
      ordersQuery,
    ]);

    const totalProducts = productsRes.count || 0;
    const orders = ordersRes.data || [];
    
    const pendingOrders = orders.filter((o: any) => o.status === 'pending').length;
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum: number, o: any) => sum + (o.total || 0), 0);

    return NextResponse.json({
      totalProducts,
      totalOrders,
      pendingOrders,
      totalRevenue,
    });
  } catch (err: any) {
    console.error('Error fetching stats:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
