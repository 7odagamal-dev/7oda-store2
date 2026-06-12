import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { supabaseAnon } from '@/lib/supabase-anon';
import { getStoreContext } from '@/lib/store-context';
import { checkRateLimit } from '@/lib/rate-limit';
import { createClient } from '@/lib/supabase-server';
import { calculateShippingCost } from '@/lib/shipping';
import { getIdempotencyResult, setIdempotencyResult } from '@/lib/idempotency';
import { log, newCorrelationId } from '@/lib/logger';
import { normalizeEmail, stripHtml } from '@/lib/email-utils';
import crypto from 'crypto';

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

interface DbProduct {
  id: string;
  name: string;
  price: number;
  main_image: string | null;
  stock: number;
  reserved_stock: number | null;
}

interface DbFlashSale {
  product_id: string;
  discount_percentage: number;
}

interface DbCoupon {
  id: string;
  code: string;
  is_active: boolean;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order: number;
  max_uses: number | null;
  used_count: number;
  expires_at: string | null;
  coupon_type: string;
  linked_email: string | null;
}

function validateCoupon(
  coupon: DbCoupon | null,
  calculatedTotal: number,
  customerEmail: string | null,
): { valid: boolean; discount?: number; couponId?: string } {
  if (!coupon || !coupon.is_active) return { valid: false };
  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) return { valid: false };
  if (coupon.max_uses && coupon.used_count >= coupon.max_uses) return { valid: false };
  if (calculatedTotal < coupon.min_order) return { valid: false };

  if (coupon.linked_email) {
    if (!customerEmail) return { valid: false };
    const normalizedInput = normalizeEmail(customerEmail);
    if (!normalizedInput || normalizedInput !== coupon.linked_email) return { valid: false };
  }

  let discount = 0;
  if (coupon.discount_type === 'percentage') {
    discount = Math.round((calculatedTotal * coupon.discount_value) / 100);
  } else {
    discount = coupon.discount_value;
  }
  if (discount > calculatedTotal) discount = calculatedTotal;

  return { valid: true, discount, couponId: coupon.id };
}

