import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '') || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  // ── Supabase Auth session refresh ──
  if (supabaseUrl && supabaseAnonKey) {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    })
    await supabase.auth.getUser()
  }

  const path = request.nextUrl.pathname;
  const host = request.headers.get('host') || '';

  // Protect admin routes (first gate — route handlers also call getAdminSession())
  if (path.startsWith('/admin') && !path.startsWith('/admin-login') && !path.startsWith('/api/admin/login')) {
    const token = request.cookies.get('og-admin-auth')?.value;

    if (!token) {
      if (path.startsWith('/api/admin')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      return NextResponse.redirect(new URL('/admin-login', request.url));
    }

    // Basic token format validation (32 bytes → 64 hex chars)
    if (token.length !== 64 || !/^[0-9a-f]+$/.test(token)) {
      if (path.startsWith('/api/admin')) {
        return NextResponse.json({ error: 'Invalid session token' }, { status: 401 });
      }
      return NextResponse.redirect(new URL('/admin-login', request.url));
    }
  }

  // Attach store context headers for all routes
  if (host) {
    supabaseResponse.headers.set('x-store-host', host);
  }
  supabaseResponse.headers.set('x-store-source', 'middleware');

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|images/|icons/).*)',
  ],
};
