'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { adminFetch } from '@/lib/admin-fetch';
import { AdminPagination } from '../components/AdminPagination';

interface Product {
  id: string;
  name: string;
  slug: string;
  main_image: string;
}

interface FlashSale {
  id: string;
  product_id: string;
  discount_percentage: number;
  ends_at: string;
  is_active: boolean;
  products: Product | null;
}

const emptyForm = {
  product_id: '',
  discount_percentage: 20,
  ends_at: '',
  is_active: true,
};

export default function FlashSalesPage() {
  const [sales, setSales] = useState<FlashSale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchSales = useCallback(async () => {
    setLoading(true);
    try {
      const [salesRes, productsRes] = await Promise.all([
        adminFetch('/api/admin/flash-sales?page=' + page + '&limit=20'),
        adminFetch('/api/admin/products'),
      ]);
      const salesData = await salesRes.json();
      const productsData = await productsRes.json();
      setSales(salesData.sales ?? []);
      setTotal(salesData.total ?? 0);
      setTotalPages(salesData.totalPages ?? 1);
      setProducts(productsData.data ?? []);
    } catch {
      setSales([]);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchSales(); }, [fetchSales]);

  const handleNew = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
  };

  const handleEdit = (sale: FlashSale) => {
    setForm({
      product_id: sale.product_id,
      discount_percentage: sale.discount_percentage,
      ends_at: new Date(sale.ends_at).toISOString().slice(0, 16),
      is_active: sale.is_active,
    });
    setEditingId(sale.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this flash sale?')) return;
    try {
      const res = await adminFetch('/api/admin/flash-sales', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (res.ok) setSales(prev => prev.filter(s => s.id !== id));
    } catch {}
  };

  const handleToggleActive = async (sale: FlashSale) => {
    try {
      const res = await adminFetch('/api/admin/flash-sales', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: sale.id, is_active: !sale.is_active }),
      });
      if (res.ok) {
        const data = await res.json();
        setSales(prev => prev.map(s => s.id === sale.id ? data.sale : s));
      }
    } catch {}
  };

  const handleSave = async () => {
    if (!form.product_id || !form.ends_at) return;
    setSaving(true);

    try {
      const body = {
        ...form,
        discount_percentage: Number(form.discount_percentage),
        ends_at: new Date(form.ends_at).toISOString(),
      };

      let res;
      if (editingId) {
        res = await adminFetch('/api/admin/flash-sales', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...body, id: editingId }),
        });
      } else {
        res = await adminFetch('/api/admin/flash-sales', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      }

      if (res.ok) {
        await fetchSales();
        setShowForm(false);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to save');
      }
    } catch {
      alert('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const endedSales = sales.filter(s => new Date(s.ends_at) <= new Date());
  const activeSales = sales.filter(s => new Date(s.ends_at) > new Date());

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Flash Sales</h1>
        {[1, 2].map(i => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">Flash Sales</h1>
        <button onClick={handleNew}
          className="px-5 py-2.5 bg-[#1A1A1A] text-white rounded-xl text-sm font-semibold hover:bg-[#333] transition-all"
        >
          New Flash Sale
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white rounded-xl border border-[#E5E7EB] p-6 mb-6 overflow-hidden"
          >
            <h2 className="text-lg font-bold mb-4">{editingId ? 'Edit Flash Sale' : 'New Flash Sale'}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-[#1A1A1A]">Product <span className="text-rose-400">*</span></label>
                <select value={form.product_id} onChange={e => setForm(p => ({ ...p, product_id: e.target.value }))}
                  className="w-full px-4 py-3 bg-[#F8F9FB] border border-[#E5E7EB] rounded-xl text-sm focus:border-[#8BA4B8] focus:outline-none transition-all"
                  disabled={!!editingId}
                >
                  <option value="">Select a product</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-[#1A1A1A]">Discount % <span className="text-rose-400">*</span></label>
                <input type="number" min={1} max={100} value={form.discount_percentage}
                  onChange={e => setForm(p => ({ ...p, discount_percentage: Number(e.target.value) }))}
                  className="w-full px-4 py-3 bg-[#F8F9FB] border border-[#E5E7EB] rounded-xl text-sm focus:border-[#8BA4B8] focus:outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-[#1A1A1A]">Ends At <span className="text-rose-400">*</span></label>
                <input type="datetime-local" value={form.ends_at}
                  onChange={e => setForm(p => ({ ...p, ends_at: e.target.value }))}
                  className="w-full px-4 py-3 bg-[#F8F9FB] border border-[#E5E7EB] rounded-xl text-sm focus:border-[#8BA4B8] focus:outline-none transition-all"
                />
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <button onClick={handleSave} disabled={saving || !form.product_id || !form.ends_at}
                className="px-6 py-3 bg-[#1A1A1A] text-white rounded-xl text-sm font-semibold hover:bg-[#333] transition-all disabled:opacity-50"
              >
                {saving ? 'Saving...' : editingId ? 'Update' : 'Create'}
              </button>
              <button onClick={() => setShowForm(false)}
                className="px-6 py-3 bg-[#F3F5F8] border border-[#E5E7EB] rounded-xl text-sm text-[#6B7280] hover:bg-[#E5E7EB] transition-all"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {activeSales.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-green-600 mb-3">Active Sales ({activeSales.length})</h2>
          <div className="space-y-3">
            {activeSales.map(sale => (
              <SaleCard key={sale.id} sale={sale} onEdit={handleEdit} onDelete={handleDelete} onToggle={handleToggleActive} />
            ))}
          </div>
        </div>
      )}

      <AdminPagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />

      {endedSales.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-[#9CA3AF] mb-3">Ended ({endedSales.length})</h2>
          <div className="space-y-3 opacity-60">
            {endedSales.map(sale => (
              <SaleCard key={sale.id} sale={sale} onEdit={handleEdit} onDelete={handleDelete} onToggle={handleToggleActive} />
            ))}
          </div>
        </div>
      )}

      {sales.length === 0 && !showForm && (
        <div className="text-center py-16">
          <p className="text-[#9CA3AF] text-sm">No flash sales yet. Create your first time-limited deal!</p>
        </div>
      )}
    </div>
  );
}

function SaleCard({ sale, onEdit, onDelete, onToggle }: {
  sale: FlashSale;
  onEdit: (s: FlashSale) => void;
  onDelete: (id: string) => void;
  onToggle: (s: FlashSale) => void;
}) {
  const isEnded = new Date(sale.ends_at) <= new Date();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl border border-[#E5E7EB] p-4 flex flex-wrap items-center justify-between gap-4"
    >
      <div className="flex items-center gap-4 flex-1 min-w-[200px]">
        {sale.products?.main_image ? (
          <div className="w-12 h-12 rounded-lg bg-[#F3F5F8] overflow-hidden shrink-0">
            <div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: `url(${sale.products.main_image})` }} />
          </div>
        ) : null}
        <div>
          <p className="font-semibold text-sm">{sale.products?.name ?? 'Unknown Product'}</p>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-sm font-bold text-rose-500">{sale.discount_percentage}% OFF</span>
            {!isEnded && (
              <span className="text-xs text-[#9CA3AF]">Ends {new Date(sale.ends_at).toLocaleDateString()}</span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {!isEnded && (
          <>
            <button onClick={() => onEdit(sale)}
              className="px-3 py-1.5 text-xs bg-[#F3F5F8] text-[#6B7280] rounded-lg hover:bg-[#E5E7EB] transition-all"
            >
              Edit
            </button>
            <button onClick={() => onToggle(sale)}
              className={`px-3 py-1.5 text-xs rounded-lg transition-all ${sale.is_active ? 'bg-amber-50 text-amber-600 hover:bg-amber-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}
            >
              {sale.is_active ? 'Pause' : 'Activate'}
            </button>
          </>
        )}
        <button onClick={() => onDelete(sale.id)}
          className="px-3 py-1.5 text-xs text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
        >
          Delete
        </button>
      </div>
    </motion.div>
  );
}
