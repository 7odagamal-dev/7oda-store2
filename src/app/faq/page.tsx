'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

const faqs = [
  {
    category: 'Orders & Payment',
    items: [
      { q: 'What payment methods do you accept?', a: 'We accept Cash on Delivery (COD) for all governorates, and Online Transfer via Vodafone Cash or InstaPay. Payment gateway integration is coming soon.' },
      { q: 'Can I change or cancel my order after placing it?', a: 'Please contact us within 1 hour of placing your order. Once the order is processed or shipped, changes cannot be made.' },
      { q: 'How do I use a coupon code?', a: 'Enter your coupon code in the "Coupon code" field at checkout and click Apply. The discount will be reflected in your order total.' },
      { q: 'What currency are prices shown in?', a: 'All prices are in Egyptian Pounds (EGP) and include applicable taxes.' },
    ],
  },
  {
    category: 'Shipping & Delivery',
    items: [
      { q: 'How long does delivery take?', a: 'Delivery takes 1–7 business days depending on your governorate. Alexandria and Cairo typically arrive in 1–2 days, while Upper Egypt and remote areas may take up to 7 days.' },
      { q: 'How much does shipping cost?', a: 'Shipping costs vary by governorate, starting from EGP 40 for Alexandria up to EGP 100 for remote areas. The exact cost is calculated at checkout.' },
      { q: 'Do you ship outside Egypt?', a: 'Currently, we only ship within Egypt. International shipping is not yet available.' },
      { q: 'Can I track my order?', a: 'Yes! Use the tracking page with your order ID to check your order status. You can also message us on Instagram for updates.' },
    ],
  },
  {
    category: 'Returns & Exchanges',
    items: [
      { q: 'What is your return policy?', a: 'We accept returns within 14 days of delivery. Items must be unworn, unwashed, and in their original packaging with tags attached.' },
      { q: 'How do I start a return?', a: 'Message us on Instagram with your order ID and reason for return. We will guide you through the process.' },
      { q: 'Who pays for return shipping?', a: 'The customer is responsible for return shipping costs unless the item is defective or we made an error with your order.' },
      { q: 'When will I get my refund?', a: 'Refunds are processed within 3–5 business days after we receive and inspect the returned item. The amount is transferred via Vodafone Cash or InstaPay.' },
    ],
  },
  {
    category: 'Sizing & Product',
    items: [
      { q: 'How do I find my correct size?', a: 'Check our Size Guide page for detailed measurements for each product. If you are between sizes, we recommend sizing up for a relaxed fit.' },
      { q: 'Are the products true to size?', a: 'Yes, our products follow standard sizing. However, some styles may have a different fit — please refer to the product description and size guide.' },
      { q: 'How do I care for my OG Old Gold products?', a: 'We recommend washing inside out in cold water, avoiding bleach, and hang drying to preserve print quality and fabric longevity.' },
    ],
  },
];

export default function FaqPage() {
  const [openIndex, setOpenIndex] = useState<{ category: number; item: number } | null>(null);

  return (
    <div className="min-h-screen bg-[#F8F9FB] pt-28 pb-20">
      <div className="max-w-3xl mx-auto px-6 sm:px-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="text-3xl font-[family-name:var(--font-playfair)] text-[#1A1A1A] mb-2">Frequently Asked Questions</h1>
          <p className="text-[#6B7280] text-sm mb-10">
            Can&apos;t find what you&apos;re looking for?{' '}
            <Link href="/contact" className="text-[#8BA4B8] underline underline-offset-2">Contact us</Link>
          </p>

          <div className="space-y-8">
            {faqs.map((category, catIdx) => (
              <section key={category.category}>
                <h2 className="text-lg font-[family-name:var(--font-playfair)] text-[#1A1A1A] mb-4">{category.category}</h2>
                <div className="space-y-2">
                  {category.items.map((item, itemIdx) => {
                    const isOpen = openIndex?.category === catIdx && openIndex?.item === itemIdx;
                    return (
                      <motion.div key={itemIdx} className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden shadow-sm">
                        <button
                          onClick={() => setOpenIndex(isOpen ? null : { category: catIdx, item: itemIdx })}
                          className="w-full flex items-center justify-between px-5 py-4 text-left text-sm font-medium text-[#1A1A1A] hover:bg-[#F8F9FB] transition-colors"
                        >
                          <span>{item.q}</span>
                          <svg
                            className={`w-4 h-4 text-[#9CA3AF] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                            fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                          </svg>
                        </button>
                        <AnimatePresence>
                          {isOpen && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <p className="px-5 pb-4 text-sm text-[#6B7280] leading-relaxed border-t border-[#F0F0F0] pt-3">
                                {item.a}
                              </p>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
