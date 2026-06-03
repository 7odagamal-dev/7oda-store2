import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAdminSession } from '@/lib/auth';
import { filterByStore } from '@/lib/db';
import { csrfGuard } from '@/lib/csrf';

function sanitizeProductBody(body: Record<string, unknown>): Record<string, unknown> | null {
  const allowed: Record<string, unknown> = {};

  if (typeof body.name === 'string' && body.name.trim()) allowed.name = body.name.trim().slice(0, 200);
  if (typeof body.slug === 'string' && body.slug.trim()) allowed.slug = body.slug.trim().slice(0, 200).toLowerCase().replace(/[^a-z0-9-]/g, '-');
  if (typeof body.description === 'string') allowed.description = body.description.trim().slice(0, 5000);
  if (typeof body.price === 'number' && body.price >= 0) allowed.price = Math.round(body.price);

  if (body.old_price === null) {
    allowed.old_price = null;
  } else if (typeof body.old_price === 'number' && body.old_price >= 0) {
    allowed.old_price = Math.round(body.old_price);
  }

  if (body.discount_percentage === null) {
    allowed.discount_percentage = null;
  } else if (typeof body.discount_percentage === 'number') {
    allowed.discount_percentage = body.discount_percentage;
  }

  if (typeof body.category === 'string') allowed.category = body.category.trim().slice(0, 100);
  if (typeof body.stock === 'number' && body.stock >= 0) allowed.stock = Math.round(body.stock);
  if (typeof body.is_featured === 'boolean') allowed.is_featured = body.is_featured;

  if (typeof body.main_image === 'string') allowed.main_image = body.main_image.trim().slice(0, 2000);
  if (typeof body.second_image === 'string') allowed.second_image = body.second_image.trim().slice(0, 2000);
  if (typeof body.third_image === 'string') allowed.third_image = body.third_image.trim().slice(0, 2000);
  if (typeof body.fourth_image === 'string') allowed.fourth_image = body.fourth_image.trim().slice(0, 2000);

  if (Array.isArray(body.sizes)) allowed.sizes = (body.sizes as unknown[]).filter((s): s is string => typeof s === 'string').slice(0, 20);

  if (!allowed.name || !allowed.slug || typeof allowed.price !== 'number') return null;
  return allowed;
}

export async function GET(req: NextRequest) {
  const session = await getAdminSession(req);
  if (!session.valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const search = searchParams.get('search') || '';
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabaseAdmin
      .from('products')
      .select('*', { count: 'exact', head: false });
    if (session.storeId) query = filterByStore(query, session.storeId);
    if (search) {
      query = query.or(`name.ilike.%${search}%,category.ilike.%${search}%`);
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;
    return NextResponse.json({
      data: data || [],
      total: count ?? 0,
      page,
      limit,
      totalPages: Math.ceil((count ?? 0) / limit),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const csrfResp = csrfGuard(req);
  if (csrfResp) return csrfResp;

  const session = await getAdminSession(req);
  if (!session.valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let raw: Record<string, unknown>;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const body = sanitizeProductBody(raw);
  if (!body) return NextResponse.json({ error: 'Invalid or missing required fields' }, { status: 400 });

  try {
    const insertData = {
      ...body,
      store_id: session.storeId || '00000000-0000-0000-0000-000000000001',
    };
    const { data, error } = await supabaseAdmin.from('products').insert([insertData]).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const csrfResp = csrfGuard(req);
  if (csrfResp) return csrfResp;

  const session = await getAdminSession(req);
  if (!session.valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let raw: Record<string, unknown>;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { id } = raw;
  if (!id || typeof id !== 'string') {
    return NextResponse.json({ error: 'Missing or invalid id' }, { status: 400 });
  }

  const allowed: Record<string, unknown> = {};
  if (typeof raw.name === 'string' && raw.name.trim()) allowed.name = raw.name.trim().slice(0, 200);
  if (typeof raw.slug === 'string' && raw.slug.trim()) allowed.slug = raw.slug.trim().slice(0, 200).toLowerCase().replace(/[^a-z0-9-]/g, '-');
  if (typeof raw.description === 'string') allowed.description = raw.description.trim().slice(0, 5000);
  if (typeof raw.price === 'number' && raw.price >= 0) allowed.price = Math.round(raw.price);

  if (raw.old_price === null) {
    allowed.old_price = null;
  } else if (typeof raw.old_price === 'number' && raw.old_price >= 0) {
    allowed.old_price = Math.round(raw.old_price);
  }
  if (raw.discount_percentage === null) {
    allowed.discount_percentage = null;
  } else if (typeof raw.discount_percentage === 'number') {
    allowed.discount_percentage = raw.discount_percentage;
  }

  if (typeof raw.category === 'string') allowed.category = raw.category.trim().slice(0, 100);
  if (typeof raw.stock === 'number' && raw.stock >= 0) allowed.stock = Math.round(raw.stock);
  if (typeof raw.is_featured === 'boolean') allowed.is_featured = raw.is_featured;
  if (typeof raw.main_image === 'string') allowed.main_image = raw.main_image.trim().slice(0, 2000);
  if (typeof raw.second_image === 'string') allowed.second_image = raw.second_image.trim().slice(0, 2000);
  if (typeof raw.third_image === 'string') allowed.third_image = raw.third_image.trim().slice(0, 2000);
  if (typeof raw.fourth_image === 'string') allowed.fourth_image = raw.fourth_image.trim().slice(0, 2000);
  if (Array.isArray(raw.sizes)) allowed.sizes = (raw.sizes as unknown[]).filter((s): s is string => typeof s === 'string').slice(0, 20);

  if (Object.keys(allowed).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  try {
    let query = supabaseAdmin.from('products').update(allowed).eq('id', id);
    if (session.storeId) query = filterByStore(query, session.storeId);
    const { data, error } = await query.select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const csrfResp = csrfGuard(req);
  if (csrfResp) return csrfResp;

  const session = await getAdminSession(req);
  if (!session.valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let raw: Record<string, unknown>;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { id } = raw;
  if (!id || typeof id !== 'string') {
    return NextResponse.json({ error: 'Missing or invalid id' }, { status: 400 });
  }

  try {
    let query = supabaseAdmin.from('products').delete().eq('id', id);
    if (session.storeId) query = filterByStore(query, session.storeId);
    const { error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
