import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const governorate = request.nextUrl.searchParams.get('governorate');
    if (!governorate) {
      return NextResponse.json({ cost: 0, error: 'Governorate is required' });
    }

    if (!supabase) throw new Error('Supabase client not initialized');

    const { data, error } = await supabase
      .from('shipping_rates')
      .select('cost, estimated_days')
      .eq('governorate', governorate)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Shipping rate not found' }, { status: 404 });
    }

    return NextResponse.json({ cost: data.cost, estimated_days: data.estimated_days });
  } catch (error) {
    console.error('Shipping cost error:', error);
    return NextResponse.json({ error: 'Failed to calculate shipping cost' }, { status: 500 });
  }
}
