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
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState<string>('');
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

  const incrementQuantity = () => {
    const maxLimit = product?.stock || 10;
    if (quantity < maxLimit) {
      setQuantity(prev => prev + 1);
    }
  };

  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity(prev => prev - 1);
    }
  };

  const handleAddToCart = () => {
    if (!selectedSize) {
      alert('Please select a size');
      return;
    }
    setIsAdding(true);
    addItem(product!, selectedSize, quantity);
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
    <div className="min-h-screen pt-24 pb-12 px-6 sm:px-8 lg:px-10 bg-[#F8F9FB]">
      <div className="max-w-7xl mx-auto">
        <div className="lg:grid lg:grid-cols-2 lg:gap-x-16">
          {/* Product Images */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col lg:flex-row gap-4"
          >
            {/* Thumbnails */}
            <div className="flex lg:flex-col gap-3 overflow-x-auto lg:overflow-visible py-2 lg:py-0 w-full lg:w-20 shrink-0 order-2 lg:order-1">
              {availableImages.map((img, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(img)}
                  className={`relative w-16 h-20 lg:w-full lg:h-24 shrink-0 rounded-xl overflow-hidden transition-all duration-300 ${
                    selectedImage === img
                      ? 'ring-2 ring-[#8BA4B8] ring-offset-2'
                      : 'ring-1 ring-[#E5E7EB] hover:ring-[#8BA4B8]'
                  }`}
                >
                  <Image src={img} alt={`View ${index + 1}`} fill sizes="(max-width: 1024px) 64px, 80px" className="object-cover" />
                </button>
              ))}
            </div>

            {/* Main Image */}
            <div className="relative w-full rounded-2xl overflow-hidden bg-[#F3F5F8] order-1 lg:order-2 shadow-sm" style={{ aspectRatio: '3/4' }}>
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
            <h1 className="text-3xl font-[family-name:var(--font-playfair)] text-[#1A1A1A] mb-2 tracking-wide">
              {product.name}
            </h1>
            <div className="mt-3 flex items-center gap-4">
              <span className="text-3xl text-[#8BA4B8] font-semibold font-[family-name:var(--font-playfair)]">
                EGP {product.price?.toLocaleString()}
              </span>
              {product.old_price && product.old_price > product.price && (
                <span className="text-lg text-[#9CA3AF] line-through">
                  EGP {product.old_price?.toLocaleString()}
                </span>
              )}
            </div>
            {flashSale && (
              <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl">
                <div className="flex items-center gap-2 text-rose-600 font-semibold text-sm mb-1">
                  <span>🔥 FLASH SALE — {flashSale.discount_percentage}% OFF</span>
                </div>
                <CountdownTimer endsAt={flashSale.ends_at} />
              </div>
            )}

            {/* Quantity */}
            <div className="mt-8">
              <h3 className="text-xs text-[#6B7280] font-medium mb-3 uppercase tracking-widest">Quantity</h3>
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-center inline-flex border border-[#E5E7EB] rounded-xl bg-white shadow-sm">
                  <button
                    onClick={decrementQuantity}
                    className="px-4 py-3 text-[#6B7280] hover:text-[#1A1A1A] hover:bg-[#F3F5F8] transition-colors rounded-l-xl"
                  >
                    −
                  </button>
                  <span className="px-5 py-3 font-medium text-sm border-x border-[#E5E7EB] min-w-[3rem] text-center">
                    {quantity}
                  </span>
                  <button
                    onClick={incrementQuantity}
                    className="px-4 py-3 text-[#6B7280] hover:text-[#1A1A1A] hover:bg-[#F3F5F8] transition-colors rounded-r-xl"
                  >
                    +
                  </button>
                </div>
                {quantity > 1 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-[#6B8BA0] text-xs font-medium bg-[#8BA4B8]/10 px-4 py-2 rounded-full flex items-center gap-2"
                  >
                    <span>✦</span> Add multiple items to qualify for bundle discounts
                  </motion.div>
                )}
              </div>
            </div>

            {/* Size Selection */}
            <div className="mt-10">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-5 border border-[#E5E7EB] rounded-xl bg-white hover:border-[#8BA4B8]/30 transition-all"
              >
                <h3 className="text-xs text-[#8BA4B8] font-semibold uppercase mb-3 tracking-widest">Select Size</h3>
                <div className="flex flex-wrap gap-2">
                  {product.sizes?.map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setSelectedSize(size)}
                      className={`py-2 px-5 text-xs font-medium uppercase rounded-full transition-all duration-300 ${
                        selectedSize === size
                          ? 'bg-[#8BA4B8] text-white shadow-sm scale-105'
                          : 'bg-[#F3F5F8] text-[#6B7280] hover:bg-[#E5E7EB] hover:text-[#1A1A1A]'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </motion.div>
            </div>

            {/* Add to Cart */}
            <div className="mt-12">
              <button
                disabled={isAdding || product.stock <= 0}
                className={`w-full py-5 px-8 text-sm font-semibold uppercase tracking-widest rounded-xl transition-all duration-300 ${
                  product.stock <= 0
                    ? 'bg-[#E5E7EB] text-[#9CA3AF] cursor-not-allowed'
                    : 'bg-[#8BA4B8] text-white hover:bg-[#6B8BA0] shadow-md hover:shadow-lg active:scale-[0.98]'
                }`}
                onClick={handleAddToCart}
              >
                {isAdding ? 'Adding...' : product.stock <= 0 ? 'Out of Stock' : 'Add to Cart — Checkout'}
              </button>
              {quantity > 1 && (
                <p className="text-center text-[#9CA3AF] text-xs mt-3 italic">
                  * Bundle discounts (if any) will be applied at checkout.
                </p>
              )}
            </div>
          </motion.div>
        </div>
      </div>
      
      {/* Bundles / Complete the Look */}
      {relevantBundles.length > 0 && (
        <div className="max-w-7xl mx-auto mt-20 border-t border-[#E5E7EB] pt-12">
          <h2 className="text-2xl font-[family-name:var(--font-playfair)] text-[#1A1A1A] mb-6 text-center">Complete the Look</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {relevantBundles.map(bundle => (
              <div key={bundle.id} className="bg-white rounded-2xl border border-[#E5E7EB] p-6 text-center hover:shadow-md transition-all">
                {bundle.image ? (
                  <div className="w-full aspect-[4/3] rounded-xl bg-[#F3F5F8] overflow-hidden mb-4">
                    <div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: `url(${bundle.image})` }} />
                  </div>
                ) : (
                  <div className="w-full aspect-[4/3] rounded-xl bg-[#F3F5F8] flex items-center justify-center mb-4">
                    <span className="text-3xl font-bold text-[#E5E7EB] font-[family-name:var(--font-playfair)]">OG</span>
                  </div>
                )}
                <h3 className="font-bold text-sm mb-1">{bundle.name}</h3>
                {bundle.description && <p className="text-xs text-[#6B7280] mb-3">{bundle.description}</p>}
                <p className="text-sm font-bold text-rose-500">
                  {bundle.discount_type === 'percentage' ? `${bundle.discount_value}% OFF` : `EGP ${bundle.discount_value} OFF`}
                </p>
                <p className="text-[10px] text-[#9CA3AF] mt-2">Add both to cart to save</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Social Proof */}
      <SocialProof productId={product.id} todaySales={0} />

      {/* Reviews */}
      <div className="max-w-3xl mx-auto">
        <ReviewSection productSlug={resolvedParams.slug} />
      </div>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <div className="max-w-7xl mx-auto mt-32 border-t border-[#E5E7EB] pt-16">
          <h2 className="text-2xl font-[family-name:var(--font-playfair)] text-[#1A1A1A] mb-8 text-center">
            You May Also Like
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {relatedProducts.map((p, idx) => (
              <ProductCard key={p.id} product={p} index={idx} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
