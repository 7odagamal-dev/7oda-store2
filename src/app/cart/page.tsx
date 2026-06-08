'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useCallback, memo } from 'react';
import { useCart, type CartItem } from '@/context/CartContext';
import { SHIPPING_RANGE } from '@/lib/shipping';

function Cart() {
  const { items, removeItem, addItem, updateQuantity, subtotal, total } = useCart();
  // Show minimum shipping for estimate; exact cost calculated at checkout after governorate selection
  const shippingEstimate = SHIPPING_RANGE.min;
  const finalTotal = total + shippingEstimate;

  if (items.length === 0) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center bg-background">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <div className="text-6xl mb-6 opacity-30">✧</div>
          <h1 className="text-[var(--text-3xl)] font-[family-name:var(--font-playfair)] text-foreground mb-[var(--space-sm)]">
            Your Cart is Empty
          </h1>
          <p className="text-secondary mb-[var(--space-xl)] text-[var(--text-sm)]">Looks like you haven&apos;t added anything yet.</p>
          <Link
            href="/shop"
            className="inline-flex items-center gap-[var(--space-sm)] px-[var(--space-xl)] py-[var(--space-sm)] bg-accent text-white text-[var(--text-sm)] font-semibold tracking-wider uppercase rounded-full hover:bg-accent-deep transition-all shadow-sm"
          >
            Continue Shopping
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-[var(--space-3xl)] bg-background">
      <div className="fsa-container">
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-[var(--text-3xl)] font-[family-name:var(--font-playfair)] text-foreground mb-[var(--space-2xl)] tracking-wide"
        >
          Shopping Cart
        </motion.h1>

        <div className="grid lg:grid-cols-3 gap-[var(--space-2xl)]">
          {/* Cart Items */}
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-2 space-y-[var(--space-md)]"
          >
            {items.map((item) => (
              <CartItem
                key={`${item.product.id}-${item.size}`}
                item={item}
                onRemove={removeItem}
                onAdd={addItem}
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
            <div className="bg-card border border-border rounded-[var(--radius-xl)] p-[var(--space-lg)] sticky top-28 shadow-sm">
              <h2 className="text-[var(--text-lg)] font-semibold text-foreground mb-[var(--space-lg)] font-[family-name:var(--font-playfair)]">
                Order Summary
              </h2>

              <div className="space-y-[var(--space-sm)] pb-[var(--space-lg)] border-b border-border-light">
                <div className="flex justify-between text-[var(--text-sm)]">
                  <span className="text-secondary">Subtotal</span>
                  <span className="text-foreground font-medium">EGP {subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-[var(--text-sm)]">
                  <span className="text-secondary">Shipping</span>
                  <span className="text-foreground">from EGP {shippingEstimate.toLocaleString()}</span>
                </div>
              </div>

              <div className="flex justify-between py-[var(--space-lg)]">
                <span className="font-bold text-[var(--text-lg)] uppercase tracking-wide text-foreground">Total</span>
                <span className="font-bold text-[var(--text-lg)] text-accent">EGP {finalTotal.toLocaleString()}</span>
              </div>

              <Link href="/checkout">
                <button className="w-full py-[var(--space-md)] bg-accent text-white font-semibold tracking-wider text-[var(--text-sm)] uppercase rounded-[var(--radius-xl)] hover:bg-accent-deep transition-all shadow-sm hover:shadow-md active:scale-[0.98]">
                  Proceed to Checkout
                </button>
              </Link>

              <Link href="/shop">
                <button className="w-full py-[var(--space-sm)] mt-[var(--space-sm)] border border-border text-secondary text-[var(--text-sm)] tracking-wider uppercase rounded-[var(--radius-xl)] hover:border-accent hover:text-accent transition-all">
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

const CartItem = memo(({ item, onRemove, onAdd, onUpdate }: { item: CartItem; onRemove: (id: string, size: string) => void; onAdd: (product: CartItem['product'], size: string, qty?: number) => void; onUpdate: (id: string, size: string, qty: number) => void }) => {
  const handleRemove = useCallback(() => onRemove(item.product.id, item.size), [onRemove, item.product.id, item.size]);
  const decreaseQty = useCallback(() => onUpdate(item.product.id, item.size, item.quantity - 1), [onUpdate, item.product.id, item.size, item.quantity]);
  const increaseQty = useCallback(() => onUpdate(item.product.id, item.size, item.quantity + 1), [onUpdate, item.product.id, item.size, item.quantity]);

  const handleSizeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSize = e.target.value;
    if (newSize === item.size) return;
    onRemove(item.product.id, item.size);
    setTimeout(() => onAdd(item.product, newSize, item.quantity), 0);
  }, [item, onRemove, onAdd]);

  const sizes = item.product.sizes || [];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex gap-[var(--space-lg)] p-[var(--space-md)] bg-card border border-border rounded-[var(--radius-xl)] hover:border-accent/30 transition-all shadow-sm"
    >
      <div className="relative w-20 sm:w-24 h-28 sm:h-32 flex-shrink-0 overflow-hidden rounded-[var(--radius-md)] bg-card-hover">
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
                <h3 className="text-[var(--text-sm)] font-medium text-foreground hover:text-accent transition-colors uppercase tracking-tight font-[family-name:var(--font-playfair)]">
                  {item.product.name}
                </h3>
              </Link>
              <div className="flex items-center gap-[var(--space-sm)] mt-[var(--space-xs)]">
                <span className="text-[var(--text-xs)] text-secondary">Size:</span>
                <select
                  value={item.size}
                  onChange={handleSizeChange}
                  className="text-[var(--text-xs)] font-medium bg-card-hover border border-border rounded-[var(--radius-sm)] px-[var(--space-sm)] py-[2px] text-foreground focus:outline-none focus:border-accent"
                >
                  {sizes.map((s: string) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
            <button onClick={handleRemove} aria-label="Remove item" className="touch-target-sm text-[#D1D5DB] hover:text-red-400 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-accent font-semibold text-[var(--text-sm)] mt-[var(--space-xs)]">EGP {item.product.price.toLocaleString()}</p>
        </div>

        <div className="flex items-center justify-between mt-[var(--space-sm)] gap-[var(--space-sm)]">
          <div className="flex items-center border border-border rounded-[var(--radius-md)] bg-card shrink-0">
            <button onClick={decreaseQty} aria-label="Decrease quantity" className="touch-target-sm px-[var(--space-sm)] py-[var(--space-xs)] text-[var(--text-xs)] text-secondary hover:text-foreground transition-colors">−</button>
            <span className="w-8 text-center px-[var(--space-xs)] py-[var(--space-xs)] text-[var(--text-xs)] font-medium border-x border-border">{item.quantity}</span>
            <button onClick={increaseQty} aria-label="Increase quantity" className="touch-target-sm px-[var(--space-sm)] py-[var(--space-xs)] text-[var(--text-xs)] text-secondary hover:text-foreground transition-colors">+</button>
          </div>
          <p className="text-[var(--text-xs)] text-secondary whitespace-nowrap">
            Subtotal: EGP {(item.product.price * item.quantity).toLocaleString()}
          </p>
        </div>
      </div>
    </motion.div>
  );
});

CartItem.displayName = 'CartItem';

export default memo(Cart);
