'use client';

import { useEffect, useState, use } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { BundleImageDisplay } from '@/components/BundleDisplay';
import type { Product } from '@/lib/supabase';
import { useCart } from '@/context/CartContext';

interface BundleDetail {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
  image_source: string;
  image_layout: string;
  image_data: Record<string, unknown>;
  product_images: (string | null)[];
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  products_data: Product[];
  products: string[];
  is_active: boolean;
}

export default function BundleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { addItem } = useCart();

  const [bundle, setBundle] = useState<BundleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetch(`/api/bundles/${encodeURIComponent(id)}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          setError(data.error);
        } else {
          setBundle(data.bundle);
        }
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load bundle');
        setLoading(false);
      });
  }, [id]);

  const products = bundle?.products_data || [];
  const originalTotal = products.reduce((sum, p) => sum + p.price, 0);
  let discountedTotal = originalTotal;
  if (bundle && originalTotal > 0) {
    if (bundle.discount_type === 'percentage') {
      discountedTotal = Math.round(originalTotal * (1 - bundle.discount_value / 100));
    } else {
      discountedTotal = Math.max(0, originalTotal - bundle.discount_value);
    }
  }
  const savings = originalTotal - discountedTotal;

  const handleAddAll = () => {
    if (!bundle) return;
    setAdding(true);
    for (const product of products) {
      const sizes = product.sizes || [];
      if (sizes.length > 0) {
        let unitPrice = product.price;
        if (bundle.discount_type === 'percentage') {
          unitPrice = Math.round(product.price * (1 - bundle.discount_value / 100));
        } else if (originalTotal > 0) {
          const share = Math.round(product.price * bundle.discount_value / originalTotal);
          unitPrice = Math.max(0, product.price - share);
        }
        addItem(product, sizes[0], 1, unitPrice);
      }
    }
    router.push('/cart');
  };

  const handleAddSingle = (product: Product) => {
    const sizes = product.sizes || [];
    if (sizes.length > 0) {
      addItem(product, sizes[0], 1);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-24 pb-20 bg-[#F8F9FB]">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10">
          <div className="animate-pulse">
            <div className="w-full aspect-[16/9] max-w-2xl mx-auto bg-card-hover rounded-[var(--radius-xl)] mb-8" />
            <div className="h-8 bg-card-hover rounded w-1/3 mx-auto mb-4" />
            <div className="h-4 bg-card-hover rounded w-2/3 mx-auto mb-8" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-card rounded-[var(--radius-xl)] border border-border p-[var(--space-lg)]">
                  <div className="w-full aspect-square bg-card-hover rounded-[var(--radius-xl)] mb-4" />
                  <div className="h-4 bg-card-hover rounded w-3/4 mb-2" />
                  <div className="h-3 bg-card-hover rounded w-1/2" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !bundle) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center bg-[#F8F9FB]">
        <div className="text-center">
          <h1 className="text-3xl font-[family-name:var(--font-playfair)] text-[#1A1A1A] mb-3">Bundle Not Found</h1>
          <p className="text-[#6B7280] mb-6">{error || 'This bundle deal is no longer available.'}</p>
          <Link href="/bundles" className="text-sm text-[#8BA4B8] underline underline-offset-4 hover:text-[#6B8BA0]">
            Browse all bundles
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-20 bg-[#F8F9FB]">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10">
        {/* Breadcrumb */}
        <nav className="mb-6 text-xs text-[#6B7280]">
          <Link href="/" className="hover:text-[#8BA4B8]">Home</Link>
          <span className="mx-2">/</span>
          <Link href="/bundles" className="hover:text-[#8BA4B8]">Bundle Deals</Link>
          <span className="mx-2">/</span>
          <span className="text-[#1A1A1A]">{bundle.name}</span>
        </nav>

        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-2xl mx-auto mb-10"
        >
          <BundleImageDisplay bundle={bundle} className="mb-6" />
          <h1 className="text-3xl md:text-4xl font-[family-name:var(--font-playfair)] tracking-wide text-[#1A1A1A] text-center mb-3">
            {bundle.name}
          </h1>
          {bundle.description && (
            <p className="text-[#6B7280] text-sm tracking-wide text-center max-w-lg mx-auto mb-4">
              {bundle.description}
            </p>
          )}
          {/* Pricing Summary */}
          <div className="text-center space-y-2">
            <p className="text-2xl font-bold text-[#1A1A1A]">
              EGP {discountedTotal.toFixed(2)}
            </p>
            {savings > 0 && (
              <>
                <p className="text-sm text-[#6B7280] line-through">EGP {originalTotal.toFixed(2)}</p>
                <p className="text-sm font-semibold text-rose-500">
                  Save EGP {savings.toFixed(2)} ({bundle.discount_type === 'percentage' ? `${bundle.discount_value}% off` : 'bundle discount'})
                </p>
              </>
            )}
          </div>
          <div className="mt-6 text-center">
            <button onClick={handleAddAll} disabled={adding || products.length === 0}
              className="px-10 py-4 bg-[#1A1A1A] text-white rounded-xl text-sm font-semibold hover:bg-[#333] transition-all disabled:opacity-50"
            >
              {adding ? 'Adding...' : `Add All to Cart — EGP ${discountedTotal.toFixed(2)}`}
            </button>
          </div>
        </motion.div>

        {/* Products Grid */}
        <h2 className="text-2xl font-[family-name:var(--font-playfair)] tracking-wide text-[#1A1A1A] text-center mb-8">
          Items in this Bundle
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product, idx) => {
            const sizes = product.sizes || [];
            return (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: idx * 0.05 }}
                className="bg-card rounded-[var(--radius-xl)] border border-border overflow-hidden hover:shadow-md transition-all"
              >
                <Link href={`/product/${encodeURIComponent(product.category || 'uncategorized')}/${product.id}`}>
                  <div className="w-full aspect-square relative bg-[#F8F9FB]">
                    <Image src={product.main_image || '/placeholder.svg'} alt={product.name} fill className="object-cover" sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" />
                  </div>
                </Link>
                <div className="p-[var(--space-lg)]">
                  <Link href={`/product/${encodeURIComponent(product.category || 'uncategorized')}/${product.id}`}>
                    <h3 className="font-bold text-[var(--text-sm)] text-[#1A1A1A] hover:text-[#8BA4B8] transition-colors mb-1">{product.name}</h3>
                  </Link>
                  <p className="text-[var(--text-xs)] text-[#6B7280] mb-3">{product.category}</p>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-bold text-[#1A1A1A]">EGP {product.price.toFixed(2)}</span>
                      {savings > 0 && (
                        <span className="text-xs text-rose-500 ml-2">
                          {bundle.discount_type === 'percentage' ? `${bundle.discount_value}% off` : 'Save'}
                        </span>
                      )}
                    </div>
                    {sizes.length > 0 && (
                      <button onClick={() => handleAddSingle(product)}
                        className="px-4 py-2 bg-[#F3F5F8] border border-[#E5E7EB] rounded-lg text-xs font-medium text-[#1A1A1A] hover:bg-[#E5E7EB] transition-all"
                      >
                        + Add
                      </button>
                    )}
                  </div>
                  {savings > 0 && bundle.discount_type === 'percentage' && (
                    <p className="text-[10px] text-rose-500 mt-2">
                      EGP {Math.round(product.price * (1 - bundle.discount_value / 100)).toFixed(2)} with bundle
                    </p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
