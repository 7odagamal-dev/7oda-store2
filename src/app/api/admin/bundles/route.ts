import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAdminSession } from '@/lib/auth';
import { requireRole } from '@/lib/admin-guards';
import { csrfGuard, safeJson } from '@/lib/csrf';
import { checkRateLimit } from '@/lib/rate-limit';
import { log, newCorrelationId } from '@/lib/logger';

export async function GET(req: NextRequest) {
  const roleResp = await requireRole(req, ['superadmin', 'admin']);
  if (roleResp) return roleResp;
  const session = await getAdminSession(req);
  try {
    const storeId = session.storeId || '00000000-0000-0000-0000-000000000001';
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data: bundles, error, count } = await supabaseAdmin
      .from('bundles')
      .select('*', { count: 'exact', head: false })
      .eq('store_id', storeId)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('Bundles fetch error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      bundles: bundles || [],
      total: count ?? 0,
      page,
      totalPages: Math.ceil((count ?? 0) / limit),
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Bundles GET error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}export async function POST(req: NextRequest) {
  const correlationId = newCorrelationId();
  const startMs = Date.now();
  const csrfResp = csrfGuard(req);
  if (csrfResp) return csrfResp;
  const roleResp = await requireRole(req, ['superadmin', 'admin']);
  if (roleResp) return roleResp;
  const session = await getAdminSession(req);
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
  const allowed = await checkRateLimit(ip, 'admin_bundles', 20, 60000);
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
  }
  try {
    const storeId = session.storeId || '00000000-0000-0000-0000-000000000001';
    const body = await req.json();

    if (!body.name || !body.products || !body.discount_type || !body.discount_value) {
      return NextResponse.json({ error: 'Name, products, discount type, and discount value are required' }, { status: 400 });
    }

    if (!Array.isArray(body.products) || body.products.length < 2) {
      return NextResponse.json({ error: 'At least 2 products required for a bundle' }, { status: 400 });
    }

    if (!['percentage', 'fixed'].includes(body.discount_type)) {
      return NextResponse.json({ error: 'Discount type must be percentage or fixed' }, { status: 400 });
    }

    const dv = parseInt(body.discount_value);
    if (isNaN(dv) || dv < 1) {
      return NextResponse.json({ error: 'Invalid discount value' }, { status: 400 });
    }

    const { data: bundle, error } = await supabaseAdmin
      .from('bundles')
      .insert([{
        store_id: storeId,
        name: body.name.trim().slice(0, 200),
        description: body.description?.trim().slice(0, 500) || null,
        products: body.products,
        discount_type: body.discount_type,
        discount_value: dv,
        image: body.image?.trim().slice(0, 500) || null,
        image_source: body.image_source || 'custom',
        image_layout: body.image_layout || 'side-by-side',
        image_data: body.image_data || {},
        is_active: body.is_active !== false,
      }])
      .select()
      .single();

    if (error) {
      console.error('Bundle create error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    log('info', { correlationId, durationMs: Date.now() - startMs, route: '/api/admin/bundles', method: 'POST', statusCode: 200, level: 'info', message: 'Bundle created', metadata: { bundleId: bundle.id } });
    return safeJson({ bundle });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    log('error', { correlationId, durationMs: Date.now() - startMs, route: '/api/admin/bundles', method: 'POST', statusCode: 500, level: 'error', message: 'Bundle creation failed', error: msg });
    console.error('Bundles POST error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
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
  const allowed = await checkRateLimit(ip, 'admin_bundles', 20, 60000);
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
  }
  try {
    const body = await req.json();
    if (!body.id) {
      return NextResponse.json({ error: 'Bundle ID is required' }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};

    if (body.name !== undefined) updates.name = body.name.trim().slice(0, 200);
    if (body.description !== undefined) updates.description = body.description?.trim().slice(0, 500) || null;
    if (body.products !== undefined) {
      if (!Array.isArray(body.products) || body.products.length < 2) {
        return NextResponse.json({ error: 'At least 2 products required' }, { status: 400 });
      }
      updates.products = body.products;
    }
    if (body.discount_type !== undefined) {
      if (!['percentage', 'fixed'].includes(body.discount_type)) {
        return NextResponse.json({ error: 'Discount type must be percentage or fixed' }, { status: 400 });
      }
      updates.discount_type = body.discount_type;
    }
    if (body.discount_value !== undefined) {
      const dv = parseInt(body.discount_value);
      if (isNaN(dv) || dv < 1) {
        return NextResponse.json({ error: 'Invalid discount value' }, { status: 400 });
      }
      updates.discount_value = dv;
    }
    if (body.image !== undefined) updates.image = body.image?.trim().slice(0, 500) || null;
    if (body.image_source !== undefined) updates.image_source = body.image_source;
    if (body.image_layout !== undefined) updates.image_layout = body.image_layout;
    if (body.image_data !== undefined) updates.image_data = body.image_data;
    if (body.is_active !== undefined) updates.is_active = body.is_active === true;
    updates.updated_at = new Date().toISOString();

    const storeId = session.storeId || '00000000-0000-0000-0000-000000000001';
    const { data: bundle, error } = await supabaseAdmin
      .from('bundles')
      .update(updates)
      .eq('id', body.id)
      .eq('store_id', storeId)
      .select()
      .single();

    if (error) {
      console.error('Bundle update error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    log('info', { correlationId, durationMs: Date.now() - startMs, route: '/api/admin/bundles', method: 'PUT', statusCode: 200, level: 'info', message: 'Bundle updated', metadata: { bundleId: bundle.id } });
    return safeJson({ bundle });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    log('error', { correlationId, durationMs: Date.now() - startMs, route: '/api/admin/bundles', method: 'PUT', statusCode: 500, level: 'error', message: 'Bundle update failed', error: msg });
    console.error('Bundles PUT error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
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
  const allowed = await checkRateLimit(ip, 'admin_bundles', 20, 60000);
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
  }
  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: 'Bundle ID is required' }, { status: 400 });
    }

    const storeId = session.storeId || '00000000-0000-0000-0000-000000000001';
    const { error } = await supabaseAdmin
      .from('bundles')
      .delete()
      .eq('id', id)
      .eq('store_id', storeId);

    if (error) {
      console.error('Bundle delete error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    log('info', { correlationId, durationMs: Date.now() - startMs, route: '/api/admin/bundles', method: 'DELETE', statusCode: 200, level: 'info', message: 'Bundle deleted', metadata: { bundleId: id } });
    return safeJson({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    log('error', { correlationId, durationMs: Date.now() - startMs, route: '/api/admin/bundles', method: 'DELETE', statusCode: 500, level: 'error', message: 'Bundle deletion failed', error: msg });
    console.error('Bundles DELETE error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
