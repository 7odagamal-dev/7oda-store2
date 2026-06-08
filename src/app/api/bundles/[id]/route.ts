import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getStoreContext } from '@/lib/store-context';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { storeId } = await getStoreContext(req);

    const { data: bundle, error } = await supabaseAdmin
      .from('bundles')
      .select('*')
      .eq('id', id)
      .eq('store_id', storeId)
      .eq('is_active', true)
      .single();

    if (error || !bundle) {
      return NextResponse.json({ error: 'Bundle not found' }, { status: 404 });
    }

    const productIds: string[] = bundle.products || [];
    let products: Record<string, unknown>[] = [];
    if (productIds.length > 0) {
      const { data: productRows } = await supabaseAdmin
        .from('products')
        .select('*')
        .in('id', productIds)
        .eq('store_id', storeId);
      if (productRows) products = productRows;
    }

    const productImages: Record<string, string> = {};
    for (const p of products) {
      const row = p as { id: string; main_image: string | null };
      if (row.main_image) productImages[row.id] = row.main_image;
    }

    const enriched = {
      ...bundle,
      products_data: products,
      product_images: productIds.map(id => productImages[id] || null).filter(Boolean),
    };

    return NextResponse.json({ bundle: enriched });
  } catch (error) {
    console.error('Bundle detail GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch bundle' }, { status: 500 });
  }
}
