'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { safeParseArray } from '@/lib/storage';

const deliveryStatuses = [
  { value: 'pending', label: 'Pending', color: 'bg-amber-100 text-amber-700', icon: '📋' },
  { value: 'confirmed', label: 'Confirmed', color: 'bg-sky-100 text-sky-700', icon: '✅' },
  { value: 'preparing', label: 'Preparing', color: 'bg-violet-100 text-violet-700', icon: '📦' },
  { value: 'shipped', label: 'Shipped', color: 'bg-orange-100 text-orange-700', icon: '🚚' },
  { value: 'out_for_delivery', label: 'Out for Delivery', color: 'bg-indigo-100 text-indigo-700', icon: '🏃' },
  { value: 'delivered', label: 'Delivered', color: 'bg-emerald-100 text-emerald-700', icon: '🎉' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-rose-100 text-rose-700', icon: '❌' },
];

interface TrackingOrderItem {
  name?: string;
  size?: string;
  quantity?: number;
  price?: number;
  product_id?: string;
  image?: string | null;
}

interface TrackingOrder {
  id: string;
  display_id?: string;
  customer_name: string;
  governorate: string;
  city: string;
  status: string;
  delivery_status?: string;
  total: number;
  payment_method: string;
  items: TrackingOrderItem[];
  created_at: string;
}

function getStatusInfo(status: string) {
  return deliveryStatuses.find(s => s.value === status) || { label: status || 'Unknown', color: 'bg-gray-100 text-gray-600', icon: '❓' };
}

function ProductCard({ item, index, displayId, orderStatus }: {
  item: TrackingOrderItem;
  index: number;
  displayId?: string;
  orderStatus: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const statusInfo = getStatusInfo(orderStatus);
  const itemTotal = (item.price || 0) * (item.quantity || 1);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left focus:outline-none"
      >
        <div className="flex items-center gap-4 p-4">
          <div className="relative w-16 h-20 flex-shrink-0 bg-[#F3F5F8] rounded-xl overflow-hidden">
            {item.image ? (
              <Image src={item.image} alt={item.name || 'Product'} fill className="object-cover" sizes="64px" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[#9CA3AF] text-xl">📷</div>
            )}
          </div>
          <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[#9CA3AF] text-xs font-mono">#{displayId || '---'}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusInfo.color}`}>{statusInfo.label}</span>
            </div>
            <p className="font-semibold text-[#1A1A1A] text-sm truncate">{item.name || 'Product'}</p>
            <div className="flex items-center gap-3 mt-1 text-xs text-[#6B7280]">
              <span>Qty: <strong>{item.quantity || 1}</strong></span>
              <span>Size: <strong>{item.size || 'N/A'}</strong></span>
              <span className="text-[#8BA4B8] font-bold">{itemTotal.toLocaleString()} EGP</span>
            </div>
          </div>
          <motion.div
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="text-[#9CA3AF] flex-shrink-0"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
            </svg>
          </motion.div>
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-0 border-t border-[#F0F0F0] mx-4">
              <div className="grid grid-cols-2 gap-3 pt-3 text-sm">
                <div>
                  <p className="text-[#9CA3AF] text-xs uppercase tracking-wider mb-1">Product ID</p>
                  <p className="text-[#1A1A1A] font-mono text-xs break-all">{item.product_id || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-[#9CA3AF] text-xs uppercase tracking-wider mb-1">Unit Price</p>
                  <p className="text-[#1A1A1A] font-medium">EGP {(item.price || 0).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[#9CA3AF] text-xs uppercase tracking-wider mb-1">Quantity</p>
                  <p className="text-[#1A1A1A] font-medium">{item.quantity || 1}</p>
                </div>
                <div>
                  <p className="text-[#9CA3AF] text-xs uppercase tracking-wider mb-1">Subtotal</p>
                  <p className="text-[#8BA4B8] font-bold">{itemTotal.toLocaleString()} EGP</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

interface RecentOrderData extends TrackingOrder {
  loaded: boolean;
}

export default function TrackOrder() {
  const [orderId, setOrderId] = useState('');
  const [order, setOrder] = useState<TrackingOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [recentOrders, setRecentOrders] = useState<RecentOrderData[]>([]);
  const [expandedRecentId, setExpandedRecentId] = useState<string | null>(null);

  useEffect(() => {
    const ids = safeParseArray<string>('og-order-ids');
    const validIds = ids.filter((id): id is string => typeof id === 'string' && id.length > 0);
    const last5 = validIds.slice(-5).reverse();

    // Fetch each recent order in parallel
    Promise.all(
      last5.map(async (id) => {
        try {
          const res = await fetch(`/api/orders/${id}`);
          if (!res.ok) return { id, loaded: false } as RecentOrderData;
          const data = await res.json();
          return { ...data, loaded: true } as RecentOrderData;
        } catch {
          return { id, loaded: false } as RecentOrderData;
        }
      })
    ).then(setRecentOrders);
  }, []);

  const searchOrder = async (idToSearch?: string) => {
    const id = (idToSearch ?? orderId).trim();
    if (!id) return;
    if (idToSearch) setOrderId(idToSearch);
    setLoading(true);
    setError('');
    setOrder(null);

    try {
      const res = await fetch(`/api/orders/${id}`);
      if (!res.ok) {
        if (res.status === 404) setError('Order not found. Please check your Order ID.');
        else if (res.status === 429) setError('Too many requests. Please try again later.');
        else setError('Error fetching order. Please try again.');
        return;
      }
      const data = await res.json();
      setOrder(data);

      // Refresh recent orders list
      const refreshed = await Promise.all(
        recentOrders.map(o => o.id === data.id ? { ...data, loaded: true } as RecentOrderData : o)
      );
      if (!refreshed.some(o => o.id === data.id)) {
        refreshed.unshift({ ...data, loaded: true } as RecentOrderData);
      }
      setRecentOrders(refreshed);
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-20 bg-[#F8F9FB]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-2xl mx-auto px-6"
      >
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-[family-name:var(--font-playfair)] tracking-wide text-[#1A1A1A] mb-3">
            Track Your Order
          </h1>
          <p className="text-[#6B7280] text-sm">Enter your order ID to check delivery status</p>
        </div>

        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-sm mb-8">
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Order ID"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchOrder()}
              className="flex-1 px-4 py-3 bg-[#F8F9FB] border border-[#E5E7EB] rounded-xl text-[#1A1A1A] placeholder-[#9CA3AF] focus:border-[#8BA4B8] focus:outline-none text-sm transition-all"
            />
            <button
              onClick={() => searchOrder()}
              disabled={loading}
              className="px-6 py-3 bg-[#8BA4B8] text-white text-sm font-semibold rounded-xl hover:bg-[#6B8BA0] transition-all disabled:opacity-50 shadow-sm"
            >
              {loading ? '...' : 'Track'}
            </button>
          </div>
        </div>

        {recentOrders.length > 0 && !order && (
          <div className="mb-8">
            <p className="text-[#6B7280] text-xs font-medium uppercase tracking-wider mb-3">Recent Orders</p>
            <div className="space-y-3">
              {recentOrders.map((ro) => {
                const isExpanded = expandedRecentId === ro.id;
                const statusInfo = getStatusInfo(ro.status || '');
                return (
                  <motion.div
                    key={ro.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden shadow-sm"
                  >
                    <button
                      onClick={() => setExpandedRecentId(isExpanded ? null : ro.id)}
                      className="w-full text-left focus:outline-none"
                    >
                      <div className="flex items-center gap-4 p-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg font-bold text-[#1A1A1A] font-mono tracking-tight">
                              #{ro.display_id || ro.id.slice(0, 8)}
                            </span>
                            {ro.loaded && (
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusInfo.color}`}>
                                {statusInfo.label}
                              </span>
                            )}
                            <span
                              onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(ro.id); }}
                              className="ml-auto text-[#9CA3AF] hover:text-[#8BA4B8] transition-colors cursor-pointer"
                              title="Copy Order ID"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.057 1.123-.08M15.75 18H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08M15.75 18.75v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5A3.375 3.375 0 006.375 7.5H5.25m11.9-3.664A2.251 2.251 0 0015 2.25h-1.5a2.25 2.25 0 00-2.15 1.586m5.8 0c.065.21.1.433.1.664v.75h-6V4.5c0-.231.035-.454.1-.664M6.75 7.5H4.875c-.621 0-1.125.504-1.125 1.125v12c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V16.5a9 9 0 00-9-9z" />
                              </svg>
                            </span>
                          </div>
                          {ro.loaded && (
                            <div className="flex items-center gap-3 text-xs text-[#6B7280]">
                              <span>{new Date(ro.created_at).toLocaleDateString('en-GB')}</span>
                              <span className="text-[#8BA4B8] font-bold">EGP {(ro.total || 0).toLocaleString()}</span>
                              <span className="capitalize">{ro.payment_method?.replace(/_/g, ' ') || ''}</span>
                            </div>
                          )}
                          {!ro.loaded && (
                            <p className="text-xs text-[#9CA3AF]">Failed to load order details</p>
                          )}
                        </div>
                        <motion.div
                          animate={{ rotate: isExpanded ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                          className="text-[#9CA3AF] flex-shrink-0"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                          </svg>
                        </motion.div>
                      </div>
                    </button>

                    <AnimatePresence>
                      {isExpanded && ro.loaded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25, ease: 'easeInOut' }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4 pt-0 border-t border-[#F0F0F0] mx-4">
                            <div className="pt-3 space-y-3">
                              {/* Customer & Payment Info */}
                              <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                  <p className="text-[#9CA3AF] text-xs uppercase tracking-wider mb-1">Customer</p>
                                  <p className="text-[#1A1A1A] font-medium">{ro.customer_name || 'N/A'}</p>
                                </div>
                                <div>
                                  <p className="text-[#9CA3AF] text-xs uppercase tracking-wider mb-1">Location</p>
                                  <p className="text-[#1A1A1A]">{ro.governorate}{ro.city ? `, ${ro.city}` : ''}</p>
                                </div>
                                <div>
                                  <p className="text-[#9CA3AF] text-xs uppercase tracking-wider mb-1">Payment</p>
                                  <p className="text-[#1A1A1A] capitalize">{ro.payment_method?.replace(/_/g, ' ') || 'N/A'}</p>
                                </div>
                                <div>
                                  <p className="text-[#9CA3AF] text-xs uppercase tracking-wider mb-1">Order ID</p>
                                  <p className="text-[#1A1A1A] font-mono text-[10px] break-all">{ro.display_id ? ro.id : ''}</p>
                                </div>
                              </div>

                              {/* Status Timeline */}
                              {ro.status && (
                                <div className="bg-[#F8F9FB] rounded-xl p-4">
                                  <div className="relative">
                                    <div className="absolute left-1.5 top-0 bottom-0 w-0.5 bg-[#E5E7EB]" />
                                    <div className="space-y-3">
                                      {deliveryStatuses.slice(0, deliveryStatuses.findIndex(s => s.value === ro.status) + 1).map((s, i) => {
                                        const isCurrent = i === deliveryStatuses.findIndex(x => x.value === ro.status);
                                        return (
                                          <div key={s.value} className="relative flex items-center gap-3 pl-8">
                                            <div className={`absolute left-0 w-3 h-3 rounded-full ${isCurrent ? 'bg-[#8BA4B8] ring-2 ring-[#8BA4B8]/30' : 'bg-[#E5E7EB]'}`} />
                                            <p className={`text-xs ${isCurrent ? 'font-semibold text-[#1A1A1A]' : 'text-[#9CA3AF]'}`}>
                                              {s.label}
                                            </p>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Items */}
                              <div>
                                <p className="text-[#9CA3AF] text-xs uppercase tracking-wider mb-2">
                                  Items ({ro.items?.length || 0})
                                </p>
                                <div className="space-y-2">
                                  {ro.items && ro.items.length > 0 ? (
                                    ro.items.map((item, idx) => (
                                      <ProductCard
                                        key={idx}
                                        item={item}
                                        index={idx}
                                        displayId={ro.display_id}
                                        orderStatus={ro.delivery_status || ro.status}
                                      />
                                    ))
                                  ) : (
                                    <p className="text-xs text-[#9CA3AF]">No items</p>
                                  )}
                                </div>
                              </div>

                              {/* Quick Search Button */}
                              <button
                                onClick={(e) => { e.stopPropagation(); setOrderId(ro.display_id || ro.id); searchOrder(ro.display_id || ro.id); }}
                                className="w-full py-2.5 bg-[#8BA4B8] text-white text-xs font-semibold rounded-xl hover:bg-[#6B8BA0] transition-all"
                              >
                                View Full Details
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                      {isExpanded && !ro.loaded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.15 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4 border-t border-[#F0F0F0] mx-4 pt-3">
                            <button
                              onClick={(e) => { e.stopPropagation(); searchOrder(ro.id); }}
                              className="w-full py-2.5 bg-[#8BA4B8] text-white text-xs font-semibold rounded-xl hover:bg-[#6B8BA0] transition-all"
                            >
                              Try Loading Again
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-center text-rose-600 text-sm mb-6"
          >
            {error}
          </motion.div>
        )}

        {order && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-5"
          >
            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-[#9CA3AF] text-xs uppercase tracking-wider mb-1">Order</p>
              <div className="flex items-center gap-2">
                <p className="text-lg font-bold text-[#1A1A1A] font-mono">#{order.display_id || order.id.slice(0, 8)}</p>
                <button onClick={() => navigator.clipboard.writeText(order.id)}
                  className="text-[#9CA3AF] hover:text-[#8BA4B8] transition-colors" title="Copy Order ID">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.057 1.123-.08M15.75 18H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08M15.75 18.75v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5A3.375 3.375 0 006.375 7.5H5.25m11.9-3.664A2.251 2.251 0 0015 2.25h-1.5a2.25 2.25 0 00-2.15 1.586m5.8 0c.065.21.1.433.1.664v.75h-6V4.5c0-.231.035-.454.1-.664M6.75 7.5H4.875c-.621 0-1.125.504-1.125 1.125v12c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V16.5a9 9 0 00-9-9z" />
                  </svg>
                </button>
              </div>
              <p className="text-[#9CA3AF] text-[10px] font-mono mt-0.5">{order.display_id ? order.id : ''}</p>
            </div>
                <div className="text-right">
                  <p className="text-[#9CA3AF] text-xs uppercase tracking-wider mb-1">Total</p>
                  <p className="text-xl font-bold text-[#8BA4B8]">EGP {(order.total || 0).toLocaleString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 mb-3">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${getStatusInfo(order.status).color}`}>
                  <span>{getStatusInfo(order.status).icon}</span> {getStatusInfo(order.status).label}
                </span>
              </div>
              <div className="space-y-1 text-sm text-[#6B7280]">
                <p><span className="font-medium text-[#1A1A1A]">Customer:</span> {order.customer_name || 'N/A'}</p>
                <p><span className="font-medium text-[#1A1A1A]">Location:</span> {order.governorate || ''}, {order.city || ''}</p>
                <p><span className="font-medium text-[#1A1A1A]">Payment:</span> {order.payment_method?.replace(/_/g, ' ') || 'N/A'}</p>
              </div>
            </div>

            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm">
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-[#E5E7EB]" />
                <div className="space-y-6">
                  {deliveryStatuses.slice(0, deliveryStatuses.findIndex(s => s.value === order.status) + 1).map((s, i) => {
                    const isCurrent = i === deliveryStatuses.findIndex(x => x.value === order.status);
                    return (
                      <div key={s.value} className="relative flex items-center gap-4 pl-10">
                        <div className={`absolute left-2.5 w-3 h-3 rounded-full ${isCurrent ? 'bg-[#8BA4B8] ring-2 ring-[#8BA4B8]/30' : 'bg-[#E5E7EB]'} ${order.status === s.value ? 'animate-pulse' : ''}`} />
                        <div className={isCurrent ? '' : 'opacity-40'}>
                          <p className={`font-medium text-sm ${isCurrent ? 'text-[#1A1A1A]' : 'text-[#9CA3AF]'}`}>
                            {s.icon} {s.label}
                          </p>
                          {isCurrent && <p className="text-xs text-[#8BA4B8] mt-0.5">Current status</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-[#1A1A1A] mb-4 font-[family-name:var(--font-playfair)] text-lg">
                Items ({order.items?.length || 0})
              </h3>
              <div className="space-y-3">
                {order.items && order.items.length > 0 ? (
                  order.items.map((item, idx) => (
                    <ProductCard key={idx} item={item} index={idx} displayId={order.display_id} orderStatus={order.delivery_status || order.status} />
                  ))
                ) : (
                  <p className="text-sm text-[#9CA3AF] text-center py-8">No items found</p>
                )}
              </div>
            </div>

            <button
              onClick={() => { setOrder(null); setOrderId(''); }}
              className="w-full py-3 border-2 border-[#E5E7EB] text-[#6B7280] text-sm font-medium rounded-xl hover:border-[#8BA4B8] hover:text-[#8BA4B8] transition-all"
            >
              Track Another Order
            </button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}