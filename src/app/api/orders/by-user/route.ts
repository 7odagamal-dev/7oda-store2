import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getStoreContext } from '@/lib/store-context'
import { filterByStore } from '@/lib/db'
import type { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { storeId } = await getStoreContext(req)

    const query = filterByStore(
      supabaseAdmin
        .from('orders')
        .select('id, display_id, status, total, items, payment_method, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20),
      storeId,
    )

    const { data: orders, error } = await query

    if (error) {
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    interface OrderItem {
      product_id?: string
      name?: string
      size?: string
      quantity?: number
      price?: number
      image?: string | null
    }

    interface OrderRow {
      id: string
      display_id: string
      status: string
      total: number
      payment_method: string
      created_at: string
      items: OrderItem[] | null
    }

    const sanitized = (orders || []).map((o: OrderRow) => ({
      id: o.id,
      display_id: o.display_id,
      status: o.status,
      total: o.total,
      payment_method: o.payment_method,
      created_at: o.created_at,
      items: Array.isArray(o.items) ? (o.items as OrderItem[]).map(i => ({
        name: i.name,
        size: i.size,
        quantity: i.quantity,
        price: i.price,
        image: i.image || null,
      })) : [],
    }))

    return NextResponse.json({ orders: sanitized })
  } catch (error) {
    console.error('Orders by-user GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
  }
}
