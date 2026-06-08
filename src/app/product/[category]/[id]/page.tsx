'use client';

import { useEffect, useState, use } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
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
import { BundleImageDisplay } from '@/components/BundleDisplay';

export default function ProductDetails({ params }: { params: Promise<{ category: string; id: string }> }) {
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
  const [relevantBundles, setRelevantBundles] = useState<Array<{ id: string; name: string; description: string | null; products: string[]; discount_type: string; discount_value: number; image: string | null; image_source: string; image_layout: string; product_images: string[] }>>([]);

  const { addItem } = useCart();

  useEffect(() => {
    async function fetchProduct() {
      try {
        setLoading(true);
        const [productRes, flashRes, bundlesRes] = await Promise.all([
          fetch(`/api/products/by-id/${encodeURIComponent(resolvedParams.id)}`),
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
  }, [resolvedParams.id]);

  const availableStock = product ? Math.max(0, product.stock - (product.reserved_stock ?? 0)) : 0;
  const isLowStock = availableStock > 0 && availableStock <= 5;
  const isOutOfStock = availableStock <= 0;
  const flashDiscountedPrice = flashSale && product
    ? Math.round(product.price * (1 - flashSale.discount_percentage / 100))
    : undefined;

  const allocatedTotal = Object.values(sizeQty).reduce((a, b) => a + b, 0);
  const isMultiMode = targetQty > 1;
  const isBalanced = allocatedTotal === targetQty;

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
    if (!product) return;
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
        addItem(product, size, qty, flashDiscountedPrice);
      }
    }
    router.push('/cart');
  };

  if (loading) {
    return <ProductDetailSkeleton />;
  }

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
        {/* Breadcrumb */}
        <nav className="text-xs text-[#6B7280] mb-6">
          <Link href="/" className="hover:text-[#8BA4B8]">Home</Link>
          <span className="mx-2">/</span>
          <Link href="/shop" className="hover:text-[#8BA4B8]">Shop</Link>
          <span className="mx-2">/</span>
          {product.category && (
            <><Link href={`/shop?category=${encodeURIComponent(product.category)}`} className="hover:text-[#8BA4B8]">{product.category}</Link><span className="mx-2">/</span></>
          )}
          <span className="text-[#1A1A1A]">{product.name}</span>
        </nav>

        <div className="lg:grid lg:grid-cols-2 lg:gap-x-[var(--space-3xl)]">
          {/* Left: Images */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-[var(--space-lg)] lg:mb-0"
          >
            <div className="relative w-full aspect-[4/5] rounded-[var(--radius-xl)] overflow-hidden bg-card-hover mb-[var(--space-md)]">
              <ImageZoom src={selectedImage || product.main_image} alt={product.name} />
            </div>
            {availableImages.length > 1 && (
              <div className="flex gap-[var(--space-sm)]">
                {availableImages.map((img, i) => (
                  <button key={i} onClick={() => setSelectedImage(img)}
                    className={`w-20 h-20 rounded-[var(--radius-lg)] overflow-hidden border-2 transition-all ${selectedImage === img ? 'border-accent' : 'border-border hover:border-accent/50'}`}
                  >
                    <Image src={img} alt={product.name} width={80} height={80} className="w-full h-full object-cover" sizes="80px" />
                  </button>
                ))}
              </div>
            )}
          </motion.div>

          {/* Right: Details */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="flex flex-col justify-center"
          >
            {/* Category Badge */}
            {product.category && (
              <Link href={`/shop?category=${encodeURIComponent(product.category)}`}
                className="text-[var(--text-xs)] tracking-[0.15em] uppercase text-accent mb-[var(--space-sm)] block hover:underline"
              >
                {product.category}
              </Link>
            )}

            <h1 className="text-[var(--text-3xl)] md:text-[var(--text-4xl)] font-[family-name:var(--font-playfair)] tracking-wide text-foreground mb-[var(--space-sm)]">
              {product.name}
            </h1>

            {/* Price */}
            <div className="flex items-baseline gap-[var(--space-sm)] mb-[var(--space-md)]">
              {flashDiscountedPrice ? (
                <>
                  <span className="text-2xl font-bold text-rose-500">EGP {flashDiscountedPrice}</span>
                  <span className="text-lg text-[#9CA3AF] line-through">EGP {product.price}</span>
                  <span className="text-xs font-medium text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full">-{flashSale?.discount_percentage}%</span>
                </>
              ) : product.old_price && product.old_price > product.price ? (
                <>
                  <span className="text-2xl font-bold text-foreground">EGP {product.price}</span>
                  <span className="text-lg text-[#9CA3AF] line-through">EGP {product.old_price}</span>
                  <span className="text-xs font-medium text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full">-{product.discount_percentage || Math.round((1 - product.price / product.old_price) * 100)}%</span>
                </>
              ) : (
                <span className="text-2xl font-bold text-foreground">EGP {product.price}</span>
              )}
            </div>

            {/* Flash Sale Timer */}
            {flashSale && (
              <div className="mb-[var(--space-md)] p-[var(--space-md)] bg-rose-50 border border-rose-200 rounded-[var(--radius-xl)]">
                <CountdownTimer endsAt={flashSale.ends_at} />
              </div>
            )}

            {/* Stock Status */}
            <div className="mb-[var(--space-md)]">
              {isOutOfStock ? (
                <span className="text-xs font-medium text-red-500 bg-red-50 px-3 py-1 rounded-full">Out of Stock</span>
              ) : isLowStock ? (
                <span className="text-xs font-medium text-amber-600 bg-amber-50 px-3 py-1 rounded-full">Only {availableStock} left</span>
              ) : product.stock > 0 ? (
                <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">In Stock ({availableStock} available)</span>
              ) : null}
            </div>

            {/* Size Selector */}
            {product.sizes && product.sizes.length > 0 && (
              <div className="mb-[var(--space-md)]">
                <div className="flex items-center justify-between mb-[var(--space-xs)]">
                  <span className="text-[var(--text-xs)] font-semibold text-foreground tracking-wide uppercase">
                    Select Size
                  </span>
                </div>

                {/* Target Quantity Control (Multi-size Mode) */}
                {product.sizes.length > 1 && (
                  <div className="flex items-center gap-[var(--space-sm)] mb-[var(--space-sm)]">
                    <span className="text-[var(--text-xs)] text-secondary">Qty:</span>
                    <button onClick={() => { if (targetQty > 1) { setTargetQty(p => p - 1); if (isMultiMode) setSizeQty({}); } }}
                      className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-sm hover:bg-card-hover transition-all disabled:opacity-30"
                    >
                      −
                    </button>
                    <span className="text-sm font-semibold w-6 text-center">{targetQty}</span>
                    <button onClick={() => { setTargetQty(p => p + 1); if (targetQty >= 1) setSizeQty({}); }}
                      className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-sm hover:bg-card-hover transition-all"
                    >
                      +
                    </button>
                    {isMultiMode && (
                      <span className="text-[10px] text-secondary ml-1">
                        (distribute {targetQty} items across sizes)
                      </span>
                    )}
                  </div>
                )}

                {/* Size Grid */}
                <div className="flex flex-wrap gap-[var(--space-xs)]">
                  {product.sizes.map(size => {
                    const qty = sizeQty[size] || 0;
                    const isSelected = qty > 0;
                    return (
                      <div key={size} className="flex items-center">
                        <button
                          onClick={() => { if (!isSelected) incrementSize(size); }}
                          disabled={isSelected || (isMultiMode && isBalanced)}
                          className={`min-w-[2.5rem] px-2 py-2 text-[var(--text-xs)] font-medium rounded-[var(--radius-lg)] border transition-all ${
                            isSelected
                              ? 'bg-accent text-white border-accent'
                              : 'bg-card border-border text-foreground hover:border-accent hover:text-accent'
                          } disabled:opacity-40`}
                        >
                          {size}
                        </button>
                        {isSelected && (
                          <div className="flex items-center ml-1">
                            <button onClick={() => decrementSize(size)}
                              className="w-5 h-5 rounded-full bg-card-hover flex items-center justify-center text-[10px] hover:bg-border transition-all"
                            >
                              −
                            </button>
                            <span className="text-[10px] font-mono w-4 text-center">{qty}</span>
                            <button onClick={() => incrementSize(size)}
                              disabled={isMultiMode && isBalanced}
                              className="w-5 h-5 rounded-full bg-card-hover flex items-center justify-center text-[10px] hover:bg-border transition-all disabled:opacity-30"
                            >
                              +
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Add to Cart */}
            <button onClick={handleAddToCart} disabled={isAdding || isOutOfStock}
              className={`w-full py-[var(--space-md)] rounded-[var(--radius-xl)] text-sm font-semibold tracking-wide transition-all duration-300 ${
                isOutOfStock
                  ? 'bg-card-hover text-secondary cursor-not-allowed'
                  : 'bg-accent text-white hover:bg-accent-deep shadow-md hover:shadow-lg active:scale-[0.98]'
              }`}
            >
              {isOutOfStock ? 'Out of Stock' : isAdding ? 'Adding...' : 'Add to Cart'}
            </button>

            {/* Bundle Discount Info */}
            {relevantBundles.length > 0 && (
              <p className="text-[var(--text-xs)] text-rose-500 mt-[var(--space-sm)] text-center">
                ✦ This item is part of a bundle — save when you buy together
              </p>
            )}
          </motion.div>
        </div>

        {/* Product Description */}
        {product.description && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="max-w-3xl mx-auto mt-[var(--space-3xl)] border-t border-border pt-[var(--space-2xl)]"
          >
            <h2 className="text-[var(--text-xl)] font-[family-name:var(--font-playfair)] text-foreground mb-[var(--space-md)] text-center">Description</h2>
            <p className="text-secondary text-sm leading-relaxed whitespace-pre-line">{product.description}</p>
          </motion.div>
        )}

        {/* Bundles / Complete the Look */}
        {relevantBundles.length > 0 && (
          <div className="max-w-7xl mx-auto mt-[var(--space-3xl)] border-t border-border pt-[var(--space-2xl)]">
            <h2 className="text-[var(--text-2xl)] font-[family-name:var(--font-playfair)] text-foreground mb-[var(--space-lg)] text-center">Complete the Look</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[var(--space-lg)]">
              {relevantBundles.map(bundle => (
                <Link key={bundle.id} href={`/bundles/${bundle.id}`}>
                  <div className="bg-card rounded-[var(--radius-xl)] border border-border p-[var(--space-lg)] text-center hover:shadow-md transition-all">
                    <BundleImageDisplay bundle={bundle} />
                    <h3 className="font-bold text-[var(--text-sm)] mb-[var(--space-xs)]">{bundle.name}</h3>
                    {bundle.description && <p className="text-[var(--text-xs)] text-secondary mb-[var(--space-sm)]">{bundle.description}</p>}
                    <p className="text-[var(--text-sm)] font-bold text-rose-500">
                      {bundle.discount_type === 'percentage' ? `${bundle.discount_value}% OFF` : `EGP ${bundle.discount_value} OFF`}
                    </p>
                    <p className="text-[var(--text-xs)] text-secondary mt-[var(--space-sm)]">Add both to cart to save</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Social Proof */}
        <SocialProof productId={product.id} todaySales={0} />

        {/* Reviews */}
        <div className="max-w-3xl mx-auto px-[var(--container-padding)]">
          <ReviewSection productSlug={product.slug} />
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
    </div>
  );
}