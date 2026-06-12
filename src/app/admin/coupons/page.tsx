'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState, useCallback } from 'react';
import { adminFetch } from '@/lib/admin-fetch';
import { AdminPagination } from '../components/AdminPagination';

interface Coupon {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order: number;
  max_uses: number | null;
  used_count: number;
  is_active: boolean;
  expires_at: string | null;
  coupon_type: string;
  linked_email: string | null;
  created_at: string;
}

const defaultForm = {
  code: '',
  discount_type: 'percentage' as 'percentage' | 'fixed',
  discount_value: 0,
  min_order: 0,
  max_uses: null as number | null,
  expires_at: '' as string,
  coupon_type: 'admin' as string,
  linked_email: '' as string,
};

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);

  const fetchCoupons = useCallback(async () => {
    try {
      const res = await adminFetch('/api/admin/coupons?page=' + page + '&limit=20');
      if (res.ok) {
        const data = await res.json();
        setCoupons(data.data ?? []);
        setTotal(data.total ?? 0);
        setTotalPages(data.totalPages ?? 1);
      }
    } catch {} finally { setLoading(false); }
  }, [page]);

  useEffect(() => { fetchCoupons(); }, [fetchCoupons]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code || !form.discount_value) return;
    setSaving(true);
    try {
      const res = await adminFetch('/api/admin/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Failed to create coupon');
        return;
      }
      setForm(defaultForm);
      setShowForm(false);
      fetchCoupons();
    } catch { alert('Error saving coupon'); }
    finally { setSaving(false); }
  };

  const toggleActive = async (coupon: Coupon) => {
    const res = await adminFetch('/api/admin/coupons', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: coupon.id, is_active: !coupon.is_active }),
    });
    if (res.ok) {
      setCoupons(prev => prev.map(c => c.id === coupon.id ? { ...c, is_active: !c.is_active } : c));
    }
  };

  const deleteCoupon = async (id: string) => {
    if (!confirm('Delete this coupon permanently?')) return;
    const res = await adminFetch('/api/admin/coupons', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    if (res.ok) setCoupons(prev => prev.filter(c => c.id !== id));
  };

  const isExpired = (coupon: Coupon) => coupon.expires_at && new Date(coupon.expires_at) < new Date();
  const isMaxed = (coupon: Coupon) => coupon.max_uses && coupon.used_count >= coupon.max_uses;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-[family-name:var(--font-playfair)] text-[#1A1A1A]">Coupons</h1>
        <button onClick={() => setShowForm(!showForm)}
          className="px-5 py-2.5 bg-[#8BA4B8] text-white rounded-xl font-medium text-sm hover:bg-[#6B8BA0] transition-all">
          {showForm ? 'Cancel' : '+ New Coupon'}
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            onSubmit={handleSubmit} className="bg-white rounded-2xl border border-[#E5E7EB] p-6 mb-6 overflow-hidden shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-[#6B7280] uppercase tracking-wider mb-1.5">Code</label>
                <input type="text" value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  placeholder="SUMMER20" required
                  className="w-full px-4 py-3 bg-[#F8F9FB] border border-[#E5E7EB] rounded-xl text-[#1A1A1A] focus:border-[#8BA4B8] focus:outline-none text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#6B7280] uppercase tracking-wider mb-1.5">Type</label>
                <select value={form.discount_type} onChange={e => setForm({ ...form, discount_type: e.target.value as 'percentage' | 'fixed' })}
                  className="w-full px-4 py-3 bg-[#F8F9FB] border border-[#E5E7EB] rounded-xl text-[#1A1A1A] focus:border-[#8BA4B8] focus:outline-none text-sm">
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed (EGP)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#6B7280] uppercase tracking-wider mb-1.5">Value</label>
                <input type="number" value={form.discount_value || ''} onChange={e => setForm({ ...form, discount_value: Number(e.target.value) })}
                  placeholder="20" required min={1}
                  className="w-full px-4 py-3 bg-[#F8F9FB] border border-[#E5E7EB] rounded-xl text-[#1A1A1A] focus:border-[#8BA4B8] focus:outline-none text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#6B7280] uppercase tracking-wider mb-1.5">Min Order (EGP)</label>
                <input type="number" value={form.min_order || ''} onChange={e => setForm({ ...form, min_order: Number(e.target.value) })}
                  placeholder="0" min={0}
                  className="w-full px-4 py-3 bg-[#F8F9FB] border border-[#E5E7EB] rounded-xl text-[#1A1A1A] focus:border-[#8BA4B8] focus:outline-none text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#6B7280] uppercase tracking-wider mb-1.5">Max Uses</label>
                <input type="number" value={form.max_uses || ''} onChange={e => setForm({ ...form, max_uses: Number(e.target.value) || null })}
                  placeholder="Unlimited"
                  className="w-full px-4 py-3 bg-[#F8F9FB] border border-[#E5E7EB] rounded-xl text-[#1A1A1A] focus:border-[#8BA4B8] focus:outline-none text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#6B7280] uppercase tracking-wider mb-1.5">Expires At</label>
                <input type="date" value={form.expires_at} onChange={e => setForm({ ...form, expires_at: e.target.value })}
                  className="w-full px-4 py-3 bg-[#F8F9FB] border border-[#E5E7EB] rounded-xl text-sm text-[#1A1A1A] focus:border-[#8BA4B8] focus:outline-none transition-all" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#6B7280] uppercase tracking-wider mb-1.5">Coupon Type</label>
                <select value={form.coupon_type} onChange={e => setForm({ ...form, coupon_type: e.target.value, linked_email: e.target.value !== 'targeted' ? '' : form.linked_email })}
                  className="w-full px-4 py-3 bg-[#F8F9FB] border border-[#E5E7EB] rounded-xl text-[#1A1A1A] focus:border-[#8BA4B8] focus:outline-none text-sm">
                  <option value="admin">Admin (no email binding)</option>
                  <option value="public">Public (no email binding)</option>
                  <option value="targeted">Targeted (email bound)</option>
                </select>
              </div>
              {form.coupon_type === 'targeted' && (
                <div>
                  <label className="block text-xs font-medium text-[#6B7280] uppercase tracking-wider mb-1.5">Linked Email</label>
                  <input type="email" value={form.linked_email} onChange={e => setForm({ ...form, linked_email: e.target.value })}
                    placeholder="user@example.com" required
                    className="w-full px-4 py-3 bg-[#F8F9FB] border border-[#E5E7EB] rounded-xl text-sm text-[#1A1A1A] placeholder-[#9CA3AF] focus:border-[#8BA4B8] focus:outline-none transition-all" />
                </div>
              )}
            </div>
            <button type="submit" disabled={saving}
              className="px-6 py-3 bg-[#1A1A1A] text-white rounded-xl font-medium text-sm hover:bg-[#333] transition-all disabled:opacity-50">
              {saving ? 'Creating...' : 'Create Coupon'}
            </button>
          </motion.form>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="animate-pulse space-y-4">{[...Array(3)].map((_, i) => (<div key={i} className="h-20 bg-[#F3F5F8] rounded-xl" />))}</div>
      ) : coupons.length === 0 ? (
        <div className="text-center py-12 text-[#9CA3AF]"><p className="font-[family-name:var(--font-playfair)]">No coupons yet</p></div>
      ) : (
        <div className="space-y-3">
          {coupons.map(coupon => (
            <motion.div key={coupon.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className={`bg-white rounded-xl border p-5 flex items-center justify-between gap-4 shadow-sm hover:shadow-md transition-all ${
                isExpired(coupon) || isMaxed(coupon) || !coupon.is_active ? 'opacity-60' : ''
              }`}>
              <div className="flex items-center gap-4">
                <div className="px-4 py-2 bg-[#F3F5F8] rounded-lg border-2 border-dashed border-[#8BA4B8]">
                  <span className="text-lg font-black tracking-widest text-[#8BA4B8]">{coupon.code}</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-[#1A1A1A]">
                    {coupon.discount_type === 'percentage' ? `${coupon.discount_value}% OFF` : `EGP ${coupon.discount_value} OFF`}
                  </p>
                  <p className="text-xs text-[#6B7280]">
                    Used {coupon.used_count}{coupon.max_uses ? ` / ${coupon.max_uses}` : ''}
                    {coupon.min_order > 0 && ` Â· Min EGP ${coupon.min_order}`}
                    {coupon.expires_at && ` Â· Expires ${new Date(coupon.expires_at).toLocaleDateString()}`}
                    {coupon.coupon_type && ` Â· ${coupon.coupon_type}`}
                    {coupon.linked_email && ` Â· ${coupon.linked_email}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => toggleActive(coupon)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-all ${
                    coupon.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                  {coupon.is_active ? 'Active' : 'Inactive'}
                </button>
                <button onClick={() => deleteCoupon(coupon.id)}
                  className="p-2 bg-rose-50 text-rose-500 border border-rose-200 rounded-lg hover:bg-rose-500 hover:text-white transition-all">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                  </svg>
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
      <AdminPagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
    </motion.div>
  );
}
