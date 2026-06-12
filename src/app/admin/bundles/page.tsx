'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { adminFetch } from '@/lib/admin-fetch';
import { AdminPagination } from '../components/AdminPagination';

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  main_image: string;
}

interface ImageData {
  images?: string[];
  adjustments?: Array<{ scale: number; rotate: number; panX: number; panY: number }>;
}

interface Bundle {
  id: string;
  name: string;
  description: string | null;
  products: string[];
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  image: string | null;
  image_source: string;
  image_layout: string;
  image_data: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
}

function getImages(imageData: Record<string, unknown> | undefined | null): string[] {
  if (!imageData) return [];
  const data = imageData as ImageData;
  return data.images || [];
}

function getAdjustments(imageData: Record<string, unknown> | undefined | null): Array<{ scale: number; rotate: number; panX: number; panY: number }> {
  if (!imageData) return [];
  const data = imageData as ImageData;
  return data.adjustments || [];
}

const emptyForm = {
  name: '',
  description: '',
  product_ids: [] as string[],
  discount_type: 'percentage' as 'percentage' | 'fixed',
  discount_value: 15,
  image: '',
  image_source: 'custom' as 'custom' | 'products',
  image_layout: 'side-by-side',
  image_data: {} as Record<string, unknown>,
  is_active: true,
};

const LAYOUTS = [
  { id: 'side-by-side', label: 'Side by Side', min: 2, max: 2, icon: '▐ ▌' },
  { id: 'stacked', label: 'Stacked', min: 2, max: 2, icon: '▔ ▁' },
  { id: 'diagonal', label: 'Diagonal', min: 2, max: 2, icon: '◧ ◔' },
  { id: 'split-diagonal', label: 'Split', min: 2, max: 2, icon: '◤ ◢' },
  { id: 'overlap', label: 'Overlap', min: 2, max: 2, icon: '◈' },
  { id: 'border', label: 'Bordered', min: 2, max: 2, icon: '▐┃▌' },
  { id: 'row-3', label: 'Row of 3', min: 3, max: 3, icon: '▐ ▌ ▐' },
  { id: 'grid-top-2', label: '2 Top + 1', min: 3, max: 3, icon: '▐ ▌\n ▐' },
  { id: 'grid-bottom-2', label: '1 + 2 Bottom', min: 3, max: 3, icon: '▐\n▐ ▌' },
  { id: 'grid-2x2', label: 'Grid 2×2', min: 4, max: 4, icon: '▐ ▌\n▐ ▌' },
  { id: 'row-4', label: 'Row of 4', min: 4, max: 4, icon: '▐ ▌▐ ▌' },
  { id: 'grid-3-1', label: '3 + 1 Side', min: 4, max: 4, icon: '▐ ▌▐\n  ▐' },
];

