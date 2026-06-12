import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAdminSession } from '@/lib/auth'
import { requireRole } from '@/lib/admin-guards'
import type { Order } from '@/lib/supabase'
import * as XLSX from 'xlsx'

export async function GET(request: NextRequest) {
  try {
    const roleResp = await requireRole(request, ['superadmin', 'admin'])
    if (roleResp) return roleResp
    const session = await getAdminSession(request)

    const { data: orders } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('store_id', session.storeId)
      .order('created_at', { ascending: false })

    const typedOrders = (orders || []) as Order[];
    const rows = typedOrders.map(o => ({
      'Order ID': o.id?.slice(0, 8),
      'Customer Name': o.customer_name,
      'Phone': o.phone,
      'Governorate': o.governorate,
      'City': o.city,
      'Address': o.address,
      'Status': o.status,
      'Total (EGP)': o.total,
      'Items Count': o.items?.reduce((s, i) => s + (i.quantity || 1), 0) || 0,
      'Payment Method': o.payment_method,
      'Notes': o.notes || '',
      'Date': new Date(o.created_at).toLocaleDateString('en-US'),
    }))

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(rows)
    ws['!cols'] = [
      { wch: 10 }, { wch: 25 }, { wch: 15 },
      { wch: 15 }, { wch: 15 }, { wch: 30 },
      { wch: 12 }, { wch: 12 }, { wch: 10 },
      { wch: 12 }, { wch: 20 }, { wch: 12 },
    ]
    XLSX.utils.book_append_sheet(wb, ws, 'Orders')

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="orders-export-${Date.now()}.xlsx"`,
      },
    })
  } catch (err) {
    console.error('Export error:', err)
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }
}
