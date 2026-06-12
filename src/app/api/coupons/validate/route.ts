import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getStoreContext } from '@/lib/store-context';
import { checkRateLimit } from '@/lib/rate-limit';
import { normalizeEmail } from '@/lib/email-utils';
import { log, newCorrelationId } from '@/lib/logger';

const GENERIC_ERROR = 'Invalid or expired coupon code';

export async function POST(request: NextRequest) {
  const correlationId = newCorrelationId();
  const startMs = Date.now();
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
    const allowed = await checkRateLimit(ip, 'validate_coupon', 3, 60000);
    if (!allowed) {
      return NextResponse.json({ valid: false, error: GENERIC_ERROR }, { status: 429 });
    }

    const { code, email } = await request.json();
    if (!code) return NextResponse.json({ valid: false, error: GENERIC_ERROR });

    const { storeId } = await getStoreContext(request);

    const { data: coupon, error } = await supabaseAdmin
      .from('coupons')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('store_id', storeId)
      .single();

    if (error || !coupon) {
      log('warn', { correlationId, durationMs: Date.now() - startMs, route: '/api/coupons/validate', method: 'POST', statusCode: 200, level: 'warn', message: 'Coupon validate: not found', metadata: { code: code.toUpperCase(), ip } });
      return NextResponse.json({ valid: false, error: GENERIC_ERROR });
    }

    if (!coupon.is_active) {
      log('warn', { correlationId, durationMs: Date.now() - startMs, route: '/api/coupons/validate', method: 'POST', statusCode: 200, level: 'warn', message: 'Coupon validate: inactive', metadata: { code: code.toUpperCase(), ip } });
      return NextResponse.json({ valid: false, error: GENERIC_ERROR });
    }

    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      log('warn', { correlationId, durationMs: Date.now() - startMs, route: '/api/coupons/validate', method: 'POST', statusCode: 200, level: 'warn', message: 'Coupon validate: expired', metadata: { code: code.toUpperCase(), ip } });
      return NextResponse.json({ valid: false, error: GENERIC_ERROR });
    }

    if (coupon.max_uses && coupon.used_count >= coupon.max_uses) {
      log('warn', { correlationId, durationMs: Date.now() - startMs, route: '/api/coupons/validate', method: 'POST', statusCode: 200, level: 'warn', message: 'Coupon validate: max uses', metadata: { code: code.toUpperCase(), ip } });
      return NextResponse.json({ valid: false, error: GENERIC_ERROR });
    }

    if (coupon.linked_email) {
      if (!email) {
        log('warn', { correlationId, durationMs: Date.now() - startMs, route: '/api/coupons/validate', method: 'POST', statusCode: 200, level: 'warn', message: 'Coupon validate: linked email required', metadata: { code: code.toUpperCase(), ip } });
        return NextResponse.json({ valid: false, error: GENERIC_ERROR });
      }
      const normalizedInput = normalizeEmail(email);
      if (!normalizedInput || normalizedInput !== coupon.linked_email) {
        log('warn', { correlationId, durationMs: Date.now() - startMs, route: '/api/coupons/validate', method: 'POST', statusCode: 200, level: 'warn', message: 'Coupon validate: email mismatch', metadata: { code: code.toUpperCase(), ip } });
        return NextResponse.json({ valid: false, error: GENERIC_ERROR });
      }
    }

    log('info', { correlationId, durationMs: Date.now() - startMs, route: '/api/coupons/validate', method: 'POST', statusCode: 200, level: 'info', message: 'Coupon validated successfully', metadata: { code: coupon.code, ip } });

    return NextResponse.json({
      valid: true,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      code: coupon.code,
      linked_email: coupon.linked_email,
    });
  } catch (error) {
    log('error', { correlationId, durationMs: Date.now() - startMs, route: '/api/coupons/validate', method: 'POST', statusCode: 500, level: 'error', message: 'Unexpected validation error', error: error instanceof Error ? error.message : 'unknown' });
    return NextResponse.json({ valid: false, error: GENERIC_ERROR });
  }
}
