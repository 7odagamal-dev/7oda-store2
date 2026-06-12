import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

function makeReq(cookieToken?: string): NextRequest {
  const headers = new Headers();
  if (cookieToken) headers.set('Cookie', `7h-admin-auth=${cookieToken}`);
  return new NextRequest('http://localhost/api/test', { headers });
}

function mockFetchResponse(status: number, body: unknown) {
  if (status === 204) {
    return new Response(null, { status, headers: { 'Content-Type': 'application/json' } });
  }
  const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
  return new Response(bodyStr, {
    status,
    headers: { 'Content-Type': 'application/json', 'content-length': String(bodyStr.length) },
  });
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('getAdminSession', () => {
  it('returns invalid when no cookie', async () => {
    const { getAdminSession } = await import('@/lib/auth');
    const result = await getAdminSession(makeReq());
    expect(result).toEqual({ valid: false, storeId: null, role: null, userId: null });
  });

  it('returns invalid when token not found in DB', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockFetchResponse(200, []),
    );
    const { getAdminSession } = await import('@/lib/auth');
    const result = await getAdminSession(makeReq('bad-token'));
    expect(result).toEqual({ valid: false, storeId: null, role: null, userId: null });
  });

  it('returns invalid when session expired (deletes expired row)', async () => {
    const expiredDate = new Date(Date.now() - 1000).toISOString();
    // First call returns the expired session, second call is DELETE of expired row
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(mockFetchResponse(200, [{
        store_id: 's1', expires_at: expiredDate, user_id: 'u1', user_role: 'admin',
      }]))
      .mockResolvedValueOnce(mockFetchResponse(204, null));

    const { getAdminSession } = await import('@/lib/auth');
    const result = await getAdminSession(makeReq('expired-token'));
    expect(result).toEqual({ valid: false, storeId: null, role: null, userId: null });
  });

  it('returns valid when session has user_role directly', async () => {
    const future = new Date(Date.now() + 3600000).toISOString();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockFetchResponse(200, [{
        store_id: 'store-1', expires_at: future, user_id: 'user-1', user_role: 'admin',
      }]),
    );

    const { getAdminSession } = await import('@/lib/auth');
    const result = await getAdminSession(makeReq('valid-token'));
    expect(result).toEqual({ valid: true, storeId: 'store-1', role: 'admin', userId: 'user-1' });
  });

  it('looks up store_users when user_role missing but user_id present', async () => {
    const future = new Date(Date.now() + 3600000).toISOString();
    // First call: get session (no user_role, has user_id)
    // Second call: get store_user role
    // Third call: PATCH session to cache the role
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(mockFetchResponse(200, [{
        store_id: 'store-1', expires_at: future, user_id: 'user-1', user_role: null,
      }]))
      .mockResolvedValueOnce(mockFetchResponse(200, [{ role: 'superadmin' }]))
      .mockResolvedValueOnce(mockFetchResponse(200, [{}]));

    const { getAdminSession } = await import('@/lib/auth');
    const result = await getAdminSession(makeReq('lookup-token'));
    expect(result).toEqual({ valid: true, storeId: 'store-1', role: 'superadmin', userId: 'user-1' });
  });

  it('returns invalid when no user_role AND no user_id (incomplete session)', async () => {
    const future = new Date(Date.now() + 3600000).toISOString();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockFetchResponse(200, [{
        store_id: null, expires_at: future, user_id: null, user_role: null,
      }]),
    );

    const { getAdminSession } = await import('@/lib/auth');
    const result = await getAdminSession(makeReq('incomplete-token'));
    // Must NOT default to superadmin — this was the security fix
    expect(result).toEqual({ valid: false, storeId: null, role: null, userId: null });
  });

  it('returns invalid when store_users lookup fails for missing user_id', async () => {
    const future = new Date(Date.now() + 3600000).toISOString();
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(mockFetchResponse(200, [{
        store_id: 'store-1', expires_at: future, user_id: 'u-missing', user_role: null,
      }]))
      .mockResolvedValueOnce(mockFetchResponse(200, []));

    const { getAdminSession } = await import('@/lib/auth');
    const result = await getAdminSession(makeReq('missing-user'));
    expect(result).toEqual({ valid: false, storeId: null, role: null, userId: null });
  });
});

describe('createSession', () => {
  it('creates session and returns response with cookies', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockFetchResponse(201, [{ token: 'new-session-token' }]),
    );

    const { createSession } = await import('@/lib/auth');
    const result = await createSession({ storeId: 'store-1', userId: 'user-1', userRole: 'admin' });

    expect(result.token).toBeTruthy();
    expect(result.response.headers.get('set-cookie')).toBeTruthy();
  });

  it('throws when session creation fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockFetchResponse(400, { message: 'Bad request' }),
    );

    const { createSession } = await import('@/lib/auth');
    await expect(createSession({ storeId: 'store-1' })).rejects.toThrow('Session creation failed');
  });
});
