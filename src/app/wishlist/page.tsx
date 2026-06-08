'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useWishlist } from '@/context/WishlistContext';
import type { Product } from '@/lib/supabase';
import ProductCard from '@/components/ProductCard';

export default function WishlistPage() {
  const { wishlist } = useWishlist();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (wishlist.length === 0) {
      setProducts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`/api/products/wishlist?slugs=${wishlist.join(',')}`)
      .then(res => res.json())
      .then(json => setProducts(json.products || []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [wishlist]);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#F8F9FB] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#8BA4B8] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FB]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-10">
          <h1 className="text-3xl font-[family-name:var(--font-playfair)] text-[#1A1A1A]">Wishlist</h1>
          <p className="text-[#6B7280] mt-2">{wishlist.length} {wishlist.length === 1 ? 'item' : 'items'} saved</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-[3/4] bg-[#E5E7EB] rounded-2xl mb-4" />
                <div className="h-4 bg-[#E5E7EB] rounded w-3/4 mb-2" />
                <div className="h-4 bg-[#E5E7EB] rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4 opacity-30">✧</div>
            <h2 className="text-xl font-[family-name:var(--font-playfair)] text-[#1A1A1A] mb-2">Your wishlist is empty</h2>
            <p className="text-[#6B7280] mb-8">Save items you love by tapping the heart icon.</p>
            <Link
              href="/shop"
              className="inline-block px-8 py-3 bg-[#1A1A1A] text-white rounded-xl font-medium text-sm hover:bg-[#333] transition-all"
            >
              Browse Shop
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
