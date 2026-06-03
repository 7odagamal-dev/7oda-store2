'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useCart } from '@/context/CartContext';
import { SHIPPING_RANGE } from '@/lib/shipping';
import { memo, useCallback } from 'react';

function Cart() {
  const { items, removeItem, updateQuantity, subtotal, total } = useCart();
  // Show minimum shipping for estimate; exact cost calculated at checkout after governorate selection
  const shippingEstimate = SHIPPING_RANGE.min;
  const finalTotal = total + shippingEstimate;

  if (items.length === 0) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center bg-[#F8F9FB]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <div className="text-6xl mb-6 opacity-30">✧</div>
          <h1 className="text-3xl font-[family-name:var(--font-playfair)] text-[#1A1A1A] mb-3">
            Your Cart is Empty
          </h1>
          <p className="text-[#6B7280] mb-8 text-sm">Looks like you haven&apos;t added anything yet.</p>
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 px-8 py-3 bg-[#8BA4B8] text-white text-sm font-semibold tracking-wider uppercase rounded-full hover:bg-[#6B8BA0] transition-all shadow-sm"
          >
            Continue Shopping
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-20 bg-[#F8F9FB]">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10">
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-[family-name:var(--font-playfair)] text-[#1A1A1A] mb-10 tracking-wide"
        >
          Shopping Cart
        </motion.h1>

        <div className="grid lg:grid-cols-3 gap-10">
          {/* Cart Items */}
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-2 space-y-4"
          >
            {items.map((item) => (
              <CartItem
                key={`${item.product.id}-${item.size}`}
                item={item}
                onRemove={removeItem}
                onUpdate={updateQuantity}
              />
            ))}
          </motion.div>

          {/* Order Summary */}
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 sticky top-28 shadow-sm">
              <h2 className="text-lg font-semibold text-[#1A1A1A] mb-6 font-[family-name:var(--font-playfair)]">
                Order Summary
              </h2>

              <div className="space-y-3 pb-5 border-b border-[#F0F0F0]">
                <div className="flex justify-between text-sm">
                  <span className="text-[#6B7280]">Subtotal</span>
                  <span className="text-[#1A1A1A] font-medium">EGP {subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#6B7280]">Shipping</span>
                  <span className="text-[#1A1A1A]">from EGP {shippingEstimate.toLocaleString()}</span>
                </div>
              </div>

              <div className="flex justify-between py-5">
                <span className="font-bold text-lg uppercase tracking-wide text-[#1A1A1A]">Total</span>
                <span className="font-bold text-lg text-[#8BA4B8]">EGP {finalTotal.toLocaleString()}</span>
              </div>

              <Link href="/checkout">
                <button className="w-full py-4 bg-[#8BA4B8] text-white font-semibold tracking-wider text-sm uppercase rounded-xl hover:bg-[#6B8BA0] transition-all shadow-sm hover:shadow-md active:scale-[0.98]">
                  Proceed to Checkout
                </button>
              </Link>

              <Link href="/shop">
                <button className="w-full py-3 mt-3 border border-[#E5E7EB] text-[#6B7280] text-sm tracking-wider uppercase rounded-xl hover:border-[#8BA4B8] hover:text-[#8BA4B8] transition-all">
                  Continue Shopping
                </button>
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

const CartItem = memo(({ item, onRemove, onUpdate }: { item: any; onRemove: (id: string, size: string) => void; onUpdate: (id: string, size: string, qty: number) => void }) => {
  const handleRemove = useCallback(() => onRemove(item.product.id, item.size), [onRemove, item.product.id, item.size]);
  const decreaseQty = useCallback(() => onUpdate(item.product.id, item.size, item.quantity - 1), [onUpdate, item.product.id, item.size, item.quantity]);
  const increaseQty = useCallback(() => onUpdate(item.product.id, item.size, item.quantity + 1), [onUpdate, item.product.id, item.size, item.quantity]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex gap-5 p-4 bg-white border border-[#E5E7EB] rounded-xl hover:border-[#8BA4B8]/30 transition-all shadow-sm"
    >
      <div className="relative w-20 sm:w-24 h-28 sm:h-32 flex-shrink-0 overflow-hidden rounded-lg bg-[#F3F5F8]">
        <Image
          src={item.image || item.product.main_image}
          alt={item.product.name}
          fill
          sizes="(max-width: 640px) 96px, 96px"
          className="object-cover"
        />
      </div>

      <div className="flex-1 flex flex-col justify-between">
        <div>
          <div className="flex justify-between items-start">
            <div>
              <Link href={`/product/${item.product.slug}`}>
                <h3 className="text-sm font-medium text-[#1A1A1A] hover:text-[#8BA4B8] transition-colors uppercase tracking-tight font-[family-name:var(--font-playfair)]">
                  {item.product.name}
                </h3>
              </Link>
              <p className="text-xs text-[#6B7280] mt-1">
                Size: <span className="text-[#1A1A1A] font-medium">{item.size}</span>
              </p>
            </div>
            <button onClick={handleRemove} aria-label="Remove item" className="touch-target-sm text-[#D1D5DB] hover:text-red-400 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-[#8BA4B8] font-semibold text-sm mt-1">EGP {item.product.price.toLocaleString()}</p>
        </div>

        <div className="flex items-center justify-between mt-2 gap-2">
          <div className="flex items-center border border-[#E5E7EB] rounded-lg bg-white shrink-0">
            <button onClick={decreaseQty} aria-label="Decrease quantity" className="touch-target-sm px-3 py-1.5 text-xs text-[#6B7280] hover:text-[#1A1A1A] transition-colors">−</button>
            <span className="w-8 text-center px-1 py-1.5 text-xs font-medium border-x border-[#E5E7EB]">{item.quantity}</span>
            <button onClick={increaseQty} aria-label="Increase quantity" className="touch-target-sm px-3 py-1.5 text-xs text-[#6B7280] hover:text-[#1A1A1A] transition-colors">+</button>
          </div>
          <p className="text-xs text-[#9CA3AF] whitespace-nowrap">
            Subtotal: EGP {(item.product.price * item.quantity).toLocaleString()}
          </p>
        </div>
      </div>
    </motion.div>
  );
});

CartItem.displayName = 'CartItem';

export default memo(Cart);
