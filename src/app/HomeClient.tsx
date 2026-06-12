'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useState, useEffect } from 'react';
import type { Product } from '@/lib/supabase';
import ProductCard from '@/components/ProductCard';
import RecentlyViewed from '@/components/RecentlyViewed';
import CountdownTimer from '@/components/CountdownTimer';
import { BundleCard } from '@/components/BundleDisplay';
import FeaturesBar from '@/components/FeaturesBar';
import CategoriesGrid from '@/components/CategoriesGrid';
import TestimonialsCarousel from '@/components/TestimonialsCarousel';
import AnimatedSection from '@/components/AnimatedSection';
import SectionHeader from '@/components/SectionHeader';

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

      <FeaturesBar />

      <CategoriesGrid />

      {flashSaleProducts.length > 0 && earliestEnd && (
        <section className="py-16 lg:py-24 bg-gradient-to-br from-[#C8D9E6]/30 via-white to-[#8BA4B8]/20">
          <div className="fsa-container">
            <AnimatedSection>
              <SectionHeader
                label="Limited Time"
                heading="Flash Sale"
              />
              <div className="flex justify-center mb-10">
                <CountdownTimer endsAt={earliestEnd} />
              </div>
            </AnimatedSection>
            <AnimatedSection delay={0.2}>
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
            </AnimatedSection>
            <AnimatedSection delay={0.3}>
              <div className="text-center mt-10">
                <Link
                  href="/shop"
                  className="inline-flex items-center gap-2 px-8 py-2 border-2 border-accent text-accent text-sm tracking-wider uppercase font-medium rounded-full hover:bg-accent hover:text-white transition-all duration-300 group"
                >
                  View All Sales
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 group-hover:translate-x-1 transition-transform">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                  </svg>
                </Link>
              </div>
            </AnimatedSection>
          </div>
        </section>
      )}

      <section className="py-16 lg:py-24 bg-card">
        <div className="fsa-container">
          <AnimatedSection>
            <SectionHeader
              label="New Arrivals"
              heading="The Latest Collection"
              description="Discover our premium pieces crafted with meticulous attention to detail"
            />
          </AnimatedSection>

          <AnimatedSection delay={0.2}>
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
          </AnimatedSection>

          <AnimatedSection delay={0.3}>
            <div className="text-center mt-16 lg:mt-20">
              <Link
                href="/shop"
                className="inline-flex items-center gap-2 px-8 py-2 border-2 border-accent text-accent text-sm tracking-wider uppercase font-medium rounded-full hover:bg-accent hover:text-white transition-all duration-300 group"
              >
                View All Pieces
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 group-hover:translate-x-1 transition-transform">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                </svg>
              </Link>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {bundles.length > 0 && (
        <section className="py-16 lg:py-24 bg-background">
          <div className="fsa-container">
            <AnimatedSection>
              <SectionHeader
                label="Bundle & Save"
                heading="Complete Sets"
                description="Curated looks at exclusive bundle prices"
              />
            </AnimatedSection>
            <AnimatedSection delay={0.2}>
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
            </AnimatedSection>
            <AnimatedSection delay={0.3}>
              <div className="text-center mt-10">
                <Link
                  href="/bundles"
                  className="inline-flex items-center gap-2 px-8 py-2 border-2 border-accent text-accent text-sm tracking-wider uppercase font-medium rounded-full hover:bg-accent hover:text-white transition-all duration-300 group"
                >
                  View All Bundles
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 group-hover:translate-x-1 transition-transform">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                  </svg>
                </Link>
              </div>
            </AnimatedSection>
          </div>
        </section>
      )}

      <section className="py-16 lg:py-24 bg-card">
        <div className="fsa-container">
          <div className="grid md:grid-cols-2 gap-16 lg:gap-20 items-center">
            <AnimatedSection>
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
                Discover the 7H difference � where luxury meets simplicity.
              </p>
            </AnimatedSection>

            <AnimatedSection delay={0.2}>
              <div className="relative aspect-[4/5] rounded-2xl overflow-hidden shadow-md group">
                <Image
                  src="/images/logo_app.jpeg?v=4"
                  alt="7H Brand"
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-accent/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      <TestimonialsCarousel />

      <section className="py-16 lg:py-24 bg-gradient-to-r from-[#8BA4B8] to-[#6B8A9E]">
        <div className="fsa-container">
          <AnimatedSection>
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-[family-name:var(--font-playfair)] tracking-wide text-white mb-4">
                Ready to Elevate Your Style?
              </h2>
              <p className="text-white/80 mb-8 text-lg">
                Join the community of discerning individuals who choose 7H.
              </p>
              <Link
                href="/shop"
                className="inline-flex items-center gap-2 px-8 py-4 bg-white text-[#8BA4B8] text-sm tracking-wider uppercase font-medium rounded-full hover:bg-white/90 transition-all duration-300 shadow-md hover:shadow-lg"
              >
                Explore Collection
              </Link>
            </div>
          </AnimatedSection>
        </div>
      </section>

      <RecentlyViewed />
    </div>
  );
}

function HeroSection() {
  const [isMobile, setIsMobile] = useState(true);

  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 500], [0, isMobile ? 0 : -50]);
  const opacity = useTransform(scrollY, [0, 300], [1, isMobile ? 1 : 0.3]);

  const [scrollIndicatorVisible, setScrollIndicatorVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setScrollIndicatorVisible(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#1A1A1A]">
      <motion.div className="absolute inset-0" style={{ y }}>
        <Image
          src="/images/background.jpeg?v=2"
          alt="7H Background"
          fill
          priority
          quality={90}
          className="object-cover"
          
          // style={{ filter: 'grayscale(1%) brightness(1.01) saturate(0.7)' }}
          sizes="100vw"
        />
      </motion.div>

      {/* <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-white/10 to-white/50 z-10" /> */}
      {/* <div className="absolute inset-0 bg-radial-gradient from-transparent via-transparent to-white/30 z-10" /> */}

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
          7H
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-xs tracking-[0.5em] text-accent uppercase mb-6 font-medium"
        >
          
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
            className="inline-flex items-center justify-center min-h-[48px] min-w-[120px] px-8 py-2 bg-accent text-white text-sm font-semibold tracking-wider uppercase rounded-full hover:bg-accent-deep hover:scale-105 transition-all duration-300 shadow-md hover:shadow-lg"
          >
            Shop Now
          </Link>
          <Link
            href="/shop"
            className="inline-flex items-center justify-center min-h-[48px] min-w-[120px] px-8 py-2 border-2 border-accent text-accent text-sm font-semibold tracking-wider uppercase rounded-full hover:bg-accent hover:text-white hover:scale-105 transition-all duration-300"
          >
            View Collection
          </Link>
        </motion.div>
      </motion.div>

      {scrollIndicatorVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 hidden md:block"
        >
          <div className="w-6 h-10 border-2 border-accent/40 rounded-full flex justify-center pt-2">
            <motion.div
              animate={{ y: [0, 6, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              className="w-1.5 h-1.5 bg-accent rounded-full"
            />
          </div>
        </motion.div>
      )}
    </section>
  );
}
