import { supabaseAdmin } from './supabase-admin';

// ── In-memory rate-limit fallback used when the database is unreachable ──
// Prevents fail-open attacks: if DB goes down, we still have conservative limits.
const memoryStore = new Map<string, { count: number; resetAt: number }>();
const MEMORY_CLEAN_INTERVAL = 60_000; // sweep stale entries every 60s

// Periodic cleanup to prevent unbounded memory growth
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of memoryStore) {
    if (now > entry.resetAt) memoryStore.delete(key);
  }
}, MEMORY_CLEAN_INTERVAL).unref?.();

function checkMemoryRateLimit(ip: string, endpoint: string, maxAttempts: number, windowMs: number): boolean {
  const key = `${ip}:${endpoint}`;
  const now = Date.now();
  const entry = memoryStore.get(key);

  if (!entry || now > entry.resetAt) {
    memoryStore.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= maxAttempts) return false;

  entry.count += 1;
  return true;
}

function clearMemoryRateLimit(ip: string, endpoint: string): void {
  const key = `${ip}:${endpoint}`;
  memoryStore.delete(key);
}

export async function checkRateLimit(ip: string, endpoint: string, maxAttempts: number, windowMs: number): Promise<boolean> {
  if (ip === 'unknown' || !ip) {
    // All unknown-IP traffic shares a single rate-limit bucket (prevents bypass)
    // Conservative limit: 60 requests per minute for all unidentifiable traffic
    return checkMemoryRateLimit('__unknown__', endpoint, Math.ceil(maxAttempts * 0.3), windowMs);
  }

  // Try atomic RPC first (avoids race condition)
  try {
    const { data, error } = await supabaseAdmin.rpc('atomic_check_rate_limit', {
      p_ip: ip,
      p_endpoint: endpoint,
      p_max_attempts: maxAttempts,
      p_window_ms: windowMs,
    });
    if (!error && typeof data === 'boolean') return data;
  } catch {
    // RPC not deployed yet — fall through to non-atomic logic
  }

  // Fallback: non-atomic rate limit (may have race condition but better than nothing)
  const now = new Date();
  const { data, error } = await supabaseAdmin
    .from('rate_limits')
    .select('count, reset_at')
    .eq('ip', ip)
    .eq('endpoint', endpoint)
    .maybeSingle();

  if (error) {
    console.error(`Rate limit DB error for ${endpoint}:`, error.message);
    // ── SECURITY: Fail-closed with in-memory fallback.
    //    When DB is unavailable, we use a conservative in-memory rate limit.
    //    Never return true unconditionally (that would defeat rate limiting).
    return checkMemoryRateLimit(ip, endpoint, Math.ceil(maxAttempts * 0.5), windowMs);
  }

  if (!data) {
    const { error: insertError } = await supabaseAdmin.from('rate_limits').insert({
      ip, endpoint, count: 1,
      reset_at: new Date(now.getTime() + windowMs).toISOString()
    });
    if (insertError) {
      return checkMemoryRateLimit(ip, endpoint, Math.ceil(maxAttempts * 0.5), windowMs);
    }
    return true;
  }

  const resetAt = new Date(data.reset_at);
  if (now > resetAt) {
    const { error: updateError } = await supabaseAdmin.from('rate_limits')
      .update({
        count: 1,
        reset_at: new Date(now.getTime() + windowMs).toISOString()
      }).eq('ip', ip).eq('endpoint', endpoint);
    if (updateError) {
      return checkMemoryRateLimit(ip, endpoint, Math.ceil(maxAttempts * 0.5), windowMs);
    }
    return true;
  }

  if (data.count >= maxAttempts) return false;

  const { error: updateError } = await supabaseAdmin.from('rate_limits')
    .update({ count: data.count + 1 })
    .eq('ip', ip).eq('endpoint', endpoint);
  if (updateError) {
    return checkMemoryRateLimit(ip, endpoint, Math.ceil(maxAttempts * 0.5), windowMs);
  }

  return true;
}

export async function clearRateLimit(ip: string, endpoint: string): Promise<void> {
  if (ip === 'unknown' || !ip) return;
  clearMemoryRateLimit(ip, endpoint);
  await supabaseAdmin.from('rate_limits').delete().eq('ip', ip).eq('endpoint', endpoint);
}
