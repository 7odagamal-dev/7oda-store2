'use client';

import { useEffect, useState } from 'react';
import ProductCard from '@/components/ProductCard';
import type { Product } from '@/lib/supabase';

const STORAGE_KEY = 'og-recently-viewed';
const MAX_ITEMS = 8;

export function trackRecentlyViewed(product: Product) {
  if (typeof window === 'undefined') return;
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const filtered = stored.filter((p: Product) => p.id !== product.id);
    filtered.unshift(product);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered.slice(0, MAX_ITEMS)));
  } catch {}
}

export default function RecentlyViewed() {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      setProducts(stored.slice(0, 6));
    } catch {}
  }, []);

  if (products.length === 0) return null;

  return (
    <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 py-16">
      <h2 className="text-2xl font-[family-name:var(--font-playfair)] text-[#1A1A1A] mb-8 text-center">
        Recently Viewed
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-6">
        {products.map((product, idx) => (
          <ProductCard key={product.id} product={product} index={idx} />
        ))}
      </div>
    </div>
  );
}
