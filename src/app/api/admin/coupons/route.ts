import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAdminSession } from '@/lib/auth';
import { filterByStore } from '@/lib/db';
import { csrfGuard, safeJson } from '@/lib/csrf';

export async function GET(req: NextRequest) {
  const session = await getAdminSession(req);
  if (!session.valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    let query = supabaseAdmin.from('coupons').select('*');
    if (session.storeId) query = filterByStore(query, session.storeId);
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return NextResponse.json(data || []);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch coupons' }, { status: 500 });
  }
}

function sanitizeCouponBody(body: Record<string, unknown>, sessionStoreId: string | null) {
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
    return safeJson(data, { status: 201 });
  } catch (error: unknown) {
    const e = error as { code?: string; message?: string };
    if (e?.code === '23505') return NextResponse.json({ error: 'Coupon code already exists' }, { status: 409 });
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
    return safeJson({ success: true });
  } catch {
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
    return safeJson({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to delete coupon' }, { status: 500 });
  }
}
