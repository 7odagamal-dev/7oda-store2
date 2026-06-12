'use client';

import Link from 'next/link';

const CATEGORIES = [
  {
    name: 'T-Shirts',
    slug: 'tshirts',
    gradient: 'from-[#8BA4B8] to-[#6B8BA0]',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.2} stroke="currentColor" className="w-10 h-10">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-3a2.25 2.25 0 0 0-2.25 2.25V9M3.75 9l2.25 12h12l2.25-12M3.75 9h16.5" />
      </svg>
    ),
  },
  {
    name: 'Hoodies',
    slug: 'hoodies',
    gradient: 'from-[#6B8BA0] to-[#4A6B7E]',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.2} stroke="currentColor" className="w-10 h-10">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-3a2.25 2.25 0 0 0-2.25 2.25V9m-3 0h16.5m-16.5 0H3l2.25 12h13.5L21 9H5.25Z" />
      </svg>
    ),
  },
  {
    name: 'Jackets',
    slug: 'jackets',
    gradient: 'from-[#4A6B7E] to-[#2D4A5C]',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.2} stroke="currentColor" className="w-10 h-10">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
      </svg>
    ),
  },
  {
    name: 'Accessories',
    slug: 'accessories',
    gradient: 'from-[#8BA4B8] to-[#4A6B7E]',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.2} stroke="currentColor" className="w-10 h-10">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 0 0-5.78 1.128 2.25 2.25 0 0 1-2.4 2.245 4.5 4.5 0 0 0 8.4-2.245c0-.399-.078-.78-.22-1.128Zm0 0a15.998 15.998 0 0 0 3.388-1.62m-5.043-.025a15.994 15.994 0 0 1 1.622-3.395m3.42 3.42a15.995 15.995 0 0 0 4.764-4.648l3.876-5.814a1.151 1.151 0 0 0-1.597-1.597L14.146 6.32a15.996 15.996 0 0 0-4.649 4.763m3.42 3.42a6.776 6.776 0 0 0-3.42-3.42" />
      </svg>
    ),
  },
];

export default function CategoriesGrid() {
  return (
    <section className="py-12 lg:py-16 bg-background">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
        <div className="text-center mb-10">
          <span className="text-xs tracking-[0.2em] text-accent uppercase mb-2 block font-semibold">Collections</span>
          <h2 className="text-3xl md:text-4xl font-[family-name:var(--font-playfair)] tracking-wide text-foreground mb-3">
            Shop by Category
          </h2>
          <p className="text-secondary max-w-md mx-auto text-sm leading-relaxed">
            Find your perfect look from our curated collections
          </p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.slug}
              href={`/shop?category=${cat.slug}`}
              className="group relative block aspect-[4/3] rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-500"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${cat.gradient} transition-transform duration-500 group-hover:scale-105`} />
              <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors duration-300" />
              <div className="relative h-full flex flex-col items-center justify-center text-white p-6">
                <div className="mb-2 opacity-80 group-hover:opacity-100 transition-opacity duration-300 group-hover:scale-110 transition-transform duration-300">
                  {cat.icon}
                </div>
                <h3 className="text-lg font-semibold text-white">{cat.name}</h3>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 group-hover:bg-white/40 transition-colors duration-300" />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
