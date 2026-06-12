'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { adminFetch } from '@/lib/admin-fetch';
import { AdminPagination } from '../components/AdminPagination';

interface Subscriber {
  id: string;
  email: string;
  name: string | null;
  discount_code: string | null;
  discount_used: boolean;
  is_active: boolean;
  subscribed_at: string;
}

export default function NewsletterPage() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const fetchSubscribers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminFetch('/api/admin/newsletter?page=' + page + '&limit=20');
      const data = await res.json();
      setSubscribers(data.subscribers ?? []);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 1);
    } catch {
      setSubscribers([]);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchSubscribers(); }, [fetchSubscribers]);

  const handleDelete = async (id: string) => {
    try {
      const res = await adminFetch('/api/admin/newsletter', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setSubscribers(prev => prev.filter(s => s.id !== id));
      }
    } catch {}
    setConfirmId(null);
  };

  const exportCSV = () => {
    const headers = ['Email', 'Name', 'Discount Code', 'Discount Used', 'Subscribed At'];
    const rows = filtered.map(s => [
      s.email,
      s.name ?? '',
      s.discount_code ?? '',
      s.discount_used ? 'Yes' : 'No',
      new Date(s.subscribed_at).toLocaleDateString(),
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `newsletter-subscribers-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = subscribers.filter(s =>
    s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.name?.toLowerCase() ?? '').includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Newsletter Subscribers</h1>
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Newsletter</h1>
          <p className="text-sm text-[#6B7280] mt-1">{total} subscriber{total !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={exportCSV}
            disabled={subscribers.length === 0}
            className="px-4 py-2 bg-white border border-[#E5E7EB] rounded-xl text-sm text-[#1A1A1A] hover:border-[#8BA4B8] transition-all disabled:opacity-50"
          >
            Export CSV
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 mb-6">
        <input
          type="text"
          placeholder="Search by email or name..."
          value={searchTerm}
          onChange={e => { setSearchTerm(e.target.value); setPage(1); }}
          className="flex-1 min-w-[200px] px-4 py-2.5 bg-[#F8F9FB] border border-[#E5E7EB] rounded-xl text-sm focus:border-[#8BA4B8] focus:outline-none transition-all"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-[#9CA3AF] text-sm">
            {searchTerm ? 'No subscribers match your search.' : 'No subscribers yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(sub => (
            <motion.div
              key={sub.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl border border-[#E5E7EB] p-4 flex flex-wrap items-center justify-between gap-4"
            >
              <div className="flex-1 min-w-[200px]">
                <p className="font-medium text-sm">{sub.email}</p>
                {sub.name && <p className="text-xs text-[#9CA3AF] mt-0.5">{sub.name}</p>}
              </div>
              <div className="flex items-center gap-4 text-xs text-[#6B7280]">
                {sub.discount_code && (
                  <span className="font-mono bg-[#F3F5F8] px-2 py-1 rounded-lg">{sub.discount_code}</span>
                )}
                <span>{new Date(sub.subscribed_at).toLocaleDateString()}</span>
                {sub.discount_used && <span className="text-rose-500 font-medium">Used</span>}
              </div>
              <div className="flex gap-2">
                {confirmId === sub.id ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDelete(sub.id)}
                      className="px-3 py-1.5 text-xs bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-all"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => setConfirmId(null)}
                      className="px-3 py-1.5 text-xs bg-[#F3F5F8] text-[#6B7280] rounded-lg hover:bg-[#E5E7EB] transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmId(sub.id)}
                    className="px-3 py-1.5 text-xs text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                  >
                    Delete
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
      <AdminPagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
    </div>
  );
}
