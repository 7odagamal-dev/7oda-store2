import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAdminSession } from '@/lib/auth';
import { filterByStore } from '@/lib/db';
import { csrfGuard } from '@/lib/csrf';

export async function GET(req: NextRequest) {
  const session = await getAdminSession(req);
  if (!session.valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    let query = supabaseAdmin.from('coupons').select('*');
    if (session.storeId) query = filterByStore(query, session.storeId);
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch coupons' }, { status: 500 });
  }
}

function sanitizeCouponBody(body: Record<string, unknown>, sessionStoreId: string | null) {
  const allowedFields = ['code', 'discount_type', 'discount_value', 'min_order', 'max_uses', 'expires_at'];
  const sanitized: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (body[key] !== undefined) sanitized[key] = body[key];
  }
  if (sanitized.code && typeof sanitized.code === 'string') sanitized.code = sanitized.code.trim().toUpperCase().slice(0, 50);
  if (!['percentage', 'fixed'].includes(sanitized.discount_type as string)) sanitized.discount_type = 'percentage';
  if (typeof sanitized.discount_value !== 'number' || sanitized.discount_value < 0) sanitized.discount_value = 0;
  if (typeof sanitized.min_order !== 'number' || sanitized.min_order < 0) sanitized.min_order = 0;
  if (sanitized.max_uses !== null && (typeof sanitized.max_uses !== 'number' || sanitized.max_uses < 1)) sanitized.max_uses = null;
  if (sanitized.expires_at && typeof sanitized.expires_at === 'string' && !sanitized.expires_at.trim()) sanitized.expires_at = null;
  sanitized.store_id = sessionStoreId || '00000000-0000-0000-0000-000000000001';
  sanitized.is_active = true;
  return sanitized;
}

export async function POST(req: NextRequest) {
  const csrfResp = csrfGuard(req);
  if (csrfResp) return csrfResp;

  const session = await getAdminSession(req);
  if (!session.valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await req.json();
    const sanitized = sanitizeCouponBody(body, session.storeId);
    const { data, error } = await supabaseAdmin.from('coupons').insert(sanitized).select().single();
    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    if (error?.code === '23505') return NextResponse.json({ error: 'Coupon code already exists' }, { status: 409 });
    return NextResponse.json({ error: 'Failed to create coupon' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const csrfResp = csrfGuard(req);
  if (csrfResp) return csrfResp;

  const session = await getAdminSession(req);
  if (!session.valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await req.json();
    const { id } = body;
    const sanitized = sanitizeCouponBody(body, session.storeId);
    delete sanitized.is_active;
    let query = supabaseAdmin.from('coupons').update(sanitized).eq('id', id);
    if (session.storeId) query = filterByStore(query, session.storeId);
    const { error } = await query;
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update coupon' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const csrfResp = csrfGuard(req);
  if (csrfResp) return csrfResp;

  const session = await getAdminSession(req);
  if (!session.valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { id } = await req.json();
    let query = supabaseAdmin.from('coupons').delete().eq('id', id);
    if (session.storeId) query = filterByStore(query, session.storeId);
    const { error } = await query;
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete coupon' }, { status: 500 });
  }
}
