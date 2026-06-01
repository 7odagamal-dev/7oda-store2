import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const host = request.headers.get('host') || '';

  // Protect admin routes
  if (path.startsWith('/admin') && !path.startsWith('/admin-login') && !path.startsWith('/api/admin/login')) {
    const token = request.cookies.get('og-admin-auth')?.value;

    if (!token) {
      if (path.startsWith('/api/admin')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      return NextResponse.redirect(new URL('/admin-login', request.url));
    }
  }

  // Attach store context headers for all routes
  // The actual domain→store resolution happens in getStoreContext() (API side)
  const response = NextResponse.next();
  if (host) {
    response.headers.set('x-store-host', host);
  }
  response.headers.set('x-store-source', 'middleware');

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|images/|icons/).*)',
  ],
};
