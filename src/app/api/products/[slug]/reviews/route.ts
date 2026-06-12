import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getStoreContext } from '@/lib/store-context';
import { filterByStore } from '@/lib/db';
import { checkRateLimit } from '@/lib/rate-limit';
import { stripHtml } from '@/lib/email-utils';

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
      .eq('store_id', storeId)
      .single();

    if (!product) {
      return NextResponse.json({ reviews: [], averageRating: 0, totalReviews: 0 });
    }

    const { data: reviews, error } = await filterByStore(
      supabase.from('reviews').select('*').eq('product_id', product.id),
      storeId,
    ).order('created_at', { ascending: false });

    if (error) throw error;

    const totalRating = reviews?.reduce((sum: number, r: { rating: number }) => sum + r.rating, 0) || 0;
    const averageRating = reviews && reviews.length > 0
      ? Math.round((totalRating / reviews.length) * 10) / 10
      : 0;

    return NextResponse.json({ reviews: reviews || [], averageRating, totalReviews: reviews?.length || 0 });
  } catch (error) {
    console.error('Reviews fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
    const allowed = await checkRateLimit(ip, 'create_review', 5, 60000);
    if (!allowed) {
      return NextResponse.json({ error: 'Too many reviews. Please try again later.' }, { status: 429 });
    }

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
      .eq('store_id', storeId)
      .single();

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const { error } = await supabase
      .from('reviews')
      .insert({
        product_id: product.id,
        name: stripHtml(name.trim()).slice(0, 100),
        rating: parsedRating,
        comment: stripHtml(comment.trim()),
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
