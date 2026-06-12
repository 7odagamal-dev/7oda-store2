'use client';

import { useState, useEffect } from 'react';

const TESTIMONIALS = [
  { name: 'Omar H.', rating: 5, comment: 'The quality of the fabric is unmatched. I\'ve never felt anything like it. Definitely my new go-to brand.' },
  { name: 'Laila M.', rating: 5, comment: 'Fast delivery and the piece fits perfectly. The attention to detail is incredible.' },
  { name: 'Karim A.', rating: 5, comment: 'I bought the oversized hoodie and it\'s hands down the most comfortable piece I own. Worth every EGP.' },
  { name: 'Nour S.', rating: 4, comment: 'Great quality and stylish designs. The sizing guide was accurate and helpful.' },
  { name: 'Youssef W.', rating: 5, comment: '7H is redefining Egyptian streetwear. Proud to wear a local brand that competes internationally.' },
  { name: 'Dalia R.', rating: 5, comment: 'Bought a bundle set and the discount was amazing. Everything fits perfectly together.' },
];

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} viewBox="0 0 20 20" fill={i < rating ? '#8BA4B8' : '#E5E7EB'} className="w-4 h-4">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

export default function TestimonialsCarousel() {
  const [current, setCurrent] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(1);

  useEffect(() => {
    setItemsPerPage(window.innerWidth >= 768 ? 2 : 1);
    const handleResize = () => setItemsPerPage(window.innerWidth >= 768 ? 2 : 1);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const totalPages = Math.ceil(TESTIMONIALS.length / itemsPerPage);
  const next = () => setCurrent((prev) => (prev + 1 >= totalPages ? 0 : prev + 1));
  const prev = () => setCurrent((prev) => (prev - 1 < 0 ? totalPages - 1 : prev - 1));
  const visible = TESTIMONIALS.slice(current * itemsPerPage, current * itemsPerPage + itemsPerPage);

  return (
    <section className="py-12 lg:py-16 bg-card">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
        <div className="text-center mb-10">
          <span className="text-xs tracking-[0.2em] text-accent uppercase mb-2 block font-semibold">Testimonials</span>
          <h2 className="text-3xl md:text-4xl font-[family-name:var(--font-playfair)] tracking-wide text-foreground mb-3">
            What Our Customers Say
          </h2>
          <p className="text-secondary max-w-md mx-auto text-sm leading-relaxed">Real reviews from real people who love 7H</p>
        </div>
        <div className="relative max-w-3xl mx-auto">
          <div className="grid md:grid-cols-2 gap-6">
            {visible.map((t) => (
              <div key={t.name} className="bg-background rounded-2xl p-6 border border-[#E5E7EB] shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-accent-light flex items-center justify-center text-accent-deep text-sm font-semibold">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{t.name}</p>
                    <Stars rating={t.rating} />
                  </div>
                </div>
                <p className="text-sm text-secondary leading-relaxed italic">&ldquo;{t.comment}&rdquo;</p>
              </div>
            ))}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-8">
              <button onClick={prev} className="w-10 h-10 rounded-full border border-[#E5E7EB] flex items-center justify-center text-secondary hover:text-foreground hover:border-accent transition-all duration-300" aria-label="Previous">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                </svg>
              </button>
              <div className="flex gap-2">
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button key={i} onClick={() => setCurrent(i)}
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${i === current ? 'bg-accent w-6' : 'bg-[#E5E7EB]'}`}
                    aria-label={`Go to slide ${i + 1}`} />
                ))}
              </div>
              <button onClick={next} className="w-10 h-10 rounded-full border border-[#E5E7EB] flex items-center justify-center text-secondary hover:text-foreground hover:border-accent transition-all duration-300" aria-label="Next">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
