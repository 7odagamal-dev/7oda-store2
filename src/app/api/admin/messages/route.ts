import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAdminSession } from '@/lib/auth';
import { filterByStore } from '@/lib/db';
import { csrfGuard } from '@/lib/csrf';

export async function GET(req: NextRequest) {
  const session = await getAdminSession(req);
  if (!session.valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let query = supabaseAdmin.from('messages').select('*');
  if (session.storeId) query = filterByStore(query, session.storeId);
  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch messages:', error.message);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function PUT(req: NextRequest) {
  const csrfResp = csrfGuard(req);
  if (csrfResp) return csrfResp;

  const session = await getAdminSession(req);
  if (!session.valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: 'Invalid JSON input' }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const csrfResp = csrfGuard(req);
  if (csrfResp) return csrfResp;

  const session = await getAdminSession(req);
  if (!session.valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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

    return NextResponse.json({ 
      success: true, 
      message: 'Message deleted successfully' 
    }, { status: 200 });

  } catch (err: unknown) {
    console.error('Error deleting message:', err);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
