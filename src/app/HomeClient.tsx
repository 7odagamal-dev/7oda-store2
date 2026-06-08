'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion, useScroll, useTransform } from 'framer-motion';
import type { Product } from '@/lib/supabase';
import ProductCard from '@/components/ProductCard';
import RecentlyViewed from '@/components/RecentlyViewed';
import CountdownTimer from '@/components/CountdownTimer';
import { BundleCard } from '@/components/BundleDisplay';

export default function HomeClient({ products, flashSaleProducts, flashSaleInfo, bundles }: {
  products: Product[];
  flashSaleProducts: Product[];
  flashSaleInfo: Record<string, { discount_percentage: number; ends_at: string }>;
  bundles: Array<Record<string, unknown>>;
}) {
  const earliestEnd = Object.values(flashSaleInfo).reduce<string | null>((earliest, info) => {
    if (!earliest || info.ends_at < earliest) return info.ends_at;
    return earliest;
  }, null);

  return (
    <div className="min-h-screen">
      <HeroSection />

      {/* Flash Sale */}
      {flashSaleProducts.length > 0 && earliestEnd && (
        <section className="py-12 lg:py-16 bg-gradient-to-br from-rose-50 via-white to-orange-50">
          <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="text-center mb-10"
            >
              <span className="text-xs tracking-[0.2em] text-rose-500 uppercase mb-2 block font-semibold">
                Limited Time
              </span>
              <h2 className="text-3xl md:text-4xl font-[family-name:var(--font-playfair)] tracking-wide text-foreground mb-3">
                Flash Sale
              </h2>
              <div className="flex justify-center">
                <CountdownTimer endsAt={earliestEnd} />
              </div>
            </motion.div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {flashSaleProducts.map((product, index) => {
                const info = flashSaleInfo[product.id];
                return (
                  <ProductCard
                    key={product.id}
                    product={product}
                    index={index}
                    flashSale={info ? { product_id: product.id, discount_percentage: info.discount_percentage, ends_at: info.ends_at } : undefined}
                  />
                );
              })}
            </div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="text-center mt-10"
            >
              <Link
                href="/shop"
                className="inline-flex items-center gap-2 px-8 py-2 border-2 border-rose-400 text-rose-500 text-sm tracking-wider uppercase font-medium rounded-full hover:bg-rose-500 hover:text-white transition-all duration-300 group"
              >
                View All Sales
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 group-hover:translate-x-1 transition-transform">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                </svg>
              </Link>
            </motion.div>
          </div>
        </section>
      )}

      {/* Bundle Deals */}
      {bundles.length > 0 && (
        <section className="py-12 lg:py-20 bg-background">
          <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="text-center mb-10"
            >
              <span className="text-xs tracking-[0.2em] text-accent uppercase mb-2 block">Bundle & Save</span>
              <h2 className="text-3xl md:text-4xl font-[family-name:var(--font-playfair)] tracking-wide text-foreground mb-4">
                Complete Sets
              </h2>
              <p className="text-secondary max-w-md mx-auto text-sm leading-relaxed">
                Curated looks at exclusive bundle prices
              </p>
            </motion.div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {bundles.map((bundle, idx) => (
                <motion.div
                  key={bundle.id as string}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: idx * 0.05 }}
                >
                  <Link href={`/bundles/${bundle.id}`}>
                    <BundleCard bundle={bundle as { id: string; name?: string; description?: string | null; image?: string | null; image_source?: string; image_layout?: string; image_data?: Record<string, unknown>; product_images?: (string | null)[]; discount_type?: string; discount_value?: number }}>
                      <p className="text-[var(--text-xs)] text-secondary mt-[var(--space-sm)]">
                        {(bundle.products as string[])?.length || 0} items included
                      </p>
                    </BundleCard>
                  </Link>
                </motion.div>
              ))}
            </div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="text-center mt-10"
            >
              <Link
                href="/bundles"
                className="inline-flex items-center gap-2 px-8 py-2 border-2 border-accent text-accent text-sm tracking-wider uppercase font-medium rounded-full hover:bg-accent hover:text-white transition-all duration-300 group"
              >
                View All Bundles
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 group-hover:translate-x-1 transition-transform">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                </svg>
              </Link>
            </motion.div>
          </div>
        </section>
      )}

      {/* Featured Collection */}
      <section className="py-12 lg:py-20 bg-card">
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="text-center mb-16 lg:mb-20"
          >
            <span className="text-xs tracking-[0.2em] text-accent uppercase mb-2 block">
              New Arrivals
            </span>
            <h2 className="text-3xl md:text-4xl font-[family-name:var(--font-playfair)] tracking-wide text-foreground mb-4">
              The Latest Collection
            </h2>
            <p className="text-secondary max-w-md mx-auto text-sm leading-relaxed">
              Discover our premium pieces crafted with meticulous attention to detail
            </p>
          </motion.div>

          {products.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {products.map((product, index) => (
                <ProductCard key={product.id} product={product} index={index} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 lg:py-20 text-secondary">
              <p className="text-lg font-[family-name:var(--font-playfair)]">No featured pieces yet</p>
            </div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="text-center mt-16 lg:mt-20"
          >
            <Link
              href="/shop"
              className="inline-flex items-center gap-2 px-8 py-2 border-2 border-accent text-accent text-sm tracking-wider uppercase font-medium rounded-full hover:bg-accent hover:text-white transition-all duration-300 group"
            >
              View All Pieces
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 group-hover:translate-x-1 transition-transform">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Editorial Section */}
      <section className="py-12 lg:py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-16 lg:gap-20 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.7, ease: "easeOut" }}
            >
              <span className="text-xs tracking-[0.2em] text-accent uppercase mb-2 block">
                Our Philosophy
              </span>
              <h2 className="text-3xl md:text-4xl font-[family-name:var(--font-playfair)] tracking-wide text-foreground mb-6">
                Timeless Elegance
              </h2>
              <p className="text-secondary leading-relaxed mb-6">
                Our collection represents the perfect balance between modern design and classic elegance.
                Each piece is carefully crafted using premium materials to ensure lasting quality and comfort.
              </p>
              <p className="text-secondary leading-relaxed">
                Discover the OG difference — where luxury meets simplicity.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="relative aspect-[4/5] rounded-2xl overflow-hidden shadow-md group"
            >
              <Image
                src="/images/logo.jpeg"
                alt="OG Brand"
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-accent/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-16 lg:py-20 px-4 md:px-6 bg-card">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mx-auto text-center"
        >
          <h2 className="text-3xl md:text-4xl font-[family-name:var(--font-playfair)] text-foreground mb-4">
            Ready to Elevate Your Style?
          </h2>
          <p className="text-secondary mb-8 text-sm">
            Join the community of discerning individuals who choose OG.
          </p>
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 px-8 py-4 bg-accent text-white text-sm tracking-wider uppercase font-medium rounded-full hover:bg-accent-deep transition-all duration-300 shadow-md hover:shadow-lg"
          >
            Explore Collection
          </Link>
        </motion.div>
      </section>
      <RecentlyViewed />
    </div>
  );
}

function HeroSection() {
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 500], [0, -50]);
  const opacity = useTransform(scrollY, [0, 300], [1, 0.3]);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image with Filters */}
      <motion.div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: 'url(/images/background.jpeg)',
          y,
          filter: 'grayscale(30%) brightness(1.15) saturate(0.7)',
        }}
      />
      
      {/* Soft White Overlay with slight blur edges */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-white/40 to-white/80 z-10" />
      
      {/* Subtle radial light effect */}
      <div className="absolute inset-0 bg-radial-gradient from-transparent via-transparent to-white/30 z-10" />

      {/* Content */}
      <motion.div
        style={{ opacity }}
        className="relative z-20 text-center px-6"
      >
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-5xl sm:text-6xl md:text-8xl font-[family-name:var(--font-playfair)] tracking-[0.15em] text-foreground mb-4"
        >
          OG
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-xs tracking-[0.5em] text-accent uppercase mb-6 font-medium"
        >
          Old Gold
        </motion.p>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-secondary text-base md:text-lg max-w-lg mx-auto mb-8 font-light leading-relaxed"
        >
          Premium clothing for the modern minimalist
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="flex flex-col sm:flex-row gap-2 sm:gap-4 justify-center"
          >
            <Link
              href="/shop"
              className="px-8 py-2 bg-accent text-white text-sm font-semibold tracking-wider uppercase rounded-full hover:bg-accent-deep transition-all duration-300 shadow-md hover:shadow-lg"
            >
              Shop Now
            </Link>
            <Link
              href="/shop"
              className="px-8 py-2 border-2 border-accent text-accent text-sm font-semibold tracking-wider uppercase rounded-full hover:bg-accent hover:text-white transition-all duration-300"
            >
              View Collection
            </Link>
        </motion.div>
      </motion.div>

      {/* Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20"
      >
        <div className="w-6 h-10 border-2 border-accent/40 rounded-full flex justify-center pt-2">
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            className="w-1.5 h-1.5 bg-accent rounded-full"
          />
        </div>
      </motion.div>
    </section>
  );
}
