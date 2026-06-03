'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  main_image: string;
}

interface Bundle {
  id: string;
  name: string;
  description: string | null;
  products: string[];
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  image: string | null;
  is_active: boolean;
  created_at: string;
}

const emptyForm = {
  name: '',
  description: '',
  product_ids: [] as string[],
  discount_type: 'percentage' as 'percentage' | 'fixed',
  discount_value: 15,
  image: '',
  is_active: true,
};

export default function BundlesPage() {
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchBundles = useCallback(async () => {
    setLoading(true);
    try {
      const [bundlesRes, productsRes] = await Promise.all([
        fetch('/api/admin/bundles'),
        fetch('/api/admin/products'),
      ]);
      const bundlesData = await bundlesRes.json();
      const productsData = await productsRes.json();
      setBundles(bundlesData.bundles ?? []);
      setProducts(productsData.data ?? []);
    } catch {
      setBundles([]);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBundles(); }, [fetchBundles]);

  const handleNew = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
  };

  const handleEdit = (bundle: Bundle) => {
    setForm({
      name: bundle.name,
      description: bundle.description ?? '',
      product_ids: bundle.products,
      discount_type: bundle.discount_type,
      discount_value: bundle.discount_value,
      image: bundle.image ?? '',
      is_active: bundle.is_active,
    });
    setEditingId(bundle.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this bundle?')) return;
    try {
      const res = await fetch('/api/admin/bundles', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (res.ok) setBundles(prev => prev.filter(b => b.id !== id));
    } catch {}
  };

  const handleToggleActive = async (bundle: Bundle) => {
    try {
      const res = await fetch('/api/admin/bundles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: bundle.id, is_active: !bundle.is_active }),
      });
      if (res.ok) {
        const data = await res.json();
        setBundles(prev => prev.map(b => b.id === bundle.id ? data.bundle : b));
      }
    } catch {}
  };

  const handleSave = async () => {
    if (!form.name.trim() || form.product_ids.length < 2) return;
    setSaving(true);

    try {
      const body = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        products: form.product_ids,
        discount_type: form.discount_type,
        discount_value: Number(form.discount_value),
        image: form.image.trim() || null,
        is_active: form.is_active,
      };

      let res;
      if (editingId) {
        res = await fetch('/api/admin/bundles', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...body, id: editingId }),
        });
      } else {
        res = await fetch('/api/admin/bundles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      }

      if (res.ok) {
        await fetchBundles();
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

  const toggleProduct = (id: string) => {
    setForm(prev => ({
      ...prev,
      product_ids: prev.product_ids.includes(id)
        ? prev.product_ids.filter(pid => pid !== id)
        : [...prev.product_ids, id],
    }));
  };

  const formatDiscount = (b: Bundle) => {
    return b.discount_type === 'percentage' ? `${b.discount_value}% OFF` : `EGP ${b.discount_value} OFF`;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Bundles</h1>
        {[1, 2].map(i => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">Bundle Deals</h1>
        <button onClick={handleNew}
          className="px-5 py-2.5 bg-[#1A1A1A] text-white rounded-xl text-sm font-semibold hover:bg-[#333] transition-all"
        >
          New Bundle
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
            <h2 className="text-lg font-bold mb-4">{editingId ? 'Edit Bundle' : 'New Bundle'}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-[#1A1A1A]">Bundle Name <span className="text-rose-400">*</span></label>
                <input type="text" value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Summer Essentials Set"
                  className="w-full px-4 py-3 bg-[#F8F9FB] border border-[#E5E7EB] rounded-xl text-sm focus:border-[#8BA4B8] focus:outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-[#1A1A1A]">Description</label>
                <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2}
                  placeholder="e.g. Complete your look with this matching set"
                  className="w-full px-4 py-3 bg-[#F8F9FB] border border-[#E5E7EB] rounded-xl text-sm focus:border-[#8BA4B8] focus:outline-none transition-all resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-[#1A1A1A]">Discount Type</label>
                  <select value={form.discount_type} onChange={e => setForm(p => ({ ...p, discount_type: e.target.value as 'percentage' | 'fixed' }))}
                    className="w-full px-4 py-3 bg-[#F8F9FB] border border-[#E5E7EB] rounded-xl text-sm focus:border-[#8BA4B8] focus:outline-none transition-all"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed (EGP)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-[#1A1A1A]">Discount Value <span className="text-rose-400">*</span></label>
                  <input type="number" min={1} value={form.discount_value}
                    onChange={e => setForm(p => ({ ...p, discount_value: Number(e.target.value) }))}
                    className="w-full px-4 py-3 bg-[#F8F9FB] border border-[#E5E7EB] rounded-xl text-sm focus:border-[#8BA4B8] focus:outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-[#1A1A1A]">Image URL</label>
                  <input type="text" value={form.image}
                    onChange={e => setForm(p => ({ ...p, image: e.target.value }))}
                    placeholder="https://..."
                    className="w-full px-4 py-3 bg-[#F8F9FB] border border-[#E5E7EB] rounded-xl text-sm focus:border-[#8BA4B8] focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-[#1A1A1A]">Products in Bundle <span className="text-rose-400">*</span> (select at least 2)</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2 bg-[#F8F9FB] rounded-xl border border-[#E5E7EB]">
                  {products.map(p => (
                    <label key={p.id} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${form.product_ids.includes(p.id) ? 'bg-[#8BA4B8]/10 border border-[#8BA4B8]' : 'bg-white border border-[#E5E7EB] hover:border-[#8BA4B8]'}`}>
                      <input type="checkbox" checked={form.product_ids.includes(p.id)} onChange={() => toggleProduct(p.id)} className="sr-only" />
                      <div className="w-8 h-8 rounded bg-[#F3F5F8] overflow-hidden shrink-0">
                        {p.main_image && <div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: `url(${p.main_image})` }} />}
                      </div>
                      <span className="text-xs font-medium">{p.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={handleSave} disabled={saving || !form.name.trim() || form.product_ids.length < 2}
                  className="px-6 py-3 bg-[#1A1A1A] text-white rounded-xl text-sm font-semibold hover:bg-[#333] transition-all disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingId ? 'Update Bundle' : 'Create Bundle'}
                </button>
                <button onClick={() => setShowForm(false)}
                  className="px-6 py-3 bg-[#F3F5F8] border border-[#E5E7EB] rounded-xl text-sm text-[#6B7280] hover:bg-[#E5E7EB] transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {bundles.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-[#9CA3AF] text-sm">No bundles yet. Create your first bundle deal!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bundles.map(bundle => (
            <motion.div
              key={bundle.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl border border-[#E5E7EB] p-4 flex flex-wrap items-center justify-between gap-4"
            >
              <div className="flex-1 min-w-[200px]">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-sm">{bundle.name}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${bundle.is_active ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-400'}`}>
                    {bundle.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-sm font-bold text-rose-500">{formatDiscount(bundle)}</span>
                  <span className="text-xs text-[#9CA3AF]">{bundle.products.length} products</span>
                </div>
                {bundle.description && (
                  <p className="text-xs text-[#6B7280] mt-0.5">{bundle.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleToggleActive(bundle)}
                  className={`px-3 py-1.5 text-xs rounded-lg transition-all ${bundle.is_active ? 'bg-amber-50 text-amber-600 hover:bg-amber-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}
                >
                  {bundle.is_active ? 'Pause' : 'Activate'}
                </button>
                <button onClick={() => handleEdit(bundle)}
                  className="px-3 py-1.5 text-xs bg-[#F3F5F8] text-[#6B7280] rounded-lg hover:bg-[#E5E7EB] transition-all"
                >
                  Edit
                </button>
                <button onClick={() => handleDelete(bundle.id)}
                  className="px-3 py-1.5 text-xs text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
