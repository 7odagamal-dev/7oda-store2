import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getStoreContext } from '@/lib/store-context';
import { filterByStore } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const slugs = request.nextUrl.searchParams.get('slugs');
    if (!slugs) {
      return NextResponse.json({ products: [] });
    }

    const slugList = slugs.split(',').filter(Boolean).map(s => s.trim());
    if (slugList.length === 0) {
      return NextResponse.json({ products: [] });
    }

    if (!supabase) throw new Error('Supabase client not initialized');
    const { storeId } = await getStoreContext(request);
    const { data: products, error } = await filterByStore(
      supabase.from('products').select('*').in('slug', slugList),
      storeId,
    );

    if (error) throw error;

    return NextResponse.json({ products: products || [] });
  } catch (error) {
    console.error('Wishlist API error:', error);
    return NextResponse.json({ error: 'Failed to fetch wishlist products' }, { status: 500 });
  }
}
