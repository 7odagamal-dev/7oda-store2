import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireRole } from '@/lib/admin-guards';
import { csrfGuard, safeJson } from '@/lib/csrf';
import { checkRateLimit } from '@/lib/rate-limit';
import { log, newCorrelationId } from '@/lib/logger';

export async function GET(req: NextRequest) {
  const roleResp = await requireRole(req, ['superadmin', 'admin']);
  if (roleResp) return roleResp;
  try {
    const { data, error } = await supabaseAdmin.from('shipping_rates').select('*').order('governorate');
    if (error) throw error;
    return NextResponse.json(data || []);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch shipping rates' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const correlationId = newCorrelationId();
  const startMs = Date.now();
  const csrfResp = csrfGuard(req);
  if (csrfResp) return csrfResp;

  const roleResp = await requireRole(req, ['superadmin']);
  if (roleResp) return roleResp;
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
  const allowed = await checkRateLimit(ip, 'admin_shipping', 10, 60000);
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
  }
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
    log('info', { correlationId, durationMs: Date.now() - startMs, route: '/api/admin/shipping', method: 'PUT', statusCode: 200, level: 'info', message: 'Shipping rate updated', metadata: { rateId: body.id } });
    return safeJson({ success: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    log('error', { correlationId, durationMs: Date.now() - startMs, route: '/api/admin/shipping', method: 'PUT', statusCode: 500, level: 'error', message: 'Shipping rate update failed', error: msg });
    return NextResponse.json({ error: 'Failed to update shipping rate' }, { status: 500 });
  }
}
