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
  const [selectedSize, setSelectedSize] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(product.main_image);
  const { addItem } = useCart();
  const router = useRouter();

  const handleAddToCart = () => {
    if (!selectedSize) return;
    for (let i = 0; i < quantity; i++) {
      addItem(product, selectedSize, 1);
    }
    onClose();
    router.push('/cart');
  };

  const hasDiscount = product.old_price && product.old_price > product.price;
  const discountPercentage = hasDiscount
    ? Math.round(((product.old_price! - product.price) / product.old_price!) * 100)
    : 0;

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
            className="fixed inset-4 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 z-[90] bg-white rounded-2xl overflow-hidden shadow-2xl max-w-2xl w-full sm:max-h-[90vh] flex flex-col sm:flex-row"
          >
            <button onClick={onClose} className="absolute top-3 right-3 z-10 w-8 h-8 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm hover:bg-white transition-all">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="w-full sm:w-1/2 bg-[#F3F5F8] relative aspect-[4/5] sm:aspect-auto sm:h-auto">
              <Image src={selectedImage} alt={product.name} fill sizes="(max-width: 640px) calc(100vw - 32px), 336px" className="object-cover" />
              {hasDiscount && (
                <div className="absolute top-3 left-3 bg-[#8BA4B8] text-white text-[10px] font-semibold px-3 py-1.5 rounded-full">-{discountPercentage}%</div>
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

            <div className="w-full sm:w-1/2 p-6 flex flex-col overflow-y-auto">
              <h2 className="text-lg font-bold font-[family-name:var(--font-playfair)]">{product.name}</h2>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-xl font-semibold">EGP {product.price?.toLocaleString()}</span>
                {hasDiscount && <span className="text-sm text-[#9CA3AF] line-through">EGP {product.old_price?.toLocaleString()}</span>}
              </div>

              {product.description && (
                <p className="text-xs text-[#6B7280] mt-3 leading-relaxed line-clamp-3">{product.description}</p>
              )}

              <div className="mt-4">
                <p className="text-xs font-medium text-[#6B7280] mb-2 uppercase tracking-wider">Size</p>
                <div className="flex flex-wrap gap-2">
                  {product.sizes?.map(size => (
                    <button key={size} onClick={() => setSelectedSize(size)}
                      className={`px-4 py-2 text-xs font-medium rounded-full border transition-all ${
                        selectedSize === size
                          ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]'
                          : 'bg-white text-[#6B7280] border-[#E5E7EB] hover:border-[#8BA4B8]'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4">
                <p className="text-xs font-medium text-[#6B7280] mb-2 uppercase tracking-wider">Qty</p>
                <div className="flex items-center border border-[#E5E7EB] rounded-lg w-fit">
                  <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="px-3 py-1.5 text-sm hover:bg-[#F3F5F8]">−</button>
                  <span className="px-4 py-1.5 text-sm font-medium border-x border-[#E5E7EB]">{quantity}</span>
                  <button onClick={() => setQuantity(q => Math.min(product.stock, q + 1))} className="px-3 py-1.5 text-sm hover:bg-[#F3F5F8]">+</button>
                </div>
              </div>

              <button onClick={handleAddToCart} disabled={!selectedSize}
                className="mt-6 w-full py-3 bg-[#1A1A1A] text-white rounded-xl text-sm font-semibold hover:bg-[#333] transition-all disabled:opacity-50"
              >
                {selectedSize ? `Add to Cart — EGP ${(product.price * quantity).toLocaleString()}` : 'Select a Size'}
              </button>

              <button onClick={() => { onClose(); router.push(`/product/${product.slug}`); }}
                className="mt-2 w-full py-2 text-xs text-[#6B7280] hover:text-[#1A1A1A] transition-all"
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
