'use client';

import Image from 'next/image';
import Link from 'next/link';
import { memo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Product } from '@/lib/supabase';
import { useWishlist } from '@/context/WishlistContext';
import CountdownTimer from '@/components/CountdownTimer';
import QuickView from '@/components/QuickView';

const isTouchDevice = typeof navigator !== 'undefined' && 'ontouchstart' in window;

interface FlashSaleInfo {
  product_id: string;
  discount_percentage: number;
  ends_at: string;
}

interface ProductCardProps {
  product: Product;
  index?: number;
  flashSale?: FlashSaleInfo;
}

function ProductCardComponent({ product, index = 0, flashSale }: ProductCardProps) {
  const router = useRouter();
  const [isHovered, setIsHovered] = useState(false);
  const [touchToggled, setTouchToggled] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const { toggleWishlist, isWishlisted } = useWishlist();

  const hasDiscount = product.old_price && product.old_price > product.price;
  const discountPercentage = hasDiscount
    ? Math.round(((product.old_price! - product.price) / product.old_price!) * 100)
    : 0;

  const showSecondImage = isHovered || touchToggled;
  const imageSrc = showSecondImage && product.second_image ? product.second_image : product.main_image;

  const handleImageClick = (e: React.MouseEvent) => {
    if (!isTouchDevice || !product.second_image) return;
    e.preventDefault();
    e.stopPropagation();
    setTouchToggled(prev => !prev);
  };

  return (
    <div>
      <Link href={`/product/${product.slug}`} className="block group">
        <div
          className="relative overflow-hidden rounded-2xl bg-[#F3F5F8] mb-4 shadow-sm group-hover:shadow-md transition-shadow duration-500"
          style={{ aspectRatio: '3/4' }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => { setIsHovered(false); setTouchToggled(false); }}
        >
          <button
            onClick={e => { e.preventDefault(); e.stopPropagation(); toggleWishlist(product.slug); }}
            className="absolute top-3 right-3 z-10 touch-target w-9 h-9 flex items-center justify-center rounded-full bg-white/80 backdrop-blur-sm shadow-sm hover:bg-white transition-all"
            aria-label={isWishlisted(product.slug) ? 'Remove from wishlist' : 'Add to wishlist'}
          >
            <svg
              viewBox="0 0 24 24"
              className={`w-4 h-4 transition-colors ${isWishlisted(product.slug) ? 'fill-rose-500 stroke-rose-500' : 'fill-none stroke-[#6B7280]'}`}
              strokeWidth="2"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </button>
          {!imageError && imageSrc ? (
            <div className="relative w-full h-full" onClick={handleImageClick}>
              <Image
                src={imageSrc}
                alt={product.name}
                fill
                className="object-cover hover:scale-105 transition-transform duration-500"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                onError={() => setImageError(true)}
              />
              {isTouchDevice && product.second_image && (
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 touch-only bg-black/50 text-white text-[8px] px-2 py-0.5 rounded-full whitespace-nowrap pointer-events-none">
                  {touchToggled ? 'Tap to see front' : 'Tap to see back'}
                </div>
              )}
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-[#F3F5F8]">
              <div className="text-center text-[#9CA3AF]">
                <div className="text-4xl mb-2 opacity-50">✧</div>
                <span className="text-xs tracking-wider uppercase">No Image</span>
              </div>
            </div>
          )}

          {flashSale ? (
            <div className="absolute top-3 left-3 z-10 space-y-1">
              <div className="bg-rose-500 text-white text-[10px] font-semibold px-3 py-1.5 rounded-full tracking-wider uppercase shadow-sm">
                -{flashSale.discount_percentage}% • FLASH
              </div>
              <div className="bg-black/80 text-white text-[10px] font-mono px-3 py-1 rounded-lg shadow-sm text-center">
                <CountdownTimer endsAt={flashSale.ends_at} compact />
              </div>
            </div>
          ) : hasDiscount ? (
            <div className="absolute top-3 left-3 bg-[#8BA4B8] text-white text-[10px] font-semibold px-3 py-1.5 rounded-full tracking-wider uppercase shadow-sm">
              -{discountPercentage}%
            </div>
          ) : null}

          <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center gap-2 sm:gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 touch-show">
            <button onClick={e => { e.preventDefault(); e.stopPropagation(); setQuickViewOpen(true); }}
              className="px-4 sm:px-5 py-2.5 bg-[#1A1A1A] text-white text-[10px] sm:text-xs tracking-wider uppercase font-semibold rounded-full hover:bg-[#333] transition-all shadow-sm"
            >
              Quick View
            </button>
            <button onClick={e => { e.preventDefault(); e.stopPropagation(); router.push(`/product/${product.slug}`); }}
              className="px-4 sm:px-5 py-2.5 border-2 border-[#1A1A1A] text-[#1A1A1A] text-[10px] sm:text-xs tracking-wider uppercase font-semibold rounded-full hover:bg-[#1A1A1A] hover:text-white transition-all"
            >
              Details
            </button>
          </div>
        </div>

        <div className="space-y-1 px-1">
          <h3 className="text-sm font-medium text-[#1A1A1A] tracking-wide truncate font-[family-name:var(--font-playfair)]">
            {product.name}
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-[#1A1A1A]">
              EGP {product.price?.toLocaleString("en-US") || 0}
            </span>
            {hasDiscount && (
              <span className="text-xs text-[#9CA3AF] line-through">
                EGP {product.old_price?.toLocaleString("en-US")}
              </span>
            )}
          </div>
        </div>
      </Link>
      <QuickView product={product} isOpen={quickViewOpen} onClose={() => setQuickViewOpen(false)} />
    </div>
  );
}

export default memo(ProductCardComponent);
