'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Order } from '@/lib/supabase';
import { adminFetch } from '@/lib/admin-fetch';

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
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 20;

  const fetchOrders = async (p = page) => {
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(limit) });
      if (searchTerm) params.set('search', searchTerm);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const res = await adminFetch(`/api/admin/orders?${params}`);
      if (!res.ok) { setOrders([]); return; }
      const response = await res.json();
      setOrders(response.data || []);
      setTotalPages(response.totalPages || 1);
    } catch (error) {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(page); }, [page, searchTerm, statusFilter]);

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    if (!confirm(`Change order status to "${newStatus}"?`)) return;
    try {
      const res = await adminFetch('/api/admin/orders', {
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
      const res = await adminFetch(`/api/admin/orders?id=${orderId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete');
      }
      setOrders(prev => prev.filter(order => order.id !== orderId));
      alert('Order permanently deleted');
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : 'Error deleting order';
      alert(errMsg);
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
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="p-[var(--space-sm)]">
      <div className="flex justify-between items-center mb-[var(--space-xl)]">
        <h1 className="text-[var(--text-3xl)] font-[family-name:var(--font-playfair)] text-foreground">Orders</h1>
        <button onClick={() => window.open('/api/admin/orders/export', '_blank')}
          className="px-[var(--space-lg)] py-[var(--space-sm)] bg-foreground text-background rounded-[var(--radius-xl)] text-[var(--text-sm)] font-semibold hover:bg-[#333] transition-all flex items-center gap-[var(--space-sm)]">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          Export Excel
        </button>
      </div>

            <div className="flex flex-wrap gap-[var(--space-md)] mb-[var(--space-lg)]">
              <input type="text" placeholder="Search orders..."
                value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 min-w-[200px] px-[var(--space-md)] py-[var(--space-sm)] bg-background border border-border rounded-[var(--radius-xl)] text-[var(--text-sm)] focus:border-accent focus:outline-none transition-all" />
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                className="px-[var(--space-md)] py-[var(--space-sm)] bg-background border border-border rounded-[var(--radius-xl)] text-[var(--text-sm)] focus:border-accent focus:outline-none transition-all">
                <option value="">All Statuses</option>
                {deliveryStatuses.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>

      {loading ? (
        <div className="animate-pulse space-y-[var(--space-md)]">
          {[...Array(5)].map((_, i) => (<div key={i} className="h-20 bg-card-hover rounded-[var(--radius-xl)]" />))}
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-[var(--space-2xl)] text-secondary"><p className="font-[family-name:var(--font-playfair)]">No orders found</p></div>
      ) : (
        <div className="space-y-[var(--space-md)]">
          <AnimatePresence>
            {filteredOrders.map((order) => {
              const statusInfo = getStatusInfo(order.status);
              const totalItemsCount = order.items?.reduce((sum, item) => sum + (item.quantity || 1), 0) || 0;
              return (
                <motion.div key={order.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                  className="bg-card rounded-[var(--radius-xl)] border border-border p-[var(--space-lg)] relative group shadow-sm hover:shadow-md transition-all">
                  {order.status === 'cancelled' && (
                    <button onClick={() => deleteOrder(order.id)}
                      className="absolute top-[var(--space-md)] right-[var(--space-md)] p-[var(--space-sm)] bg-rose-50 text-rose-500 border border-rose-200 rounded-[var(--radius-md)] hover:bg-rose-500 hover:text-white transition-all z-10"
                      title="Delete permanently">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                      </svg>
                    </button>
                  )}
                  <div className="flex flex-wrap items-start justify-between gap-[var(--space-md)] mb-[var(--space-md)]">
                    <div>
                      <div className="flex items-center gap-[var(--space-sm)] mb-[var(--space-sm)]">
                        <h3 className="font-bold text-[var(--text-lg)] text-foreground">{order.customer_name}</h3>
                        <span className={`px-[var(--space-sm)] py-[var(--space-xs)] rounded-full text-[var(--text-xs)] font-semibold ${statusInfo.color}`}>{statusInfo.label}</span>
                      </div>
                      <p className="text-secondary text-[var(--text-sm)]">Order: #{order.id.slice(0, 8)}</p>
                      <p className="text-secondary text-[var(--text-sm)]">{order.phone}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[var(--text-xl)] font-bold text-accent">{order.total?.toLocaleString()} EGP</p>
                      <p className="text-[var(--text-sm)] font-medium text-secondary mb-[var(--space-xs)]">({totalItemsCount} items)</p>
                      <p className="text-secondary text-[var(--text-xs)]">{new Date(order.created_at).toLocaleDateString('en-US')}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-[var(--space-sm)] mb-[var(--space-md)] text-[var(--text-sm)]">
                    <span className="text-foreground font-medium">{order.governorate} - {order.city}</span>
                    <span className="text-secondary">|</span>
                    <span className="text-secondary">{order.address}</span>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-[var(--space-md)] pt-[var(--space-md)] border-t border-border-light">
                    <div className="flex flex-wrap gap-[var(--space-sm)]">
                      {deliveryStatuses.map((status) => (
                        <button key={status.value} onClick={() => updateOrderStatus(order.id, status.value)}
                          className={`px-[var(--space-sm)] py-[var(--space-xs)] text-[var(--text-xs)] rounded-full transition-all font-medium ${
                            order.status === status.value
                              ? status.color + ' ring-2 ring-offset-1 ring-accent'
                              : 'bg-card-hover text-secondary hover:bg-border'
                          }`}>
                          {status.label}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                    <button onClick={() => window.open(`/admin/orders/invoice/${order.id}`, '_blank')}
                      className="px-[var(--space-md)] py-[var(--space-sm)] bg-card-hover text-secondary hover:bg-border rounded-[var(--radius-md)] text-[var(--text-sm)] font-semibold transition-all">
                      Print Invoice
                    </button>
                    <button onClick={() => setSelectedOrder(order)}
                      className="px-[var(--space-md)] py-[var(--space-sm)] border border-accent text-accent hover:bg-accent hover:text-white rounded-[var(--radius-md)] text-[var(--text-sm)] font-semibold transition-all">
                      View Details
                    </button>
                  </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-[var(--space-md)] mt-[var(--space-lg)]">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
            className="px-[var(--space-md)] py-[var(--space-sm)] bg-card-hover text-secondary hover:bg-border disabled:opacity-40 rounded-[var(--radius-md)] text-[var(--text-sm)] font-semibold transition-all">
            Previous
          </button>
          <span className="text-[var(--text-sm)] text-secondary font-medium">
            Page {page} of {totalPages}
          </span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
            className="px-[var(--space-md)] py-[var(--space-sm)] bg-card-hover text-secondary hover:bg-border disabled:opacity-40 rounded-[var(--radius-md)] text-[var(--text-sm)] font-semibold transition-all">
            Next
          </button>
        </div>
      )}

      {/* Details Modal */}
      <AnimatePresence>
        {selectedOrder && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedOrder(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-card rounded-[var(--radius-xl)] p-[var(--space-lg)] w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-border shadow-xl"
              onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-start mb-[var(--space-lg)] border-b border-border-light pb-[var(--space-md)]">
                <h2 className="text-[var(--text-2xl)] font-[family-name:var(--font-playfair)] text-accent">Order Details</h2>
                <button onClick={() => setSelectedOrder(null)} className="text-secondary hover:text-foreground transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="space-y-[var(--space-lg)]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-[var(--space-lg)] bg-background p-[var(--space-md)] rounded-[var(--radius-xl)]">
                  <div>
                    <p className="text-secondary text-[var(--text-xs)] mb-[var(--space-xs)] uppercase tracking-wider">Customer & Phone</p>
                    <p className="font-bold text-foreground">{selectedOrder.customer_name}</p>
                    <p className="text-accent">{selectedOrder.phone}</p>
                  </div>
                  <div>
                    <p className="text-secondary text-[var(--text-xs)] mb-[var(--space-xs)] uppercase tracking-wider">Address</p>
                    <p className="font-medium text-foreground">{selectedOrder.governorate} - {selectedOrder.city}</p>
                    <p className="text-[var(--text-sm)] text-secondary">{selectedOrder.address}</p>
                  </div>
                </div>
                {selectedOrder.notes && (
                  <div className="bg-amber-50 border-l-4 border-amber-400 p-[var(--space-sm)] rounded-r-[var(--radius-md)]">
                    <p className="text-amber-700 text-[var(--text-xs)] font-bold mb-[var(--space-xs)]">Notes:</p>
                    <p className="text-foreground text-[var(--text-sm)]">{selectedOrder.notes}</p>
                  </div>
                )}
                <div>
                  <p className="text-secondary text-[var(--text-sm)] mb-[var(--space-md)] font-semibold uppercase tracking-wider">Items</p>
                  <div className="space-y-[var(--space-sm)]">
                    {selectedOrder.items?.map((item, idx) => (
                      <div key={idx} className="flex gap-[var(--space-md)] items-center bg-background p-[var(--space-md)] rounded-[var(--radius-xl)] border border-border">
                        <div className="relative w-16 h-20 flex-shrink-0 bg-card-hover rounded-[var(--radius-md)] overflow-hidden">
                          {item.image && <Image src={item.image} alt={item.name || ''} fill sizes="(max-width: 640px) 64px, 64px" className="object-cover" />}
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-foreground text-[var(--text-lg)] mb-[var(--space-xs)]">{item.name}</p>
                          <div className="flex flex-wrap gap-x-[var(--space-lg)] gap-y-[var(--space-xs)]">
                            <p className="text-[var(--text-sm)] text-secondary">Size: <span className="text-foreground font-bold bg-border px-[var(--space-sm)] py-[var(--space-xs)] rounded">{item.size || 'N/A'}</span></p>
                            <p className="text-[var(--text-sm)] text-secondary">Qty: <span className="text-accent font-extrabold text-[var(--text-lg)]">{item.quantity || 1}</span></p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[var(--text-sm)] font-bold text-accent">{((item.price || 0) * (item.quantity || 1)).toLocaleString()} EGP</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex justify-between items-center pt-[var(--space-lg)] border-t border-border-light">
                  <div>
                    <p className="text-secondary text-[var(--text-sm)]">Total Items</p>
                    <p className="text-[var(--text-xl)] font-bold text-foreground">{selectedOrder.items?.reduce((sum, item) => sum + (item.quantity || 1), 0) || 0} pieces</p>
                  </div>
                  <div className="text-right">
                    <p className="text-secondary text-[var(--text-sm)]">Total Amount</p>
                    <p className="text-[var(--text-3xl)] font-black text-accent">{selectedOrder.total?.toLocaleString()} EGP</p>
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
