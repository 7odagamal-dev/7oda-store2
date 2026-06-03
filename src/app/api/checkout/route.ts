import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getStoreContext } from '@/lib/store-context';
import { checkRateLimit } from '@/lib/rate-limit';
import { createClient } from '@/lib/supabase-server';
import { calculateShippingCost } from '@/lib/shipping';

const VALID_PAYMENT_METHODS = ['cash_on_delivery', 'online_transfer', 'paymob'] as const;
type PaymentMethod = (typeof VALID_PAYMENT_METHODS)[number];

function isValidPaymentMethod(value: unknown): value is PaymentMethod {
  return typeof value === 'string' && VALID_PAYMENT_METHODS.includes(value as PaymentMethod);
}

interface CheckoutItem {
  product_id: string;
  size: string;
  quantity: number;
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
    const allowed = await checkRateLimit(ip, 'checkout', 10, 60000);
    if (!allowed) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
    }

    const body = await req.json();
    const { items, customer_name, phone, governorate, city, address, notes, payment_method, coupon_code } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
    }
    if (!customer_name || !phone || !governorate || !city || !address) {
      return NextResponse.json({ error: 'Please complete shipping details' }, { status: 400 });
    }

    const cleanPhone = phone.replace(/\s/g, '');
    const EGYPTIAN_PHONE_REGEX = /^(010|011|012|015)\d{8}$/;
    if (!EGYPTIAN_PHONE_REGEX.test(cleanPhone)) {
      return NextResponse.json({ error: 'Please enter a valid Egyptian phone number' }, { status: 400 });
    }

    const validatedPaymentMethod: PaymentMethod = isValidPaymentMethod(payment_method)
      ? payment_method
      : 'cash_on_delivery';

    const { storeId } = await getStoreContext(req);

    // ── Capture user_id if logged in ──
    let userId: string | null = null
    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      userId = user?.id || null
    } catch {}

    // ── Fetch products WITH store isolation ──
    const productIds = items.map((item: CheckoutItem) => item.product_id);
    const { data: products, error: productsError } = await supabaseAdmin
      .from('products')
      .select('id, name, price, main_image, stock, reserved_stock')
      .in('id', productIds)
      .eq('store_id', storeId);

    if (productsError || !products) {
      return NextResponse.json({ error: 'Failed to validate products' }, { status: 500 });
    }

    let calculatedTotal = 0;
    const orderItems: Array<{
      product_id: string;
      name: string;
      size: string;
      quantity: number;
      price: number;
      image: string | null;
    }> = [];

    for (const item of items as CheckoutItem[]) {
      const dbProduct = products.find((p: any) => p.id === item.product_id);
      if (!dbProduct) {
        return NextResponse.json({ error: `Product not found: ${item.product_id}` }, { status: 400 });
      }

      const qty = Math.min(Math.max(1, item.quantity), 10);
      const available = dbProduct.stock - (dbProduct.reserved_stock ?? 0);
      if (dbProduct.stock <= 0 || available <= 0) {
        return NextResponse.json({ error: `"${dbProduct.name}" is currently unavailable` }, { status: 400 });
      }
      if (qty > available) {
        return NextResponse.json({
          error: `Requested quantity of "${dbProduct.name}" (${qty}) exceeds available stock (${available})`
        }, { status: 400 });
      }

      calculatedTotal += dbProduct.price * qty;

      orderItems.push({
        product_id: dbProduct.id,
        name: dbProduct.name,
        size: item.size,
        quantity: qty,
        price: dbProduct.price,
        image: dbProduct.main_image || null,
      });
    }

    // ── Coupon calculation (read-only — no mutation yet) ──
    let couponDiscount = 0;
    let couponRecord: unknown = null;
    if (coupon_code) {
      const { data: coupon, error: couponError } = await supabaseAdmin
        .from('coupons')
        .select('*')
        .eq('code', coupon_code.toUpperCase())
        .eq('store_id', storeId)
        .single();
      if (!couponError && coupon && coupon.is_active) {
        if (!coupon.expires_at || new Date(coupon.expires_at) > new Date()) {
          if (!coupon.max_uses || coupon.used_count < coupon.max_uses) {
            if (calculatedTotal >= coupon.min_order) {
              couponDiscount = coupon.discount_type === 'percentage'
                ? Math.round((calculatedTotal * coupon.discount_value) / 100)
                : coupon.discount_value;
              if (couponDiscount > calculatedTotal) couponDiscount = calculatedTotal;
              couponRecord = coupon;
            }
          }
        }
      }
    }

    const shippingCost = calculateShippingCost(governorate);
    const finalTotal = calculatedTotal - couponDiscount + shippingCost;

    const arabicToLatin: Record<string, string> = {
      'ا':'A','أ':'A','إ':'E','آ':'A','ب':'B','ت':'T','ث':'TH','ج':'G',
      'ح':'H','خ':'KH','د':'D','ذ':'TH','ر':'R','ز':'Z','س':'S','ش':'SH',
      'ص':'S','ض':'D','ط':'T','ظ':'Z','ع':'A','غ':'GH','ف':'F','ق':'Q',
      'ك':'K','ل':'L','م':'M','ن':'N','ه':'H','و':'W','ي':'Y','ى':'A',
      'ة':'H','ء':'','ئ':'E','ؤ':'W',
    };

    function transliterate(text: string): string {
      return [...text].map(c => arabicToLatin[c] || c).join('');
    }

    function generateDisplayId(items: Array<{ name?: string }>): string {
      const prefix = transliterate(items[0]?.name || 'OG')
        .replace(/[^a-zA-Z0-9]/g, '')
        .slice(0, 5)
        .toUpperCase() || 'OG';
      const ts = Date.now().toString(36).slice(-4).toUpperCase();
      const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
      return `${prefix}-${ts}${rand}`;
    }

    // ── Step 1: Create order FIRST ──
    const orderData: Record<string, unknown> = {
      store_id: storeId,
      display_id: generateDisplayId(orderItems),
      ...(userId ? { user_id: userId } : {}),
      customer_name,
      phone: cleanPhone,
      governorate,
      city,
      address,
      notes: notes || null,
      payment_method: validatedPaymentMethod,
      status: 'pending',
      total: finalTotal,
      items: orderItems,
    };

    const { data: order, error: insertError } = await supabaseAdmin
      .from('orders')
      .insert([orderData])
      .select('id')
      .single();

    if (insertError) {
      console.error('[Checkout] Order insert error:', insertError.message);
      return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
    }

    // ── Step 2: Reserve stock ──
    const reservePayload = orderItems.map(i => ({ product_id: i.product_id, quantity: i.quantity }));
    const { error: reserveError } = await supabaseAdmin.rpc('reserve_order_stock', {
      order_id: order.id,
      items: reservePayload,
    });

    if (reserveError) {
      console.error('[Checkout] Stock reservation failed (run schema.sql to deploy reserve_order_stock RPC):', reserveError.message);
      await supabaseAdmin.from('orders').delete().eq('id', order.id);
      return NextResponse.json({
        error: 'Failed to reserve stock. Ensure the database schema is deployed.',
      }, { status: 409 });
    }

    // ── Step 3: Atomic coupon usage increment (race-condition-safe) ──
    if (couponRecord) {
      const cr = couponRecord as { id: string };
      const { error: couponIncrError } = await supabaseAdmin
        .rpc('atomic_increment_coupon', { p_coupon_id: cr.id });
      if (couponIncrError) {
        console.error('[Checkout] Failed to increment coupon usage:', couponIncrError.message);
      }
    }

    return NextResponse.json({ success: true, orderId: order.id }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Checkout] Unexpected error:', message);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
