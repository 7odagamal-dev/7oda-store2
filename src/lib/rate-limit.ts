import { supabaseAdmin } from './supabase-admin';

export async function checkRateLimit(ip: string, endpoint: string, maxAttempts: number, windowMs: number): Promise<boolean> {
  if (ip === 'unknown' || !ip) return true; // Can't rate limit unknown IPs easily without blocking everyone

  const now = new Date();
  
  // 1. Fetch current limit
  const { data, error } = await supabaseAdmin
    .from('rate_limits')
    .select('count, reset_at')
    .eq('ip', ip)
    .eq('endpoint', endpoint)
    .maybeSingle();

  if (error) {
    // If table doesn't exist or DB fails, fail open (allow request) to prevent blocking service
    console.error(`Rate limit DB error for ${endpoint}:`, error.message);
    return true; 
  }

  if (!data) {
    // First attempt
    await supabaseAdmin.from('rate_limits').insert({
      ip,
      endpoint,
      count: 1,
      reset_at: new Date(now.getTime() + windowMs).toISOString()
    });
    return true;
  }

  const resetAt = new Date(data.reset_at);

  if (now > resetAt) {
    // Window expired, reset
    await supabaseAdmin.from('rate_limits').update({
      count: 1,
      reset_at: new Date(now.getTime() + windowMs).toISOString()
    }).eq('ip', ip).eq('endpoint', endpoint);
    return true;
  }

  if (data.count >= maxAttempts) {
    // Rate limit exceeded
    return false;
  }

  // Increment count
  await supabaseAdmin.from('rate_limits').update({
    count: data.count + 1
  }).eq('ip', ip).eq('endpoint', endpoint);

  return true;
}

export async function clearRateLimit(ip: string, endpoint: string): Promise<void> {
  if (ip === 'unknown' || !ip) return;
  await supabaseAdmin.from('rate_limits').delete().eq('ip', ip).eq('endpoint', endpoint);
}
