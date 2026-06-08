import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { normalizeSupabaseProjectUrl } from '@/lib/supabase-project-url';
import { getStoreContext } from '@/lib/store-context';
import { filterByStore } from '@/lib/db';

function getServerSupabase() {
  const url = normalizeSupabaseProjectUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id || typeof id !== 'string') {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  const supabase = getServerSupabase();
  if (!supabase) {
    return NextResponse.json({ product: null, source: 'no-db' });
  }

  try {
    const { storeId } = await getStoreContext(req);

    const { data, error } = await filterByStore(
      supabase.from('products').select('*').eq('id', id),
      storeId,
    ).maybeSingle();

    if (error) {
      console.error('Product fetch error:', error.message);
      return NextResponse.json({ product: null, source: 'db-error', message: 'Database error' });
    }

    if (!data) {
      return NextResponse.json({ product: null, source: 'not-found' }, { status: 404 });
    }

    const { data: relatedData } = await filterByStore(
      supabase.from('products').select('*').eq('category', data.category).neq('id', data.id),
      storeId,
    ).limit(4);

    return NextResponse.json({
      product: data,
      relatedProducts: relatedData || [],
      source: 'db'
    });
  } catch {
    return NextResponse.json({ product: null, source: 'error' }, { status: 500 });
  }
}
