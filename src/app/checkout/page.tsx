'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState, useCallback, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useCart } from '@/context/CartContext';
import { calculateShippingCost, SHIPPING_RANGE, GOVERNORATES } from '@/lib/shipping';
import { StorageService } from '@/lib/storage';
import { OrderSuccess, type OrderSummaryData } from '@/components/OrderSuccess';

const orderStorage = new StorageService('og-');



const EGYPTIAN_PHONE_REGEX = /^(010|011|012|015)\d{8}$/;

export default function Checkout() {
  const { items, subtotal, total, clearCart } = useCart();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => { setMounted(true); }, []);
  const [orderComplete, setOrderComplete] = useState(false);
  const [orderId, setOrderId] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [shippingCost, setShippingCost] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'online_transfer' | 'cash_on_delivery' | 'paymob'>('online_transfer');
  const [paymentDetails, setPaymentDetails] = useState({ vodafone_cash: '', instapay: '' });
  const [paymobUrl, setPaymobUrl] = useState('');
  const [paymobLoading, setPaymobLoading] = useState(false);
  const [paymobError, setPaymobError] = useState('');

  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponError, setCouponError] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [couponInfo, setCouponInfo] = useState<{ type: string; value: number; code: string } | null>(null);

  const [idempotencyKey] = useState(() =>
    typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2, 18)
  );

  const [orderSummary, setOrderSummary] = useState<{
    subtotal: number;
    discount: number;
    shippingCost: number;
    finalAmount: number;
    items: Array<{ name: string; size: string; quantity: number; price: number; image: string }>;
  } | null>(null);

  const [formData, setFormData] = useState({
    customer_name: '',
    phone: '',
    governorate: '',
    city: '',
    address: '',
    notes: '',
    payment_method: 'online_transfer',
  });

  useEffect(() => {
    fetch('/api/payment-details').then(r => r.json()).then(setPaymentDetails).catch(() => {});
  }, []);

  const handleGovernorateChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, governorate: value }));
    if (value) {
      try {
        const res = await fetch(`/api/shipping/cost?governorate=${encodeURIComponent(value)}`);
        const data = await res.json();
        setShippingCost(data.cost || 0);
      } catch {
        setShippingCost(100);
      }
    } else {
      setShippingCost(0);
    }
  };

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name !== 'governorate') setFormData(prev => ({ ...prev, [name]: value }));
    if (name === 'phone') setPhoneError('');
  }, []);

  const finalAmount = useMemo(() => total + shippingCost - couponDiscount, [total, shippingCost, couponDiscount]);

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    setValidatingCoupon(true);
    setCouponError('');
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponCode.trim(), orderTotal: subtotal }),
      });
      const data = await res.json();
      if (data.valid) {
        setCouponDiscount(data.discount);
        setCouponApplied(true);
        setCouponInfo({ type: data.discountType, value: data.discountValue, code: data.code });
      } else {
        setCouponError(data.error || 'Invalid coupon');
        setCouponDiscount(0);
        setCouponApplied(false);
        setCouponInfo(null);
      }
    } catch {
      setCouponError('Failed to validate coupon');
    } finally {
      setValidatingCoupon(false);
    }
  };

  const removeCoupon = () => {
    setCouponCode('');
    setCouponDiscount(0);
    setCouponApplied(false);
    setCouponError('');
    setCouponInfo(null);
  };

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = formData.phone.replace(/\s/g, '');
    if (!EGYPTIAN_PHONE_REGEX.test(cleanPhone)) {
      setPhoneError('Please enter a valid Egyptian phone number');
      return;
    }
    setLoading(true);
    // For Paymob, create the order first, then redirect to payment
    if (paymentMethod === 'paymob') {
      setPaymobLoading(true);
      setPaymobError('');
      try {
        // Create order in pending status
        const orderRes = await fetch('/api/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formData,
            payment_method: 'paymob',
            phone: cleanPhone,
            shipping_cost: shippingCost,
            coupon_code: couponApplied ? couponCode.trim().toUpperCase() : null,
            idempotency_key: idempotencyKey,
            items: items.map(item => ({
              product_id: item.product.id,
              size: item.size,
              quantity: item.quantity,
            })),
          }),
        });
        const orderData = await orderRes.json();
        if (!orderRes.ok) throw new Error(orderData.error || 'Order creation failed');

        // Create Paymob payment
        const payRes = await fetch('/api/paymob/payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: finalAmount,
            orderId: orderData.orderId,
            customer: {
              name: formData.customer_name,
              phone: cleanPhone,
              city: formData.city,
              address: formData.address,
            },
          }),
        });
        const payData = await payRes.json();
        if (!payRes.ok) throw new Error(payData.error || 'Payment initiation failed');

        clearCart();
        // Redirect to Paymob iframe
        window.location.href = payData.iframeUrl;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Payment failed';
        setPaymobError(message);
        setPaymobLoading(false);
        setLoading(false);
      }
      return;
    }

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formData,
            payment_method: paymentMethod,
            phone: cleanPhone,
            shipping_cost: shippingCost,
            coupon_code: couponApplied ? couponCode.trim().toUpperCase() : null,
            idempotency_key: idempotencyKey,
            items: items.map(item => ({
              product_id: item.product.id,
              size: item.size,
              quantity: item.quantity,
            })),
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail ? `${data.error} (${data.detail})` : (data.error || 'Error'));

      const summary = {
        subtotal,
        discount: couponDiscount,
        shippingCost,
        finalAmount,
        items: items.map(item => ({
          name: item.product.name,
          size: item.size,
          quantity: item.quantity,
          price: item.product.price,
          image: item.image || item.product.main_image,
        })),
      };
      setOrderSummary(summary);

      orderStorage.update<string[]>('order-ids', ids => [...ids, data.orderId].slice(-20), []);

      setOrderId(data.orderId);
      clearCart();
      setOrderComplete(true);
      window.scrollTo(0, 0);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred';
      alert(message);
    } finally {
      setLoading(false);
    }
  }, [items, formData, finalAmount, clearCart, paymentMethod, subtotal, shippingCost, couponDiscount, couponApplied, couponCode]);

  if (!mounted) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-accent border-t-transparent"></div>
      </div>
    );
  }

  if (items.length === 0 && !orderComplete) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-[var(--text-2xl)] font-[family-name:var(--font-playfair)] text-foreground mb-[var(--space-sm)]">Cart is Empty</h1>
          <Link href="/shop" className="text-accent underline underline-offset-4 text-[var(--text-sm)]">Go Back to Shop</Link>
        </div>
      </div>
    );
  }

  if (orderComplete && orderSummary) {
    return <OrderSuccess orderId={orderId} orderSummary={orderSummary} paymentMethod={paymentMethod} paymentDetails={paymentDetails} />;
  }

  if (orderComplete && !orderSummary) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center bg-[#F8F9FB]">
        <p className="text-[#6B7280]">Loading order details...</p>
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
          Checkout
        </motion.h1>
        <div className="grid lg:grid-cols-2 gap-[var(--space-3xl)] lg:items-start">
          <form onSubmit={handleSubmit} className="space-y-[var(--space-xl)]">
            <section className="bg-card border border-border p-[var(--space-md)] sm:p-[var(--space-xl)] rounded-[var(--radius-xl)] shadow-sm">
              <h2 className="text-[var(--text-lg)] font-semibold text-foreground mb-[var(--space-lg)] pb-[var(--space-sm)] border-b border-border-light font-[family-name:var(--font-playfair)]">
                Shipping Details
              </h2>
              <div className="grid gap-[var(--space-md)]">
                <input type="text" name="customer_name" required value={formData.customer_name} onChange={handleChange}
                  className="w-full px-4 py-3 bg-[#F8F9FB] border border-[#E5E7EB] focus:border-[#8BA4B8] focus:outline-none rounded-xl text-sm text-[#1A1A1A] placeholder-[#9CA3AF] transition-all"
                  placeholder="Full Name" />
                <input type="tel" name="phone" required value={formData.phone} onChange={handleChange} maxLength={11} inputMode="numeric"
                  className={`w-full px-4 py-3 bg-[#F8F9FB] border rounded-xl text-sm focus:outline-none transition-all ${phoneError ? 'border-red-400' : 'border-[#E5E7EB] focus:border-[#8BA4B8]'}`}
                  placeholder="Phone Number" />
                {phoneError && <p className="text-xs text-red-400 -mt-2">{phoneError}</p>}
                <select name="governorate" required value={formData.governorate} onChange={handleGovernorateChange}
                  className="w-full px-4 py-3 bg-[#F8F9FB] border border-[#E5E7EB] focus:border-[#8BA4B8] focus:outline-none rounded-xl text-sm text-[#1A1A1A] transition-all">
                  <option value="">Select Governorate</option>
                  {GOVERNORATES.map(gov => <option key={gov} value={gov}>{gov}</option>)}
                </select>
                <input type="text" name="city" required value={formData.city} onChange={handleChange}
                  className="w-full px-4 py-3 bg-[#F8F9FB] border border-[#E5E7EB] focus:border-[#8BA4B8] focus:outline-none rounded-xl text-sm text-[#1A1A1A] placeholder-[#9CA3AF] transition-all"
                  placeholder="City / Area" />
                <textarea name="address" required value={formData.address} onChange={handleChange} rows={3}
                  className="w-full px-4 py-3 bg-[#F8F9FB] border border-[#E5E7EB] focus:border-[#8BA4B8] focus:outline-none rounded-xl text-sm text-[#1A1A1A] placeholder-[#9CA3AF] resize-none transition-all"
                  placeholder="Detailed Address" />
              </div>
            </section>

            <section className="bg-card border border-border p-[var(--space-md)] sm:p-[var(--space-xl)] rounded-[var(--radius-xl)] shadow-sm">
              <h2 className="text-[var(--text-lg)] font-semibold text-foreground mb-[var(--space-lg)] pb-[var(--space-sm)] border-b border-border-light font-[family-name:var(--font-playfair)]">
                Payment Method
              </h2>
              <div className="space-y-[var(--space-sm)]">
                {[
                  { value: 'online_transfer', label: 'Online Transfer (Vodafone Cash / InstaPay)' },
                  { value: 'paymob', label: 'Pay with Card (Visa / Mastercard)' },
                  { value: 'cash_on_delivery', label: 'Cash on Delivery' },
                ].map(option => (
                  <label key={option.value} className="flex items-center gap-[var(--space-sm)] cursor-pointer group p-[var(--space-sm)] rounded-[var(--radius-xl)] hover:bg-background transition-all">
                    <input
                      type="radio"
                      name="payment_method"
                      value={option.value}
                      checked={paymentMethod === option.value}
                      onChange={() => setPaymentMethod(option.value as any)}
                      className="w-4 h-4 accent-accent"
                    />
                    <span className="text-[var(--text-sm)] text-foreground group-hover:text-accent transition-colors">
                      {option.label}
                    </span>
                  </label>
                ))}
              </div>
              {paymobError && <p className="text-xs text-rose-500 mt-2">{paymobError}</p>}
            </section>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-[var(--space-lg)] bg-accent text-white font-semibold text-[var(--text-sm)] tracking-wider uppercase rounded-[var(--radius-xl)] hover:bg-accent-deep transition-all shadow-sm hover:shadow-md active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Place Order'}
            </button>
          </form>

          <aside className="bg-card border border-border p-[var(--space-md)] sm:p-[var(--space-xl)] rounded-[var(--radius-xl)] md:sticky md:top-28 shadow-sm">
            <h2 className="text-[var(--text-lg)] font-semibold text-foreground mb-[var(--space-lg)] font-[family-name:var(--font-playfair)]">Your Order</h2>
            <div className="space-y-[var(--space-md)] max-h-80 overflow-y-auto pr-2">
              {items.map(item => (
                <div key={`${item.product.id}-${item.size}`} className="flex gap-[var(--space-md)] items-center">
                  <div className="relative w-14 h-18 bg-card-hover rounded-[var(--radius-md)] overflow-hidden">
                    <Image src={item.image || item.product.main_image} alt={item.product.name} fill sizes="(max-width: 640px) 56px, 56px" className="object-cover" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[var(--text-xs)] font-medium text-foreground uppercase">{item.product.name}</p>
                    <p className="text-[var(--text-xs)] text-secondary">Size: {item.size} | Qty: {item.quantity}</p>
                  </div>
                  <span className="text-[var(--text-xs)] font-medium text-foreground">EGP {(item.product.price * item.quantity).toLocaleString()}</span>
                </div>
              ))}
            </div>
            {/* Coupon */}
            <div className="mt-[var(--space-lg)] pt-[var(--space-lg)] border-t border-border-light">
              {couponApplied ? (
                <div className="flex items-center justify-between bg-card rounded-[var(--radius-xl)] px-[var(--space-md)] py-[var(--space-sm)]">
                  <div>
                    <span className="text-[var(--text-xs)] font-semibold text-emerald-700">
                      {couponInfo?.type === 'percentage' ? `${couponInfo.value}% OFF` : `EGP ${couponDiscount.toLocaleString()} OFF`}
                    </span>
                    <p className="text-[var(--text-sm)] font-bold text-foreground">− EGP {couponDiscount.toLocaleString()}</p>
                  </div>
                  <button onClick={removeCoupon} className="text-[var(--text-xs)] text-secondary hover:text-rose-500 underline">Remove</button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input type="text" value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())}
                    placeholder="Coupon code"
                    className="flex-1 px-4 py-2.5 bg-[#F8F9FB] border border-[#E5E7EB] rounded-xl text-sm text-[#1A1A1A] placeholder-[#9CA3AF] focus:border-[#8BA4B8] focus:outline-none transition-all" />
                  <button onClick={applyCoupon} disabled={validatingCoupon || !couponCode.trim()}
                    className="px-4 py-2.5 bg-[#1A1A1A] text-white rounded-xl text-xs font-semibold hover:bg-[#333] transition-all disabled:opacity-50">
                    {validatingCoupon ? '...' : 'Apply'}
                  </button>
                </div>
              )}
              {couponError && <p className="text-xs text-rose-500 mt-1.5">{couponError}</p>}
            </div>

            <div className="mt-[var(--space-lg)] pt-[var(--space-lg)] border-t border-border-light space-y-[var(--space-sm)] text-[var(--text-sm)]">
              <div className="flex justify-between text-secondary"><span>Subtotal</span><span>EGP {subtotal.toLocaleString()}</span></div>
              {couponDiscount > 0 && <div className="flex justify-between text-emerald-600 font-medium"><span>Coupon Discount</span><span>− EGP {couponDiscount.toLocaleString()}</span></div>}
              <div className="flex justify-between text-secondary"><span>Shipping</span><span>{shippingCost > 0 ? `EGP ${shippingCost}` : `${SHIPPING_RANGE.min} – ${SHIPPING_RANGE.max} EGP`}</span></div>
              <div className="flex justify-between pt-[var(--space-lg)] border-t border-border-light text-[var(--text-base)] font-bold">
                <span className="text-foreground">TOTAL</span>
                <span className="text-accent">EGP {finalAmount.toLocaleString()}</span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}


