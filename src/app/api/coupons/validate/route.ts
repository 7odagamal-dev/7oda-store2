import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getStoreContext } from '@/lib/store-context';
import { checkRateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
    const allowed = await checkRateLimit(ip, 'validate_coupon', 10, 60000);
    if (!allowed) {
      return NextResponse.json({ valid: false, error: 'Too many attempts. Please try again later.' }, { status: 429 });
    }

    const { code, orderTotal } = await request.json();
    if (!code) return NextResponse.json({ valid: false, error: 'Code is required' });

    const { storeId } = await getStoreContext(request);

    const { data: coupon, error } = await supabaseAdmin
      .from('coupons')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('store_id', storeId)
      .single();

    if (error || !coupon) {
      return NextResponse.json({ valid: false, error: 'Invalid coupon code' });
    }

    if (!coupon.is_active) {
      return NextResponse.json({ valid: false, error: 'This coupon is no longer active' });
    }

    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      return NextResponse.json({ valid: false, error: 'This coupon has expired' });
    }

    if (coupon.max_uses && coupon.used_count >= coupon.max_uses) {
      return NextResponse.json({ valid: false, error: 'This coupon has reached its usage limit' });
    }

    if (orderTotal && orderTotal < coupon.min_order) {
      return NextResponse.json({ valid: false, error: `Minimum order amount is EGP ${coupon.min_order}` });
    }

    let discountAmount = 0;
    if (coupon.discount_type === 'percentage') {
      discountAmount = Math.round((orderTotal * coupon.discount_value) / 100);
    } else {
      discountAmount = coupon.discount_value;
    }

    if (discountAmount > orderTotal) discountAmount = orderTotal;

    return NextResponse.json({
      valid: true,
      discount: discountAmount,
      discountType: coupon.discount_type,
      discountValue: coupon.discount_value,
      code: coupon.code,
    });
  } catch (error) {
    console.error('Coupon validation error:', error);
    return NextResponse.json({ valid: false, error: 'Failed to validate coupon' });
  }
}
