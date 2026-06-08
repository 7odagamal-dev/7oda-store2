'use client';

import { motion } from 'framer-motion';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { Order } from '@/lib/supabase';
import { adminFetch } from '@/lib/admin-fetch';

interface FinanceStats {
  totalRevenue: number;
  totalOrders: number;
  deliveredOrders: number;
  pendingOrders: number;
  cancelledOrders: number;
  averageOrder: number;
}

interface MonthlyData {
  month: string;
  revenue: number;
  orders: number;
}

interface TopProduct {
  name: string;
  count: number;
  revenue: number;
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

interface StatsResponse {
  totalProducts: number;
  totalOrders: number;
  pendingOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  totalRevenue: number;
  avgOrderValue: number;
  conversionRate: number;
  monthly: Array<{ month: string; revenue: number; count: number }>;
  topProducts: Array<{ name: string; qty: number; revenue: number }>;
}

export default function FinancePage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartView, setChartView] = useState<'revenue' | 'orders'>('revenue');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [serverStats, setServerStats] = useState<StatsResponse | null>(null);

  const stats = useMemo((): FinanceStats => {
    if (serverStats) {
      return {
        totalRevenue: serverStats.totalRevenue,
        totalOrders: serverStats.totalOrders,
        deliveredOrders: serverStats.deliveredOrders,
        pendingOrders: serverStats.pendingOrders,
        cancelledOrders: serverStats.cancelledOrders,
        averageOrder: serverStats.avgOrderValue,
      };
    }
    const delivered = orders.filter(o => o.delivery_status === 'delivered' || o.status === 'delivered');
    const pending = orders.filter(o => o.status === 'pending' || o.status === 'confirmed');
    const cancelled = orders.filter(o => o.status === 'cancelled');
    const totalRevenue = delivered.reduce((sum, o) => sum + (o.total || 0), 0);
    const averageOrder = delivered.length > 0 ? Math.round(totalRevenue / delivered.length) : 0;
    return { totalRevenue, totalOrders: orders.length, deliveredOrders: delivered.length, pendingOrders: pending.length, cancelledOrders: cancelled.length, averageOrder };
  }, [orders, serverStats]);

  const monthlyData = useMemo((): MonthlyData[] => {
    if (serverStats?.monthly) {
      return serverStats.monthly.map(m => ({
        month: m.month,
        revenue: m.revenue,
        orders: m.count,
      }));
    }
    const map: Record<string, MonthlyData> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const label = `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
      map[key] = { month: label, revenue: 0, orders: 0 };
    }
    orders.forEach(o => {
      const d = new Date(o.created_at);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (map[key]) {
        map[key].revenue += o.total || 0;
        map[key].orders += 1;
      }
    });
    return Object.values(map);
  }, [orders, serverStats]);

  const topProducts = useMemo((): TopProduct[] => {
    if (serverStats?.topProducts) {
      return serverStats.topProducts.map(p => ({ name: p.name, count: p.qty, revenue: p.revenue }));
    }
    const map: Record<string, TopProduct> = {};
    orders.forEach(o => {
      o.items?.forEach(item => {
        const name = item.name || 'Unknown';
        if (map[name]) {
          map[name].count += item.quantity || 1;
          map[name].revenue += (item.price || 0) * (item.quantity || 1);
        } else {
          map[name] = { name, count: item.quantity || 1, revenue: (item.price || 0) * (item.quantity || 1) };
        }
      });
    });
    return Object.values(map).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [orders, serverStats]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [statsRes, ordersRes] = await Promise.all([
        adminFetch('/api/admin/stats'),
        adminFetch(`/api/admin/orders?page=${page}&limit=50`),
      ]);
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setServerStats(statsData);
      }
      if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        setOrders(ordersData.data || []);
        setTotalPages(ordersData.totalPages || 1);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'delivered': return 'bg-emerald-100 text-emerald-700';
      case 'shipped': return 'bg-violet-100 text-violet-700';
      case 'confirmed': return 'bg-sky-100 text-sky-700';
      case 'pending': return 'bg-amber-100 text-amber-700';
      case 'cancelled': return 'bg-rose-100 text-rose-700';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const maxChartValue = Math.max(...monthlyData.map(d => chartView === 'revenue' ? d.revenue : d.orders), 1);

  const statCards = [
    { label: 'Total Revenue', value: `${stats.totalRevenue.toLocaleString()} EGP`, icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z', color: 'bg-emerald-100 text-emerald-600' },
    { label: 'Total Orders', value: stats.totalOrders.toString(), icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2', color: 'bg-sky-100 text-sky-600' },
    { label: 'Delivered', value: stats.deliveredOrders.toString(), icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', color: 'bg-emerald-100 text-emerald-600' },
    { label: 'Pending', value: stats.pendingOrders.toString(), icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', color: 'bg-amber-100 text-amber-600' },
    { label: 'Cancelled', value: stats.cancelledOrders.toString(), icon: 'M6 18L18 6M6 6l12 12', color: 'bg-rose-100 text-rose-600' },
    { label: 'Avg Order', value: `${stats.averageOrder.toLocaleString()} EGP`, icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4m0 0l-4 4m4-4v.01', color: 'bg-[#8BA4B8]/20 text-[#8BA4B8]' },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <h1 className="text-3xl font-[family-name:var(--font-playfair)] text-[#1A1A1A] mb-8">Finance Reports</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {statCards.map((stat, index) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.08 }}
            className="bg-white rounded-2xl p-6 border border-[#E5E7EB] shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#6B7280] text-xs font-medium uppercase tracking-wider mb-1">{stat.label}</p>
                <p className={`text-2xl font-bold font-[family-name:var(--font-playfair)] ${stat.label.includes('Revenue') ? 'text-[#8BA4B8]' : 'text-[#1A1A1A]'}`}>
                  {loading ? '...' : stat.value}
                </p>
              </div>
              <div className={`w-11 h-11 rounded-xl ${stat.color} flex items-center justify-center`}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d={stat.icon} />
                </svg>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Monthly Revenue / Orders Bar Chart */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-[family-name:var(--font-playfair)] text-[#1A1A1A]">Monthly Overview</h2>
            <div className="flex bg-[#F3F5F8] rounded-lg p-0.5">
              <button onClick={() => setChartView('revenue')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${chartView === 'revenue' ? 'bg-white text-[#1A1A1A] shadow-sm' : 'text-[#6B7280] hover:text-[#1A1A1A]'}`}>Revenue</button>
              <button onClick={() => setChartView('orders')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${chartView === 'orders' ? 'bg-white text-[#1A1A1A] shadow-sm' : 'text-[#6B7280] hover:text-[#1A1A1A]'}`}>Orders</button>
            </div>
          </div>
          {loading ? (
            <div className="animate-pulse h-48 bg-[#F3F5F8] rounded-xl" />
          ) : monthlyData.length === 0 ? (
            <p className="text-[#9CA3AF] text-sm text-center py-12">No data yet</p>
          ) : (
            <div className="flex items-end gap-3 h-48">
              {monthlyData.map((d, i) => {
                const value = chartView === 'revenue' ? d.revenue : d.orders;
                const pct = maxChartValue > 0 ? (value / maxChartValue) * 100 : 0;
                return (
                  <div key={d.month} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                    <span className="text-[10px] font-semibold text-[#8BA4B8]">
                      {chartView === 'revenue' ? `${(value / 1000).toFixed(0)}k` : value}
                    </span>
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${Math.max(pct, 2)}%` }}
                      transition={{ delay: i * 0.05, duration: 0.4 }}
                      className={`w-full rounded-lg ${chartView === 'revenue' ? 'bg-[#8BA4B8]' : 'bg-[#1A1A1A]'} opacity-80 hover:opacity-100 transition-opacity`}
                      title={`${d.month}: ${chartView === 'revenue' ? `EGP ${d.revenue.toLocaleString()}` : `${d.orders} orders`}`}
                    />
                    <span className="text-[9px] text-[#9CA3AF] -rotate-45 origin-left whitespace-nowrap mt-1">{d.month.split(' ')[0]}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top Products */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 shadow-sm">
          <h2 className="text-lg font-[family-name:var(--font-playfair)] text-[#1A1A1A] mb-4">Top Products</h2>
          {loading ? (
            <div className="animate-pulse space-y-3">{[...Array(5)].map((_, i) => (<div key={i} className="h-8 bg-[#F3F5F8] rounded-lg" />))}</div>
          ) : topProducts.length === 0 ? (
            <p className="text-[#9CA3AF] text-sm text-center py-12">No sales data yet</p>
          ) : (
            <div className="space-y-3">
              {topProducts.map((p, i) => {
                const maxCount = Math.max(...topProducts.map(x => x.count), 1);
                const barPct = (p.count / maxCount) * 100;
                return (
                  <div key={p.name}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-[#1A1A1A] font-medium truncate flex-1">
                        <span className="text-[#9CA3AF] font-mono mr-2">#{i + 1}</span>
                        {p.name}
                      </span>
                      <span className="text-[#8BA4B8] font-semibold ml-2">{p.count} sold</span>
                    </div>
                    <div className="w-full h-2 bg-[#F3F5F8] rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${barPct}%` }}
                        transition={{ delay: i * 0.08, duration: 0.5 }}
                        className="h-full bg-[#8BA4B8] rounded-full"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Order Status Distribution */}
      {!loading && orders.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 shadow-sm mb-8">
          <h2 className="text-lg font-[family-name:var(--font-playfair)] text-[#1A1A1A] mb-4">Order Status Distribution</h2>
          <div className="flex flex-wrap gap-4">
            {[
              { label: 'Delivered', value: stats.deliveredOrders, color: 'bg-emerald-500' },
              { label: 'Pending', value: stats.pendingOrders, color: 'bg-amber-500' },
              { label: 'Cancelled', value: stats.cancelledOrders, color: 'bg-rose-500' },
              { label: 'Other', value: stats.totalOrders - stats.deliveredOrders - stats.pendingOrders - stats.cancelledOrders, color: 'bg-[#9CA3AF]' },
            ].filter(s => s.value > 0).map(s => {
              const pct = stats.totalOrders > 0 ? (s.value / stats.totalOrders) * 100 : 0;
              return (
                <div key={s.label} className="flex items-center gap-3 bg-[#F8F9FB] rounded-xl px-4 py-3 flex-1 min-w-[140px]">
                  <div className={`w-3 h-3 rounded-full ${s.color}`} />
                  <div>
                    <p className="text-xs text-[#6B7280]">{s.label}</p>
                    <p className="text-sm font-bold text-[#1A1A1A]">{s.value} ({pct.toFixed(0)}%)</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Order Details Table */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 shadow-sm">
        <h2 className="text-xl font-[family-name:var(--font-playfair)] text-[#1A1A1A] mb-4">Order Details</h2>
        {loading ? (
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (<div key={i} className="h-12 bg-[#F3F5F8] rounded-lg" />))}
          </div>
        ) : orders.length === 0 ? (
          <p className="text-[#9CA3AF] text-center py-8 font-[family-name:var(--font-playfair)]">No orders found</p>
        ) : (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#E5E7EB]">
                    <th className="px-4 py-3 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wider">Order</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wider">Customer</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wider">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wider">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0F0F0]">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-[#F8F9FB] transition-colors cursor-hover">
                      <td className="px-4 py-3 text-[#1A1A1A] text-sm font-medium">#{order.id ? String(order.id).slice(0, 8) : 'N/A'}</td>
                      <td className="px-4 py-3 text-[#6B7280] text-sm">{order.customer_name}</td>
                      <td className="px-4 py-3 text-[#8BA4B8] font-medium text-sm">{order.total} EGP</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusStyle(order.status)}`}>{order.status}</span>
                      </td>
                      <td className="px-4 py-3 text-[#9CA3AF] text-sm">{new Date(order.created_at).toLocaleDateString('en-US')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-6">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-4 py-2 text-sm font-medium rounded-xl bg-[#F3F5F8] text-[#1A1A1A] hover:bg-[#E5E7EB] disabled:opacity-40 transition-all"
                >
                  Previous
                </button>
                <span className="text-sm text-[#6B7280]">Page {page} of {totalPages}</span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-4 py-2 text-sm font-medium rounded-xl bg-[#F3F5F8] text-[#1A1A1A] hover:bg-[#E5E7EB] disabled:opacity-40 transition-all"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}