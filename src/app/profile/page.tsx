'use client';

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import Image from 'next/image'

interface OrderItem {
  name: string
  size: string
  quantity: number
  price: number
  image: string | null
}

interface UserOrder {
  id: string
  display_id: string
  status: string
  total: number
  payment_method: string
  created_at: string
  items: OrderItem[]
}

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
  confirmed: { label: 'Confirmed', color: 'bg-blue-100 text-blue-800' },
  shipped: { label: 'Shipped', color: 'bg-purple-100 text-purple-800' },
  delivered: { label: 'Delivered', color: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800' },
}

export default function ProfilePage() {
  const router = useRouter()
  const { user, loading, signOut } = useAuth()
  const [orders, setOrders] = useState<UserOrder[]>([])
  const [ordersLoading, setOrdersLoading] = useState(true)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user) {
      fetch('/api/orders/by-user')
        .then(r => r.json())
        .then(data => { setOrders(data.orders || []); setOrdersLoading(false) })
        .catch(() => setOrdersLoading(false))
    }
  }, [user])

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
  }

  if (loading) return null
  if (!user) return null

  return (
    <div className="min-h-screen pt-28 pb-12 px-6 sm:px-8 lg:px-10 bg-[#F8F9FB]">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* User Info Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#E5E7EB] p-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-[family-name:var(--font-playfair)] text-[#1A1A1A]">My Account</h1>
              <p className="text-sm text-[#6B7280] mt-1">{user.email}</p>
              <p className="text-xs text-[#9CA3AF] mt-1">
                Joined {new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
              </p>
            </div>
            <button
              onClick={handleSignOut}
              className="px-5 py-2 rounded-xl border border-[#E5E7EB] text-sm text-[#6B7280] hover:text-red-600 hover:border-red-200 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Order History */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#E5E7EB] p-8">
          <h2 className="text-xl font-[family-name:var(--font-playfair)] text-[#1A1A1A] mb-6">Order History</h2>

          {ordersLoading ? (
            <p className="text-sm text-[#6B7280]">Loading orders...</p>
          ) : orders.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-[#6B7280] mb-4">No orders yet</p>
              <Link
                href="/shop"
                className="inline-block px-6 py-2.5 rounded-xl bg-[#1A1A1A] text-white text-sm tracking-[0.15em] uppercase font-medium hover:bg-[#333] transition-colors"
              >
                Start Shopping
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map(order => (
                <div key={order.id} className="border border-[#E5E7EB] rounded-xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <span className="text-sm font-medium text-[#1A1A1A]">{order.display_id}</span>
                      <span className="text-xs text-[#9CA3AF] ml-3">
                        {new Date(order.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusLabels[order.status]?.color || 'bg-gray-100 text-gray-800'}`}>
                        {statusLabels[order.status]?.label || order.status}
                      </span>
                      <span className="text-sm font-semibold text-[#1A1A1A]">{order.total.toLocaleString()} EGP</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-3 text-sm">
                        {item.image && (
                          <div className="relative w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-[#F3F4F6]">
                            <Image src={item.image} alt={item.name} fill sizes="(max-width: 640px) 40px, 40px" className="object-cover" />
                          </div>
                        )}
                        <span className="text-[#1A1A1A] flex-1">{item.name}{item.size ? ` (${item.size})` : ''}</span>
                        <span className="text-[#6B7280]">x{item.quantity}</span>
                        <span className="text-[#1A1A1A] font-medium">{item.price.toLocaleString()} EGP</span>
                      </div>
                    ))}
                  </div>
                  <Link
                    href={`/track?id=${order.display_id}`}
                    className="inline-block mt-3 text-xs text-[#8BA4B8] hover:text-[#6B8BA0] font-medium transition-colors"
                  >
                    Track Order &rarr;
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
