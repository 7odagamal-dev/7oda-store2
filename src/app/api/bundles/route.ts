import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getStoreContext } from '@/lib/store-context';

export async function GET(req: NextRequest) {
  try {
    const { storeId } = await getStoreContext(req);

    const { data: bundles, error } = await supabaseAdmin
      .from('bundles')
      .select('*')
      .eq('store_id', storeId)
      .eq('is_active', true);

    if (error) {
      console.error('Public bundles fetch error:', error.message);
      return NextResponse.json({ error: 'Failed to fetch bundles' }, { status: 500 });
    }

    const active = bundles ?? [];

    const productImages: Record<string, string> = {};
    const allProductIds = active.flatMap(b => b.products || []);
    if (allProductIds.length > 0) {
      const uniqueIds = [...new Set(allProductIds)];
      const { data: products } = await supabaseAdmin
        .from('products')
        .select('id, main_image')
        .in('id', uniqueIds);
      if (products) {
        for (const p of products) {
          if (p.main_image) productImages[p.id] = p.main_image;
        }
      }
    }

    const enriched = active.map(b => ({
      ...b,
      product_images: (b.products || []).map((id: string) => productImages[id] || null).filter(Boolean),
    }));

    return NextResponse.json({ bundles: enriched });
  } catch (error) {
    console.error('Bundles GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch bundles' }, { status: 500 });
  }
}
