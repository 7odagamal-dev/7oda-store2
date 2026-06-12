import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAdminSession } from '@/lib/auth';
import { requireRole } from '@/lib/admin-guards';
import { filterByStore } from '@/lib/db';
import { csrfGuard, safeJson } from '@/lib/csrf';
import { checkRateLimit } from '@/lib/rate-limit';
import { log, newCorrelationId } from '@/lib/logger';

export async function GET(req: NextRequest) {
  const roleResp = await requireRole(req, ['superadmin', 'admin']);
  if (roleResp) return roleResp;
  const session = await getAdminSession(req);

  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabaseAdmin.from('reviews').select('*', { count: 'exact', head: false });
    if (session.storeId) query = filterByStore(query, session.storeId);
    const { data: reviews, error, count } = await query.order('created_at', { ascending: false }).range(from, to);

    if (error) throw error;
    return NextResponse.json({
      data: reviews || [],
      total: count ?? 0,
      page,
      totalPages: Math.ceil((count ?? 0) / limit),
    });
  } catch (error) {
    console.error('Admin reviews fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 });
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
  const allowed = await checkRateLimit(ip, 'admin_reviews', 20, 60000);
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
  }

  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: 'Review ID is required' }, { status: 400 });
    }

    let query = supabaseAdmin.from('reviews').delete().eq('id', id);
    if (session.storeId) query = filterByStore(query, session.storeId);
    const { error } = await query;

    if (error) throw error;
    log('info', { correlationId, durationMs: Date.now() - startMs, route: '/api/admin/reviews', method: 'DELETE', statusCode: 200, level: 'info', message: 'Review deleted', metadata: { reviewId: id } });
    return safeJson({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    log('error', { correlationId, durationMs: Date.now() - startMs, route: '/api/admin/reviews', method: 'DELETE', statusCode: 500, level: 'error', message: 'Review deletion failed', error: msg });
    console.error('Admin review delete error:', error);
    return NextResponse.json({ error: 'Failed to delete review' }, { status: 500 });
  }
}