export default function BundlesPage() {
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [adjustments, setAdjustments] = useState<Array<{ scale: number; rotate: number; panX: number; panY: number }>>([]);

  const defaultAdj = () => ({ scale: 1, rotate: 0, panX: 0, panY: 0 });
  const imageInputRef = useRef<HTMLInputElement>(null);
  const multiInputRef = useRef<HTMLInputElement>(null);

  const availableImages: string[] = form.image_source === 'products'
    ? products.filter(p => form.product_ids.includes(p.id)).map(p => p.main_image).filter(Boolean) as string[]
    : getImages(form.image_data);

  const fetchBundles = useCallback(async () => {
    setLoading(true);
    try {
      const [bundlesRes, productsRes] = await Promise.all([
        adminFetch('/api/admin/bundles?page=' + page + '&limit=20'),
        adminFetch('/api/admin/products'),
      ]);
      const bundlesData = await bundlesRes.json();
      const productsData = await productsRes.json();
      setBundles(bundlesData.bundles ?? []);
      setTotal(bundlesData.total ?? 0);
      setTotalPages(bundlesData.totalPages ?? 1);
      setProducts(productsData.data ?? []);
    } catch {
      setBundles([]);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchBundles(); }, [fetchBundles]);

  const handleNew = () => {
    setForm(emptyForm);
    setAdjustments([]);
    setEditingId(null);
    setShowForm(true);
  };

  const handleEdit = (bundle: Bundle) => {
    const imgData = (bundle.image_data || {}) as Record<string, unknown>;
    setForm({
      name: bundle.name,
      description: bundle.description ?? '',
      product_ids: bundle.products,
      discount_type: bundle.discount_type,
      discount_value: bundle.discount_value,
      image: bundle.image ?? '',
      image_source: (bundle.image_source as 'custom' | 'products') || 'custom',
      image_layout: bundle.image_layout || 'side-by-side',
      image_data: imgData,
      is_active: bundle.is_active,
    });
    setAdjustments(getAdjustments(imgData));
    setEditingId(bundle.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this bundle?')) return;
    try {
      const res = await adminFetch('/api/admin/bundles', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setBundles(prev => prev.filter(b => b.id !== id));
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete');
      }
    } catch {
      alert('Failed to delete');
    }
  };

  const handleToggleActive = async (bundle: Bundle) => {
    try {
      const res = await adminFetch('/api/admin/bundles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: bundle.id, is_active: !bundle.is_active }),
      });
      if (res.ok) {
        const data = await res.json();
        setBundles(prev => prev.map(b => b.id === bundle.id ? data.bundle : b));
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to toggle bundle');
      }
    } catch {
      alert('Failed to toggle bundle');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await adminFetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        const { url } = await res.json();
        const currentImages = getImages(form.image_data);
        const newImages = [...currentImages, url];
        const newAdjustments = [...adjustments, defaultAdj()];
        setForm(prev => ({ ...prev, image_data: { ...(prev.image_data || {}), images: newImages } }));
        setAdjustments(newAdjustments);
      } else {
        alert('Upload failed');
      }
    } catch {
      alert('Upload failed');
    } finally {
      setUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleMultiUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    const currentImages = getImages(form.image_data);
    const newImages = [...currentImages];
    const newAdjustments = [...adjustments];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file);
        const res = await adminFetch('/api/admin/upload', {
          method: 'POST',
          body: formData,
        });
        if (res.ok) {
          const { url } = await res.json();
          newImages.push(url);
          newAdjustments.push(defaultAdj());
        }
      }
      setForm(prev => ({ ...prev, image_data: { ...(prev.image_data || {}), images: newImages } }));
      setAdjustments(newAdjustments);
    } catch {
      alert('Some uploads failed');
    } finally {
      setUploading(false);
      if (e.target) e.target.value = '';
    }
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
        image_source: form.image_source,
        image_layout: form.image_layout,
        image_data: { ...(form.image_data || {}), adjustments },
        is_active: form.is_active,
      };

      let res;
      if (editingId) {
        res = await adminFetch('/api/admin/bundles', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...body, id: editingId }),
        });
      } else {
        res = await adminFetch('/api/admin/bundles', {
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

  const updateAdjustment = (index: number, key: 'scale' | 'rotate' | 'panX' | 'panY', value: number) => {
    setAdjustments(prev => {
      const next = [...prev];
      if (!next[index]) next[index] = defaultAdj();
      next[index] = { ...next[index], [key]: value };
      return next;
    });
  };

  const removeImage = (index: number) => {
    const currentImages = getImages(form.image_data);
    const newImages = currentImages.filter((_, i) => i !== index);
    const newAdjustments = adjustments.filter((_, i) => i !== index);
    setForm(prev => ({ ...prev, image_data: { ...(prev.image_data || {}), images: newImages } }));
    setAdjustments(newAdjustments);
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
                <div className="sm:col-span-3">
                  <label className="block text-sm font-medium mb-3 text-[#1A1A1A]">Bundle Image</label>

                  {/* Image Source Tabs */}
                  <div className="flex gap-1 mb-4 bg-[#F3F5F8] p-1 rounded-xl">
                    <button onClick={() => { setForm(p => ({ ...p, image_source: 'custom' })); if (availableImages.length === 0) setAdjustments([]); }}
                      className={`flex-1 px-4 py-2 text-xs font-medium rounded-lg transition-all ${form.image_source === 'custom' ? 'bg-white text-[#1A1A1A] shadow-sm' : 'text-[#6B7280] hover:text-[#1A1A1A]'}`}
                    >
                      Custom Images
                    </button>
                    <button onClick={() => { setForm(p => ({ ...p, image_source: 'products' })); }}
                      className={`flex-1 px-4 py-2 text-xs font-medium rounded-lg transition-all ${form.image_source === 'products' ? 'bg-white text-[#1A1A1A] shadow-sm' : 'text-[#6B7280] hover:text-[#1A1A1A]'}`}
                    >
                      Product Images
                    </button>
                  </div>

                  {/* Available Images */}
                  {availableImages.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs text-[#6B7280] mb-2 font-medium">
                        {form.image_source === 'products' ? `${availableImages.length} product image(s)` : `${availableImages.length} uploaded image(s)`}
                      </p>
                      <div className="flex gap-2 flex-wrap">
                        {availableImages.map((url, i) => {
                          const adj = adjustments[i] || { scale: 1, rotate: 0, panX: 0, panY: 0 };
                          return (
                            <div key={i} className="relative group">
                              <div className="w-16 h-16 rounded-lg overflow-hidden bg-[#F3F5F8] border border-[#E5E7EB]">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={url} alt="" className="w-full h-full object-cover" style={{ transform: `translate(${adj.panX || 0}px, ${adj.panY || 0}px) scale(${adj.scale}) rotate(${adj.rotate}deg)` }} />
                              </div>
                              {form.image_source === 'custom' && (
                                <button onClick={() => removeImage(i)} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-400 text-white rounded-full text-[10px] leading-none flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">×</button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Custom: Upload area */}
                  {form.image_source === 'custom' && (
                    <div className="mb-4 p-4 border-2 border-dashed border-[#E5E7EB] rounded-xl bg-[#F8F9FB]">
                      <p className="text-[10px] text-[#6B7280] mb-3 font-medium">Upload images from your computer</p>
                      <div className="flex gap-2">
                        <button onClick={() => multiInputRef.current?.click()} disabled={uploading}
                          className="flex-1 px-4 py-3 bg-[#1A1A1A] text-white rounded-xl text-xs font-semibold hover:bg-[#333] transition-all disabled:opacity-50"
                        >
                          {uploading ? 'Uploading...' : 'Upload Multiple Images'}
                        </button>
                        <input ref={multiInputRef} type="file" multiple accept="image/*" onChange={handleMultiUpload} className="hidden" />
                        <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                        <button onClick={() => imageInputRef.current?.click()} disabled={uploading}
                          className="px-4 py-3 bg-[#F3F5F8] border border-[#E5E7EB] rounded-xl text-xs text-[#6B7280] hover:bg-[#E5E7EB] transition-all disabled:opacity-50"
                        >
                          + Single
                        </button>
                      </div>
                      <div className="mt-2">
                        <input type="text" value={form.image}
                          onChange={e => setForm(p => ({ ...p, image: e.target.value }))}
                          placeholder="Or paste an image URL..."
                          className="w-full px-4 py-2.5 bg-white border border-[#E5E7EB] rounded-lg text-sm focus:border-[#8BA4B8] focus:outline-none transition-all text-xs"
                        />
                      </div>
                    </div>
                  )}

                  {/* Layout Templates Grid — actual images used as previews */}
                  {availableImages.length >= 2 && (
                    <div className="mb-4">
                      <p className="text-xs text-[#6B7280] mb-2 font-medium">Choose layout template:</p>
                      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                        {LAYOUTS.filter(l => availableImages.length >= l.min && availableImages.length <= l.max).map(layout => (
                          <button key={layout.id} onClick={() => setForm(p => ({ ...p, image_layout: layout.id }))}
                            className={`relative p-1.5 rounded-xl border-2 transition-all text-center ${form.image_layout === layout.id ? 'border-[#8BA4B8] bg-[#8BA4B8]/5 ring-1 ring-[#8BA4B8]' : 'border-[#E5E7EB] bg-white hover:border-[#8BA4B8]'}`}
                          >
                            <div className="w-full aspect-[4/3] rounded-lg overflow-hidden bg-[#F3F5F8] mb-1">
                              <LayoutThumbnail images={availableImages.slice(0, layout.max)} layout={layout.id} adjustments={adjustments} />
                            </div>
                            <span className="text-[8px] font-semibold text-[#1A1A1A] block leading-tight">{layout.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Full Live Preview + Per-Image Controls */}
                  {availableImages.length >= 2 && (
                    <div>
                      <p className="text-xs text-[#6B7280] mb-2 font-medium">Live Preview — click image to adjust:</p>
                      <div className="bg-[#F8F9FB] border border-[#E5E7EB] rounded-xl p-4">
                        <div className="w-full aspect-[4/3] rounded-xl overflow-hidden bg-white shadow-sm mb-3">
                          <LayoutRenderer images={availableImages.slice(0, LAYOUTS.find(l => l.id === form.image_layout)?.max || 2)} layout={form.image_layout} adjustments={adjustments} onUpdateAdjustment={updateAdjustment} />
                        </div>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {availableImages.slice(0, LAYOUTS.find(l => l.id === form.image_layout)?.max || 2).map((url, i) => {
                            const adj = adjustments[i] || { scale: 1, rotate: 0, panX: 0, panY: 0 };
                            return (
                              <div key={i} className="flex items-center gap-3 p-2 bg-white rounded-lg border border-[#E5E7EB]">
                                <div className="w-8 h-8 rounded overflow-hidden bg-[#F3F5F8] shrink-0">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={url} alt="" className="w-full h-full object-cover" />
                                </div>
                                <div className="flex-1 grid grid-cols-2 gap-x-3 gap-y-1">
                                  <div className="flex items-center gap-1">
                                    <span className="text-[10px] text-[#6B7280] w-4">🔍</span>
                                    <input type="range" min="0.5" max="3" step="0.1" value={adj.scale}
                                      onChange={e => updateAdjustment(i, 'scale', Number(e.target.value))}
                                      className="flex-1 h-1 accent-[#8BA4B8]"
                                    />
                                    <span className="text-[10px] text-[#6B7280] w-8 text-right">{adj.scale.toFixed(1)}×</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className="text-[10px] text-[#6B7280] w-4">🔄</span>
                                    <input type="range" min="0" max="360" step="1" value={adj.rotate}
                                      onChange={e => updateAdjustment(i, 'rotate', Number(e.target.value))}
                                      className="flex-1 h-1 accent-[#8BA4B8]"
                                    />
                                    <span className="text-[10px] text-[#6B7280] w-8 text-right">{adj.rotate}°</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className="text-[10px] text-[#6B7280] w-4">↔</span>
                                    <input type="range" min="-100" max="100" step="1" value={adj.panX || 0}
                                      onChange={e => updateAdjustment(i, 'panX', Number(e.target.value))}
                                      className="flex-1 h-1 accent-[#8BA4B8]"
                                    />
                                    <span className="text-[10px] text-[#6B7280] w-8 text-right">{(adj.panX || 0).toFixed(0)}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className="text-[10px] text-[#6B7280] w-4">↕</span>
                                    <input type="range" min="-100" max="100" step="1" value={adj.panY || 0}
                                      onChange={e => updateAdjustment(i, 'panY', Number(e.target.value))}
                                      className="flex-1 h-1 accent-[#8BA4B8]"
                                    />
                                    <span className="text-[10px] text-[#6B7280] w-8 text-right">{(adj.panY || 0).toFixed(0)}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Fallback when no images */}
                  {availableImages.length === 0 && form.image_source === 'products' && (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-center">
                      <p className="text-[10px] text-amber-600">Select at least 2 products with images to see layout previews</p>
                    </div>
                  )}
                  {availableImages.length === 0 && form.image_source === 'custom' && (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-center">
                      <p className="text-[10px] text-amber-600">Upload images to see layout previews</p>
                    </div>
                  )}
                  {availableImages.length === 1 && (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-center">
                      <p className="text-[10px] text-amber-600">Add at least {form.image_source === 'products' ? 'one more product' : 'one more image'} to enable layouts (min 2)</p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-[#1A1A1A]">Products in Bundle <span className="text-rose-400">*</span> (select at least 2)</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2 bg-[#F8F9FB] rounded-xl border border-[#E5E7EB]">
                  {products.map(p => (
                    <label key={p.id} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${form.product_ids.includes(p.id) ? 'bg-[#8BA4B8]/10 border border-[#8BA4B8]' : 'bg-white border border-[#E5E7EB] hover:border-[#8BA4B8]'}`}>
                      <input type="checkbox" checked={form.product_ids.includes(p.id)} onChange={() => toggleProduct(p.id)} className="sr-only" />
                      <div className="w-8 h-8 rounded bg-[#F3F5F8] overflow-hidden shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {p.main_image && <img src={p.main_image} alt={p.name} className="w-full h-full object-cover" />}
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
        <AdminPagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
    </div>
  );
}

function LayoutThumbnail({ images, layout, adjustments }: { images: string[]; layout: string; adjustments: Array<{ scale: number; rotate: number; panX: number; panY: number }> }) {
  return <LayoutRenderer images={images} layout={layout} adjustments={adjustments} thumbnail />;
}

function LayoutRenderer({ images, layout, adjustments, thumbnail, onUpdateAdjustment }: { images: string[]; layout: string; adjustments: Array<{ scale: number; rotate: number; panX: number; panY: number }>; thumbnail?: boolean; onUpdateAdjustment?: (index: number, key: 'panX' | 'panY', value: number) => void }) {
  const count = images.length;
  const dragStates = useRef<Record<number, { dragging: boolean; pressed: boolean; startX: number; startY: number; startPanX: number; startPanY: number; timer: number }>>({});

  const getDrag = (i: number) => {
    if (!dragStates.current[i]) {
      dragStates.current[i] = { dragging: false, pressed: false, startX: 0, startY: 0, startPanX: 0, startPanY: 0, timer: 0 };
    }
    return dragStates.current[i];
  };

  const img = (i: number) => {
    const adj = adjustments[i] || { scale: 1, rotate: 0, panX: 0, panY: 0 };

    const handleMouseDown = (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      e.preventDefault();
      const d = getDrag(i);
      d.pressed = true;
      d.dragging = false;
      d.startX = e.clientX;
      d.startY = e.clientY;
      d.startPanX = adj.panX || 0;
      d.startPanY = adj.panY || 0;
      d.timer = window.setTimeout(() => { d.dragging = true; }, 200);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
      const d = getDrag(i);
      if (!d.pressed) return;
      if (!d.dragging) {
        if (Math.abs(e.clientX - d.startX) > 3 || Math.abs(e.clientY - d.startY) > 3) {
          window.clearTimeout(d.timer);
          d.dragging = true;
        }
        return;
      }
      e.preventDefault();
      const dx = e.clientX - d.startX;
      const dy = e.clientY - d.startY;
      if (onUpdateAdjustment) {
        onUpdateAdjustment(i, 'panX', Math.round((d.startPanX + dx) * 10) / 10);
        onUpdateAdjustment(i, 'panY', Math.round((d.startPanY + dy) * 10) / 10);
      }
    };

    const handleMouseUp = () => {
      const d = getDrag(i);
      d.pressed = false;
      window.clearTimeout(d.timer);
      d.dragging = false;
    };

    return (
      <div className="w-full h-full overflow-hidden" onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} style={{ cursor: 'grab' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={images[i]}
          alt=""
          className="w-full h-full object-cover select-none pointer-events-none"
          style={{
            transform: `translate(${adj.panX || 0}px, ${adj.panY || 0}px) scale(${adj.scale}) rotate(${adj.rotate}deg)`,
          }}
          draggable={false}
        />
      </div>
    );
  };

  const wrap = (children: React.ReactNode) => (
    <div className={`w-full h-full ${thumbnail ? '' : 'shadow-sm'}`}>
      <div className="w-full h-full relative overflow-hidden">{children}</div>
    </div>
  );

  if (layout === 'side-by-side') {
    return wrap(
      <div className="flex w-full h-full">
        <div className="w-1/2 h-full overflow-hidden">{img(0)}</div>
        {count >= 2 && <><div className="w-[2px] bg-border shrink-0" /><div className="w-1/2 h-full overflow-hidden">{img(1)}</div></>}
      </div>
    );
  }

  if (layout === 'stacked') {
    return wrap(
      <div className="flex flex-col w-full h-full">
        <div className="w-full h-1/2 overflow-hidden">{img(0)}</div>
        {count >= 2 && <><div className="h-[2px] bg-border shrink-0" /><div className="w-full h-1/2 overflow-hidden">{img(1)}</div></>}
      </div>
    );
  }

  if (layout === 'diagonal') {
    return wrap(
      <div className="w-full h-full relative">
        <div className="absolute inset-0 overflow-hidden">{img(0)}</div>
        {count >= 2 && (
          <div className="absolute bottom-[6%] right-[6%] w-[42%] h-[42%] rounded-xl overflow-hidden border-2 border-white shadow-lg">
            {img(1)}
          </div>
        )}
      </div>
    );
  }

  if (layout === 'split-diagonal') {
    return wrap(
      <div className="w-full h-full relative">
        {count >= 1 && <div className="absolute inset-0 overflow-hidden" style={{ clipPath: 'polygon(0 0, 100% 0, 0 100%)' }}>{img(0)}</div>}
        {count >= 2 && <div className="absolute inset-0 overflow-hidden" style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }}>{img(1)}</div>}
      </div>
    );
  }

  if (layout === 'overlap') {
    return wrap(
      <div className="w-full h-full relative">
        <div className="absolute inset-0 w-3/4 h-full overflow-hidden rounded-xl">{img(0)}</div>
        {count >= 2 && <div className="absolute bottom-[5%] right-0 w-[55%] h-[60%] rounded-xl overflow-hidden border-2 border-white shadow-lg">{img(1)}</div>}
      </div>
    );
  }

  if (layout === 'border') {
    return wrap(
      <div className="flex w-full h-full">
        <div className="w-[calc(50%-3px)] h-full overflow-hidden">{img(0)}</div>
        {count >= 2 && <><div className="w-[6px] bg-border shrink-0" /><div className="w-[calc(50%-3px)] h-full overflow-hidden">{img(1)}</div></>}
      </div>
    );
  }

  if (layout === 'row-3') {
    return wrap(
      <div className="flex w-full h-full">
        {[0, 1, 2].slice(0, count).map(i => <div key={i} className="flex-1 h-full overflow-hidden border-r last:border-r-0 border-border">{img(i)}</div>)}
      </div>
    );
  }

  if (layout === 'grid-top-2') {
    return wrap(
      <div className="flex flex-col w-full h-full">
        <div className="flex w-full h-1/2">
          {count >= 1 && <div className="flex-1 h-full overflow-hidden border-b border-r border-border">{img(0)}</div>}
          {count >= 2 && <div className="flex-1 h-full overflow-hidden border-b border-border">{img(1)}</div>}
        </div>
        {count >= 3 && <div className="w-1/2 h-1/2 mx-auto overflow-hidden">{img(2)}</div>}
      </div>
    );
  }

  if (layout === 'grid-bottom-2') {
    return wrap(
      <div className="flex flex-col w-full h-full">
        {count >= 1 && <div className="w-1/2 h-1/2 mx-auto overflow-hidden">{img(0)}</div>}
        <div className="flex w-full h-1/2">
          {count >= 2 && <div className="flex-1 h-full overflow-hidden border-t border-r border-border">{img(1)}</div>}
          {count >= 3 && <div className="flex-1 h-full overflow-hidden border-t border-border">{img(2)}</div>}
        </div>
      </div>
    );
  }

  if (layout === 'grid-2x2') {
    return wrap(
      <div className="grid grid-cols-2 w-full h-full">
        {[0, 1, 2, 3].slice(0, count).map(i => (
          <div key={i} className={`overflow-hidden ${i < 2 ? 'border-b' : ''} ${i % 2 === 0 ? 'border-r' : ''} border-border`}>{img(i)}</div>
        ))}
      </div>
    );
  }

  if (layout === 'row-4') {
    return wrap(
      <div className="flex w-full h-full">
        {[0, 1, 2, 3].slice(0, count).map(i => <div key={i} className="flex-1 h-full overflow-hidden border-r last:border-r-0 border-border">{img(i)}</div>)}
      </div>
    );
  }

  if (layout === 'grid-3-1') {
    return wrap(
      <div className="flex w-full h-full">
        <div className="flex-1 h-full grid grid-cols-2">
          {count >= 1 && <div className="overflow-hidden border-b border-r border-border">{img(0)}</div>}
          {count >= 2 && <div className="overflow-hidden border-b border-border">{img(1)}</div>}
          {count >= 3 && <div className="overflow-hidden border-r border-border col-span-2">{img(2)}</div>}
        </div>
        {count >= 4 && <div className="w-1/3 h-full overflow-hidden border-l border-border">{img(3)}</div>}
      </div>
    );
  }

  return wrap(
    <div className="w-full h-full flex items-center justify-center bg-card-hover">
      <span className="text-3xl font-bold text-border font-[family-name:var(--font-playfair)]">7H</span>
    </div>
  );
}