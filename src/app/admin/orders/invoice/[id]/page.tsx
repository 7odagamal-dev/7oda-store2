'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'

interface OrderData {
  id: string
  customer_name: string
  phone: string
  governorate: string
  city: string
  address: string
  notes: string | null
  total: number
  items: Array<{ name?: string; size?: string; quantity?: number; price?: number; image?: string | null }>
  created_at: string
}

export default function InvoicePage() {
  const { id } = useParams()
  const [order, setOrder] = useState<OrderData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/admin/orders`).then(r => r.json()).then((orders: OrderData[]) => {
      const found = orders.find((o: OrderData) => o.id?.startsWith(id as string) || o.id === id)
      setOrder(found || null)
      setLoading(false)
      setTimeout(() => window.print(), 500)
    }).catch(() => setLoading(false))
  }, [id])

  if (loading) return <div className="flex items-center justify-center min-h-screen text-[#6B7280]">Loading invoice...</div>
  if (!order) return <div className="flex items-center justify-center min-h-screen text-rose-500">Order not found</div>

  const totalItems = order.items?.reduce((s, i) => s + (i.quantity || 1), 0) || 0

  return (
    <div className="min-h-screen bg-white p-8 print:p-0 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start border-b-2 border-[#8BA4B8] pb-6 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-[#1A1A1A] font-[family-name:var(--font-playfair)]">OG Old Gold</h1>
          <p className="text-[#6B7280] text-sm">Premium Luxury Fashion</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-[#6B7280] uppercase tracking-wider">Invoice</p>
          <p className="text-lg font-bold text-[#1A1A1A]">#{order.id?.slice(0, 8)}</p>
          <p className="text-xs text-[#6B7280]">{new Date(order.created_at).toLocaleDateString('en-US')}</p>
        </div>
      </div>

      {/* Customer Info */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        <div>
          <p className="text-xs text-[#9CA3AF] uppercase tracking-wider mb-1">Customer</p>
          <p className="font-bold text-[#1A1A1A]">{order.customer_name}</p>
          <p className="text-sm text-[#8BA4B8]">{order.phone}</p>
        </div>
        <div>
          <p className="text-xs text-[#9CA3AF] uppercase tracking-wider mb-1">Shipping Address</p>
          <p className="font-medium text-[#1A1A1A]">{order.governorate} - {order.city}</p>
          <p className="text-sm text-[#6B7280]">{order.address}</p>
        </div>
      </div>

      {order.notes && (
        <div className="bg-amber-50 border-l-4 border-amber-400 p-3 rounded-r-lg mb-6">
          <p className="text-xs font-bold text-amber-700 mb-1">Notes:</p>
          <p className="text-sm text-[#1A1A1A]">{order.notes}</p>
        </div>
      )}

      {/* Items Table */}
      <table className="w-full mb-8">
        <thead>
          <tr className="border-b-2 border-[#E5E7EB]">
            <th className="text-left py-3 text-xs text-[#9CA3AF] uppercase tracking-wider font-semibold">Item</th>
            <th className="text-left py-3 text-xs text-[#9CA3AF] uppercase tracking-wider font-semibold">Size</th>
            <th className="text-center py-3 text-xs text-[#9CA3AF] uppercase tracking-wider font-semibold">Qty</th>
            <th className="text-right py-3 text-xs text-[#9CA3AF] uppercase tracking-wider font-semibold">Price</th>
            <th className="text-right py-3 text-xs text-[#9CA3AF] uppercase tracking-wider font-semibold">Total</th>
          </tr>
        </thead>
        <tbody>
          {order.items?.map((item, idx) => (
            <tr key={idx} className="border-b border-[#F0F0F0]">
              <td className="py-4">
                <div className="flex items-center gap-3">
                  {item.image && (
                    <div className="relative w-12 h-14 bg-[#F3F5F8] rounded overflow-hidden shrink-0">
                      <Image src={item.image} alt={item.name || ''} fill sizes="(max-width: 640px) 48px, 48px" className="object-cover" />
                    </div>
                  )}
                  <span className="font-medium text-[#1A1A1A]">{item.name}</span>
                </div>
              </td>
              <td className="py-4 text-sm text-[#6B7280]">{item.size || 'N/A'}</td>
              <td className="py-4 text-center font-bold text-[#1A1A1A]">{item.quantity || 1}</td>
              <td className="py-4 text-right text-sm text-[#6B7280]">{item.price?.toLocaleString()} EGP</td>
              <td className="py-4 text-right font-bold text-[#1A1A1A]">{(item.price || 0) * (item.quantity || 1)} EGP</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="flex justify-between items-center pt-4 border-t-2 border-[#8BA4B8]">
        <div>
          <p className="text-sm text-[#6B7280]">Total Items</p>
          <p className="text-lg font-bold text-[#1A1A1A]">{totalItems} pieces</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-[#6B7280]">Total Amount</p>
          <p className="text-3xl font-black text-[#8BA4B8]">{order.total?.toLocaleString()} EGP</p>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-12 pt-6 border-t border-[#E5E7EB] text-center text-xs text-[#9CA3AF]">
        <p>OG Old Gold — Premium Luxury Fashion</p>
        <p>Thank you for your order!</p>
      </div>

      <style jsx>{`
        @media print {
          @page { margin: 1.5cm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </div>
  )
}
