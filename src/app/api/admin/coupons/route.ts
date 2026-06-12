import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAdminSession } from '@/lib/auth';
import { filterByStore } from '@/lib/db';
import { csrfGuard, safeJson } from '@/lib/csrf';
import { checkRateLimit } from '@/lib/rate-limit';
import { log, newCorrelationId } from '@/lib/logger';
import { requireRole } from '@/lib/admin-guards';

export async function GET(req: NextRequest) {
  const roleResp = await requireRole(req, ['superadmin', 'admin']);
  if (roleResp) return roleResp;

  const session = await getAdminSession(req);
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabaseAdmin.from('coupons').select('*', { count: 'exact', head: false });
    if (session.storeId) query = filterByStore(query, session.storeId);
    const { data, error, count } = await query.order('created_at', { ascending: false }).range(from, to);
    if (error) throw error;
    return NextResponse.json({
      data: data || [],
      total: count ?? 0,
      page,
      totalPages: Math.ceil((count ?? 0) / limit),
    });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch coupons' }, { status: 500 });
  }
}function sanitizeCouponBody(body: Record<string, unknown>, sessionStoreId: string | null) {
  const sanitized: Record<string, unknown> = {};
  sanitized.store_id = sessionStoreId || '00000000-0000-0000-0000-000000000001';
  sanitized.is_active = true;

  if (typeof body.code === 'string' && body.code.trim()) {
    sanitized.code = body.code.trim().toUpperCase().slice(0, 50);
  }
  if (typeof body.discount_type === 'string' && ['percentage', 'fixed'].includes(body.discount_type)) {
    sanitized.discount_type = body.discount_type;
  } else {
    sanitized.discount_type = 'percentage';
  }
  if (typeof body.discount_value === 'number' && body.discount_value >= 0) {
    sanitized.discount_value = body.discount_value;
  } else {
    sanitized.discount_value = 0;
  }
  if (typeof body.min_order === 'number' && body.min_order >= 0) {
    sanitized.min_order = body.min_order;
  } else {
    sanitized.min_order = 0;
  }
  if (body.max_uses === null || (typeof body.max_uses === 'number' && body.max_uses >= 1)) {
    sanitized.max_uses = body.max_uses;
  } else {
    sanitized.max_uses = null;
  }
  if (typeof body.expires_at === 'string' && body.expires_at.trim()) {
    sanitized.expires_at = body.expires_at.trim();
  }
  if (typeof body.coupon_type === 'string' && ['admin', 'public', 'targeted'].includes(body.coupon_type)) {
    sanitized.coupon_type = body.coupon_type;
  } else {
    sanitized.coupon_type = 'admin';
  }
  if (body.coupon_type === 'targeted' && typeof body.linked_email === 'string' && body.linked_email.trim()) {
    sanitized.linked_email = body.linked_email.trim().toLowerCase();
  }
  return sanitized;
}

export async function POST(req: NextRequest) {
  const correlationId = newCorrelationId();
  const startMs = Date.now();
  const csrfResp = csrfGuard(req);
  if (csrfResp) return csrfResp;

  const roleResp = await requireRole(req, ['superadmin', 'admin']);
  if (roleResp) return roleResp;

  const session = await getAdminSession(req);
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
  const allowed = await checkRateLimit(ip, 'admin_coupons', 20, 60000);
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
  }
  try {
    const body = await req.json();
    const sanitized = sanitizeCouponBody(body, session.storeId);
    const { data, error } = await supabaseAdmin.from('coupons').insert(sanitized).select().single();
    if (error) throw error;
    log('info', { correlationId, durationMs: Date.now() - startMs, route: '/api/admin/coupons', method: 'POST', statusCode: 201, level: 'info', message: 'Coupon created', metadata: { couponId: data.id } });
    return safeJson(data, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    log('error', { correlationId, durationMs: Date.now() - startMs, route: '/api/admin/coupons', method: 'POST', statusCode: 500, level: 'error', message: 'Coupon creation failed', error: msg });
    const e = error as { code?: string; message?: string };
    if (e?.code === '23505') return NextResponse.json({ error: 'Coupon code already exists' }, { status: 409 });
    return NextResponse.json({ error: 'Failed to create coupon' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const correlationId = newCorrelationId();
  const startMs = Date.now();
  const csrfResp = csrfGuard(req);
  if (csrfResp) return csrfResp;

  const roleResp = await requireRole(req, ['superadmin', 'admin']);
  if (roleResp) return roleResp;

  const session = await getAdminSession(req);
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
  const allowed = await checkRateLimit(ip, 'admin_coupons', 20, 60000);
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
  }
  try {
    const body = await req.json();
    const { id } = body;
    const sanitized = sanitizeCouponBody(body, session.storeId);
    delete sanitized.is_active;
    let query = supabaseAdmin.from('coupons').update(sanitized).eq('id', id);
    if (session.storeId) query = filterByStore(query, session.storeId);
    const { error } = await query;
    if (error) throw error;
    log('info', { correlationId, durationMs: Date.now() - startMs, route: '/api/admin/coupons', method: 'PUT', statusCode: 200, level: 'info', message: 'Coupon updated', metadata: { couponId: id } });
    return safeJson({ success: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    log('error', { correlationId, durationMs: Date.now() - startMs, route: '/api/admin/coupons', method: 'PUT', statusCode: 500, level: 'error', message: 'Coupon update failed', error: msg });
    return NextResponse.json({ error: 'Failed to update coupon' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const correlationId = newCorrelationId();
  const startMs = Date.now();
  const csrfResp = csrfGuard(req);
  if (csrfResp) return csrfResp;

  const roleResp = await requireRole(req, ['superadmin', 'admin']);
  if (roleResp) return roleResp;

  const session = await getAdminSession(req);
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
  const allowed = await checkRateLimit(ip, 'admin_coupons', 20, 60000);
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
  }
  try {
    const { id } = await req.json();
    let query = supabaseAdmin.from('coupons').delete().eq('id', id);
    if (session.storeId) query = filterByStore(query, session.storeId);
    const { error } = await query;
    if (error) throw error;
    log('info', { correlationId, durationMs: Date.now() - startMs, route: '/api/admin/coupons', method: 'DELETE', statusCode: 200, level: 'info', message: 'Coupon deleted', metadata: { couponId: id } });
    return safeJson({ success: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    log('error', { correlationId, durationMs: Date.now() - startMs, route: '/api/admin/coupons', method: 'DELETE', statusCode: 500, level: 'error', message: 'Coupon deletion failed', error: msg });
    return NextResponse.json({ error: 'Failed to delete coupon' }, { status: 500 });
  }
}
