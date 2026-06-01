/**
 * Supabase client expects the project origin only, e.g. https://xxxxx.supabase.co
 * (not .../rest/v1/ which appears in the REST docs / browser address bar snippets).
 */
export function normalizeSupabaseProjectUrl(raw: string | undefined): string {
  if (!raw) return '';
  let u = raw.trim().replace(/\/+$/, '');
  u = u.replace(/\/rest\/v1\/?$/i, '');
  return u.trim();
}
