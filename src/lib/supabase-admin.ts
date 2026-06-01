/**
 * supabase-admin.ts
 *
 * Server-side ONLY Supabase client using the service-role key.
 * This client bypasses Row Level Security — use it exclusively
 * inside Next.js API routes (src/app/api/**).
 *
 * ⚠️  NEVER import this in any file under src/app/(pages) or
 *     src/components — it would expose the service key to the browser.
 *
 * FIX: Removed module-level throw. A top-level throw causes the entire
 * Next.js build to fail even if the admin routes are never called.
 * Instead, we create the client lazily and throw at call-time so the
 * error is surfaced in the route handler, not at build time.
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { normalizeSupabaseProjectUrl } from '@/lib/supabase-project-url';

let _supabaseAdmin: SupabaseClient | null = null;

function getSupabaseAdmin(): SupabaseClient {
  if (_supabaseAdmin) return _supabaseAdmin;

  const supabaseUrl = normalizeSupabaseProjectUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env variables'
    );
  }

  _supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return _supabaseAdmin;
}

// Proxy object: every property access triggers lazy init.
// This keeps the import syntax identical (supabaseAdmin.from(...))
// while deferring the env-var check to actual usage.
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabaseAdmin();
    const value = (client as any)[prop];
    return typeof value === 'function' ? value.bind(client) : value;
  },
});
