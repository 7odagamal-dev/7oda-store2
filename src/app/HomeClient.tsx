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
      <section className="py-24 px-6 sm:px-8 lg:px-10 bg-white">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="text-center mb-14"
          >
            <span className="text-xs tracking-[0.2em] text-[#8BA4B8] uppercase mb-3 block">
              New Arrivals
            </span>
            <h2 className="text-3xl md:text-4xl font-[family-name:var(--font-playfair)] tracking-wide text-[#1A1A1A] mb-4">
              The Latest Collection
            </h2>
            <p className="text-[#6B7280] max-w-md mx-auto text-sm leading-relaxed">
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
            <div className="text-center py-16 text-[#9CA3AF]">
              <p className="text-lg font-[family-name:var(--font-playfair)]">No featured pieces yet</p>
            </div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="text-center mt-12"
          >
            <Link
              href="/shop"
              className="inline-flex items-center gap-2 px-8 py-3 border-2 border-[#8BA4B8] text-[#8BA4B8] text-sm tracking-wider uppercase font-medium rounded-full hover:bg-[#8BA4B8] hover:text-white transition-all duration-300 group"
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
      <section className="py-24 px-6 sm:px-8 lg:px-10 bg-[#F8F9FB]">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-14 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.7, ease: "easeOut" }}
            >
              <span className="text-xs tracking-[0.2em] text-[#8BA4B8] uppercase mb-3 block">
                Our Philosophy
              </span>
              <h2 className="text-3xl md:text-4xl font-[family-name:var(--font-playfair)] tracking-wide text-[#1A1A1A] mb-6">
                Timeless Elegance
              </h2>
              <p className="text-[#6B7280] leading-relaxed mb-5">
                Our collection represents the perfect balance between modern design and classic elegance.
                Each piece is carefully crafted using premium materials to ensure lasting quality and comfort.
              </p>
              <p className="text-[#6B7280] leading-relaxed">
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
              <div className="absolute inset-0 bg-gradient-to-t from-[#8BA4B8]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-20 px-6 sm:px-8 lg:px-10 bg-white">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mx-auto text-center"
        >
          <h2 className="text-3xl md:text-4xl font-[family-name:var(--font-playfair)] text-[#1A1A1A] mb-4">
            Ready to Elevate Your Style?
          </h2>
          <p className="text-[#6B7280] mb-8 text-sm">
            Join the community of discerning individuals who choose OG.
          </p>
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 px-10 py-4 bg-[#8BA4B8] text-white text-sm tracking-wider uppercase font-medium rounded-full hover:bg-[#6B8BA0] transition-all duration-300 shadow-md hover:shadow-lg"
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
    <section className="relative h-screen flex items-center justify-center overflow-hidden">
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
          className="text-6xl md:text-8xl font-[family-name:var(--font-playfair)] tracking-[0.15em] text-[#1A1A1A] mb-4"
        >
          OG
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-xs tracking-[0.5em] text-[#8BA4B8] uppercase mb-6 font-medium"
        >
          Old Gold
        </motion.p>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-[#6B7280] text-base md:text-lg max-w-lg mx-auto mb-10 font-light leading-relaxed"
        >
          Premium clothing for the modern minimalist
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <Link
            href="/shop"
            className="px-9 py-3.5 bg-[#8BA4B8] text-white text-sm font-semibold tracking-wider uppercase rounded-full hover:bg-[#6B8BA0] transition-all duration-300 shadow-md hover:shadow-lg"
          >
            Shop Now
          </Link>
          <Link
            href="/shop"
            className="px-9 py-3.5 border-2 border-[#8BA4B8] text-[#8BA4B8] text-sm font-semibold tracking-wider uppercase rounded-full hover:bg-[#8BA4B8] hover:text-white transition-all duration-300"
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
        <div className="w-6 h-10 border-2 border-[#8BA4B8]/40 rounded-full flex justify-center pt-2">
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            className="w-1.5 h-1.5 bg-[#8BA4B8] rounded-full"
          />
        </div>
      </motion.div>
    </section>
  );
}
