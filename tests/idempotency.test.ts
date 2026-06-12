import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getIdempotencyResult, setIdempotencyResult } from '@/lib/idempotency';

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        })),
      })),
    })),
  },
}));

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('getIdempotencyResult', () => {
  it('returns null for unknown key', async () => {
    expect(await getIdempotencyResult('unknown-key')).toBeNull();
  });

  it('returns orderId for stored key', async () => {
    setIdempotencyResult('key-1', 'order-abc');
    expect(await getIdempotencyResult('key-1')).toBe('order-abc');
  });

  it('returns null for expired entry', async () => {
    vi.useFakeTimers();
    setIdempotencyResult('key-2', 'order-expired');
    // Advance time past 24h TTL
    vi.advanceTimersByTime(25 * 60 * 60 * 1000);
    expect(await getIdempotencyResult('key-2')).toBeNull();
    vi.useRealTimers();
  });
});

describe('setIdempotencyResult', () => {
  it('stores and retrieves multiple keys independently', async () => {
    setIdempotencyResult('a', 'order-1');
    setIdempotencyResult('b', 'order-2');
    expect(await getIdempotencyResult('a')).toBe('order-1');
    expect(await getIdempotencyResult('b')).toBe('order-2');
  });

  it('overwrites existing key', async () => {
    setIdempotencyResult('dup', 'order-old');
    setIdempotencyResult('dup', 'order-new');
    expect(await getIdempotencyResult('dup')).toBe('order-new');
  });
});
