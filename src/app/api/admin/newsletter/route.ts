import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAdminSession } from '@/lib/auth';
import { csrfGuard } from '@/lib/csrf';

export async function GET(req: NextRequest) {
  const session = await getAdminSession(req);
  if (!session.valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const storeId = session.storeId || '00000000-0000-0000-0000-000000000001';

    const { data: subscribers, error } = await supabaseAdmin
      .from('subscribers')
      .select('*')
      .eq('store_id', storeId)
      .order('subscribed_at', { ascending: false });

    if (error) {
      console.error('Admin newsletter fetch error:', error.message);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    return NextResponse.json({ subscribers });
  } catch (error) {
    console.error('Admin newsletter GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const csrfResp = csrfGuard(req);
  if (csrfResp) return csrfResp;
  const session = await getAdminSession(req);
  if (!session.valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: 'Subscriber ID is required' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('subscribers')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Admin newsletter delete error:', error.message);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin newsletter DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
