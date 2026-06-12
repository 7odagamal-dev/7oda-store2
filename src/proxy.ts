import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import crypto from 'crypto';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '') || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

function buildCSP(nonce: string): string {
  const isDev = process.env.NODE_ENV === 'development';
  // strict-dynamic allows scripts loaded by the nonced entry script to also execute
  // The fallback 'unsafe-inline' is for browsers that don't support strict-dynamic
  const scriptSrc = isDev
    ? `'strict-dynamic' 'nonce-${nonce}' 'unsafe-inline' 'unsafe-eval'`
    : `'strict-dynamic' 'nonce-${nonce}' 'unsafe-inline'`;
  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https:",
    "connect-src 'self' https://*.supabase.co https://accept.paymob.com https://*.paymob.com https://*.sentry.io",
    "frame-src 'self' https://accept.paymob.com",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "base-uri 'self'",
    "worker-src 'self' blob:",
  ].join('; ');
}

export async function proxy(request: NextRequest) {
  const nonce = crypto.randomBytes(16).toString('base64');
  let supabaseResponse = NextResponse.next({ request })
  // Set CSP with nonce and x-nonce header for Next.js inline scripts
  supabaseResponse.headers.set('Content-Security-Policy', buildCSP(nonce));
  supabaseResponse.headers.set('x-nonce', nonce);

  // ── Security headers ──
  supabaseResponse.headers.set('X-Frame-Options', 'DENY');
  supabaseResponse.headers.set('X-Content-Type-Options', 'nosniff');
  supabaseResponse.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  supabaseResponse.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  supabaseResponse.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

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
    const token = request.cookies.get('7h-admin-auth')?.value;

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

  // ── Redirect old /product/:slug to /product/:category/:id ──
  const productSlugMatch = path.match(/^\/product\/([^/]+)$/);
  if (productSlugMatch && supabaseUrl && supabaseAnonKey) {
    const slug = decodeURIComponent(productSlugMatch[1]);
    try {
      const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
          getAll() { return request.cookies.getAll() },
          setAll() {},
        },
      });
      const { data } = await supabase
        .from('products')
        .select('id, category')
        .eq('slug', slug)
        .maybeSingle();
      if (data) {
        return NextResponse.redirect(new URL(
          `/product/${encodeURIComponent(data.category || 'uncategorized')}/${data.id}`,
          request.url
        ));
      }
    } catch {}
    return NextResponse.redirect(new URL('/shop', request.url));
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
