'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

export default function NewsletterPopup() {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin');
  const [isVisible, setIsVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [step, setStep] = useState<'form' | 'success' | 'error'>('form');
  const [discountCode, setDiscountCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [swipeStart, setSwipeStart] = useState(0);

  useEffect(() => {
    if (isAdmin || typeof window === 'undefined') return;
    const dismissed = localStorage.getItem('og-newsletter-dismissed');
    if (dismissed === 'true') return;

    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 30000);

    return () => clearTimeout(timer);
  }, [isAdmin]);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('og-newsletter-dismissed', 'true');
  };

  const handleSubmit = async () => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setMessage('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setMessage('');

    if (!password || password.length < 6) {
      setMessage('Password must be at least 6 characters');
      return;
    }

    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), name: name.trim() || undefined, password }),
      });

      const data = await res.json();

      if (res.ok) {
        setDiscountCode(data.discountCode);
        setMessage(data.message);
        setStep('success');
        localStorage.setItem('og-newsletter-dismissed', 'true');
      } else {
        setMessage(data.error || 'Something went wrong. Please try again.');
        setStep('error');
      }
    } catch {
      setMessage('Something went wrong. Please try again.');
      setStep('error');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (discountCode) {
      navigator.clipboard.writeText(discountCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60]"
            onClick={handleDismiss}
          />
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.95 }}
            className="fixed bottom-0 sm:bottom-8 sm:right-8 left-0 sm:left-auto z-[70] mx-4 sm:mx-0"
            onTouchStart={(e) => setSwipeStart(e.touches[0].clientY)}
            onTouchMove={(e) => { if (e.touches[0].clientY - swipeStart > 100) handleDismiss(); }}
          >
            <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl border border-[#E5E7EB] max-w-sm w-full sm:w-[380px] overflow-hidden">
              <button
                onClick={handleDismiss}
                aria-label="Close newsletter"
                className="touch-target absolute top-3 right-3 text-[#9CA3AF] hover:text-[#1A1A1A] transition-colors z-10"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {step === 'form' && (
                <div className="p-6">
                  <div className="w-12 h-12 bg-[#d4af37]/10 rounded-xl flex items-center justify-center mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="#d4af37" className="w-6 h-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-[#1A1A1A] mb-1">Get 10% OFF</h3>
                  <p className="text-sm text-[#6B7280] mb-5">Subscribe and get a discount code for your first order.</p>

                  <div className="space-y-3">
                    <div>
                      <input
                        type="text"
                        placeholder="Your name (optional)"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        className="w-full px-4 py-3 bg-[#F8F9FB] border border-[#E5E7EB] rounded-xl text-sm text-[#1A1A1A] placeholder-[#9CA3AF] focus:border-[#8BA4B8] focus:outline-none transition-all"
                        onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                      />
                    </div>
                    <div>
                      <input
                        type="email"
                        placeholder="your@email.com"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="w-full px-4 py-3 bg-[#F8F9FB] border border-[#E5E7EB] rounded-xl text-sm text-[#1A1A1A] placeholder-[#9CA3AF] focus:border-[#8BA4B8] focus:outline-none transition-all"
                        onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                      />
                    </div>
                    <div>
                      <input
                        type="password"
                        placeholder="Create a password (min 6 characters)"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="w-full px-4 py-3 bg-[#F8F9FB] border border-[#E5E7EB] rounded-xl text-sm text-[#1A1A1A] placeholder-[#9CA3AF] focus:border-[#8BA4B8] focus:outline-none transition-all"
                        onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                      />
                    </div>
                    {message && (
                      <p className="text-xs text-rose-500">{message}</p>
                    )}
                    <button
                      onClick={handleSubmit}
                      disabled={loading || !email}
                      className="w-full py-3 bg-[#1A1A1A] text-white rounded-xl text-sm font-semibold hover:bg-[#333] transition-all disabled:opacity-50"
                    >
                      {loading ? 'Subscribing...' : 'Get 10% OFF'}
                    </button>
                    <p className="text-[10px] text-[#9CA3AF] text-center">No spam. Unsubscribe anytime.</p>
                  </div>
                </div>
              )}

              {step === 'success' && (
                <div className="p-6 text-center">
                  <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="#10b981" className="w-8 h-8">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-[#1A1A1A] mb-1">You're in!</h3>
                  <p className="text-sm text-[#6B7280] mb-5">{message}</p>

                  <div className="bg-[#F8F9FB] border border-[#E5E7EB] rounded-xl p-4 mb-4">
                    <p className="text-xs text-[#9CA3AF] mb-2">Your discount code</p>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-lg font-bold font-mono tracking-wider text-[#1A1A1A]">{discountCode}</span>
                      <button
                        onClick={handleCopyCode}
                        className="px-4 py-2 bg-[#1A1A1A] text-white rounded-lg text-xs font-semibold hover:bg-[#333] transition-all"
                      >
                        {copied ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  </div>
                  <p className="text-[10px] text-[#9CA3AF]">Use this code at checkout to get 10% off your order.</p>
                </div>
              )}

              {step === 'error' && (
                <div className="p-6">
                  <div className="w-12 h-12 bg-rose-50 rounded-xl flex items-center justify-center mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-rose-500">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-[#1A1A1A] mb-1">Oops!</h3>
                  <p className="text-sm text-[#6B7280] mb-5">{message}</p>
                  <button
                    onClick={() => { setStep('form'); setMessage(''); }}
                    className="w-full py-3 bg-[#1A1A1A] text-white rounded-xl text-sm font-semibold hover:bg-[#333] transition-all"
                  >
                    Try Again
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
