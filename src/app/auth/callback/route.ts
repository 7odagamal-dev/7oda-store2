import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import type { NextRequest } from 'next/server'

const ALLOWED_REDIRECTS = new Set([
  '/profile', '/', '/shop', '/cart', '/checkout', '/wishlist',
  '/auth/login', '/auth/register', '/auth/forgot-password',
]);

function safeRedirect(destination: string, defaultDest: string): string {
  try {
    const url = new URL(destination, 'http://localhost');
    if (url.pathname === destination && ALLOWED_REDIRECTS.has(url.pathname)) {
      return url.pathname;
    }
  } catch {}
  return defaultDest;
}

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url)
  const code = searchParams.get('code')
  const redirect = safeRedirect(searchParams.get('redirect') || '', '/profile')

  if (code) {
    const supabase = await createClient()
    await supabase.auth.exchangeCodeForSession(code)
  }

  return NextResponse.redirect(`${origin}${redirect}`)
}
