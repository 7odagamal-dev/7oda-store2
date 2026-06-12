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

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabaseAdmin.from('messages').select('*', { count: 'exact', head: false });
  if (session.storeId) query = filterByStore(query, session.storeId);
  const { data, error, count } = await query.order('created_at', { ascending: false }).range(from, to);

  if (error) {
    console.error('Failed to fetch messages:', error.message);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
  return NextResponse.json({
    data: data || [],
    total: count ?? 0,
    page,
    totalPages: Math.ceil((count ?? 0) / limit),
  });
}export async function PUT(req: NextRequest) {
  const correlationId = newCorrelationId();
  const startMs = Date.now();
  const csrfResp = csrfGuard(req);
  if (csrfResp) return csrfResp;
  const roleResp = await requireRole(req, ['superadmin', 'admin']);
  if (roleResp) return roleResp;

  const session = await getAdminSession(req);
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
  const allowed = await checkRateLimit(ip, 'admin_messages', 20, 60000);
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
  }

  try {
    const { id, status } = await req.json();
    if (!id || !status) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

    let query = supabaseAdmin.from('messages').update({ status }).eq('id', id);
    if (session.storeId) query = filterByStore(query, session.storeId);
    const { data, error } = await query.select().single();

    if (error) {
      console.error('Failed to update message:', error.message);
      return NextResponse.json({ error: 'Failed to update message' }, { status: 500 });
    }
    log('info', { correlationId, durationMs: Date.now() - startMs, route: '/api/admin/messages', method: 'PUT', statusCode: 200, level: 'info', message: 'Message updated', metadata: { messageId: data.id } });
    return safeJson(data);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    log('error', { correlationId, durationMs: Date.now() - startMs, route: '/api/admin/messages', method: 'PUT', statusCode: 400, level: 'error', message: 'Message update failed', error: msg });
    return NextResponse.json({ error: 'Invalid JSON input' }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const correlationId = newCorrelationId();
  const startMs = Date.now();
  const csrfResp = csrfGuard(req);
  if (csrfResp) return csrfResp;
  const roleResp = await requireRole(req, ['superadmin', 'admin']);
  if (roleResp) return roleResp;

  const session = await getAdminSession(req);
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
  const allowed = await checkRateLimit(ip, 'admin_messages', 20, 60000);
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Message ID is required' }, { status: 400 });
    }

    let deleteQuery = supabaseAdmin.from('messages').delete().eq('id', id);
    if (session.storeId) deleteQuery = filterByStore(deleteQuery, session.storeId);
    const { error } = await deleteQuery;

    if (error) {
      console.error('Failed to delete message:', error.message);
      return NextResponse.json({ error: 'Failed to delete message' }, { status: 500 });
    }

    log('info', { correlationId, durationMs: Date.now() - startMs, route: '/api/admin/messages', method: 'DELETE', statusCode: 200, level: 'info', message: 'Message deleted', metadata: { messageId: id } });
    return safeJson({ 
      success: true, 
      message: 'Message deleted successfully' 
    }, { status: 200 });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    log('error', { correlationId, durationMs: Date.now() - startMs, route: '/api/admin/messages', method: 'DELETE', statusCode: 500, level: 'error', message: 'Message deletion failed', error: msg });
    console.error('Error deleting message:', err);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
