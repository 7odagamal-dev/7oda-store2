import { supabaseAdmin } from './supabase-admin';

export async function checkRateLimit(ip: string, endpoint: string, maxAttempts: number, windowMs: number): Promise<boolean> {
  if (ip === 'unknown' || !ip) return true;

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
    return true;
  }

  if (!data) {
    await supabaseAdmin.from('rate_limits').insert({
      ip, endpoint, count: 1,
      reset_at: new Date(now.getTime() + windowMs).toISOString()
    });
    return true;
  }

  const resetAt = new Date(data.reset_at);
  if (now > resetAt) {
    await supabaseAdmin.from('rate_limits').update({
      count: 1,
      reset_at: new Date(now.getTime() + windowMs).toISOString()
    }).eq('ip', ip).eq('endpoint', endpoint);
    return true;
  }

  if (data.count >= maxAttempts) return false;

  await supabaseAdmin.from('rate_limits').update({
    count: data.count + 1
  }).eq('ip', ip).eq('endpoint', endpoint);

  return true;
}

export async function clearRateLimit(ip: string, endpoint: string): Promise<void> {
  if (ip === 'unknown' || !ip) return;
  await supabaseAdmin.from('rate_limits').delete().eq('ip', ip).eq('endpoint', endpoint);
}
