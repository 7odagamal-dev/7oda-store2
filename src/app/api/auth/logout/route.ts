import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(req: NextRequest) {
  const token = req.cookies.get('og-admin-auth')?.value;

  if (token) {
    await supabaseAdmin.from('admin_sessions').delete().eq('token', token);
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set('og-admin-auth', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });
  response.cookies.set('csrf-token', '', {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
  });

  return response;
}
