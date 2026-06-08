import { describe, it, expect, vi, beforeEach } from 'vitest';

// Import is side-effect only for mock setup, but we test the function separately
// We re-import inside each test to get fresh state

beforeEach(() => {
  vi.restoreAllMocks();
  // Clear cookies
  document.cookie = 'csrf-token=; max-age=0; path=/';
});

describe('adminFetch', () => {
  it('attaches CSRF header on POST when token cookie exists', async () => {
    document.cookie = 'csrf-token=abc123; path=/';
    const mockFetch = vi.fn().mockResolvedValue(new Response('ok', { status: 200 }));
    vi.stubGlobal('fetch', mockFetch);

    const { adminFetch } = await import('@/lib/admin-fetch');
    await adminFetch('/api/admin/orders', { method: 'POST', body: '{}' });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [, init] = mockFetch.mock.calls[0];
    const headers = new Headers(init.headers);
    expect(headers.get('x-csrf-token')).toBe('abc123');
  });

  it('skips CSRF header on GET requests', async () => {
    document.cookie = 'csrf-token=abc123; path=/';
    const mockFetch = vi.fn().mockResolvedValue(new Response('ok', { status: 200 }));
    vi.stubGlobal('fetch', mockFetch);

    const { adminFetch } = await import('@/lib/admin-fetch');
    await adminFetch('/api/admin/orders');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [, init] = mockFetch.mock.calls[0];
    // init is undefined for GET with no init
    expect(init).toBeUndefined();
  });

  it('skips CSRF header when no token cookie exists', async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response('ok', { status: 200 }));
    vi.stubGlobal('fetch', mockFetch);

    const { adminFetch } = await import('@/lib/admin-fetch');
    await adminFetch('/api/admin/orders', { method: 'PUT', body: '{}' });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [, init] = mockFetch.mock.calls[0];
    const headers = new Headers(init.headers);
    expect(headers.get('x-csrf-token')).toBeNull();
  });

  it('does not override existing x-csrf-token header', async () => {
    document.cookie = 'csrf-token=abc123; path=/';
    const mockFetch = vi.fn().mockResolvedValue(new Response('ok', { status: 200 }));
    vi.stubGlobal('fetch', mockFetch);

    const { adminFetch } = await import('@/lib/admin-fetch');
    await adminFetch('/api/admin/orders', {
      method: 'DELETE',
      headers: { 'x-csrf-token': 'manual-token' },
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [, init] = mockFetch.mock.calls[0];
    const headers = new Headers(init.headers);
    expect(headers.get('x-csrf-token')).toBe('manual-token');
  });
});
