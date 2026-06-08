/**
 * idempotency.ts — Server-side idempotency key store.
 *
 * Prevents duplicate order creation when a client retries a checkout request
 * (e.g., network timeout, double-click on "Place Order").
 *
 * In-memory store is suitable for single-server deployments.
 * For multi-server (horizontal scaling), replace with Redis or a DB table.
 */

const STORE = new Map<string, { orderId: string; expiresAt: number }>();
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const CLEANUP_INTERVAL = 60 * 60 * 1000; // sweep every hour

// Periodic cleanup to prevent unbounded memory growth
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of STORE) {
    if (now > entry.expiresAt) STORE.delete(key);
  }
}, CLEANUP_INTERVAL).unref?.();

/**
 * Returns the orderId if this key has been seen before (duplicate),
 * or null if this is a new request that should proceed.
 */
export function getIdempotencyResult(key: string): string | null {
  const entry = STORE.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    STORE.delete(key);
    return null;
  }
  return entry.orderId;
}

/**
 * Records a successful idempotent operation.
 */
export function setIdempotencyResult(key: string, orderId: string): void {
  STORE.set(key, { orderId, expiresAt: Date.now() + TTL_MS });
}
