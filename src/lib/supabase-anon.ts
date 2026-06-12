/**
 * supabase-anon.ts — Public (anon) Supabase client.
 *
 * Uses the anon key (NEXT_PUBLIC_SUPABASE_ANON_KEY) which is safe for
 * public-facing API routes. RLS policies in the database control what
 * data this client can read and write.
 *
 * Use this in PUBLIC API routes (checkout, payment, contact, bundles).
 * DO NOT use this in admin routes — they need supabaseAdmin (service role).
 *
 * The callback route MUST keep using supabaseAdmin because it receives
 * Paymob webhooks (server-to-server, no user session) and needs to write
 * payment_events and call RPCs that require elevated privileges.
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { normalizeSupabaseProjectUrl } from '@/lib/supabase-project-url';

let _supabaseAnon: SupabaseClient | null = null;

function getSupabaseAnon(): SupabaseClient {
  if (_supabaseAnon) return _supabaseAnon;

  const supabaseUrl = normalizeSupabaseProjectUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY env variables',
    );
  }

  _supabaseAnon = createClient(supabaseUrl, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return _supabaseAnon;
}

// Proxy pattern: same as supabase-admin.ts — lazy init without build-time env check
export const supabaseAnon = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabaseAnon();
    const value = (client as any)[prop];
    return typeof value === 'function' ? value.bind(client) : value;
  },
});
