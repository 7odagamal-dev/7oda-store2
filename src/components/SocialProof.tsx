'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

const RECENT_MESSAGES = [
  'Someone just purchased this item',
  'Almost sold out — popular today',
  'Trending right now in Egypt',
];

interface SocialProofProps {
  productId?: string;
  productName?: string;
  todaySales?: number;
}

export default function SocialProof({ productId, todaySales = 0 }: SocialProofProps) {
  const [show, setShow] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!productId) return;

    // Show after 6 seconds
    const showTimer = setTimeout(() => {
      const hasDismissed = sessionStorage.getItem(`og-social-${productId}`);
      if (hasDismissed) return;

      // Pick a message based on sales data
      const msgs: string[] = [];
      if (todaySales > 0) {
        msgs.push(`🔥 ${todaySales} purchased today`);
      }
      msgs.push(...RECENT_MESSAGES);

      const idx = Math.floor(Math.random() * msgs.length);
      setMessage(msgs[idx]);
      setShow(true);
    }, 6000);

    // Auto-dismiss after 5 seconds
    const dismissTimer = setTimeout(() => {
      setShow(false);
      if (productId) sessionStorage.setItem(`og-social-${productId}`, 'true');
    }, 11000);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(dismissTimer);
    };
  }, [productId, todaySales]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 10, x: -20 }}
          animate={{ opacity: 1, y: 0, x: 0 }}
          exit={{ opacity: 0, y: 10, x: -20 }}
          className="fixed bottom-24 left-6 z-50 max-w-[260px]"
        >
          <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-lg px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse shrink-0" />
              <p className="text-xs text-[#6B7280] leading-relaxed">{message}</p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
