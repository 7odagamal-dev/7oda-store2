import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { checkRateLimit } from '@/lib/rate-limit';
import { getStoreContext } from '@/lib/store-context';

const MAX_MESSAGES = 5;
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

function sanitize(str: string): string {
  return str.trim().slice(0, 2000).replace(/<[^>]*>/g, '');
}

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get('x-forwarded-for') ??
    req.headers.get('x-real-ip') ??
    'unknown';
  const isAllowed = await checkRateLimit(ip, 'contact', MAX_MESSAGES, WINDOW_MS);
  if (!isAllowed) {
    return NextResponse.json(
      { error: 'Too many messages. Please try again later.' },
      { status: 429 }
    );
  }

  let body: { name?: string; email?: string; message?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const name = sanitize(body.name ?? '');
  const email = sanitize(body.email ?? '');
  const message = sanitize(body.message ?? '');

  if (!name || !email || !message) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
  }

  const { storeId } = await getStoreContext(req);

  const { error } = await supabaseAdmin.from('messages').insert([
    { name, email, message, status: 'unread', store_id: storeId },
  ]);

  if (error) {
    return NextResponse.json({ error: 'Failed to save message' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
