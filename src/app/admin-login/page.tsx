'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

export default function AdminLogin() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const router = useRouter();

  // Redirect to admin if already logged in
  useEffect(() => {
    fetch('/api/admin/verify', { method: 'GET' })
      .then((res) => res.json())
      .then((data) => {
        if (data.valid) {
          router.replace('/admin');
        } else {
          setChecking(false);
        }
      })
      .catch(() => setChecking(false));
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (res.status === 429) {
        setError('Too many failed attempts. Please try again in 15 minutes.');
        return;
      }

      if (res.ok && data.success) {
        router.push('/admin');
        return;
      }

      if (res.status === 503 || res.status === 500) {
        const msg =
          typeof data?.error === 'string' && data.error
            ? data.error
            : 'Server error. Check Supabase settings and try again.';
        const hint = typeof data?.hint === 'string' && data.hint ? `\n\n${data.hint}` : '';
        const dbg =
          process.env.NODE_ENV === 'development' &&
          typeof (data as { debug?: string }).debug === 'string'
            ? `\n\n[Dev details] ${(data as { debug: string }).debug}${
                (data as { code?: string }).code ? ` (${(data as { code: string }).code})` : ''
              }`
            : '';
        setError(msg + hint + dbg);
        return;
      }

      setError(
        typeof data?.error === 'string' && data.error ? data.error : 'Invalid password'
      );
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-[#F8F9FB] flex items-center justify-center">
        <motion.div
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="text-[#8BA4B8] text-sm tracking-widest font-medium"
        >
          VERIFYING...
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FB] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-full max-w-md"
      >
        {/* Login card */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-[family-name:var(--font-playfair)] tracking-[0.15em] text-[#1A1A1A] mb-1">
              7H
            </h1>
            <p className="text-xs tracking-[0.3em] text-[#8BA4B8] uppercase font-medium">
              Admin Access
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
                className="w-full px-4 py-3.5 bg-[#F8F9FB] border border-[#E5E7EB] rounded-xl text-[#1A1A1A] placeholder-[#9CA3AF] focus:border-[#8BA4B8] focus:outline-none text-center text-sm transition-all duration-200"
              />
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-rose-500 text-xs mt-2 text-center whitespace-pre-wrap break-words bg-rose-50 py-2 rounded-lg"
                >
                  {error}
                </motion.p>
              )}
            </div>

            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-3.5 bg-[#8BA4B8] text-white font-semibold tracking-wider text-sm uppercase rounded-xl hover:bg-[#6B8BA0] transition-all disabled:opacity-50 shadow-sm"
            >
              {loading ? 'Loading...' : 'Login'}
            </motion.button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-[#9CA3AF] text-xs mt-6">
          Restricted area — authorized personnel only
        </p>
      </motion.div>
    </div>
  );
}