'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BundleCard } from '@/components/BundleDisplay';
import Link from 'next/link';

interface BundleItem {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
  image_source: string;
  image_layout: string;
  image_data: Record<string, unknown>;
  product_images: (string | null)[];
  discount_type: string;
  discount_value: number;
  products: string[];
}

export default function BundlesPage() {
  const [bundles, setBundles] = useState<BundleItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/bundles')
      .then(r => r.json())
      .then(data => {
        setBundles(data.bundles ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen pt-24 pb-20 bg-[#F8F9FB]">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-[family-name:var(--font-playfair)] tracking-wide text-[#1A1A1A] mb-3">
            Bundle Deals
          </h1>
          <p className="text-[#6B7280] text-sm tracking-wide max-w-md mx-auto">
            Save more when you buy together
          </p>
        </motion.div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-card rounded-[var(--radius-xl)] border border-border p-[var(--space-lg)] animate-pulse">
                <div className="w-full aspect-[4/3] bg-card-hover rounded-[var(--radius-xl)]" />
                <div className="h-4 bg-card-hover rounded mt-[var(--space-md)] w-3/4 mx-auto" />
                <div className="h-3 bg-card-hover rounded mt-[var(--space-sm)] w-1/2 mx-auto" />
              </div>
            ))}
          </div>
        ) : bundles.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <div className="text-5xl mb-4 opacity-40">✦</div>
            <p className="text-[#6B7280] text-lg mb-6 font-[family-name:var(--font-playfair)]">
              No bundle deals available right now
            </p>
            <Link
              href="/shop"
              className="text-sm text-[#8BA4B8] underline underline-offset-4 hover:text-[#6B8BA0] transition-colors"
            >
              Browse our collection
            </Link>
          </motion.div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {bundles.map((bundle, index) => (
                <motion.div
                  key={bundle.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                >
                  <Link href={`/bundles/${bundle.id}`}>
                    <BundleCard bundle={bundle}>
                      <p className="text-[var(--text-xs)] text-secondary mt-[var(--space-sm)]">
                        {bundle.products?.length || 0} items included
                      </p>
                    </BundleCard>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
