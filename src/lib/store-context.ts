import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const DEFAULT_STORE_ID = '00000000-0000-0000-0000-000000000001';
export const DEFAULT_STORE_SLUG = '7H-old-gold';

export interface StoreInfo {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  settings: Record<string, unknown>;
  is_active: boolean;
}

export interface StoreContext {
  storeId: string;
  isSuperAdmin: boolean;
  source: 'session' | 'header' | 'domain' | 'default';
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidStoreId(value: unknown): value is string {
  return typeof value === 'string' && UUID_REGEX.test(value);
}

/**
 * Resolve the current store context from a request.
 *
 * Priority:
 *  1. Admin session → admin's assigned store_id (null = superadmin)
 *  2. x-store-id header (only respected if superadmin or no session)
 *  3. x-store-host header → domain lookup in stores table
 *  4. Development: DEFAULT_STORE_ID
 *  5. Production: throws if no store resolved
 */
export async function getStoreContext(req: NextRequest): Promise<StoreContext> {
  const isProduction = process.env.NODE_ENV === 'production';

  // ── 1. Admin session check ──
  const token = req.cookies.get('7H-admin-auth')?.value;
  if (token) {
    const { data: session } = await supabaseAdmin
      .from('admin_sessions')
      .select('store_id, expires_at')
      .eq('token', token)
      .single();

    if (session && new Date(session.expires_at) > new Date()) {
      if (session.store_id === null) {
        // Superadmin — allow override via x-store-id header
        const headerStoreId = req.headers.get('x-store-id');
        if (headerStoreId && isValidStoreId(headerStoreId)) {
          return { storeId: headerStoreId, isSuperAdmin: true, source: 'header' };
        }
        // No override — superadmin has unrestricted access.
        // Return null-like to signal callers to not filter.
        // We use DEFAULT_STORE_ID as a safe default but superadmin routes handle their own logic.
        return { storeId: DEFAULT_STORE_ID, isSuperAdmin: true, source: 'session' };
      }
      // Regular admin — bound to their store
      return { storeId: session.store_id, isSuperAdmin: false, source: 'session' };
    }
  }

  // ── 2. x-store-id header (DEVELOPMENT ONLY — blocked in production) ──
  if (!isProduction) {
    const headerStoreId = req.headers.get('x-store-id');
    if (headerStoreId && isValidStoreId(headerStoreId)) {
      return { storeId: headerStoreId, isSuperAdmin: false, source: 'header' };
    }
  }

  // ── 3. Domain lookup ──
  const host = req.headers.get('x-store-host') || req.headers.get('host') || '';
  if (host) {
    // First check exact domain match
    const { data: domainStore } = await supabaseAdmin
      .from('stores')
      .select('id')
      .eq('domain', host)
      .eq('is_active', true)
      .maybeSingle();

    if (domainStore) {
      return { storeId: domainStore.id, isSuperAdmin: false, source: 'domain' };
    }

    // Then check slug (for subdomain-based routing: mystore.7hstore.com → slug "mystore")
    const subdomain = host.split('.')[0];
    if (subdomain && subdomain !== 'www' && subdomain !== host) {
      const { data: slugStore } = await supabaseAdmin
        .from('stores')
        .select('id')
        .eq('slug', subdomain)
        .eq('is_active', true)
        .maybeSingle();

      if (slugStore) {
        return { storeId: slugStore.id, isSuperAdmin: false, source: 'domain' };
      }
    }
  }

  // ── 4. Development fallback ──
  if (!isProduction) {
    return { storeId: DEFAULT_STORE_ID, isSuperAdmin: false, source: 'default' };
  }

  // ── 5. Production: fallback to default store ──
  console.warn(`[store-context] No store resolved for host "${host}", falling back to default`);
  return { storeId: DEFAULT_STORE_ID, isSuperAdmin: false, source: 'default' };
}
