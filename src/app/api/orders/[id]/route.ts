import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getStoreContext } from '@/lib/store-context';
import { filterByStore } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id?.trim()) {
      return NextResponse.json({ error: 'Order ID required' }, { status: 400 });
    }

    const { storeId } = await getStoreContext(req);

    let query = filterByStore(
      supabaseAdmin
        .from('orders')
        .select('id, display_id, customer_name, governorate, city, status, delivery_status, total, items, payment_method, created_at, store_id'),
      storeId,
    );

    // Support both UUID and display_id
    if (/^[0-9a-f-]{36}$/i.test(id.trim())) {
      query = query.eq('id', id.trim());
    } else {
      query = query.eq('display_id', id.trim().toUpperCase());
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    interface OrderItem {
      name?: string;
      size?: string;
      quantity?: number;
      price?: number;
      product_id?: string;
      image?: string;
    }

    const sanitizedItems = Array.isArray(data.items)
      ? (data.items as OrderItem[]).map((item: OrderItem) => ({
          name: item.name,
          size: item.size,
          quantity: item.quantity,
          price: item.price,
          product_id: item.product_id,
          image: item.image || null,
        }))
      : [];

    return NextResponse.json({
      id: data.id,
      display_id: data.display_id,
      customer_name: data.customer_name,
      governorate: data.governorate,
      city: data.city,
      status: data.status,
      delivery_status: data.delivery_status,
      total: data.total,
      payment_method: data.payment_method,
      items: sanitizedItems,
      created_at: data.created_at,
    });
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}