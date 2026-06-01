/**
 * auth.ts — Server-side session validation helper
 *
 * SEC-01: reads from Supabase admin_sessions table (not in-memory store)
 * SEC-02: reads token from HttpOnly cookie (not Authorization header or body)
 *
 * Uses direct fetch() to PostgREST instead of the supabaseAdmin client
 * to avoid 'fetch failed' errors from the supabase-js library in Next.js 16.
 */
import { NextRequest } from 'next/server';

export type UserRole = 'superadmin' | 'owner' | 'admin' | 'staff';

export interface AdminSession {
  valid: boolean;
  storeId: string | null;
  role: UserRole | null;
  userId: string | null;
}

const SCHEMA_RETRY_MS = 1500;

function getSupabaseUrl(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || '';
}

function getServiceKey(): string {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || '';
}

async function supabaseRest<T = any>(
  path: string,
  options?: {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
    select?: string;
  }
): Promise<{ data: T | null; error: any }> {
  const url = getSupabaseUrl();
  const key = getServiceKey();
  if (!url || !key) {
    return { data: null, error: new Error('Missing Supabase credentials') };
  }

  const method = options?.method || 'GET';
  const body = options?.body ? JSON.stringify(options.body) : undefined;

  const headers: Record<string, string> = {
    'apikey': key,
    'Authorization': `Bearer ${key}`,
    ...options?.headers,
  };

  if (body) {
    headers['Content-Type'] = 'application/json';
  }

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const fullUrl = `${url}/rest/v1/${path}`;
      const res = await fetch(fullUrl, { method, headers, body });

      if (!res.ok) {
        const text = await res.text();
        const isSchemaError = text.includes('does not exist') ||
          text.includes('42703') || text.includes('PGRST205');
        if (isSchemaError && attempt < 3) {
          await new Promise(r => setTimeout(r, SCHEMA_RETRY_MS * attempt));
          continue;
        }
        return { data: null, error: new Error(`Supabase ${res.status}: ${text}`) };
      }

      if (res.status === 204 || res.headers.get('content-length') === '0') {
        return { data: null as T, error: null };
      }

      const text = await res.text();
      const json = text ? JSON.parse(text) : null;
      return { data: json as T, error: null };
    } catch (err) {
      if (attempt < 3) {
        await new Promise(r => setTimeout(r, SCHEMA_RETRY_MS * attempt));
        continue;
      }
      return { data: null, error: err };
    }
  }

  return { data: null, error: new Error('Max retries exceeded') };
}

function encodeValue(val: string): string {
  return encodeURIComponent(val);
}

function buildQuery(table: string, select: string, filters?: Record<string, string>): string {
  let q = `${table}?select=${encodeURIComponent(select)}`;
  if (filters) {
    for (const [col, val] of Object.entries(filters)) {
      q += `&${col}=eq.${encodeValue(val)}`;
    }
  }
  return q;
}

export async function warmupSchema(): Promise<void> {
  try {
    await supabaseRest('admin_sessions?select=token&limit=1');
  } catch {
    // Warmup is best-effort
  }
}

export async function getAdminSession(req: NextRequest): Promise<AdminSession> {
  const token = req.cookies.get('og-admin-auth')?.value;
  if (!token) return { valid: false, storeId: null, role: null, userId: null };

  const q = buildQuery('admin_sessions', 'store_id,expires_at,user_id,user_role', { token });
  const { data, error } = await supabaseRest<any[]>(q);

  if (error || !data || data.length === 0) {
    return { valid: false, storeId: null, role: null, userId: null };
  }

  const row = data[0];

  if (new Date(row.expires_at) < new Date()) {
    await supabaseRest(`admin_sessions?token=eq.${encodeValue(token)}`, { method: 'DELETE' });
    return { valid: false, storeId: null, role: null, userId: null };
  }

  let role: AdminSession['role'] = null;
  if (row.user_role) {
    role = row.user_role as UserRole;
  } else if (row.user_id) {
    const uq = buildQuery('store_users', 'role', { id: row.user_id });
    const { data: user } = await supabaseRest<any[]>(uq);
    if (user && user.length > 0) {
      role = user[0].role as UserRole;
      await supabaseRest(`admin_sessions?token=eq.${encodeValue(token)}`, {
        method: 'PATCH',
        body: { user_role: user[0].role },
      });
    }
  } else {
    role = 'superadmin';
  }

  return {
    valid: true,
    storeId: row.store_id,
    role,
    userId: row.user_id,
  };
}

export async function createSession(params: {
  storeId?: string | null;
  userId?: string | null;
  userRole?: string | null;
}): Promise<{ token: string; expiresAt: Date; response: any }> {
  const { randomBytes } = await import('crypto');
  const { NextResponse: NR } = await import('next/server');

  const SESSION_HOURS = 8;
  const now = Date.now();
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(now + SESSION_HOURS * 60 * 60 * 1000);

  const body = {
    token,
    store_id: params.storeId || null,
    user_id: params.userId || null,
    user_role: params.userRole || null,
    expires_at: expiresAt.toISOString(),
  };

  const { data, error } = await supabaseRest<any[]>('admin_sessions?select=token', {
    method: 'POST',
    body,
    headers: { 'Prefer': 'return=representation' },
  });

  if (error || !data || data.length === 0) {
    throw new Error(`Session creation failed: ${error?.message || 'no data returned'}`);
  }

  const response = NR.json({ success: true });
  response.cookies.set('og-admin-auth', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: SESSION_HOURS * 60 * 60,
    path: '/',
  });
  response.cookies.set('csrf-token', token.slice(0, 16), {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: SESSION_HOURS * 60 * 60,
    path: '/',
  });

  return { token, expiresAt, response };
}
