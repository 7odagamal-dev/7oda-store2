import { supabaseAdmin } from './supabase-admin';

const STORE = new Map<string, { orderId: string; expiresAt: number }>();
const TTL_MS = 24 * 60 * 60 * 1000;
const CLEANUP_INTERVAL = 60 * 60 * 1000;

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of STORE) {
    if (now > entry.expiresAt) STORE.delete(key);
  }
}, CLEANUP_INTERVAL).unref?.();

export async function getIdempotencyResult(key: string): Promise<string | null> {
  const entry = STORE.get(key);
  if (entry) {
    if (Date.now() > entry.expiresAt) {
      STORE.delete(key);
      return null;
    }
    return entry.orderId;
  }

  try {
    const { data } = await supabaseAdmin
      .from('orders')
      .select('id')
      .eq('idempotency_key', key)
      .maybeSingle();
    if (data) {
      STORE.set(key, { orderId: data.id, expiresAt: Date.now() + TTL_MS });
      return data.id;
    }
  } catch {
    // DB unavailable — not yet deployed or connection issue
  }

  return null;
}

export function setIdempotencyResult(key: string, orderId: string): void {
  STORE.set(key, { orderId, expiresAt: Date.now() + TTL_MS });
}
