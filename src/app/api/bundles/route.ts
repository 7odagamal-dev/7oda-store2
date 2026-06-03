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
      return NextResponse.json({ bundles: [] });
    }

    return NextResponse.json({ bundles: bundles ?? [] });
  } catch {
    return NextResponse.json({ bundles: [] });
  }
}
