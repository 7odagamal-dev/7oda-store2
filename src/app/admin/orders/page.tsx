'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Order } from '@/lib/supabase';

const deliveryStatuses = [
  { value: 'pending', label: 'New', color: 'bg-amber-100 text-amber-700' },
  { value: 'confirmed', label: 'Confirmed', color: 'bg-sky-100 text-sky-700' },
  { value: 'preparing', label: 'Preparing', color: 'bg-violet-100 text-violet-700' },
  { value: 'shipped', label: 'Shipped', color: 'bg-orange-100 text-orange-700' },
  { value: 'out_for_delivery', label: 'Out for Delivery', color: 'bg-indigo-100 text-indigo-700' },
  { value: 'delivered', label: 'Delivered', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-rose-100 text-rose-700' },
];

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/admin/orders');
      if (!res.ok) { setOrders([]); return; }
      const data = await res.json();
      setOrders(data || []);
    } catch (error) {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, []);

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    if (!confirm(`Change order status to "${newStatus}"?`)) return;
    try {
      const res = await fetch('/api/admin/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: orderId, status: newStatus, delivery_status: newStatus === 'delivered' ? 'delivered' : newStatus }),
      });
      if (!res.ok) throw new Error('Failed');
      setOrders(prev => prev.map(order =>
        order.id === orderId ? { ...order, status: newStatus, delivery_status: newStatus === 'delivered' ? 'delivered' : newStatus } : order
      ));
    } catch (error) {
      alert('Failed to update status');
    }
  };

  const deleteOrder = async (orderId: string) => {
    if (!confirm('⚠️ Permanently delete this order? This cannot be undone.')) return;
    try {
      const res = await fetch(`/api/admin/orders?id=${orderId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete');
      }
      setOrders(prev => prev.filter(order => order.id !== orderId));
      alert('Order permanently deleted');
    } catch (error: any) {
      alert(error.message || 'Error deleting order');
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch =
      order.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.phone?.includes(searchTerm) ||
      order.id?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusInfo = (status: string) => {
    return deliveryStatuses.find(s => s.value === status) || { label: status, color: 'bg-gray-100 text-gray-600' };
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="p-2">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-[family-name:var(--font-playfair)] text-[#1A1A1A]">Orders</h1>
      </div>

      <div className="flex gap-4 mb-6">
        <input type="text" placeholder="Search by name, phone, or order ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-4 py-3 bg-white border border-[#E5E7EB] rounded-xl text-[#1A1A1A] placeholder-[#9CA3AF] focus:border-[#8BA4B8] focus:outline-none text-sm transition-all" />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-3 bg-white border border-[#E5E7EB] rounded-xl text-[#1A1A1A] focus:border-[#8BA4B8] focus:outline-none text-sm transition-all">
          <option value="all">All Status</option>
          {deliveryStatuses.map(status => (
            <option key={status.value} value={status.value}>{status.label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (<div key={i} className="h-20 bg-[#F3F5F8] rounded-xl" />))}
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-12 text-[#9CA3AF]"><p className="font-[family-name:var(--font-playfair)]">No orders found</p></div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {filteredOrders.map((order) => {
              const statusInfo = getStatusInfo(order.status);
              const totalItemsCount = order.items?.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0) || 0;
              return (
                <motion.div key={order.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                  className="bg-white rounded-xl border border-[#E5E7EB] p-6 relative group shadow-sm hover:shadow-md transition-all">
                  {order.status === 'cancelled' && (
                    <button onClick={() => deleteOrder(order.id)}
                      className="absolute top-4 right-4 p-2 bg-rose-50 text-rose-500 border border-rose-200 rounded-lg hover:bg-rose-500 hover:text-white transition-all z-10"
                      title="Delete permanently">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                      </svg>
                    </button>
                  )}
                  <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-bold text-lg text-[#1A1A1A]">{order.customer_name}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusInfo.color}`}>{statusInfo.label}</span>
                      </div>
                      <p className="text-[#6B7280] text-sm">Order: #{order.id.slice(0, 8)}</p>
                      <p className="text-[#6B7280] text-sm">{order.phone}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-[#8BA4B8]">{order.total?.toLocaleString()} EGP</p>
                      <p className="text-sm font-medium text-[#6B7280] mb-1">({totalItemsCount} items)</p>
                      <p className="text-[#9CA3AF] text-xs">{new Date(order.created_at).toLocaleDateString('en-US')}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-4 text-sm">
                    <span className="text-[#1A1A1A] font-medium">{order.governorate} - {order.city}</span>
                    <span className="text-[#D1D5DB]">|</span>
                    <span className="text-[#6B7280]">{order.address}</span>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-[#F0F0F0]">
                    <div className="flex flex-wrap gap-2">
                      {deliveryStatuses.map((status) => (
                        <button key={status.value} onClick={() => updateOrderStatus(order.id, status.value)}
                          className={`px-3 py-1 text-xs rounded-full transition-all font-medium ${
                            order.status === status.value
                              ? status.color + ' ring-2 ring-offset-1 ring-[#8BA4B8]'
                              : 'bg-[#F3F5F8] text-[#6B7280] hover:bg-[#E5E7EB]'
                          }`}>
                          {status.label}
                        </button>
                      ))}
                    </div>
                    <button onClick={() => setSelectedOrder(order)}
                      className="px-4 py-2 border border-[#8BA4B8] text-[#8BA4B8] hover:bg-[#8BA4B8] hover:text-white rounded-lg text-sm font-semibold transition-all">
                      View Details
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Details Modal */}
      <AnimatePresence>
        {selectedOrder && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedOrder(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-[#E5E7EB] shadow-xl"
              onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-start mb-6 border-b border-[#F0F0F0] pb-4">
                <h2 className="text-2xl font-[family-name:var(--font-playfair)] text-[#8BA4B8]">Order Details</h2>
                <button onClick={() => setSelectedOrder(null)} className="text-[#9CA3AF] hover:text-[#1A1A1A] transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[#F8F9FB] p-4 rounded-xl">
                  <div>
                    <p className="text-[#9CA3AF] text-xs mb-1 uppercase tracking-wider">Customer & Phone</p>
                    <p className="font-bold text-[#1A1A1A]">{selectedOrder.customer_name}</p>
                    <p className="text-[#8BA4B8]">{selectedOrder.phone}</p>
                  </div>
                  <div>
                    <p className="text-[#9CA3AF] text-xs mb-1 uppercase tracking-wider">Address</p>
                    <p className="font-medium text-[#1A1A1A]">{selectedOrder.governorate} - {selectedOrder.city}</p>
                    <p className="text-sm text-[#6B7280]">{selectedOrder.address}</p>
                  </div>
                </div>
                {selectedOrder.notes && (
                  <div className="bg-amber-50 border-l-4 border-amber-400 p-3 rounded-r-lg">
                    <p className="text-amber-700 text-xs font-bold mb-1">Notes:</p>
                    <p className="text-[#1A1A1A] text-sm">{selectedOrder.notes}</p>
                  </div>
                )}
                <div>
                  <p className="text-[#6B7280] text-sm mb-4 font-semibold uppercase tracking-wider">Items</p>
                  <div className="space-y-3">
                    {selectedOrder.items?.map((item: any, idx: number) => (
                      <div key={idx} className="flex gap-4 items-center bg-[#F8F9FB] p-4 rounded-xl border border-[#E5E7EB]">
                        <div className="relative w-16 h-20 flex-shrink-0 bg-[#F3F5F8] rounded-lg overflow-hidden">
                          {item.image && <Image src={item.image} alt={item.name} fill className="object-cover" />}
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-[#1A1A1A] text-lg mb-1">{item.name}</p>
                          <div className="flex flex-wrap gap-x-6 gap-y-1">
                            <p className="text-sm text-[#6B7280]">Size: <span className="text-[#1A1A1A] font-bold bg-[#E5E7EB] px-2 py-0.5 rounded">{item.size || 'N/A'}</span></p>
                            <p className="text-sm text-[#6B7280]">Qty: <span className="text-[#8BA4B8] font-extrabold text-lg">{item.quantity || 1}</span></p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-[#8BA4B8]">{(item.price * (item.quantity || 1)).toLocaleString()} EGP</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex justify-between items-center pt-6 border-t border-[#F0F0F0]">
                  <div>
                    <p className="text-[#9CA3AF] text-sm">Total Items</p>
                    <p className="text-xl font-bold text-[#1A1A1A]">{selectedOrder.items?.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0) || 0} pieces</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[#9CA3AF] text-sm">Total Amount</p>
                    <p className="text-3xl font-black text-[#8BA4B8]">{selectedOrder.total?.toLocaleString()} EGP</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
