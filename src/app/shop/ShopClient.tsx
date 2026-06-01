'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ProductCard from '@/components/ProductCard';
import { Product } from '@/lib/supabase';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: Low → High' },
  { value: 'price_desc', label: 'Price: High → Low' },
  { value: 'discount', label: 'Biggest Discount' },
];

export default function ShopClient({ initialProducts }: { initialProducts: Product[] }) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState('newest');
  const [onlyDiscount, setOnlyDiscount] = useState(false);

  const categories = useMemo(() => {
    return Array.from(new Set(initialProducts.map(p => p.category).filter(Boolean)));
  }, [initialProducts]);

  const filtered = useMemo(() => {
    let list = [...initialProducts];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q));
    }
    if (category !== 'all') list = list.filter(p => p.category === category);
    if (onlyDiscount) list = list.filter(p => p.old_price && p.old_price > p.price);
    switch (sort) {
      case 'price_asc': list.sort((a, b) => (a.price ?? 0) - (b.price ?? 0)); break;
      case 'price_desc': list.sort((a, b) => (b.price ?? 0) - (a.price ?? 0)); break;
      case 'discount':
        list.sort((a, b) => {
          const da = a.old_price ? (a.old_price - a.price) / a.old_price : 0;
          const db = b.old_price ? (b.old_price - b.price) / b.old_price : 0;
          return db - da;
        });
        break;
      default: break;
    }
    return list;
  }, [initialProducts, search, category, sort, onlyDiscount]);

  return (
    <div className="min-h-screen pt-24 pb-20 bg-[#F8F9FB]">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-[family-name:var(--font-playfair)] tracking-wide text-[#1A1A1A] mb-3">
            The Collection
          </h1>
          <p className="text-[#6B7280] text-sm tracking-wide max-w-md mx-auto">
            Explore our curated selection of premium pieces
          </p>
        </motion.div>

        {/* Search Bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="mb-8"
        >
          <div className="relative max-w-md mx-auto">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search pieces..."
              className="w-full pl-11 pr-4 py-3 bg-white border border-[#E5E7EB] text-[#1A1A1A] placeholder-[#9CA3AF] focus:border-[#8BA4B8] focus:outline-none rounded-xl text-sm transition-all duration-300 shadow-sm"
            />
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="flex flex-wrap items-center justify-center gap-2 mb-10"
        >
          <button
            onClick={() => setCategory('all')}
            className={`px-5 py-2 text-xs rounded-full border transition-all duration-300 font-medium tracking-wider uppercase ${
              category === 'all'
                ? 'bg-[#8BA4B8] text-white border-[#8BA4B8] shadow-sm'
                : 'bg-white border-[#E5E7EB] text-[#6B7280] hover:border-[#8BA4B8] hover:text-[#8BA4B8]'
            }`}
          >
            All
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-5 py-2 text-xs rounded-full border transition-all duration-300 font-medium tracking-wider uppercase ${
                category === cat
                  ? 'bg-[#8BA4B8] text-white border-[#8BA4B8] shadow-sm'
                  : 'bg-white border-[#E5E7EB] text-[#6B7280] hover:border-[#8BA4B8] hover:text-[#8BA4B8]'
              }`}
            >
              {cat}
            </button>
          ))}
          <span className="w-px h-6 bg-[#E5E7EB] mx-1" />
          <button
            onClick={() => setOnlyDiscount(v => !v)}
            className={`px-5 py-2 text-xs rounded-full border transition-all duration-300 font-medium tracking-wider uppercase ${
              onlyDiscount
                ? 'bg-[#8BA4B8] text-white border-[#8BA4B8] shadow-sm'
                : 'bg-white border-[#E5E7EB] text-[#6B7280] hover:border-[#8BA4B8] hover:text-[#8BA4B8]'
            }`}
          >
            Sale ✦
          </button>
          <select
            value={sort}
            onChange={e => setSort(e.target.value)}
            className="ml-auto px-4 py-2 text-xs bg-white border border-[#E5E7EB] text-[#1A1A1A] focus:border-[#8BA4B8] focus:outline-none rounded-xl cursor-pointer transition-all"
          >
            {SORT_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </motion.div>

        {/* Results count */}
        <p className="text-center text-xs text-[#9CA3AF] tracking-wider mb-8">
          {filtered.length} {filtered.length === 1 ? 'Piece' : 'Pieces'} Found
        </p>

        {/* Products Grid */}
        <AnimatePresence mode="wait">
          {filtered.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-20"
            >
              <div className="text-5xl mb-4 opacity-40">✧</div>
              <p className="text-[#6B7280] text-lg mb-6 font-[family-name:var(--font-playfair)]">
                No pieces match your criteria
              </p>
              <button
                onClick={() => { setSearch(''); setCategory('all'); setOnlyDiscount(false); }}
                className="text-sm text-[#8BA4B8] underline underline-offset-4 hover:text-[#6B8BA0] transition-colors"
              >
                Clear all filters
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            >
              {filtered.map((product, index) => (
                <ProductCard key={product.id} product={product} index={index} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}