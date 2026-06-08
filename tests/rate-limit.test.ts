import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabase-admin', () => {
  const mockRpc = vi.fn();
  return { supabaseAdmin: { rpc: mockRpc, from: vi.fn() } };
});

import { checkRateLimit, clearRateLimit } from '@/lib/rate-limit';
import { supabaseAdmin } from '@/lib/supabase-admin';

const mockRpc = supabaseAdmin.rpc as ReturnType<typeof vi.fn>;
const mockFrom = supabaseAdmin.from as ReturnType<typeof vi.fn>;

/** Creates a thenable object that resolves to `returns` and has a chainable .eq() */
function chain(returns: unknown) {
  const c = {
    eq: () => c,
    then: (resolve: (v: unknown) => void) => { resolve(returns); return Promise.resolve(); },
    catch: () => {},
    finally: () => Promise.resolve(returns),
  };
  return c;
}

function makeSelectChain(data: unknown, error: unknown = null) {
  const eq = vi.fn(() => ({
    eq,
    maybeSingle: vi.fn().mockResolvedValue({ data, error }),
  }));
  const select = vi.fn().mockReturnValue({ eq });
  return select;
}

function makeUpdateChain(err: unknown = null) {
  return vi.fn().mockReturnValue(chain({ error: err }));
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('checkRateLimit', () => {
  it('allows when ip is unknown', async () => {
    expect(await checkRateLimit('unknown', '/api/test', 5, 60000)).toBe(true);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('allows when ip is empty', async () => {
    expect(await checkRateLimit('', '/api/test', 5, 60000)).toBe(true);
  });

  it('calls atomic RPC first', async () => {
    mockRpc.mockResolvedValue({ data: true, error: null });
    expect(await checkRateLimit('1.2.3.4', '/api/test', 5, 60000)).toBe(true);
    expect(mockRpc).toHaveBeenCalledWith('atomic_check_rate_limit', {
      p_ip: '1.2.3.4', p_endpoint: '/api/test', p_max_attempts: 5, p_window_ms: 60000,
    });
  });

  it('returns false when RPC says false', async () => {
    mockRpc.mockResolvedValue({ data: false, error: null });
    expect(await checkRateLimit('1.2.3.4', '/api/test', 5, 60000)).toBe(false);
  });

  it('falls through to DB select when RPC throws + no existing row → inserts', async () => {
    mockRpc.mockRejectedValue(new Error('RPC not found'));
    mockFrom.mockReturnValue({
      select: makeSelectChain(null, null),       // no existing row
      insert: vi.fn().mockResolvedValue({ error: null }),
      update: makeUpdateChain(),
      delete: vi.fn(),
    });
    expect(await checkRateLimit('1.2.3.4', '/api/test', 5, 60000)).toBe(true);
    expect(mockFrom).toHaveBeenCalledWith('rate_limits');
  });

  it('uses memory fallback when DB select errors', async () => {
    mockRpc.mockRejectedValue(new Error('RPC not found'));
    mockFrom.mockReturnValue({
      select: makeSelectChain(null, new Error('DB down')),
      insert: vi.fn(),
      update: makeUpdateChain(),
      delete: vi.fn(),
    });
    expect(await checkRateLimit('1.2.3.4', '/api/test', 10, 60000)).toBe(true);
  });

  it('denies when over limit via DB', async () => {
    mockRpc.mockRejectedValue(new Error('RPC not found'));
    const future = new Date(Date.now() + 60000).toISOString();
    mockFrom.mockReturnValue({
      select: makeSelectChain({ count: 5, reset_at: future }, null),
      insert: vi.fn(),
      update: makeUpdateChain(),
      delete: vi.fn(),
    });
    expect(await checkRateLimit('1.2.3.4', '/api/test', 5, 60000)).toBe(false);
  });

  it('allows and updates when window expired', async () => {
    mockRpc.mockRejectedValue(new Error('RPC not found'));
    const past = new Date(Date.now() - 60000).toISOString();
    mockFrom.mockReturnValue({
      select: makeSelectChain({ count: 5, reset_at: past }, null),
      insert: vi.fn(),
      update: makeUpdateChain(),
      delete: vi.fn(),
    });
    expect(await checkRateLimit('1.2.3.4', '/api/test', 5, 60000)).toBe(true);
  });

  it('allows and increments when under limit', async () => {
    mockRpc.mockRejectedValue(new Error('RPC not found'));
    const future = new Date(Date.now() + 60000).toISOString();
    mockFrom.mockReturnValue({
      select: makeSelectChain({ count: 2, reset_at: future }, null),
      insert: vi.fn(),
      update: makeUpdateChain(),
      delete: vi.fn(),
    });
    expect(await checkRateLimit('1.2.3.4', '/api/test', 5, 60000)).toBe(true);
  });

  it('exhausts memory fallback after reaching limit', async () => {
    mockRpc.mockRejectedValue(new Error('RPC not found'));
    mockFrom.mockReturnValue({
      select: makeSelectChain(null, new Error('DB down')),
      insert: vi.fn(),
      update: makeUpdateChain(),
      delete: vi.fn(),
    });
    for (let i = 0; i < 5; i++) {
      expect(await checkRateLimit('1.2.3.4', '/api/test-mem', 10, 60000)).toBe(true);
    }
    expect(await checkRateLimit('1.2.3.4', '/api/test-mem', 10, 60000)).toBe(false);
  });
});

describe('clearRateLimit', () => {
  it('deletes DB entry', async () => {
    const eq = vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) }));
    mockFrom.mockReturnValue({ delete: vi.fn().mockReturnValue({ eq }), select: vi.fn(), insert: vi.fn(), update: vi.fn() });
    await clearRateLimit('1.2.3.4', '/api/test');
    expect(mockFrom).toHaveBeenCalledWith('rate_limits');
  });

  it('skips for unknown ip', async () => {
    await clearRateLimit('unknown', '/api/test');
    expect(mockFrom).not.toHaveBeenCalled();
  });
});
