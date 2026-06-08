'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import type { Product } from '@/lib/supabase';
import { useCart } from '@/context/CartContext';
import { useRouter } from 'next/navigation';

interface QuickViewProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
}

export default function QuickView({ product, isOpen, onClose }: QuickViewProps) {
  const [selectedImage, setSelectedImage] = useState(product.main_image);
  const [swiping, setSwiping] = useState(false);
  const [swipeY, setSwipeY] = useState(0);
  const [sizeQty, setSizeQty] = useState<Record<string, number>>({});
  const [targetQty, setTargetQty] = useState(1);
  const { addItem } = useCart();
  const router = useRouter();

  const allocatedTotal = Object.values(sizeQty).reduce((a, b) => a + b, 0);
  const isMultiMode = targetQty > 1;
  const isBalanced = allocatedTotal === targetQty;

  const availableStock = Math.max(0, product.stock - (product.reserved_stock ?? 0));

  const incrementSize = (size: string) => {
    if (allocatedTotal >= targetQty) return;
    setSizeQty(prev => ({ ...prev, [size]: (prev[size] || 0) + 1 }));
  };

  const decrementSize = (size: string) => {
    setSizeQty(prev => {
      const current = prev[size] || 0;
      if (current <= 1) {
        const copy = { ...prev };
        delete copy[size];
        return Object.keys(copy).length > 0 ? copy : {};
      }
      return { ...prev, [size]: current - 1 };
    });
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setSwiping(true);
    setSwipeY(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!swiping) return;
    const delta = e.touches[0].clientY - swipeY;
    if (delta > 80) {
      onClose();
      setSwiping(false);
    }
  };

  const handleTouchEnd = () => {
    setSwiping(false);
  };

  const handleAddToCart = () => {
    if (allocatedTotal === 0) return;
    if (isMultiMode && !isBalanced) {
      alert(`Please distribute all ${targetQty} items across sizes (${allocatedTotal}/${targetQty} allocated)`);
      return;
    }
    for (const [size, qty] of Object.entries(sizeQty)) {
      if (qty > 0) {
        addItem(product, size, qty);
      }
    }
    onClose();
    router.push('/cart');
  };

  const hasDiscount = product.old_price && product.old_price > product.price;
  const discountPercentage = hasDiscount && product.old_price
    ? Math.round(((product.old_price - product.price) / product.old_price) * 100)
    : 0;

  const isLowStock = availableStock > 0 && availableStock <= 5;
  const isOutOfStock = availableStock <= 0;

  const availableImages = [product.main_image, product.second_image, product.third_image, product.fourth_image].filter(Boolean) as string[];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[80]"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 z-[90] bg-card sm:rounded-[var(--radius-xl)] overflow-hidden shadow-2xl max-w-2xl w-full sm:max-h-[90vh] flex flex-col sm:flex-row"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div className="sm:hidden absolute top-2 left-1/2 -translate-x-1/2 z-10 w-10 h-1 bg-[#D1D5DB] rounded-full" />
            <button onClick={onClose} aria-label="Close quick view" className="touch-target absolute top-3 right-3 z-10 w-9 h-9 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm hover:bg-white transition-all">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="w-full sm:w-1/2 bg-card-hover relative aspect-[4/5] sm:aspect-auto sm:h-auto sm:max-h-[90vh]">
              <Image src={selectedImage} alt={product.name} fill sizes="(max-width: 640px) calc(100vw - 32px), 336px" className="object-cover" />
              {hasDiscount && (
                <div className="absolute top-[var(--space-sm)] left-[var(--space-sm)] bg-accent text-white text-[var(--text-xs)] font-semibold px-[var(--space-sm)] py-[var(--space-xs)] rounded-full">-{discountPercentage}%</div>
              )}
              {availableImages.length > 1 && (
                <div className="absolute bottom-3 left-3 right-3 flex gap-2">
                  {availableImages.map(img => (
                    <button key={img} onClick={() => setSelectedImage(img)}
                      className={`w-10 h-10 rounded-lg overflow-hidden border-2 transition-all ${selectedImage === img ? 'border-[#8BA4B8]' : 'border-white/80 opacity-60 hover:opacity-100'}`}
                    >
                      <div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: `url(${img})` }} />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="w-full sm:w-1/2 p-[var(--space-md)] sm:p-[var(--space-lg)] flex flex-col overflow-y-auto">
              <h2 className="text-[var(--text-lg)] font-bold font-[family-name:var(--font-playfair)]">{product.name}</h2>
              <div className="flex items-center gap-[var(--space-sm)] mt-[var(--space-sm)]">
                <span className="text-[var(--text-xl)] font-semibold">EGP {product.price?.toLocaleString()}</span>
                {hasDiscount && <span className="text-[var(--text-sm)] text-secondary line-through">EGP {product.old_price?.toLocaleString()}</span>}
              </div>

              {product.description && (
                <p className="text-[var(--text-xs)] text-secondary mt-[var(--space-sm)] leading-relaxed line-clamp-3">{product.description}</p>
              )}

              <div className="mt-[var(--space-md)]">
                <div className="flex items-center justify-between mb-[var(--space-sm)]">
                  <p className="text-[var(--text-xs)] font-medium text-secondary uppercase tracking-wider">
                    Quantity: {targetQty}
                  </p>
                  <span className={`text-[var(--text-xs)] font-medium ${isLowStock ? 'text-rose-500' : 'text-green-600'}`}>
                    {isLowStock ? `Only ${availableStock} left` : `${availableStock} available`}
                  </span>
                </div>
                <div className="flex items-center gap-[var(--space-sm)] mb-[var(--space-sm)]">
                  <div className="flex items-center border border-border rounded-full overflow-hidden">
                    <button type="button"
                      onClick={() => {
                        if (targetQty <= 1) return;
                        const exitingMulti = targetQty === 2;
                        setTargetQty(prev => prev - 1);
                        if (exitingMulti) {
                          setSizeQty(product.sizes?.[0] ? { [product.sizes[0]]: 1 } : {});
                        }
                      }}
                      disabled={targetQty <= 1}
                      className="px-2 py-0.5 text-xs hover:bg-card-hover disabled:opacity-30 transition-colors"
                    >−</button>
                    <span className="px-2 py-0.5 text-xs font-medium min-w-[1.5rem] text-center border-x border-border">{targetQty}</span>
                    <button type="button"
                      onClick={() => {
                        const maxLimit = Math.min(availableStock, 10);
                        if (targetQty >= maxLimit) return;
                        const enteringMulti = targetQty === 1;
                        setTargetQty(prev => prev + 1);
                        if (enteringMulti) {
                          setSizeQty({});
                        }
                      }}
                      disabled={targetQty >= Math.min(availableStock, 10)}
                      className="px-2 py-0.5 text-xs hover:bg-card-hover disabled:opacity-30 transition-colors"
                    >+</button>
                  </div>
                  {isMultiMode && !isBalanced && (
                    <span className="text-[10px] text-rose-500 font-medium">
                      Allocate {targetQty - allocatedTotal} more
                    </span>
                  )}
                  {isMultiMode && isBalanced && allocatedTotal > 0 && (
                    <span className="text-[10px] text-green-600 font-medium">
                      ✓ Allocated
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-[var(--space-sm)]">
                  {product.sizes?.map(size => {
                    const qty = sizeQty[size] || 0;
                    return isMultiMode ? (
                      <div key={size} className="flex flex-col items-center gap-1">
                        <span className="text-[10px] text-secondary font-medium uppercase">{size}</span>
                        <div className="flex items-center border border-border rounded-full overflow-hidden">
                          <button type="button" onClick={() => decrementSize(size)} disabled={qty === 0}
                            className="px-1.5 py-0.5 text-xs hover:bg-card-hover disabled:opacity-30 transition-colors"
                          >−</button>
                          <span className="px-2 py-0.5 text-xs font-medium min-w-[1.5rem] text-center border-x border-border">{qty}</span>
                          <button type="button" onClick={() => incrementSize(size)}
                            disabled={allocatedTotal >= targetQty}
                            className="px-1.5 py-0.5 text-xs hover:bg-card-hover disabled:opacity-30 transition-colors"
                          >+</button>
                        </div>
                      </div>
                    ) : (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setSizeQty({ [size]: 1 })}
                        className={`py-[var(--space-xs)] px-[var(--space-md)] text-[10px] font-medium uppercase rounded-full transition-all duration-300 ${
                          qty > 0
                            ? 'bg-accent text-white shadow-sm'
                            : 'bg-card-hover text-secondary hover:bg-border hover:text-foreground'
                        }`}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
                {isMultiMode && !isBalanced && allocatedTotal > 0 && (
                  <p className="text-[10px] text-rose-500 mt-[var(--space-xs)] text-center">
                    {allocatedTotal} of {targetQty} allocated
                  </p>
                )}
              </div>

              <button onClick={handleAddToCart} disabled={allocatedTotal === 0 || isOutOfStock || (isMultiMode && !isBalanced)}
                className="mt-[var(--space-xl)] w-full py-[var(--space-sm)] bg-foreground text-background rounded-[var(--radius-xl)] text-[var(--text-sm)] font-semibold hover:bg-[#333] transition-all disabled:opacity-50"
              >
                {isOutOfStock ? 'Out of Stock' : allocatedTotal === 0 ? 'Select a size' : isMultiMode && !isBalanced ? `Allocate ${targetQty - allocatedTotal} more` : `Add to Cart — EGP ${(product.price * allocatedTotal).toLocaleString()}`}
              </button>

              <button onClick={() => { onClose(); router.push(`/product/${encodeURIComponent(product.category || 'uncategorized')}/${product.id}`); }}
                className="mt-[var(--space-sm)] w-full py-[var(--space-sm)] text-[var(--text-xs)] text-secondary hover:text-foreground transition-all"
              >
                View Full Details
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
