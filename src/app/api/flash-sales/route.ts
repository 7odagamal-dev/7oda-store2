import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getStoreContext } from '@/lib/store-context';

export async function GET(req: NextRequest) {
  try {
    const { storeId } = await getStoreContext(req);

    const { data: sales, error } = await supabaseAdmin
      .from('flash_sales')
      .select('product_id, discount_percentage, ends_at')
      .eq('store_id', storeId)
      .eq('is_active', true)
      .gt('ends_at', new Date().toISOString());

    if (error) {
      console.error('Active flash sales fetch error:', error.message);
      return NextResponse.json({ error: 'Failed to fetch flash sales' }, { status: 500 });
    }

    return NextResponse.json({ sales: sales ?? [] });
  } catch (error) {
    console.error('Flash sales GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch flash sales' }, { status: 500 });
  }
}
