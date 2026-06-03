'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { SHIPPING_RANGE } from '@/lib/shipping';

export interface OrderSummaryData {
  subtotal: number;
  discount: number;
  shippingCost: number;
  finalAmount: number;
  items: Array<{ name: string; size: string; quantity: number; price: number; image: string }>;
}

export function OrderSuccess({
  orderId,
  orderSummary,
  paymentMethod,
  paymentDetails,
}: {
  orderId: string;
  orderSummary: OrderSummaryData;
  paymentMethod: string;
  paymentDetails: { vodafone_cash: string; instapay: string };
}) {
  return (
    <div className="min-h-screen pt-24 pb-20 px-4 bg-[#F8F9FB] flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-xl w-full text-center bg-white border border-[#E5E7EB] p-8 rounded-2xl shadow-md"
      >
        <div className="w-16 h-16 bg-[#8BA4B8] rounded-full flex items-center justify-center mx-auto mb-5">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-8 h-8 text-white">
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
        </div>
        <h1 className="text-2xl font-[family-name:var(--font-playfair)] text-[#1A1A1A] mb-2">Order Confirmed</h1>
        <div className="flex items-center justify-center gap-2 mb-1">
          <p className="text-[#6B7280] text-sm">Order ID: <span className="text-[#8BA4B8] font-medium">#{orderId.slice(0, 8)}</span></p>
          <button onClick={() => navigator.clipboard.writeText(orderId)}
            aria-label="Copy Order ID" className="touch-target-sm text-[#9CA3AF] hover:text-[#8BA4B8] transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.057 1.123-.08M15.75 18H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08M15.75 18.75v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5A3.375 3.375 0 006.375 7.5H5.25m11.9-3.664A2.251 2.251 0 0015 2.25h-1.5a2.25 2.25 0 00-2.15 1.586m5.8 0c.065.21.1.433.1.664v.75h-6V4.5c0-.231.035-.454.1-.664M6.75 7.5H4.875c-.621 0-1.125.504-1.125 1.125v12c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V16.5a9 9 0 00-9-9z" />
            </svg>
          </button>
        </div>

        <div className="bg-[#F8F9FB] rounded-xl p-5 mb-6 text-left mt-6">
          <h3 className="text-sm font-semibold text-[#1A1A1A] mb-3 font-[family-name:var(--font-playfair)]">Order Summary</h3>
          <div className="space-y-3 mb-4">
            {orderSummary.items.map((item: OrderSummaryData['items'][number], idx: number) => (
              <div key={idx} className="flex gap-3 items-center border-b border-[#E5E7EB] pb-2">
                <div className="relative w-10 h-12 bg-[#F3F5F8] rounded overflow-hidden flex-shrink-0">
                  {item.image && <Image src={item.image} alt={item.name} fill sizes="(max-width: 640px) 40px, 40px" className="object-cover" />}
                </div>
                <div className="flex-1 text-xs">
                  <p className="text-[#1A1A1A] font-medium uppercase">{item.name}</p>
                  <p className="text-[#9CA3AF]">Size: {item.size} | Qty: {item.quantity} | {item.price.toLocaleString()} EGP</p>
                </div>
                <div className="text-xs font-bold text-[#1A1A1A]">{(item.price * item.quantity).toLocaleString()} EGP</div>
              </div>
            ))}
          </div>
          <div className="space-y-1.5 text-xs text-[#6B7280]">
            <div className="flex justify-between"><span>Subtotal</span><span className="text-[#1A1A1A]">{orderSummary.subtotal.toLocaleString()} EGP</span></div>
            {orderSummary.discount > 0 && <div className="flex justify-between text-[#6B8BA0]"><span>Discount</span><span>− {orderSummary.discount.toLocaleString()} EGP</span></div>}
            <div className="flex justify-between"><span>Shipping</span><span className="text-[#1A1A1A]">{orderSummary.shippingCost > 0 ? `${orderSummary.shippingCost} EGP` : `${SHIPPING_RANGE.min} – ${SHIPPING_RANGE.max} EGP`}</span></div>
            <div className="flex justify-between pt-2 border-t border-[#E5E7EB] font-bold text-sm text-[#1A1A1A]">
              <span>Total</span><span className="text-[#8BA4B8]">{orderSummary.finalAmount.toLocaleString()} EGP</span>
            </div>
          </div>
        </div>

        {paymentMethod === 'cash_on_delivery' && (
          <div className="bg-[#F8F9FB] rounded-xl p-5 mb-6 text-center">
            <h3 className="text-sm font-semibold text-[#1A1A1A] mb-2">Cash on Delivery</h3>
            <p className="text-xs text-[#6B7280]">You will pay <span className="font-bold text-[#1A1A1A]">{orderSummary.finalAmount.toLocaleString()} EGP</span> upon delivery.</p>
          </div>
        )}

        {paymentMethod === 'paymob' && (
          <div className="bg-[#F8F9FB] rounded-xl p-5 mb-6 text-center">
            <h3 className="text-sm font-semibold text-[#1A1A1A] mb-2">Paid by Card</h3>
            <p className="text-xs text-[#6B7280]">Your payment has been processed successfully via Paymob.</p>
          </div>
        )}

        {paymentMethod === 'online_transfer' && (
          <div className="bg-[#F8F9FB] rounded-xl p-5 mb-6 text-left">
            <h3 className="text-sm font-semibold text-[#1A1A1A] mb-3">Payment Instructions</h3>
            <p className="text-xs text-[#6B7280] mb-3">Please transfer <span className="font-bold text-[#1A1A1A]">{orderSummary.finalAmount.toLocaleString()} EGP</span> to:</p>
            <div className="bg-white p-4 rounded-lg border border-[#E5E7EB] space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-[#6B7280]">Vodafone Cash:</span><span className="font-bold text-[#1A1A1A]">{paymentDetails.vodafone_cash || '01024627197'}</span></div>
              <div className="flex justify-between"><span className="text-[#6B7280]">InstaPay:</span><span className="font-bold text-[#1A1A1A]">{paymentDetails.instapay || 'youssefwhab@instapay'}</span></div>
            </div>
            <div className="mt-3 space-y-1 text-xs text-[#6B7280]">
              <p>1. Take a screenshot of the transaction</p>
              <p>2. Send photo via Instagram to confirm</p>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <a href="https://www.instagram.com/og.oldgold?igsh=bzlvMDhnejFzbWMy&utm_source=qr" target="_blank"
            className="block w-full py-3.5 bg-[#8BA4B8] text-white text-sm font-semibold tracking-wider uppercase rounded-xl hover:bg-[#6B8BA0] transition-all">
            Confirm on Instagram
          </a>
          <Link href="/track"
            className="block w-full py-3.5 border border-[#8BA4B8] text-[#8BA4B8] text-sm font-semibold rounded-xl hover:bg-[#8BA4B8] hover:text-white transition-all">
            Track My Order
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
