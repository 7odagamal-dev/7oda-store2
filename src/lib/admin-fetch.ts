'use client';

/**
 * adminFetch — a thin wrapper around window.fetch that automatically
 * attaches the CSRF token (from the csrf-token cookie) to every
 * non-GET request targeting an /api/admin/* endpoint.
 *
 * WHY a dedicated wrapper instead of monkey-patching window.fetch:
 *   1. No global pollution — third-party libraries are unaffected.
 *   2. No risk of dangling overrides if a component unmounts unexpectedly.
 *   3. Clear intent — every call site explicitly opts into CSRF protection.
 *
 * Usage: import { adminFetch } from '@/lib/admin-fetch'
 *        await adminFetch('/api/admin/orders', { method: 'PUT', body: ... })
 */

function getCsrfToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)csrf-token=([^;]*)/);
  return match ? match[1] : null;
}

export async function adminFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const method = init?.method || 'GET';

  // Only add CSRF header for mutating requests
  if (method !== 'GET') {
    const token = getCsrfToken();
    if (token) {
      const headers = new Headers(init?.headers);
      if (!headers.has('x-csrf-token')) {
        headers.set('x-csrf-token', token);
      }
      return fetch(input, { ...init, headers });
    }
  }

  return fetch(input, init);
}
