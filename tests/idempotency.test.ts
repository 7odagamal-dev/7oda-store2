import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getIdempotencyResult, setIdempotencyResult } from '@/lib/idempotency';

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('getIdempotencyResult', () => {
  it('returns null for unknown key', () => {
    expect(getIdempotencyResult('unknown-key')).toBeNull();
  });

  it('returns orderId for stored key', () => {
    setIdempotencyResult('key-1', 'order-abc');
    expect(getIdempotencyResult('key-1')).toBe('order-abc');
  });

  it('returns null for expired entry', () => {
    vi.useFakeTimers();
    setIdempotencyResult('key-2', 'order-expired');
    // Advance time past 24h TTL
    vi.advanceTimersByTime(25 * 60 * 60 * 1000);
    expect(getIdempotencyResult('key-2')).toBeNull();
    vi.useRealTimers();
  });
});

describe('setIdempotencyResult', () => {
  it('stores and retrieves multiple keys independently', () => {
    setIdempotencyResult('a', 'order-1');
    setIdempotencyResult('b', 'order-2');
    expect(getIdempotencyResult('a')).toBe('order-1');
    expect(getIdempotencyResult('b')).toBe('order-2');
  });

  it('overwrites existing key', () => {
    setIdempotencyResult('dup', 'order-old');
    setIdempotencyResult('dup', 'order-new');
    expect(getIdempotencyResult('dup')).toBe('order-new');
  });
});
