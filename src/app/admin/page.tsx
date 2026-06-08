'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { adminFetch } from '@/lib/admin-fetch'

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
    adminFetch('/api/admin/stats').then(r => r.json()).then(data => {
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
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="p-[var(--space-sm)] space-y-[var(--space-lg)]">

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-[var(--space-md)]">
        <div className="bg-card rounded-[var(--radius-xl)] p-[var(--space-lg)] border border-border shadow-sm">
          <p className="text-secondary text-[var(--text-xs)] uppercase tracking-wider mb-[var(--space-xs)]">Total Products</p>
          <p className="text-[var(--text-3xl)] font-bold text-foreground">{stats.totalProducts}</p>
        </div>
        <div className="bg-card rounded-[var(--radius-xl)] p-[var(--space-lg)] border border-border shadow-sm">
          <p className="text-secondary text-[var(--text-xs)] uppercase tracking-wider mb-[var(--space-xs)]">Total Orders</p>
          <p className="text-[var(--text-3xl)] font-bold text-foreground">{stats.totalOrders}</p>
        </div>
        <div className="bg-card rounded-[var(--radius-xl)] p-[var(--space-lg)] border border-border shadow-sm">
          <p className="text-secondary text-[var(--text-xs)] uppercase tracking-wider mb-[var(--space-xs)]">Pending</p>
          <p className="text-[var(--text-3xl)] font-bold text-amber-500">{stats.pendingOrders}</p>
        </div>
        <div className="bg-card rounded-[var(--radius-xl)] p-[var(--space-lg)] border border-border shadow-sm">
          <p className="text-secondary text-[var(--text-xs)] uppercase tracking-wider mb-[var(--space-xs)]">Revenue</p>
          <p className="text-[var(--text-3xl)] font-bold text-accent">{stats.totalRevenue.toLocaleString()} <span className="text-[var(--text-sm)] font-medium">EGP</span></p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-[var(--space-lg)]">
        <div className="lg:col-span-2 bg-card rounded-[var(--radius-xl)] p-[var(--space-lg)] border border-border shadow-sm">
          <div className="flex justify-between items-center mb-[var(--space-lg)]">
            <h3 className="text-[var(--text-lg)] font-[family-name:var(--font-playfair)] text-foreground">Monthly Overview</h3>
            <div className="flex gap-1">
              <button onClick={() => setChartView('revenue')}
                className={`px-[var(--space-sm)] py-[var(--space-xs)] text-[var(--text-xs)] font-medium rounded-[var(--radius-md)] transition-all ${chartView === 'revenue' ? 'bg-accent text-white' : 'bg-card-hover text-secondary hover:bg-border'}`}>
                Revenue
              </button>
              <button onClick={() => setChartView('orders')}
                className={`px-[var(--space-sm)] py-[var(--space-xs)] text-[var(--text-xs)] font-medium rounded-[var(--radius-md)] transition-all ${chartView === 'orders' ? 'bg-accent text-white' : 'bg-card-hover text-secondary hover:bg-border'}`}>
                Orders
              </button>
            </div>
          </div>
          <div className="flex items-end gap-[var(--space-sm)] h-48">
            {stats.monthly.map((m) => (
              <div key={m.month} className="flex-1 flex flex-col items-center gap-[var(--space-sm)] h-full justify-end">
                <span className="text-[var(--text-xs)] text-secondary font-medium">
                  {chartView === 'revenue' ? `${(m.revenue / 1000).toFixed(0)}k` : m.count}
                </span>
                <div
                  className="w-full rounded-[var(--radius-md)] bg-gradient-to-t from-accent to-accent/60 transition-all duration-500 hover:opacity-80 cursor-pointer"
                  style={{ height: `${Math.max((chartView === 'revenue' ? m.revenue / maxRevenue : m.count / maxCount) * 100, 4)}%` }}
                />
                <span className="text-[var(--text-xs)] text-secondary mt-[var(--space-xs)]">{m.month}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card rounded-[var(--radius-xl)] p-[var(--space-lg)] border border-border shadow-sm">
          <h3 className="text-[var(--text-lg)] font-[family-name:var(--font-playfair)] text-foreground mb-[var(--space-md)]">Top Products</h3>
          {stats.topProducts.length === 0 ? (
            <p className="text-secondary text-[var(--text-sm)]">No sales yet</p>
          ) : (
            <div className="space-y-[var(--space-sm)]">
              {stats.topProducts.map((p, i) => (
                <div key={p.name} className="flex items-center gap-[var(--space-sm)]">
                  <span className="w-6 h-6 rounded-full bg-accent/10 text-accent text-[var(--text-xs)] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[var(--text-sm)] font-medium text-foreground truncate">{p.name}</p>
                    <p className="text-[var(--text-xs)] text-secondary">{p.qty} sold · {p.revenue.toLocaleString()} EGP</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-[var(--space-lg)]">
        <div className="bg-card rounded-[var(--radius-xl)] p-[var(--space-lg)] border border-border shadow-sm">
          <div className="flex justify-between items-center mb-[var(--space-md)]">
            <h3 className="text-[var(--text-lg)] font-[family-name:var(--font-playfair)] text-foreground">Recent Orders</h3>
            <Link href="/admin/orders" className="text-[var(--text-xs)] text-accent hover:underline font-medium">View all</Link>
          </div>
          {stats.recentOrders.length === 0 ? (
            <p className="text-secondary text-[var(--text-sm)]">No orders yet</p>
          ) : (
            <div className="space-y-[var(--space-sm)]">
              {stats.recentOrders.map(o => (
                <div key={o.id} className="flex items-center justify-between py-[var(--space-sm)] border-b border-border-light last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-[var(--text-sm)] font-medium text-foreground truncate">{o.customer_name}</p>
                    <p className="text-[var(--text-xs)] text-secondary">#{o.id.slice(0, 8)}</p>
                  </div>
                  <div className="text-right flex items-center gap-[var(--space-sm)]">
                    <span className="text-[var(--text-sm)] font-semibold text-accent">{o.total.toLocaleString()} EGP</span>
                    <span className={`px-[var(--space-sm)] py-[var(--space-xs)] text-[var(--text-xs)] font-semibold rounded-full ${statusColors[o.status] || 'bg-gray-100 text-gray-600'}`}>
                      {o.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-card rounded-[var(--radius-xl)] p-[var(--space-lg)] border border-border shadow-sm">
          <h3 className="text-[var(--text-lg)] font-[family-name:var(--font-playfair)] text-foreground mb-[var(--space-md)]">Quick Stats</h3>
          <div className="grid grid-cols-2 gap-[var(--space-md)]">
            <div className="bg-background rounded-[var(--radius-xl)] p-[var(--space-md)]">
              <p className="text-secondary text-[var(--text-xs)] uppercase tracking-wider">Avg Order Value</p>
              <p className="text-[var(--text-xl)] font-bold text-foreground mt-[var(--space-xs)]">{stats.avgOrderValue.toLocaleString(undefined, { maximumFractionDigits: 0 })} EGP</p>
            </div>
            <div className="bg-background rounded-[var(--radius-xl)] p-[var(--space-md)]">
              <p className="text-secondary text-[var(--text-xs)] uppercase tracking-wider">Delivered</p>
              <p className="text-[var(--text-xl)] font-bold text-emerald-600 mt-[var(--space-xs)]">{stats.deliveredOrders}</p>
            </div>
            <div className="bg-background rounded-[var(--radius-xl)] p-[var(--space-md)]">
              <p className="text-secondary text-[var(--text-xs)] uppercase tracking-wider">Cancelled</p>
              <p className="text-[var(--text-xl)] font-bold text-rose-500 mt-[var(--space-xs)]">{stats.cancelledOrders}</p>
            </div>
            <div className="bg-background rounded-[var(--radius-xl)] p-[var(--space-md)]">
              <p className="text-secondary text-[var(--text-xs)] uppercase tracking-wider">Conversion</p>
              <p className="text-[var(--text-xl)] font-bold text-foreground mt-[var(--space-xs)]">{stats.conversionRate}%</p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
