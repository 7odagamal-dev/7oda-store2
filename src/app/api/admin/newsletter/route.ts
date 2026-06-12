import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAdminSession } from '@/lib/auth';
import { requireRole } from '@/lib/admin-guards';
import { csrfGuard, safeJson } from '@/lib/csrf';
import { checkRateLimit } from '@/lib/rate-limit';
import { log, newCorrelationId } from '@/lib/logger';

export async function GET(req: NextRequest) {
  const roleResp = await requireRole(req, ['superadmin', 'admin']);
  if (roleResp) return roleResp;
  const session = await getAdminSession(req);
  try {
    const storeId = session.storeId || '00000000-0000-0000-0000-000000000001';
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data: subscribers, error, count } = await supabaseAdmin
      .from('subscribers')
      .select('*', { count: 'exact', head: false })
      .eq('store_id', storeId)
      .order('subscribed_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('Admin newsletter fetch error:', error.message);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    return NextResponse.json({
      subscribers: subscribers || [],
      total: count ?? 0,
      page,
      totalPages: Math.ceil((count ?? 0) / limit),
    });
  } catch (error) {
    console.error('Admin newsletter GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}export async function DELETE(req: NextRequest) {
  const correlationId = newCorrelationId();
  const startMs = Date.now();
  const csrfResp = csrfGuard(req);
  if (csrfResp) return csrfResp;
  const roleResp = await requireRole(req, ['superadmin', 'admin']);
  if (roleResp) return roleResp;
  const session = await getAdminSession(req);
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
  const allowed = await checkRateLimit(ip, 'admin_newsletter', 10, 60000);
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
  }
  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: 'Subscriber ID is required' }, { status: 400 });
    }

    const storeId = session.storeId || '00000000-0000-0000-0000-000000000001';
    const { error } = await supabaseAdmin
      .from('subscribers')
      .delete()
      .eq('id', id)
      .eq('store_id', storeId);

    if (error) {
      console.error('Admin newsletter delete error:', error.message);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    log('info', { correlationId, durationMs: Date.now() - startMs, route: '/api/admin/newsletter', method: 'DELETE', statusCode: 200, level: 'info', message: 'Subscriber deleted', metadata: { subscriberId: id } });
    return safeJson({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    log('error', { correlationId, durationMs: Date.now() - startMs, route: '/api/admin/newsletter', method: 'DELETE', statusCode: 500, level: 'error', message: 'Subscriber deletion failed', error: msg });
    console.error('Admin newsletter DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
