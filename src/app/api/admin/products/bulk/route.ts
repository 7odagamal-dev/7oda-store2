import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAdminSession } from '@/lib/auth'
import { csrfGuard } from '@/lib/csrf'
import * as XLSX from 'xlsx'

export async function POST(request: NextRequest) {
  try {
    const csrfResp = csrfGuard(request)
    if (csrfResp) return csrfResp

    const session = await getAdminSession(request)
    if (!session.valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const form = await request.formData()
    const file = form.get('file') as File
    if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })

    const buf = Buffer.from(await file.arrayBuffer())
    const wb = XLSX.read(buf, { type: 'buffer' })
    const ws = wb.Sheets[wb.SheetNames[0]]
    const rows: any[] = XLSX.utils.sheet_to_json(ws)

    if (!rows.length) return NextResponse.json({ error: 'File is empty' }, { status: 400 })

    const results = { success: 0, errors: [] as string[] }

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]
      try {
        const name = String(r.name || r.Name || r.NAME || '').trim()
        const price = Number(r.price || r.Price || r.PRICE || 0)
        const stock = Number(r.stock || r.Stock || r.STOCK || 0)
        const category = String(r.category || r.Category || r.CATEGORY || '').toLowerCase().trim()

        if (!name || !price || !category) {
          results.errors.push(`Row ${i + 2}: Missing required fields (name, price, category)`)
          continue
        }

        const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
        const oldPrice = Number(r.old_price || r.oldPrice || r['Old Price'] || r['old price'] || 0) || null
        const discountPct = oldPrice && price ? Math.round(((oldPrice - price) / oldPrice) * 100) : null
        const description = String(r.description || r.Description || r.DESC || '').trim()
        const mainImage = String(r.main_image || r.mainImage || r['Main Image'] || r.image || r.Image || '').trim()
        const secondImage = String(r.second_image || r.secondImage || r['Second Image'] || '').trim()
        const sizesRaw = String(r.sizes || r.Sizes || r.SIZE || '').trim()
        const sizes = sizesRaw ? sizesRaw.split(',').map((s: string) => s.trim().toUpperCase()).filter(Boolean) : ['M', 'L', 'XL']

        const product = {
          store_id: session.storeId || '00000000-0000-0000-0000-000000000001',
          name,
          slug,
          description,
          price,
          old_price: oldPrice,
          discount_percentage: discountPct,
          category,
          stock,
          sizes,
          main_image: mainImage,
          second_image: secondImage,
          is_featured: false,
        }

        const { error } = await supabaseAdmin.from('products').insert(product)
        if (error) throw error
        results.success++
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : 'Unknown error';
        results.errors.push(`Row ${i + 2}: ${errMsg}`)
      }
    }

    return NextResponse.json(results)
  } catch (err) {
    console.error('Bulk upload error:', err)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
