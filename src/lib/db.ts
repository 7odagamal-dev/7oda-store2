/**
 * db.ts — Store-aware database access layer.
 *
 * All tenant-scoped queries MUST use these helpers to ensure
 * store_id filtering is never forgotten.
 *
 * The `as any` casts are intentional: they keep the API simple
 * while preserving full Supabase chainability at runtime.
 */

/**
 * Add a store_id filter to any existing Supabase query chain.
 *
 * Usage:
 *   filterByStore(supabase.from('products').select('*'), storeId)
 *     .eq('slug', slug)
 *     .single();
 */
export function filterByStore(query: any, storeId: string): any {
  return query.filter('store_id', 'eq', storeId);
}

/**
 * Create a store-scoped query from scratch.
 * Equivalent to supabase.from(table).select('*').filter('store_id', 'eq', storeId)
 *
 * Usage:
 *   const { data } = await storeQuery(supabase, 'products', storeId)
 *     .eq('slug', slug)
 *     .single();
 */
export function storeQuery(supabase: any, table: string, storeId: string): any {
  return supabase.from(table).select('*').filter('store_id', 'eq', storeId);
}

/**
 * Tables that are tenant-scoped (have store_id column).
 */
export const TENANT_TABLES = [
  'products',
  'orders',
  'messages',
  'reviews',
  'coupons',
  'payment_events',
  'payment_errors',
  'inventory_log',
  'store_users',
] as const;

export type TenantTable = (typeof TENANT_TABLES)[number];

/**
 * Tables that are GLOBAL (no store_id).
 */
export const GLOBAL_TABLES = [
  'shipping_rates',
  'rate_limits',
  'stores',
  'admin_sessions',
] as const;

export type GlobalTable = (typeof GLOBAL_TABLES)[number];

/**
 * Paginate a Supabase query.
 * Adds .range() and returns total count in a single round-trip.
 */
export async function paginateQuery<T>(
  query: any,
  page: number,
  limit: number,
): Promise<{ data: T[]; total: number; page: number; limit: number; totalPages: number }> {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, error, count } = await query
    .select('*', { count: 'exact', head: false })
    .range(from, to);

  if (error) throw error;

  return {
    data: data || [],
    total: count ?? 0,
    page,
    limit,
    totalPages: Math.ceil((count ?? 0) / limit),
  };
}
