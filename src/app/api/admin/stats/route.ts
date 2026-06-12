import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAdminSession } from '@/lib/auth';
import { requireRole } from '@/lib/admin-guards';
import { filterByStore } from '@/lib/db';
import type { Order } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const roleResp = await requireRole(req, ['superadmin', 'admin']);
  if (roleResp) return roleResp;
  const session = await getAdminSession(req);

  try {
    let productsQuery = supabaseAdmin.from('products').select('id', { count: 'exact' });
    let ordersQuery = supabaseAdmin.from('orders').select('*');
    if (session.storeId) {
      productsQuery = filterByStore(productsQuery, session.storeId);
      ordersQuery = filterByStore(ordersQuery, session.storeId);
    }

    const [productsRes, ordersRes] = await Promise.all([
      productsQuery,
      ordersQuery,
    ]);

    const totalProducts = productsRes.count || 0;
    const orders = (ordersRes.data || []) as Order[];

    const pendingOrders = orders.filter(o => o.status === 'pending').length;
    const deliveredOrders = orders.filter(o => o.status === 'delivered').length;
    const cancelledOrders = orders.filter(o => o.status === 'cancelled').length;
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const conversionRate = totalOrders > 0 ? Math.round((deliveredOrders / totalOrders) * 100) : 0;

    // Monthly breakdown (last 6 months, delivered only)
    const monthlyData: Record<string, { revenue: number; count: number }> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleString('en-US', { month: 'short', year: '2-digit' });
      monthlyData[key] = { revenue: 0, count: 0 };
    }
    orders.filter(o => o.status === 'delivered').forEach(o => {
      const d = new Date(o.created_at);
      const key = d.toLocaleString('en-US', { month: 'short', year: '2-digit' });
      if (monthlyData[key]) {
        monthlyData[key].revenue += o.total || 0;
        monthlyData[key].count++;
      }
    });

    // Top 5 products by revenue
    const productMap: Record<string, { name: string; qty: number; revenue: number }> = {};
    orders.filter(o => o.status === 'delivered').forEach(o => {
      (o.items || []).forEach(item => {
        const key = item.name || 'Unknown';
        if (!productMap[key]) productMap[key] = { name: key, qty: 0, revenue: 0 };
        productMap[key].qty += item.quantity || 1;
        productMap[key].revenue += (item.price || 0) * (item.quantity || 1);
      });
    });
    const topProducts = Object.values(productMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Recent 5 orders
    const recentOrders = [...orders]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5)
      .map(o => ({
        id: o.id,
        customer_name: o.customer_name,
        total: o.total,
        status: o.status,
        created_at: o.created_at,
      }));

    return NextResponse.json({
      totalProducts,
      totalOrders,
      pendingOrders,
      deliveredOrders,
      cancelledOrders,
      totalRevenue,
      avgOrderValue,
      conversionRate,
      monthly: Object.entries(monthlyData).map(([month, data]) => ({ month, ...data })),
      topProducts,
      recentOrders,
    });
  } catch (err: unknown) {
    console.error('Error fetching stats:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
