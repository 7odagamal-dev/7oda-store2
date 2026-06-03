'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion, useScroll, useTransform } from 'framer-motion';
import type { Product } from '@/lib/supabase';
import ProductCard from '@/components/ProductCard';
import RecentlyViewed from '@/components/RecentlyViewed';

export default function HomeClient({ products }: { products: Product[] }) {
  return (
    <div className="min-h-screen">
      <HeroSection />
      
      {/* Featured Collection */}
      <section className="fsa-section bg-card">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="text-center mb-[var(--space-3xl)]"
          >
            <span className="text-[var(--text-xs)] tracking-[0.2em] text-accent uppercase mb-[var(--space-sm)] block">
              New Arrivals
            </span>
            <h2 className="text-[var(--text-3xl)] md:text-[var(--text-4xl)] font-[family-name:var(--font-playfair)] tracking-wide text-foreground mb-[var(--space-md)]">
              The Latest Collection
            </h2>
            <p className="text-secondary max-w-md mx-auto text-[var(--text-sm)] leading-relaxed">
              Discover our premium pieces crafted with meticulous attention to detail
            </p>
          </motion.div>

          {products.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[var(--space-lg)]">
              {products.map((product, index) => (
                <ProductCard key={product.id} product={product} index={index} />
              ))}
            </div>
          ) : (
            <div className="text-center py-[var(--space-3xl)] text-secondary">
              <p className="text-[var(--text-lg)] font-[family-name:var(--font-playfair)]">No featured pieces yet</p>
            </div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="text-center mt-[var(--space-3xl)]"
          >
            <Link
              href="/shop"
              className="inline-flex items-center gap-[var(--space-sm)] px-[var(--space-xl)] py-[var(--space-sm)] border-2 border-accent text-accent text-[var(--text-sm)] tracking-wider uppercase font-medium rounded-full hover:bg-accent hover:text-white transition-all duration-300 group"
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
      <section className="fsa-section bg-background">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-[var(--space-3xl)] items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.7, ease: "easeOut" }}
            >
              <span className="text-[var(--text-xs)] tracking-[0.2em] text-accent uppercase mb-[var(--space-sm)] block">
                Our Philosophy
              </span>
              <h2 className="text-[var(--text-3xl)] md:text-[var(--text-4xl)] font-[family-name:var(--font-playfair)] tracking-wide text-foreground mb-[var(--space-lg)]">
                Timeless Elegance
              </h2>
              <p className="text-secondary leading-relaxed mb-[var(--space-lg)]">
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
              className="relative aspect-[4/5] rounded-[var(--radius-xl)] overflow-hidden shadow-md group"
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
      <section className="py-[var(--space-3xl)] px-[var(--container-padding)] bg-card">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mx-auto text-center"
        >
          <h2 className="text-[var(--text-3xl)] md:text-[var(--text-4xl)] font-[family-name:var(--font-playfair)] text-foreground mb-[var(--space-md)]">
            Ready to Elevate Your Style?
          </h2>
          <p className="text-secondary mb-[var(--space-xl)] text-[var(--text-sm)]">
            Join the community of discerning individuals who choose OG.
          </p>
          <Link
            href="/shop"
            className="inline-flex items-center gap-[var(--space-sm)] px-[var(--space-xl)] py-[var(--space-md)] bg-accent text-white text-[var(--text-sm)] tracking-wider uppercase font-medium rounded-full hover:bg-accent-deep transition-all duration-300 shadow-md hover:shadow-lg"
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
    <section className="relative min-h-screen md:h-screen flex items-center justify-center overflow-hidden">
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
        className="relative z-20 text-center px-[var(--space-lg)]"
      >
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-[var(--text-4xl)] sm:text-6xl md:text-8xl font-[family-name:var(--font-playfair)] tracking-[0.15em] text-foreground mb-[var(--space-md)]"
        >
          OG
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-[var(--text-xs)] tracking-[0.5em] text-accent uppercase mb-[var(--space-lg)] font-medium"
        >
          Old Gold
        </motion.p>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-secondary text-[var(--text-base)] md:text-[var(--text-lg)] max-w-lg mx-auto mb-[var(--space-xl)] font-light leading-relaxed"
        >
          Premium clothing for the modern minimalist
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="flex flex-col sm:flex-row gap-[var(--space-sm)] sm:gap-[var(--space-md)] justify-center"
          >
            <Link
              href="/shop"
              className="px-[var(--space-xl)] py-[var(--space-sm)] bg-accent text-white text-[var(--text-sm)] font-semibold tracking-wider uppercase rounded-full hover:bg-accent-deep transition-all duration-300 shadow-md hover:shadow-lg"
            >
              Shop Now
            </Link>
            <Link
              href="/shop"
              className="px-[var(--space-xl)] py-[var(--space-sm)] border-2 border-accent text-accent text-[var(--text-sm)] font-semibold tracking-wider uppercase rounded-full hover:bg-accent hover:text-white transition-all duration-300"
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
