'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { safeRemoveStorage, StorageService } from '@/lib/storage';

const orderStorage = new StorageService('7h-');

interface OrderData {
  id: string;
  display_id?: string;
  customer_name: string;
  total: number;
  status: string;
  delivery_status: string;
  payment_method: string;
  governorate: string;
  city: string;
  items: Array<{ name: string; size: string; quantity: number; price: number; image?: string }>;
  created_at: string;
}

function OrderSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = searchParams.get('order_id');
  const success = searchParams.get('success');
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isSuccess = success === 'true';

  const fetchOrder = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/orders/${id}`);
      if (!res.ok) { setError('Order not found'); return; }
      const data = await res.json();
      setOrder(data);
      orderStorage.update<string[]>('order-ids', ids => [...ids, id].slice(-20), []);
      orderStorage.update<Record<string, { display_id?: string; total: number; firstItemName: string; firstItemImage?: string; status: string; date: string }>>('order-summaries', summaries => ({
        ...summaries,
        [id]: {
          display_id: data.display_id,
          total: data.total,
          firstItemName: data.items[0]?.name || '',
          firstItemImage: data.items[0]?.image,
          status: data.status,
          date: data.created_at,
        }
      }), {});
      safeRemoveStorage('7h-cart');
    } catch {
      setError('Failed to load order');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!orderId) {
      router.push('/');
      return;
    }
    fetchOrder(orderId);
  }, [orderId, router, fetchOrder]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FB] flex items-center justify-center">
        <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.5, repeat: Infinity }}
          className="text-[#8BA4B8] text-sm tracking-widest font-medium">LOADING...</motion.div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-[#F8F9FB] flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4 opacity-30">âœ§</div>
          <h1 className="text-2xl font-[family-name:var(--font-playfair)] text-[#1A1A1A] mb-2">Order Not Found</h1>
          <p className="text-[#6B7280] mb-6">{error || 'We could not find this order.'}</p>
          <Link href="/" className="text-[#8BA4B8] underline underline-offset-4">Back to Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FB] flex items-center justify-center px-4 py-20">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}
        className="max-w-xl w-full bg-white border border-[#E5E7EB] p-8 rounded-2xl shadow-md">
        {isSuccess ? (
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-8 h-8 text-emerald-600">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            </div>
            <h1 className="text-2xl font-[family-name:var(--font-playfair)] text-[#1A1A1A] mb-2">Payment Successful</h1>
            <div className="flex items-center justify-center gap-2">
              <p className="text-[#6B7280] text-sm">Order ID: <span className="text-[#8BA4B8] font-medium">#{order.display_id || order.id.slice(0, 8)}</span></p>
              <button onClick={() => navigator.clipboard.writeText(order.id)}
                className="text-[#9CA3AF] hover:text-[#8BA4B8] transition-colors" title="Copy Order ID">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.057 1.123-.08M15.75 18H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08M15.75 18.75v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5A3.375 3.375 0 006.375 7.5H5.25m11.9-3.664A2.251 2.251 0 0015 2.25h-1.5a2.25 2.25 0 00-2.15 1.586m5.8 0c.065.21.1.433.1.664v.75h-6V4.5c0-.231.035-.454.1-.664M6.75 7.5H4.875c-.621 0-1.125.504-1.125 1.125v12c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V16.5a9 9 0 00-9-9z" />
                </svg>
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-8 h-8 text-rose-600">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-2xl font-[family-name:var(--font-playfair)] text-[#1A1A1A] mb-2">Payment Failed</h1>
            <p className="text-[#6B7280] text-sm">Your payment was not processed. Please try again.</p>
          </div>
        )}

        <div className="bg-[#F8F9FB] rounded-xl p-5 mb-6">
          <h3 className="text-sm font-semibold text-[#1A1A1A] mb-3 font-[family-name:var(--font-playfair)]">Order Summary</h3>
          <div className="space-y-3 mb-4">
            {order.items.map((item, idx) => (
              <div key={idx} className="flex gap-3 items-center border-b border-[#E5E7EB] pb-2 last:border-0">
                <div className="flex-1 text-xs">
                  <p className="text-[#1A1A1A] font-medium uppercase">{item.name}</p>
                  <p className="text-[#9CA3AF]">Size: {item.size} | Qty: {item.quantity}</p>
                </div>
                <div className="text-xs font-bold text-[#1A1A1A]">EGP {(item.price * item.quantity).toLocaleString()}</div>
              </div>
            ))}
          </div>
          <div className="flex justify-between items-center pt-3 border-t border-[#E5E7EB]">
            <span className="text-sm text-[#6B7280]">Total</span>
            <span className="text-xl font-bold text-[#8BA4B8]">EGP {order.total.toLocaleString()}</span>
          </div>
        </div>

        {isSuccess && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6 text-sm text-center">
            <p className="text-emerald-800 font-medium">Your order has been confirmed!</p>
            <p className="text-emerald-600 text-xs mt-1">We will process and ship it soon.</p>
          </div>
        )}

        <div className="space-y-3">
          {!isSuccess && (
            <button onClick={() => router.push('/checkout')}
              className="block w-full py-3.5 bg-[#1A1A1A] text-white text-sm font-semibold rounded-xl hover:bg-[#333] transition-all text-center">
              Try Again
            </button>
          )}
          <Link href="/track"
            className="block w-full py-3.5 border border-[#8BA4B8] text-[#8BA4B8] text-sm font-semibold rounded-xl hover:bg-[#8BA4B8] hover:text-white transition-all text-center">
            Track My Order
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F8F9FB] flex items-center justify-center">
        <div className="text-[#8BA4B8] text-sm tracking-widest font-medium">LOADING...</div>
      </div>
    }>
      <OrderSuccessContent />
    </Suspense>
  );
}
