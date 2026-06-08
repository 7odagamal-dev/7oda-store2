import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAdminSession } from '@/lib/auth';
import { csrfGuard, safeJson } from '@/lib/csrf';

export async function GET(req: NextRequest) {
  const session = await getAdminSession(req);
  if (!session.valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { data, error } = await supabaseAdmin.from('shipping_rates').select('*').order('governorate');
    if (error) throw error;
    return NextResponse.json(data || []);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch shipping rates' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const csrfResp = csrfGuard(req);
  if (csrfResp) return csrfResp;

  const session = await getAdminSession(req);
  if (!session.valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.role !== 'superadmin') return NextResponse.json({ error: 'Forbidden: superadmin only' }, { status: 403 });
  try {
    const body = await req.json();
    if (!body.id || typeof body.id !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid id' }, { status: 400 });
    }
    const cost = typeof body.cost === 'number' && body.cost >= 0 ? body.cost : 0;
    const estimated_days = typeof body.estimated_days === 'string' ? body.estimated_days.slice(0, 100) : '';
    const { error } = await supabaseAdmin.from('shipping_rates').update({
      cost, estimated_days,
    }).eq('id', body.id);
    if (error) throw error;
    return safeJson({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to update shipping rate' }, { status: 500 });
  }
}
