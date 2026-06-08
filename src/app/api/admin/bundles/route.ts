import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAdminSession } from '@/lib/auth';
import { csrfGuard, safeJson } from '@/lib/csrf';

export async function GET(req: NextRequest) {
  const session = await getAdminSession(req);
  if (!session.valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const storeId = session.storeId || '00000000-0000-0000-0000-000000000001';

    const { data: bundles, error } = await supabaseAdmin
      .from('bundles')
      .select('*')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Bundles fetch error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ bundles });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Bundles GET error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
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
        is_active: body.is_active !== false,
      }])
      .select()
      .single();

    if (error) {
      console.error('Bundle create error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return safeJson({ bundle });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Bundles POST error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const csrfResp = csrfGuard(req);
  if (csrfResp) return csrfResp;
  const session = await getAdminSession(req);
  if (!session.valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
    if (body.is_active !== undefined) updates.is_active = body.is_active === true;

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

    return safeJson({ bundle });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Bundles PUT error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const csrfResp = csrfGuard(req);
  if (csrfResp) return csrfResp;
  const session = await getAdminSession(req);
  if (!session.valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    return safeJson({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Bundles DELETE error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
