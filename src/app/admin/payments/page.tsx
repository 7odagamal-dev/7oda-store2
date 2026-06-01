'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState, useCallback } from 'react';

interface PaymentEvent {
  id: string; paymob_txn_id: string; order_id: string;
  event_type: 'payment.success' | 'payment.failed';
  status: 'received' | 'processing' | 'processed' | 'failed';
  error_message: string | null; correlation_id: string;
  received_at: string; processed_at: string | null; created_at: string | null;
}

interface PaymentError {
  id: string; event_id: string | null; order_id: string | null;
  error_type: string; error_message: string;
  retry_count: number; created_at: string; resolved_at: string | null;
  raw_payload: unknown;
}

interface PaymobOrder {
  id: string; status: string; paymob_txn_id: string;
  total: number; created_at: string;
}

type Tab = 'events' | 'errors' | 'orders';

export default function AdminPayments() {
  const [events, setEvents] = useState<PaymentEvent[]>([]);
  const [errors, setErrors] = useState<PaymentError[]>([]);
  const [paymobOrders, setPaymobOrders] = useState<PaymobOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('errors');
  const [retrying, setRetrying] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/reconciliation');
      if (!res.ok) return;
      const data = await res.json();
      setEvents(data.events || []);
      setErrors(data.errors || []);
      setPaymobOrders(data.paymobOrders || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const retryEvent = async (eventId: string) => {
    setRetrying(eventId);
    try {
      const res = await fetch('/api/admin/reconciliation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'retry_event', eventId }),
      });
      if (!res.ok) { alert('Retry failed'); return; }
      await fetchData();
    } catch { alert('Retry failed'); }
    finally { setRetrying(null); }
  };

  const resolveError = async (errorId: string) => {
    try {
      await fetch('/api/admin/reconciliation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resolve_error', errorId }),
      });
      await fetchData();
    } catch { alert('Failed to resolve'); }
  };

  const retryAllFailed = async () => {
    if (!confirm('Retry ALL failed payment events?')) return;
    try {
      await fetch('/api/admin/reconciliation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'retry_all_failed' }),
      });
      await fetchData();
    } catch { alert('Bulk retry failed'); }
  };

  const unresolvedErrors = errors.filter(e => !e.resolved_at);
  const failedEvents = events.filter(e => e.status === 'failed');

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'errors', label: 'Errors', count: unresolvedErrors.length },
    { key: 'events', label: 'Event Log', count: failedEvents.length },
    { key: 'orders', label: 'Orders' },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="p-2">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-[family-name:var(--font-playfair)] text-[#1A1A1A]">Payment Reconciliation</h1>
          <p className="text-sm text-[#6B7280] mt-1">Event log · DLQ · Manual retry</p>
        </div>
        <div className="flex items-center gap-3">
          {failedEvents.length > 0 && (
            <button onClick={retryAllFailed}
              className="px-4 py-2 bg-amber-50 text-amber-600 border border-amber-200 rounded-xl hover:bg-amber-100 text-sm font-medium transition-all">
              Retry All Failed ({failedEvents.length})
            </button>
          )}
          <button onClick={fetchData}
            className="px-4 py-2 bg-white text-[#6B7280] border border-[#E5E7EB] rounded-xl hover:bg-[#F3F5F8] text-sm font-medium transition-all">
            Refresh
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-4">
          <p className="text-xs text-[#9CA3AF] uppercase tracking-wider">Total Events</p>
          <p className="text-2xl font-bold text-[#1A1A1A] mt-1">{events.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-4">
          <p className="text-xs text-[#9CA3AF] uppercase tracking-wider">Unresolved Errors</p>
          <p className="text-2xl font-bold text-rose-500 mt-1">{unresolvedErrors.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-4">
          <p className="text-xs text-[#9CA3AF] uppercase tracking-wider">Failed Events</p>
          <p className="text-2xl font-bold text-amber-500 mt-1">{failedEvents.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-4">
          <p className="text-xs text-[#9CA3AF] uppercase tracking-wider">Paymob Orders</p>
          <p className="text-2xl font-bold text-emerald-500 mt-1">{paymobOrders.length}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-white rounded-xl border border-[#E5E7EB] p-1 shadow-sm">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.key
                ? 'bg-[#8BA4B8] text-white shadow-sm'
                : 'text-[#6B7280] hover:text-[#1A1A1A]'
            }`}>
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                tab === t.key ? 'bg-white/20 text-white' : 'bg-rose-50 text-rose-500'
              }`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (<div key={i} className="h-16 bg-[#F3F5F8] rounded-xl" />))}
        </div>
      ) : tab === 'errors' ? (
        <ReconciliationTable
          title="Dead Letter Queue (DLQ)"
          description="Failed webhook processing — requires manual review"
          headers={['Type', 'Message', 'Order', 'Date', 'Actions']}
          rows={errors.filter(e => !e.resolved_at).map(err => ({
            key: err.id,
            cells: [
              <span key="type" className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                err.error_type === 'hmac_failure' ? 'bg-red-50 text-red-600' :
                err.error_type === 'stock_decrement_failed' ? 'bg-amber-50 text-amber-600' :
                err.error_type === 'amount_mismatch' ? 'bg-orange-50 text-orange-600' :
                'bg-gray-50 text-gray-600'
              }`}>{err.error_type}</span>,
              <span key="msg" className="text-sm text-[#4B5563] truncate max-w-[300px]">{err.error_message}</span>,
              <span key="order" className="text-xs font-mono text-[#8BA4B8]">{err.order_id?.slice(0,8) || '—'}</span>,
              <span key="date" className="text-xs text-[#9CA3AF]">{new Date(err.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>,
              <div key="actions" className="flex gap-2">
                {err.event_id && (
                  <button onClick={() => retryEvent(err.event_id!)}
                    disabled={retrying === err.event_id}
                    className="px-3 py-1 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-100 text-xs font-medium transition-all disabled:opacity-50">
                    {retrying === err.event_id ? '...' : 'Retry'}
                  </button>
                )}
                <button onClick={() => resolveError(err.id)}
                  className="px-3 py-1 bg-green-50 text-green-600 border border-green-200 rounded-lg hover:bg-green-100 text-xs font-medium transition-all">
                  Resolve
                </button>
              </div>,
            ],
          }))}
        />
      ) : tab === 'events' ? (
        <ReconciliationTable
          title="Payment Event Log (Append-only)"
          description="Every webhook delivery recorded immutably"
          headers={['ID', 'Type', 'Status', 'Order', 'Correlation ID', 'Received', 'Processed']}
          rows={events.map(ev => ({
            key: ev.id,
            cells: [
              <span key="id" className="text-xs font-mono text-[#8BA4B8]">{ev.paymob_txn_id.slice(0,12)}</span>,
              <span key="type" className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                ev.event_type === 'payment.success' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
              }`}>{ev.event_type === 'payment.success' ? 'success' : 'failed'}</span>,
              <span key="status" className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                ev.status === 'processed' ? 'bg-emerald-50 text-emerald-600' :
                ev.status === 'failed' ? 'bg-rose-50 text-rose-600' :
                ev.status === 'processing' ? 'bg-blue-50 text-blue-600' :
                'bg-gray-50 text-gray-600'
              }`}>{ev.status}</span>,
              <span key="order" className="text-xs font-mono text-[#8BA4B8]">{ev.order_id.slice(0,8)}</span>,
              <span key="corr" className="text-xs font-mono text-[#9CA3AF]">{ev.correlation_id.slice(0,8)}</span>,
              <span key="recv" className="text-xs text-[#9CA3AF]">{new Date(ev.received_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>,
              <span key="proc" className="text-xs text-[#9CA3AF]">{ev.processed_at ? new Date(ev.processed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}</span>,
            ],
          }))}
        />
      ) : (
        <ReconciliationTable
          title="Paymob Orders"
          description="Orders with Paymob transaction IDs"
          headers={['Order ID', 'TX ID', 'Status', 'Total', 'Date']}
          rows={paymobOrders.map(o => ({
            key: o.id,
            cells: [
              <span key="id" className="text-xs font-mono text-[#8BA4B8]">{o.id.slice(0,8)}</span>,
              <span key="txn" className="text-xs font-mono text-[#6B7280]">{o.paymob_txn_id.slice(0,16)}</span>,
              <span key="status" className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                o.status === 'confirmed' ? 'bg-emerald-50 text-emerald-600' :
                o.status === 'cancelled' ? 'bg-rose-50 text-rose-600' :
                o.status === 'pending' ? 'bg-amber-50 text-amber-600' :
                'bg-gray-50 text-gray-600'
              }`}>{o.status}</span>,
              <span key="total" className="text-sm font-medium">{o.total.toFixed(2)} EGP</span>,
              <span key="date" className="text-xs text-[#9CA3AF]">{new Date(o.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>,
            ],
          }))}
        />
      )}
    </motion.div>
  );
}

function ReconciliationTable({ title, description, headers, rows }: {
  title: string; description: string;
  headers: string[]; rows: { key: string; cells: React.ReactNode[] }[];
}) {
  if (rows.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-[#E5E7EB] p-8 text-center">
        <p className="font-[family-name:var(--font-playfair)] text-[#9CA3AF]">No items to show</p>
        <p className="text-xs text-[#9CA3AF] mt-1">System is healthy — no issues detected</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-[#E5E7EB]">
        <h2 className="text-sm font-bold text-[#1A1A1A]">{title}</h2>
        <p className="text-xs text-[#9CA3AF]">{description}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
              {headers.map(h => (
                <th key={h} className="px-5 py-3 text-xs font-semibold text-[#6B7280] uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {rows.map(row => (
                <motion.tr key={row.key} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="border-b border-[#E5E7EB] hover:bg-[#F9FAFB] transition-colors">
                  {row.cells.map((cell, i) => (
                    <td key={i} className="px-5 py-3">{cell}</td>
                  ))}
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
    </div>
  );
}
