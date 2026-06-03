'use client';

import Image from 'next/image';
import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Product } from '@/lib/supabase';

interface ProductImage {
  id: string;
  url: string;
  uploading?: boolean;
}

const defaultProduct = {
  name: '',
  slug: '',
  description: '',
  price: 0,
  old_price: null as number | null,
  category: '',
  stock: 0,
  sizes: [] as string[],
  newSize: '',
  images: [] as ProductImage[],
  is_featured: false,
};

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'list' | 'add'>('list');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState<typeof defaultProduct>(defaultProduct);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [newSizeInput, setNewSizeInput] = useState('');

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/products');
      if (!res.ok) throw new Error('Unauthorized');
      const data = await res.json();
      console.log('API response:', JSON.stringify(data, null, 2));
      const list = Array.isArray(data) ? data : (Array.isArray(data.data) ? data.data : []);
      console.log('list type:', typeof list, Array.isArray(list), list?.length);
      setProducts(list);
    } catch (error) {
      console.error('fetchProducts error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const handleImageUrlAdd = useCallback(() => {
    if (!newImageUrl.trim()) return;
    setFormData(prev => ({
      ...prev,
      images: [...prev.images, { id: Date.now().toString(), url: newImageUrl }]
    }));
    setNewImageUrl('');
  }, [newImageUrl]);

  const handleImageRemove = useCallback((id: string) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter(img => img.id !== id)
    }));
  }, []);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError('');
    const tempId = Date.now().toString();
    setFormData(prev => ({
      ...prev,
      images: [...prev.images, { id: tempId, url: '', uploading: true }]
    }));
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/admin/upload', { method: 'POST', body: form });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Upload failed');
      }
      const { url } = await res.json();
      setFormData(prev => ({
        ...prev,
        images: prev.images.map(img =>
          img.id === tempId ? { id: tempId, url, uploading: false } : img
        )
      }));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setUploadError('Upload failed: ' + message);
      setFormData(prev => ({
        ...prev,
        images: prev.images.filter(img => img.id !== tempId)
      }));
    }
    e.target.value = '';
  }, []);

  const addSize = useCallback((size: string) => {
    const trimmed = size.trim().toUpperCase();
    if (!trimmed) return;
    setFormData(prev => {
      if (prev.sizes.includes(trimmed)) return prev;
      return { ...prev, sizes: [...prev.sizes, trimmed] };
    });
    setNewSizeInput('');
  }, []);

  const removeSize = useCallback((size: string) => {
    setFormData(prev => ({
      ...prev,
      sizes: prev.sizes.filter(s => s !== size)
    }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.price || !formData.category || !formData.stock) {
      alert('Please fill all required fields');
      return;
    }
    if (formData.images.length === 0) {
      alert('Please add at least one image');
      return;
    }
    if (formData.images.some(img => img.uploading)) {
      alert('Images are still uploading, please wait...');
      return;
    }
    setSubmitting(true);
    const hasOldPrice = formData.old_price && formData.old_price > 0;
    const discountPercentage = hasOldPrice && formData.price
      ? Math.round(((formData.old_price! - formData.price) / formData.old_price!) * 100)
      : null;
    const productData = {
      name: formData.name,
      slug: formData.slug || formData.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
      description: formData.description,
      price: formData.price,
      old_price: hasOldPrice ? formData.old_price : null,
      discount_percentage: discountPercentage,
      category: formData.category,
      stock: formData.stock,
      main_image: formData.images[0]?.url || '',
      second_image: formData.images[1]?.url || '',
      third_image: formData.images[2]?.url || '',
      fourth_image: formData.images[3]?.url || '',
      sizes: formData.sizes.length > 0 ? formData.sizes : ['M', 'L', 'XL'],
      is_featured: formData.is_featured,
    };
    try {
      const method = editingProduct ? 'PUT' : 'POST';
      const body = editingProduct ? { id: editingProduct.id, ...productData } : productData;
      const res = await fetch('/api/admin/products', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Save failed');
      }
      alert(editingProduct ? 'Product updated!' : 'Product added!');
      resetForm();
      setActiveTab('list');
      fetchProducts();
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : 'Unknown error';
      alert('Error: ' + errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this product?')) return;
    try {
      const res = await fetch('/api/admin/products', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error('Delete failed');
      setProducts(prev => prev.filter(p => p.id !== id));
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Unknown error';
      alert('Error: ' + errMsg);
    }
  };

  const handleEdit = (product: Product) => {
    const images: ProductImage[] = [];
    if (product.main_image) images.push({ id: '1', url: product.main_image });
    if (product.second_image) images.push({ id: '2', url: product.second_image });
    if (product.third_image) images.push({ id: '3', url: product.third_image });
    if (product.fourth_image) images.push({ id: '4', url: product.fourth_image });
    setEditingProduct(product);
    setFormData({ name: product.name, slug: product.slug, description: product.description, price: product.price, old_price: product.old_price, category: product.category, stock: product.stock, sizes: product.sizes || [], newSize: '', images, is_featured: product.is_featured });
    setActiveTab('add');
  };

  const resetForm = () => {
    setFormData(defaultProduct);
    setEditingProduct(null);
    setUploadError('');
  };

  if (!Array.isArray(products)) {
    console.error('products is not an array:', typeof products, products);
  }
  const list = Array.isArray(products) ? products : [];
  const filteredProducts = list.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="p-2">
      <div className="flex gap-2 mb-6">
        <button onClick={() => { setActiveTab('list'); resetForm(); }}
          className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all ${
            activeTab === 'list' ? 'bg-[#8BA4B8] text-white shadow-sm' : 'bg-white border border-[#E5E7EB] text-[#6B7280] hover:border-[#8BA4B8]'
          }`}>
          Products ({products.length})
        </button>
        <button onClick={() => { resetForm(); setActiveTab('add'); }}
          className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all ${
            activeTab === 'add' ? 'bg-[#8BA4B8] text-white shadow-sm' : 'bg-white border border-[#E5E7EB] text-[#6B7280] hover:border-[#8BA4B8]'
          }`}>
          + {editingProduct ? 'Edit' : 'Add'}
        </button>
      </div>

      {activeTab === 'list' && (
        <>
          <div className="relative mb-6">
            <input type="text" placeholder="Search products..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full max-w-md px-4 py-3 bg-white border border-[#E5E7EB] rounded-xl text-[#1A1A1A] placeholder-[#9CA3AF] focus:border-[#8BA4B8] focus:outline-none text-sm transition-all" />
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-2 border-[#8BA4B8] border-t-transparent"></div></div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-20 text-[#9CA3AF]"><div className="text-6xl mb-4">📦</div><p className="text-xl font-[family-name:var(--font-playfair)]">No products found</p></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredProducts.map(product => (
                <div key={product.id} className="bg-white rounded-xl p-4 border border-[#E5E7EB] hover:shadow-md transition-all group">
                  <div className="relative h-48 bg-[#F3F5F8] rounded-lg mb-3 overflow-hidden">
                    {product.main_image ? (
                      <Image src={product.main_image} alt={product.name} fill sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 25vw" className="object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#9CA3AF]"><span className="text-4xl">📷</span></div>
                    )}
                    {product.discount_percentage && (<span className="absolute top-2 right-2 bg-rose-500 text-white text-xs font-bold px-2 py-1 rounded-full">-{product.discount_percentage}%</span>)}
                  </div>
                  <h3 className="font-semibold text-[#1A1A1A] mb-1 truncate">{product.name}</h3>
                  <p className="text-[#6B7280] text-xs mb-2">{product.category}</p>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-[#6B7280]">Stock:</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${product.stock < 3 ? 'bg-rose-500 text-white animate-pulse' : product.stock < 10 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {product.stock}
                    </span>
                    {product.stock < 3 && <span className="text-[9px] text-rose-500 font-bold uppercase tracking-wider">Low stock!</span>}
                  </div>
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-[#8BA4B8] font-bold text-lg">{product.price} EGP</span>
                      {product.old_price && (<span className="text-[#9CA3AF] text-sm line-through ml-2">{product.old_price}</span>)}
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3 pt-3 border-t border-[#F0F0F0]">
                    <button onClick={() => handleEdit(product)} className="flex-1 py-2 bg-[#8BA4B8]/10 text-[#8BA4B8] rounded-lg hover:bg-[#8BA4B8] hover:text-white transition-all text-sm font-medium">✏️ Edit</button>
                    <button onClick={() => handleDelete(product.id)} className="px-4 py-2 bg-rose-50 text-rose-500 rounded-lg hover:bg-rose-500 hover:text-white transition-all">🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === 'add' && (
        <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-[#E5E7EB] shadow-sm space-y-4">
            <h3 className="text-lg font-[family-name:var(--font-playfair)] text-[#1A1A1A] mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-[#1A1A1A]">Product Name <span className="text-rose-400">*</span></label>
                <input type="text" required value={formData.name} onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))} placeholder="Enter product name"
                  className="w-full px-4 py-3 bg-[#F8F9FB] border border-[#E5E7EB] rounded-xl text-[#1A1A1A] placeholder-[#9CA3AF] focus:border-[#8BA4B8] focus:outline-none text-sm transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-[#1A1A1A]">Category <span className="text-rose-400">*</span></label>
                <select required value={formData.category} onChange={(e) => setFormData(p => ({ ...p, category: e.target.value }))}
                  className="w-full px-4 py-3 bg-[#F8F9FB] border border-[#E5E7EB] rounded-xl text-[#1A1A1A] focus:border-[#8BA4B8] focus:outline-none text-sm transition-all">
                  <option value="">Select category</option>
                  <option value="t-shirts">👕 T-Shirts</option>
                  <option value="hoodies">🧥 Hoodies</option>
                  <option value="jackets">🧥 Jackets</option>
                  <option value="pants">👖 Pants</option>
                  <option value="sweatshirts">🎽 Sweatshirts</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-[#1A1A1A]">Description</label>
              <textarea value={formData.description} onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))} rows={3} placeholder="Product description..."
                className="w-full px-4 py-3 bg-[#F8F9FB] border border-[#E5E7EB] rounded-xl text-[#1A1A1A] placeholder-[#9CA3AF] focus:border-[#8BA4B8] focus:outline-none text-sm transition-all resize-none" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-[#1A1A1A]">Price <span className="text-rose-400">*</span></label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] text-sm">EGP</span>
                  <input type="number" required value={formData.price || ''} onChange={(e) => setFormData(p => ({ ...p, price: Number(e.target.value) }))}
                    className="w-full pl-14 pr-4 py-3 bg-[#F8F9FB] border border-[#E5E7EB] rounded-xl text-[#1A1A1A] focus:border-[#8BA4B8] focus:outline-none text-sm transition-all" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-[#1A1A1A]">Old Price</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] text-sm">EGP</span>
                  <input type="number" value={formData.old_price || ''} onChange={(e) => setFormData(p => ({ ...p, old_price: e.target.value ? Number(e.target.value) : null }))}
                    className="w-full pl-14 pr-4 py-3 bg-[#F8F9FB] border border-[#E5E7EB] rounded-xl text-[#1A1A1A] focus:border-[#8BA4B8] focus:outline-none text-sm transition-all" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-[#1A1A1A]">Stock <span className="text-rose-400">*</span></label>
                <input type="number" required value={formData.stock || ''} onChange={(e) => setFormData(p => ({ ...p, stock: Number(e.target.value) }))}
                  className="w-full px-4 py-3 bg-[#F8F9FB] border border-[#E5E7EB] rounded-xl text-[#1A1A1A] focus:border-[#8BA4B8] focus:outline-none text-sm transition-all" />
              </div>
            </div>
          </div>

          {/* Sizes Section */}
          <div className="bg-white rounded-2xl p-6 border border-[#E5E7EB] shadow-sm">
            <h3 className="text-lg font-[family-name:var(--font-playfair)] text-[#1A1A1A] mb-1">
              Sizes
              <span className="text-[#9CA3AF] text-sm font-normal ml-2">({formData.sizes.length} sizes)</span>
            </h3>
            <div className="flex gap-2 flex-wrap mb-4 mt-4">
              {['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'].map(preset => (
                <button key={preset} type="button" onClick={() => addSize(preset)}
                  disabled={formData.sizes.includes(preset)}
                  className={`px-4 py-2 text-xs font-medium uppercase rounded-full border transition-all ${
                    formData.sizes.includes(preset)
                      ? 'bg-[#8BA4B8] text-white border-[#8BA4B8]'
                      : 'bg-white border-[#E5E7EB] text-[#6B7280] hover:border-[#8BA4B8] hover:text-[#8BA4B8]'
                  }`}>
                  {preset}
                </button>
              ))}
            </div>
            <div className="flex gap-2 mb-4">
              <input type="text" value={newSizeInput} onChange={e => setNewSizeInput(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSize(newSizeInput))}
                placeholder="Enter custom size..."
                className="flex-1 px-4 py-3 bg-[#F8F9FB] border border-[#E5E7EB] rounded-xl text-[#1A1A1A] placeholder-[#9CA3AF] focus:border-[#8BA4B8] focus:outline-none text-sm transition-all" />
              <button type="button" onClick={() => addSize(newSizeInput)} className="px-5 py-3 bg-[#8BA4B8] text-white rounded-xl font-medium text-sm hover:bg-[#6B8BA0] transition-all">Add Size</button>
            </div>
            {formData.sizes.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {formData.sizes.map(size => (
                  <span key={size} className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#F3F5F8] text-[#1A1A1A] text-sm font-medium rounded-full border border-[#E5E7EB]">
                    {size}
                    <button type="button" onClick={() => removeSize(size)} className="text-[#9CA3AF] hover:text-rose-500 transition-colors text-lg leading-none ml-1">&times;</button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-[#9CA3AF] text-sm">No sizes added. Defaults to M, L, XL.</p>
            )}
          </div>

          {/* Images Section */}
          <div className="bg-white rounded-2xl p-6 border border-[#E5E7EB] shadow-sm">
            <h3 className="text-lg font-[family-name:var(--font-playfair)] text-[#1A1A1A] mb-1">
              Images <span className="text-rose-400">*</span>
              <span className="text-[#9CA3AF] text-sm font-normal ml-2">({formData.images.length} images)</span>
            </h3>
            {uploadError && (
              <div className="mb-4 px-4 py-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-500 text-sm">{uploadError}</div>
            )}
            <div className="flex gap-3 mb-4">
              <input type="url" value={newImageUrl} onChange={(e) => setNewImageUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleImageUrlAdd())}
                placeholder="🔗 Paste image URL..."
                className="flex-1 px-4 py-3 bg-[#F8F9FB] border border-[#E5E7EB] rounded-xl text-[#1A1A1A] placeholder-[#9CA3AF] focus:border-[#8BA4B8] focus:outline-none text-sm transition-all" />
              <button type="button" onClick={handleImageUrlAdd} className="px-5 py-3 bg-[#8BA4B8] text-white rounded-xl font-medium text-sm hover:bg-[#6B8BA0] transition-all">+ Add</button>
              <label className="px-5 py-3 bg-[#6B8BA0] text-white rounded-xl font-medium text-sm cursor-pointer hover:bg-[#5A7A8F] transition-all">
                📁 Upload
                <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>
            <div className="grid grid-cols-4 md:grid-cols-6 gap-3">
              {formData.images.map((img, index) => (
                <div key={img.id} className="relative aspect-square bg-[#F3F5F8] rounded-lg overflow-hidden group border border-[#E5E7EB]">
                  {img.uploading ? (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-2 border-[#8BA4B8] border-t-transparent"></div>
                    </div>
                  ) : img.url ? (
                    <Image src={img.url} alt={`Image ${index + 1}`} fill sizes="160px" className="object-cover" />
                  ) : null}
                  {!img.uploading && (
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button type="button" onClick={() => handleImageRemove(img.id)} className="w-8 h-8 bg-rose-500 text-white rounded-full hover:bg-rose-600 transition-all flex items-center justify-center text-lg">×</button>
                    </div>
                  )}
                  {index === 0 && !img.uploading && (<span className="absolute bottom-1 left-1 bg-[#8BA4B8] text-white text-[10px] font-bold px-2 py-0.5 rounded">Main</span>)}
                </div>
              ))}
              {formData.images.length === 0 && (
                <div className="col-span-4 md:col-span-6 h-32 flex items-center justify-center text-[#9CA3AF] border-2 border-dashed border-[#E5E7EB] rounded-xl">
                  <div className="text-center"><div className="text-3xl mb-2">📷</div><p className="text-sm">Add at least one image</p></div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-[#E5E7EB]">
            <input type="checkbox" id="is_featured" checked={formData.is_featured} onChange={(e) => setFormData(p => ({ ...p, is_featured: e.target.checked }))} className="w-5 h-5 accent-[#8BA4B8] cursor-pointer" />
            <label htmlFor="is_featured" className="text-[#1A1A1A] text-sm cursor-pointer">⭐ Feature on homepage</label>
          </div>

          <div className="flex gap-4 pt-4">
            <button type="submit" disabled={submitting}
              className="flex-1 py-4 bg-[#8BA4B8] text-white font-semibold rounded-xl hover:bg-[#6B8BA0] transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm">
              {submitting ? (<><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>Saving...</>) : (<>💾 {editingProduct ? 'Update Product' : 'Add Product'}</>)}
            </button>
            <button type="button" onClick={() => { resetForm(); setActiveTab('list'); }} className="px-8 py-4 border border-[#E5E7EB] text-[#6B7280] hover:border-[#8BA4B8] hover:text-[#8BA4B8] rounded-xl transition-all text-sm">Cancel</button>
          </div>
        </form>
      )}
    </motion.div>
  );
}
