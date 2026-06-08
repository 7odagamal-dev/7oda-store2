import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock all dependencies
vi.mock('@/lib/rate-limit', () => ({ checkRateLimit: vi.fn().mockResolvedValue(true) }));
vi.mock('@/lib/store-context', () => ({ getStoreContext: vi.fn().mockResolvedValue({ storeId: 'store-1' }) }));
vi.mock('@/lib/db', () => ({ filterByStore: vi.fn() }));
vi.mock('@/lib/paymob', () => ({
  getAuthToken: vi.fn().mockResolvedValue('paymob-token'),
  createOrder: vi.fn().mockResolvedValue(12345),
  getPaymentKey: vi.fn().mockResolvedValue('payment-key-abc'),
}));

// supabaseAdmin.from().select().eq() chain — must not throw even though filterByStore mocks ignore it
vi.mock('@/lib/supabase-admin', () => {
  const eq = vi.fn();
  return {
    supabaseAdmin: {
      from: vi.fn(() => ({
        select: vi.fn(() => ({ eq })),
      })),
    },
  };
});

import { POST } from '@/app/api/paymob/payment/route';
import { checkRateLimit } from '@/lib/rate-limit';
import { filterByStore } from '@/lib/db';

const mockFilter = filterByStore as ReturnType<typeof vi.fn>;
const mockCheckRL = checkRateLimit as ReturnType<typeof vi.fn>;

function makeReq(body: unknown, ip = '1.2.3.4'): NextRequest {
  return new NextRequest('http://localhost/api/paymob/payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockCheckRL.mockResolvedValue(true);
  vi.stubEnv('PAYMOB_IFRAME_ID', 'test-iframe-123');
});

describe('amount verification', () => {
  it('allows when client amount matches DB total', async () => {
    mockFilter.mockReturnValue({
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: 'order-1', total: 500, status: 'pending', payment_method: 'paymob' },
        error: null,
      }),
    });
    const res = await POST(makeReq({ amount: 500, orderId: 'order-1', customer: { name: 'A', phone: '01000000000' } }));
    expect(res.status).toBe(200);
    expect(await res.json()).toHaveProperty('paymentKey');
  });

  it('rejects 400 when client amount differs from DB total', async () => {
    mockFilter.mockReturnValue({
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: 'order-1', total: 500, status: 'pending', payment_method: 'paymob' },
        error: null,
      }),
    });
    const res = await POST(makeReq({ amount: 1, orderId: 'order-1', customer: { name: 'A', phone: '01000000000' } }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Amount mismatch' });
  });

  it('allows 1-piastre rounding tolerance', async () => {
    mockFilter.mockReturnValue({
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: 'order-2', total: 500.01, status: 'pending', payment_method: 'paymob' },
        error: null,
      }),
    });
    const res = await POST(makeReq({ amount: 500.0, orderId: 'order-2', customer: { name: 'A', phone: '01000000000' } }));
    expect(res.status).toBe(200);
  });

  it('returns 404 when order not found', async () => {
    mockFilter.mockReturnValue({
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    });
    const res = await POST(makeReq({ amount: 500, orderId: 'missing', customer: { name: 'A', phone: '01000000000' } }));
    expect(res.status).toBe(404);
  });

  it('returns 409 when order status is not pending', async () => {
    mockFilter.mockReturnValue({
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: 'order-3', total: 500, status: 'confirmed', payment_method: 'paymob' },
        error: null,
      }),
    });
    const res = await POST(makeReq({ amount: 500, orderId: 'order-3', customer: { name: 'A', phone: '01000000000' } }));
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: 'Order is not in a payable state' });
  });

  it('validates required fields', async () => {
    const res = await POST(makeReq({ amount: 500 }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Missing required fields' });
  });
});

describe('rate limiting', () => {
  it('returns 429 when rate limited', async () => {
    mockCheckRL.mockResolvedValue(false);
    const res = await POST(makeReq({ amount: 500, orderId: 'order-1', customer: { name: 'A', phone: '01000000000' } }));
    expect(res.status).toBe(429);
  });
});

describe('error handling', () => {
  it('returns 500 on unexpected errors', async () => {
    mockCheckRL.mockRejectedValue(new Error('Unexpected'));
    const res = await POST(makeReq({ amount: 500, orderId: 'order-1', customer: { name: 'A', phone: '01000000000' } }));
    expect(res.status).toBe(500);
  });
});
