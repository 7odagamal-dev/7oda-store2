'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'

interface MonthlyData {
  month: string; revenue: number; count: number
}
interface TopProduct {
  name: string; qty: number; revenue: number
}
interface RecentOrder {
  id: string; customer_name: string; total: number; status: string; created_at: string
}
interface StatsResponse {
  totalProducts: number; totalOrders: number; pendingOrders: number
  deliveredOrders: number; cancelledOrders: number; totalRevenue: number
  avgOrderValue: number; conversionRate: number
  monthly: MonthlyData[]
  topProducts: TopProduct[]
  recentOrders: RecentOrder[]
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<StatsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [chartView, setChartView] = useState<'revenue' | 'orders'>('revenue')

  useEffect(() => {
    fetch('/api/admin/stats').then(r => r.json()).then(data => {
      setStats(data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="animate-pulse space-y-6 p-2">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-[#F3F5F8] rounded-2xl" />)}
      </div>
    </div>
  )

  if (!stats) return <div className="p-2 text-[#9CA3AF]">Failed to load stats</div>

  const maxRevenue = Math.max(...stats.monthly.map(m => m.revenue), 1)
  const maxCount = Math.max(...stats.monthly.map(m => m.count), 1)

  const statusColors: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700', confirmed: 'bg-sky-100 text-sky-700',
    preparing: 'bg-violet-100 text-violet-700', shipped: 'bg-orange-100 text-orange-700',
    out_for_delivery: 'bg-indigo-100 text-indigo-700', delivered: 'bg-emerald-100 text-emerald-700',
    cancelled: 'bg-rose-100 text-rose-700',
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="p-2 space-y-6">

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-[#E5E7EB] shadow-sm">
          <p className="text-[#9CA3AF] text-xs uppercase tracking-wider mb-1">Total Products</p>
          <p className="text-3xl font-bold text-[#1A1A1A]">{stats.totalProducts}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-[#E5E7EB] shadow-sm">
          <p className="text-[#9CA3AF] text-xs uppercase tracking-wider mb-1">Total Orders</p>
          <p className="text-3xl font-bold text-[#1A1A1A]">{stats.totalOrders}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-[#E5E7EB] shadow-sm">
          <p className="text-[#9CA3AF] text-xs uppercase tracking-wider mb-1">Pending</p>
          <p className="text-3xl font-bold text-amber-500">{stats.pendingOrders}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-[#E5E7EB] shadow-sm">
          <p className="text-[#9CA3AF] text-xs uppercase tracking-wider mb-1">Revenue</p>
          <p className="text-3xl font-bold text-[#8BA4B8]">{stats.totalRevenue.toLocaleString()} <span className="text-sm font-medium">EGP</span></p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-[#E5E7EB] shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-[family-name:var(--font-playfair)] text-[#1A1A1A]">Monthly Overview</h3>
            <div className="flex gap-1">
              <button onClick={() => setChartView('revenue')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${chartView === 'revenue' ? 'bg-[#8BA4B8] text-white' : 'bg-[#F3F5F8] text-[#6B7280] hover:bg-[#E5E7EB]'}`}>
                Revenue
              </button>
              <button onClick={() => setChartView('orders')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${chartView === 'orders' ? 'bg-[#8BA4B8] text-white' : 'bg-[#F3F5F8] text-[#6B7280] hover:bg-[#E5E7EB]'}`}>
                Orders
              </button>
            </div>
          </div>
          <div className="flex items-end gap-3 h-48">
            {stats.monthly.map((m) => (
              <div key={m.month} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                <span className="text-[10px] text-[#9CA3AF] font-medium">
                  {chartView === 'revenue' ? `${(m.revenue / 1000).toFixed(0)}k` : m.count}
                </span>
                <div
                  className="w-full rounded-lg bg-gradient-to-t from-[#8BA4B8] to-[#8BA4B8]/60 transition-all duration-500 hover:opacity-80 cursor-pointer"
                  style={{ height: `${Math.max((chartView === 'revenue' ? m.revenue / maxRevenue : m.count / maxCount) * 100, 4)}%` }}
                />
                <span className="text-[10px] text-[#6B7280] mt-1">{m.month}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-[#E5E7EB] shadow-sm">
          <h3 className="text-lg font-[family-name:var(--font-playfair)] text-[#1A1A1A] mb-4">Top Products</h3>
          {stats.topProducts.length === 0 ? (
            <p className="text-[#9CA3AF] text-sm">No sales yet</p>
          ) : (
            <div className="space-y-3">
              {stats.topProducts.map((p, i) => (
                <div key={p.name} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-[#8BA4B8]/10 text-[#8BA4B8] text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#1A1A1A] truncate">{p.name}</p>
                    <p className="text-xs text-[#6B7280]">{p.qty} sold · {p.revenue.toLocaleString()} EGP</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-[#E5E7EB] shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-[family-name:var(--font-playfair)] text-[#1A1A1A]">Recent Orders</h3>
            <Link href="/admin/orders" className="text-xs text-[#8BA4B8] hover:underline font-medium">View all</Link>
          </div>
          {stats.recentOrders.length === 0 ? (
            <p className="text-[#9CA3AF] text-sm">No orders yet</p>
          ) : (
            <div className="space-y-2">
              {stats.recentOrders.map(o => (
                <div key={o.id} className="flex items-center justify-between py-2 border-b border-[#F0F0F0] last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#1A1A1A] truncate">{o.customer_name}</p>
                    <p className="text-xs text-[#6B7280]">#{o.id.slice(0, 8)}</p>
                  </div>
                  <div className="text-right flex items-center gap-3">
                    <span className="text-sm font-semibold text-[#8BA4B8]">{o.total.toLocaleString()} EGP</span>
                    <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${statusColors[o.status] || 'bg-gray-100 text-gray-600'}`}>
                      {o.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl p-6 border border-[#E5E7EB] shadow-sm">
          <h3 className="text-lg font-[family-name:var(--font-playfair)] text-[#1A1A1A] mb-4">Quick Stats</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#F8F9FB] rounded-xl p-4">
              <p className="text-[#9CA3AF] text-xs uppercase tracking-wider">Avg Order Value</p>
              <p className="text-xl font-bold text-[#1A1A1A] mt-1">{stats.avgOrderValue.toLocaleString(undefined, { maximumFractionDigits: 0 })} EGP</p>
            </div>
            <div className="bg-[#F8F9FB] rounded-xl p-4">
              <p className="text-[#9CA3AF] text-xs uppercase tracking-wider">Delivered</p>
              <p className="text-xl font-bold text-emerald-600 mt-1">{stats.deliveredOrders}</p>
            </div>
            <div className="bg-[#F8F9FB] rounded-xl p-4">
              <p className="text-[#9CA3AF] text-xs uppercase tracking-wider">Cancelled</p>
              <p className="text-xl font-bold text-rose-500 mt-1">{stats.cancelledOrders}</p>
            </div>
            <div className="bg-[#F8F9FB] rounded-xl p-4">
              <p className="text-[#9CA3AF] text-xs uppercase tracking-wider">Conversion</p>
              <p className="text-xl font-bold text-[#1A1A1A] mt-1">{stats.conversionRate}%</p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
