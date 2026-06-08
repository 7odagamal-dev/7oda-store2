'use client';

import { useEffect, useState, use } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import type { Product } from '@/lib/supabase';
import { useCart } from '@/context/CartContext';
import { useRouter } from 'next/navigation';
import ProductCard from '@/components/ProductCard';
import ReviewSection from '@/components/ReviewSection';
import SocialProof from '@/components/SocialProof';
import CountdownTimer from '@/components/CountdownTimer';
import { ProductDetailSkeleton } from '@/components/Skeleton';
import { trackRecentlyViewed } from '@/components/RecentlyViewed';
import ImageZoom from '@/components/ImageZoom';

export default function ProductDetails({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();

  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [sizeQty, setSizeQty] = useState<Record<string, number>>({});
  const [targetQty, setTargetQty] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [flashSale, setFlashSale] = useState<{ discount_percentage: number; ends_at: string } | null>(null);
  const [relevantBundles, setRelevantBundles] = useState<Array<{ id: string; name: string; description: string | null; products: string[]; discount_type: string; discount_value: number; image: string | null }>>([]);

  const { addItem } = useCart();

  useEffect(() => {
    async function fetchProduct() {
      try {
        setLoading(true);
        const [productRes, flashRes, bundlesRes] = await Promise.all([
          fetch(`/api/products/${encodeURIComponent(resolvedParams.slug)}`),
          fetch('/api/flash-sales'),
          fetch('/api/bundles'),
        ]);
        const json = await productRes.json();
        const flashData = await flashRes.json();
        const bundlesData = await bundlesRes.json();

        if (!productRes.ok || !json.product) {
          setError('Product not found.');
        } else {
          setProduct(json.product);
          setSelectedImage(json.product.main_image);
          if (json.relatedProducts) {
            setRelatedProducts(json.relatedProducts);
          }
          trackRecentlyViewed(json.product);
          if (flashData.sales) {
            const sale = flashData.sales.find((s: { product_id: string; discount_percentage: number; ends_at: string }) =>
              s.product_id === json.product.id
            );
            if (sale) setFlashSale(sale);
          }
          if (bundlesData.bundles) {
            const relevant = bundlesData.bundles.filter((b: { products: string[] }) =>
              b.products.includes(json.product.id) && b.products.length > 1
            );
            setRelevantBundles(relevant);
          }
        }
      } catch {
        setError('An error occurred while loading product details.');
      } finally {
        setLoading(false);
      }
    }
    fetchProduct();
  }, [resolvedParams.slug]);

  const availableStock = product ? Math.max(0, product.stock - (product.reserved_stock ?? 0)) : 0;
  const isLowStock = availableStock > 0 && availableStock <= 5;
  const isOutOfStock = availableStock <= 0;

  const allocatedTotal = Object.values(sizeQty).reduce((a, b) => a + b, 0);
  const isMultiMode = targetQty > 1;
  const isBalanced = allocatedTotal === targetQty;
  const totalQty = targetQty;
  const selectedSizes = Object.entries(sizeQty).filter(([size]) => sizeQty[size] > 0).map(([size]) => size);

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

  const handleAddToCart = () => {
    if (allocatedTotal === 0) {
      alert('Please select a size');
      return;
    }
    if (isMultiMode && !isBalanced) {
      alert(`Please distribute all ${targetQty} items across sizes (${allocatedTotal}/${targetQty} allocated)`);
      return;
    }
    setIsAdding(true);
    for (const [size, qty] of Object.entries(sizeQty)) {
      if (qty > 0) {
        addItem(product!, size, qty);
      }
    }
    router.push('/cart');
  };

  // Loading State
  if (loading) {
    return <ProductDetailSkeleton />;
  }

  // Error State
  if (error || !product) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center bg-[#F8F9FB]">
        <div className="text-center">
          <h1 className="text-3xl font-[family-name:var(--font-playfair)] text-[#1A1A1A] mb-3">Not Found</h1>
          <p className="text-[#6B7280]">{error || 'Product not found.'}</p>
        </div>
      </div>
    );
  }

  const availableImages = [product.main_image, product.second_image, product.third_image, product.fourth_image].filter(Boolean) as string[];

  return (
    <div className="min-h-screen pt-[var(--space-3xl)] pb-[var(--space-2xl)] px-[var(--container-padding)] bg-background">
      <div className="max-w-7xl mx-auto">
        <div className="lg:grid lg:grid-cols-2 lg:gap-x-[var(--space-3xl)]">
          {/* Product Images */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col lg:flex-row gap-4"
          >
            {/* Thumbnails */}
            <div className="flex lg:flex-col gap-[var(--space-sm)] overflow-x-auto lg:overflow-visible py-[var(--space-sm)] lg:py-0 w-full lg:w-20 shrink-0 order-2 lg:order-1">
              {availableImages.map((img, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(img)}
                  className={`relative w-16 h-20 lg:w-full lg:h-24 shrink-0 rounded-[var(--radius-xl)] overflow-hidden transition-all duration-300 touch-target-sm ${
                    selectedImage === img
                      ? 'ring-2 ring-accent ring-offset-2'
                      : 'ring-1 ring-border hover:ring-accent'
                  }`}
                >
                  <Image src={img} alt={`View ${index + 1}`} fill sizes="(max-width: 1024px) 64px, 80px" className="object-cover" />
                </button>
              ))}
            </div>

            {/* Main Image */}
            <div className="relative w-full rounded-[var(--radius-xl)] overflow-hidden bg-card-hover order-1 lg:order-2 shadow-sm group" style={{ aspectRatio: '3/4' }}>
              <AnimatePresence mode="wait">
                {selectedImage && (
                  <motion.div
                    key={selectedImage}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="w-full h-full"
                  >
                    <ImageZoom src={selectedImage} alt={product.name} />
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 touch-only bg-black/50 text-white text-[10px] px-3 py-1.5 rounded-full whitespace-nowrap pointer-events-none">
                      Hold to zoom • Tap images to compare
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Product Details */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mt-10 lg:mt-0"
          >
            <h1 className="text-[var(--text-3xl)] font-[family-name:var(--font-playfair)] text-foreground mb-[var(--space-sm)] tracking-wide">
              {product.name}
            </h1>
            <div className="mt-[var(--space-sm)] flex items-center gap-[var(--space-md)]">
              <span className="text-[var(--text-3xl)] text-accent font-semibold font-[family-name:var(--font-playfair)]">
                EGP {product.price?.toLocaleString()}
              </span>
              {product.old_price && product.old_price > product.price && (
                <span className="text-[var(--text-lg)] text-secondary line-through">
                  EGP {product.old_price?.toLocaleString()}
                </span>
              )}
            </div>
            {flashSale && (
              <div className="mt-[var(--space-md)] p-[var(--space-sm)] bg-rose-50 border border-rose-200 rounded-[var(--radius-xl)]">
                <div className="flex items-center gap-[var(--space-sm)] text-rose-600 font-semibold text-[var(--text-sm)] mb-[var(--space-xs)]">
                  <span>🔥 FLASH SALE — {flashSale.discount_percentage}% OFF</span>
                </div>
                <CountdownTimer endsAt={flashSale.ends_at} />
              </div>
            )}

            {/* Quantity */}
            <div className="mt-[var(--space-2xl)]">
              <div className="flex items-center justify-between mb-[var(--space-sm)]">
                <h3 className="text-[var(--text-xs)] text-secondary font-medium uppercase tracking-widest">
                  Quantity: {targetQty}
                </h3>
                <span className="text-[var(--text-xs)] text-secondary">Max {Math.min(availableStock, 10)}</span>
              </div>
              <div className="flex items-center gap-[var(--space-md)]">
                <div className="flex items-center border border-border rounded-[var(--radius-xl)] bg-card shadow-sm">
                  <button
                    onClick={() => {
                      if (targetQty <= 1) return;
                      const exitingMulti = targetQty === 2;
                      setTargetQty(prev => prev - 1);
                      if (exitingMulti) {
                        setSizeQty(product?.sizes?.[0] ? { [product.sizes[0]]: 1 } : {});
                      }
                    }}
                    disabled={targetQty <= 1}
                    aria-label="Decrease quantity"
                    className="touch-target-sm px-[var(--space-md)] py-[var(--space-sm)] text-secondary hover:text-foreground hover:bg-card-hover transition-colors rounded-l-[var(--radius-xl)] disabled:opacity-30"
                  >
                    −
                  </button>
                  <span className="px-[var(--space-lg)] py-[var(--space-sm)] font-medium text-[var(--text-sm)] border-x border-border min-w-[3rem] text-center">
                    {totalQty}
                  </span>
                  <button
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
                    aria-label="Increase quantity"
                    className="touch-target-sm px-[var(--space-md)] py-[var(--space-sm)] text-secondary hover:text-foreground hover:bg-card-hover transition-colors rounded-r-[var(--radius-xl)] disabled:opacity-30"
                  >
                    +
                  </button>
                </div>
                {isMultiMode && !isBalanced && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-rose-500 text-[var(--text-xs)] font-medium bg-rose-50 px-[var(--space-md)] py-[var(--space-sm)] rounded-full flex items-center gap-[var(--space-sm)]"
                  >
                    <span>✦</span> Allocate {targetQty - allocatedTotal} more
                  </motion.div>
                )}
                {isMultiMode && isBalanced && allocatedTotal > 0 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-green-600 text-[var(--text-xs)] font-medium bg-green-50 px-[var(--space-md)] py-[var(--space-sm)] rounded-full"
                  >
                    ✓ Allocated
                  </motion.div>
                )}
              </div>
            </div>

            {/* Size Selection */}
            <div className="mt-[var(--space-2xl)]">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-[var(--space-lg)] border border-border rounded-[var(--radius-xl)] bg-card hover:border-accent/30 transition-all"
              >
                <div className="flex items-center justify-between mb-[var(--space-sm)]">
                  <h3 className="text-[var(--text-xs)] text-accent font-semibold uppercase tracking-widest">
                    {isMultiMode ? 'Distribute across sizes' : 'Select Size'}
                  </h3>
                  <span className={`text-[var(--text-xs)] font-medium ${isLowStock ? 'text-rose-500' : 'text-green-600'}`}>
                    {isLowStock ? `Only ${availableStock} left` : `${availableStock} available`}
                  </span>
                </div>
                <div className="flex flex-wrap gap-[var(--space-sm)]">
                  {product.sizes?.map((size) => {
                    const qty = sizeQty[size] || 0;
                    return isMultiMode ? (
                      <div key={size} className="flex flex-col items-center gap-1">
                        <span className="text-[var(--text-xs)] text-secondary font-medium uppercase">{size}</span>
                        <div className="flex items-center border border-border rounded-full overflow-hidden">
                          <button
                            type="button"
                            onClick={() => decrementSize(size)}
                            disabled={qty === 0}
                            className="px-2 py-1 text-[var(--text-xs)] hover:bg-card-hover disabled:opacity-30 transition-colors"
                          >
                            −
                          </button>
                          <span className="px-3 py-1 text-[var(--text-xs)] font-medium min-w-[2rem] text-center border-x border-border">
                            {qty}
                          </span>
                          <button
                            type="button"
                            onClick={() => incrementSize(size)}
                            disabled={allocatedTotal >= targetQty}
                            className="px-2 py-1 text-[var(--text-xs)] hover:bg-card-hover disabled:opacity-30 transition-colors"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        key={size}
                        type="button"
                        onClick={() => {
                          setSizeQty({ [size]: 1 });
                        }}
                        className={`py-[var(--space-sm)] px-[var(--space-lg)] text-[var(--text-xs)] font-medium uppercase rounded-full transition-all duration-300 ${
                          qty > 0
                            ? 'bg-accent text-white shadow-sm scale-105'
                            : 'bg-card-hover text-secondary hover:bg-border hover:text-foreground'
                        }`}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            </div>

            {/* Add to Cart */}
            <div className="mt-[var(--space-3xl)]">
              <button
                disabled={isAdding || isOutOfStock || allocatedTotal === 0 || (isMultiMode && !isBalanced)}
                className={`w-full py-[var(--space-lg)] px-[var(--space-xl)] text-[var(--text-sm)] font-semibold uppercase tracking-widest rounded-[var(--radius-xl)] transition-all duration-300 ${
                  isOutOfStock || (isMultiMode && !isBalanced) || allocatedTotal === 0
                    ? 'bg-border text-secondary cursor-not-allowed'
                    : 'bg-accent text-white hover:bg-accent-deep shadow-md hover:shadow-lg active:scale-[0.98]'
                }`}
                onClick={handleAddToCart}
              >
                {isAdding ? 'Adding...' : isOutOfStock ? 'Out of Stock' : allocatedTotal === 0 ? 'Select a size' : isMultiMode && !isBalanced ? `Allocate ${targetQty - allocatedTotal} more` : isLowStock ? `Only ${availableStock} Left — Add to Cart` : 'Add to Cart — Checkout'}
              </button>
              {allocatedTotal > 0 && isBalanced && selectedSizes.length > 0 && (
                <div className="text-center text-secondary text-[var(--text-xs)] mt-[var(--space-sm)] space-y-1">
                  <p>{availableStock} item{availableStock !== 1 ? 's' : ''} available</p>
                  <p className="text-accent font-medium">
                    {selectedSizes.map(s => `${s} × ${sizeQty[s]}`).join(', ')}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
      
      {/* Bundles / Complete the Look */}
      {relevantBundles.length > 0 && (
        <div className="max-w-7xl mx-auto mt-[var(--space-3xl)] border-t border-border pt-[var(--space-2xl)]">
          <h2 className="text-[var(--text-2xl)] font-[family-name:var(--font-playfair)] text-foreground mb-[var(--space-lg)] text-center">Complete the Look</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[var(--space-lg)]">
            {relevantBundles.map(bundle => (
              <div key={bundle.id} className="bg-card rounded-[var(--radius-xl)] border border-border p-[var(--space-lg)] text-center hover:shadow-md transition-all">
                {bundle.image ? (
                  <div className="w-full aspect-[4/3] rounded-[var(--radius-xl)] bg-card-hover overflow-hidden mb-[var(--space-md)]">
                    <div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: `url(${bundle.image})` }} />
                  </div>
                ) : (
                  <div className="w-full aspect-[4/3] rounded-[var(--radius-xl)] bg-card-hover flex items-center justify-center mb-[var(--space-md)]">
                    <span className="text-[var(--text-3xl)] font-bold text-border font-[family-name:var(--font-playfair)]">OG</span>
                  </div>
                )}
                <h3 className="font-bold text-[var(--text-sm)] mb-[var(--space-xs)]">{bundle.name}</h3>
                {bundle.description && <p className="text-[var(--text-xs)] text-secondary mb-[var(--space-sm)]">{bundle.description}</p>}
                <p className="text-[var(--text-sm)] font-bold text-rose-500">
                  {bundle.discount_type === 'percentage' ? `${bundle.discount_value}% OFF` : `EGP ${bundle.discount_value} OFF`}
                </p>
                <p className="text-[var(--text-xs)] text-secondary mt-[var(--space-sm)]">Add both to cart to save</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Social Proof */}
      <SocialProof productId={product.id} todaySales={0} />

      {/* Reviews */}
      <div className="max-w-3xl mx-auto px-[var(--container-padding)]">
        <ReviewSection productSlug={resolvedParams.slug} />
      </div>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <div className="max-w-7xl mx-auto mt-[var(--space-3xl)] border-t border-border pt-[var(--space-3xl)]">
          <h2 className="text-[var(--text-2xl)] font-[family-name:var(--font-playfair)] text-foreground mb-[var(--space-xl)] text-center">
            You May Also Like
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[var(--space-lg)]">
            {relatedProducts.map((p, idx) => (
              <ProductCard key={p.id} product={p} index={idx} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
