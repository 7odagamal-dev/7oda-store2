import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAdminSession } from '@/lib/auth';
import { csrfGuard, safeJson } from '@/lib/csrf';

export async function GET(req: NextRequest) {
  const session = await getAdminSession(req);
  if (!session.valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const storeId = session.storeId || '00000000-0000-0000-0000-000000000001';
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const query = supabaseAdmin
      .from('flash_sales')
      .select('*, products:product_id(name, slug, main_image, price, old_price)', { count: 'exact', head: false })
      .eq('store_id', storeId)
      .order('created_at', { ascending: false })
      .range(from, to);

    const { data, error, count } = await query;

    if (error) throw error;

    return NextResponse.json({
      sales: data || [],
      total: count ?? 0,
      page,
      totalPages: Math.ceil((count ?? 0) / limit),
    });
  } catch (error) {
    console.error('Flash sales GET error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const csrfResp = csrfGuard(req);
  if (csrfResp) return csrfResp;
  const session = await getAdminSession(req);
  if (!session.valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const storeId = session.storeId || '00000000-0000-0000-0000-000000000001';
    const body = await req.json();

    if (!body.product_id) {
      return NextResponse.json({ error: 'Product is required' }, { status: 400 });
    }

    const discount = parseInt(body.discount_percentage);
    if (isNaN(discount) || discount < 1 || discount > 100) {
      return NextResponse.json({ error: 'Discount must be between 1 and 100' }, { status: 400 });
    }

    if (!body.ends_at) {
      return NextResponse.json({ error: 'End date is required' }, { status: 400 });
    }

    const endsAt = new Date(body.ends_at);
    if (endsAt <= new Date()) {
      return NextResponse.json({ error: 'End date must be in the future' }, { status: 400 });
    }

    const { data: sale, error } = await supabaseAdmin
      .from('flash_sales')
      .insert([{
        store_id: storeId,
        product_id: body.product_id,
        discount_percentage: discount,
        ends_at: endsAt.toISOString(),
        is_active: body.is_active !== false,
      }])
      .select('*, products:product_id(name, slug, main_image, price, old_price)')
      .single();

    if (error) {
      console.error('Flash sale create error:', error.message);
      return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
    }

    return safeJson({ sale });
  } catch (error) {
    console.error('Flash sales POST error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const csrfResp = csrfGuard(req);
  if (csrfResp) return csrfResp;
  const session = await getAdminSession(req);
  if (!session.valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const storeId = session.storeId || '00000000-0000-0000-0000-000000000001';
    const body = await req.json();
    if (!body.id) {
      return NextResponse.json({ error: 'Sale ID is required' }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};

    if (body.discount_percentage !== undefined) {
      const d = parseInt(body.discount_percentage);
      if (isNaN(d) || d < 1 || d > 100) {
        return NextResponse.json({ error: 'Discount must be between 1 and 100' }, { status: 400 });
      }
      updates.discount_percentage = d;
    }

    if (body.ends_at !== undefined) {
      const endsAt = new Date(body.ends_at);
      if (endsAt <= new Date()) {
        return NextResponse.json({ error: 'End date must be in the future' }, { status: 400 });
      }
      updates.ends_at = endsAt.toISOString();
    }

    if (body.is_active !== undefined) {
      updates.is_active = body.is_active === true;
    }

    const { data: sale, error } = await supabaseAdmin
      .from('flash_sales')
      .update(updates)
      .eq('id', body.id)
      .eq('store_id', storeId)
      .select('*, products:product_id(name, slug, main_image, price, old_price)')
      .single();

    if (error) {
      console.error('Flash sale update error:', error.message);
      return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
    }

    return safeJson({ sale });
  } catch (error) {
    console.error('Flash sales PUT error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const csrfResp = csrfGuard(req);
  if (csrfResp) return csrfResp;
  const session = await getAdminSession(req);
  if (!session.valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const storeId = session.storeId || '00000000-0000-0000-0000-000000000001';
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: 'Sale ID is required' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('flash_sales')
      .delete()
      .eq('id', id)
      .eq('store_id', storeId);

    if (error) {
      console.error('Flash sale delete error:', error.message);
      return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
    }

    return safeJson({ success: true });
  } catch (error) {
    console.error('Flash sales DELETE error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
