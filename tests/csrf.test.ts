import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { validateCsrf, csrfGuard, rotateCsrfToken, safeJson } from '@/lib/csrf';

beforeEach(() => {
  vi.restoreAllMocks();
});

function makeReq(method: string, cookieToken?: string, headerToken?: string): NextRequest {
  const url = 'http://localhost/api/test';
  const headers = new Headers({ 'Content-Type': 'application/json' });
  if (headerToken) headers.set('x-csrf-token', headerToken);
  if (cookieToken) headers.set('Cookie', `csrf-token=${cookieToken}`);
  return new NextRequest(url, { method, headers, body: method === 'GET' ? null : '{}' });
}

describe('validateCsrf', () => {
  it('returns true when cookie and header match', () => {
    expect(validateCsrf(makeReq('POST', 'tok-123', 'tok-123'))).toBe(true);
  });

  it('returns false when cookie and header differ', () => {
    expect(validateCsrf(makeReq('POST', 'tok-abc', 'tok-xyz'))).toBe(false);
  });

  it('returns false when cookie is missing', () => {
    expect(validateCsrf(makeReq('POST', undefined, 'tok-123'))).toBe(false);
  });

  it('returns false when header is missing', () => {
    expect(validateCsrf(makeReq('POST', 'tok-123', undefined))).toBe(false);
  });

  it('returns false when both are missing', () => {
    expect(validateCsrf(makeReq('POST'))).toBe(false);
  });
});

describe('csrfGuard', () => {
  it('returns null for GET requests', () => {
    expect(csrfGuard(makeReq('GET'))).toBeNull();
  });

  it('returns null for POST with valid token', () => {
    expect(csrfGuard(makeReq('POST', 'tok', 'tok'))).toBeNull();
  });

  it('returns 403 for POST with invalid token', async () => {
    const res = csrfGuard(makeReq('DELETE', 'cookie', 'wrong'));
    expect(res).toBeInstanceOf(NextResponse);
    expect(res!.status).toBe(403);
    expect(await res!.json()).toEqual({ error: 'Invalid CSRF token' });
  });
});

describe('rotateCsrfToken', () => {
  it('sets csrf-token cookie and x-csrf-token header', () => {
    vi.spyOn(crypto, 'randomBytes').mockReturnValue(Buffer.from('aabb'.repeat(8), 'hex'));
    const res = new NextResponse(null, { status: 200 });
    rotateCsrfToken(res);
    expect(res.cookies.toString()).toContain('csrf-token=');
    expect(res.headers.get('x-csrf-token')).toBe('aabb'.repeat(8));
  });

  it('generates 32-hex-char token', () => {
    vi.spyOn(crypto, 'randomBytes').mockImplementation((size: number) =>
      Buffer.from('ff'.repeat(size), 'hex'),
    );
    const res = new NextResponse(null, { status: 200 });
    rotateCsrfToken(res);
    expect(res.headers.get('x-csrf-token')!.length).toBe(32);
    expect(res.headers.get('x-csrf-token')).toMatch(/^[a-f0-9]{32}$/);
  });
});

describe('safeJson', () => {
  it('returns response with data and rotated token', async () => {
    vi.spyOn(crypto, 'randomBytes').mockReturnValue(Buffer.from('cc'.repeat(16), 'hex'));
    const res = safeJson({ success: true, id: 'order-1' }, { status: 201 });
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ success: true, id: 'order-1' });
    expect(res.cookies.toString()).toContain('csrf-token=');
    expect(res.headers.get('x-csrf-token')).toBe('cc'.repeat(16));
  });

  it('defaults to 200 status', () => {
    vi.spyOn(crypto, 'randomBytes').mockReturnValue(Buffer.from('dd'.repeat(16), 'hex'));
    expect(safeJson({ ok: true }).status).toBe(200);
  });
});