export async function POST(req: NextRequest) {
  const correlationId = newCorrelationId();
  const startMs = Date.now();
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
    const allowed = await checkRateLimit(ip, 'checkout', 10, 60000);
    if (!allowed) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
    }

    // ── Origin CSRF check ──
    const origin = req.headers.get('origin') || req.headers.get('referer') || '';
    const host = req.headers.get('host') || '';
    const allowedOrigins = [host, `www.${host}`];
    if (origin) {
      try {
        const originHost = new URL(origin).host;
        if (!allowedOrigins.includes(originHost)) {
          log('warn', { correlationId, route: '/api/checkout', method: 'POST', durationMs: Date.now() - startMs, statusCode: 403, level: 'warn', message: 'CSRF: origin mismatch', metadata: { origin, host } });
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
      } catch {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const body = await req.json();
    const customer_name = body.customer_name ? stripHtml(body.customer_name.trim()) : '';
    const phone = body.phone ? body.phone.trim() : '';
    const governorate = body.governorate ? body.governorate.trim() : '';
    const city = body.city ? body.city.trim() : '';
    const address = body.address ? stripHtml(body.address.trim()) : '';
    const notes = body.notes ? stripHtml(body.notes.trim().slice(0, 500)) : '';
    const payment_method = body.payment_method;
    const coupon_code = body.coupon_code;
    const idempotency_key = body.idempotency_key || crypto.randomUUID();
    const items = body.items;
    const rawEmail = stripHtml(body.email || body.customer_email || '').trim();
    const customer_email = normalizeEmail(rawEmail);

    if (idempotency_key) {
      const existingOrderId = await getIdempotencyResult(idempotency_key);
      if (existingOrderId) {
        return NextResponse.json({ success: true, orderId: existingOrderId, idempotent: true }, { status: 200 });
      }
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
    }
    if (!customer_name || !phone || !governorate || !city) {
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

    let userId: string | null = null
    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      userId = user?.id || null
    } catch {}

    const productIds = items.map((item: CheckoutItem) => item.product_id);
    const { data: products, error: productsError } = await supabaseAnon
      .from('products')
      .select('id, name, price, main_image, stock, reserved_stock')
      .in('id', productIds)
      .eq('store_id', storeId);

    if (productsError || !products) {
      return NextResponse.json({ error: 'Failed to validate products' }, { status: 500 });
    }

    const { data: flashSalesRaw } = await supabaseAnon
      .from('flash_sales')
      .select('product_id, discount_percentage')
      .eq('store_id', storeId)
      .eq('is_active', true)
      .gt('ends_at', new Date().toISOString());
    const flashSales = (flashSalesRaw || []) as DbFlashSale[];

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
      const dbProduct = (products as DbProduct[]).find(p => p.id === item.product_id);
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

      let unitPrice = dbProduct.price;
      const activeFlashSale = (flashSales || []).find(fs => fs.product_id === dbProduct.id);
      if (activeFlashSale) {
        unitPrice = Math.round(dbProduct.price * (1 - activeFlashSale.discount_percentage / 100));
      }
      calculatedTotal += unitPrice * qty;

      orderItems.push({
        product_id: dbProduct.id,
        name: dbProduct.name,
        size: stripHtml(item.size || '').slice(0, 50),
        quantity: qty,
        price: unitPrice,
        image: dbProduct.main_image || null,
      });
    }

    // ── Coupon validation with email check ──
    let couponDiscount = 0;
    let couponId: string | null = null;
    if (coupon_code) {
      const { data: couponRaw, error: couponError } = await supabaseAdmin
        .from('coupons')
        .select('*')
        .eq('code', coupon_code.toUpperCase())
        .eq('store_id', storeId)
        .single();
      const coupon = couponRaw as DbCoupon | null;
      if (!couponError && coupon) {
        const result = validateCoupon(coupon, calculatedTotal, customer_email);
        if (result.valid && result.discount !== undefined) {
          couponDiscount = result.discount;
          couponId = result.couponId || null;
          log('info', { correlationId, route: '/api/checkout', method: 'POST', durationMs: Date.now() - startMs, statusCode: 200, level: 'info', message: 'Coupon applied', metadata: { couponId, discount: couponDiscount }});
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
      const prefix = transliterate(items[0]?.name || '7H')
        .replace(/[^a-zA-Z0-9]/g, '')
        .slice(0, 5)
        .toUpperCase() || '7H';
      const ts = Date.now().toString(36).slice(-4).toUpperCase();
      const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
      return `${prefix}-${ts}${rand}`;
    }

    // ── Step 1: Atomic coupon increment (prevents double-use race condition) ──
    if (couponId) {
      const { data: incResult, error: incError } = await supabaseAdmin.rpc(
        'atomic_increment_coupon',
        { p_coupon_id: couponId },
      );
      if (incError || incResult === false) {
        log('error', { correlationId, route: '/api/checkout', method: 'POST', durationMs: Date.now() - startMs, statusCode: 409, level: 'error', message: 'Coupon increment failed — max_uses reached', metadata: { couponId }});
        return NextResponse.json({ error: 'This coupon has already been used' }, { status: 409 });
      }
    }

    // ── Step 2: Create order ──
    const orderData: Record<string, unknown> = {
      store_id: storeId,
      display_id: generateDisplayId(orderItems),
      ...(userId ? { user_id: userId } : {}),
      customer_name,
      ...(customer_email ? { customer_email } : {}),
      phone: cleanPhone,
      governorate,
      city,
      address,
      notes: notes || null,
      payment_method: validatedPaymentMethod,
      status: 'pending',
      total: finalTotal,
      items: orderItems,
      ip_address: ip,
    };

    const { data: order, error: insertError } = await supabaseAdmin
      .from('orders')
      .insert([{
        ...orderData,
        ...(couponId ? { coupon_id: couponId } : {}),
        ...(idempotency_key ? { idempotency_key } : {}),
      }])
      .select('id')
      .single();

    if (insertError) {
      log('error', { correlationId, route: '/api/checkout', method: 'POST', durationMs: Date.now() - startMs, statusCode: 500, level: 'error', message: 'Order insert failed', error: insertError.message });
      if (couponId) {
        await supabaseAdmin.rpc('atomic_decrement_coupon', { p_coupon_id: couponId });
      }
      return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
    }

    // ── Update coupon with order id and timestamp ──
    if (couponId) {
      await supabaseAdmin.from('coupons').update({
        used_by_order_id: order.id,
        used_at: new Date().toISOString(),
        used_by_ip: ip,
      }).eq('id', couponId);
    }

    // ── Step 3: Reserve stock ──
    const reservePayload = orderItems.map(i => ({ product_id: i.product_id, quantity: i.quantity }));
    const { error: reserveError } = await supabaseAdmin.rpc('reserve_order_stock', {
      order_id: order.id,
      items: reservePayload,
    });

    if (reserveError) {
      log('error', { correlationId, route: '/api/checkout', method: 'POST', durationMs: Date.now() - startMs, statusCode: 409, level: 'error', message: 'Stock reservation failed', error: reserveError.message });
      await supabaseAdmin.from('orders').delete().eq('id', order.id);
      if (couponId) {
        await supabaseAdmin.rpc('atomic_decrement_coupon', { p_coupon_id: couponId });
      }
      return NextResponse.json({
        error: `Stock reservation failed: ${reserveError.message}`,
      }, { status: 409 });
    }

    if (idempotency_key) {
      setIdempotencyResult(idempotency_key, order.id);
    }

    log('info', { correlationId, route: '/api/checkout', method: 'POST', durationMs: Date.now() - startMs, statusCode: 201, level: 'info', message: 'Order created', metadata: { orderId: order.id }});
    return NextResponse.json({ success: true, orderId: order.id, total: finalTotal, idempotency_key }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    log('error', { correlationId, route: '/api/checkout', method: 'POST', durationMs: Date.now() - startMs, statusCode: 500, level: 'error', message: 'Unexpected error', error: message, metadata: { stack: err instanceof Error ? err.stack : undefined }});
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
