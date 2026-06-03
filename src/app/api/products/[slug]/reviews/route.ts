import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getStoreContext } from '@/lib/store-context';
import { filterByStore } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { storeId } = await getStoreContext(request);
    if (!supabase) throw new Error('Supabase client not initialized');

    const { data: product } = await supabase
      .from('products')
      .select('id')
      .eq('slug', slug)
      .single();

    if (!product) {
      return NextResponse.json({ reviews: [], averageRating: 0, totalReviews: 0 });
    }

    const { data: reviews, error } = await filterByStore(
      supabase.from('reviews').select('*').eq('product_id', product.id),
      storeId,
    ).order('created_at', { ascending: false });

    if (error) throw error;

    const totalRating = reviews?.reduce((sum: number, r: any) => sum + r.rating, 0) || 0;
    const averageRating = reviews && reviews.length > 0
      ? Math.round((totalRating / reviews.length) * 10) / 10
      : 0;

    return NextResponse.json({ reviews: reviews || [], averageRating, totalReviews: reviews?.length || 0 });
  } catch (error) {
    console.error('Reviews fetch error:', error);
    return NextResponse.json({ reviews: [], averageRating: 0, totalReviews: 0 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { storeId } = await getStoreContext(request);
    const body = await request.json();
    const { name, rating, comment, image } = body;

    if (!name?.trim() || !comment?.trim()) {
      return NextResponse.json({ error: 'Name and comment are required' }, { status: 400 });
    }

    const parsedRating = parseInt(rating, 10);
    if (!parsedRating || parsedRating < 1 || parsedRating > 5) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 });
    }

    if (!supabase) throw new Error('Supabase client not initialized');

    const { data: product } = await supabase
      .from('products')
      .select('id')
      .eq('slug', slug)
      .single();

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const { error } = await supabase
      .from('reviews')
      .insert({
        product_id: product.id,
        name: name.trim(),
        rating: parsedRating,
        comment: comment.trim(),
        image: image?.trim().slice(0, 500) || null,
        store_id: storeId,
      });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Review creation error:', error);
    return NextResponse.json({ error: 'Failed to submit review' }, { status: 500 });
  }
}
