import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/rate-limit', () => ({ checkRateLimit: vi.fn().mockResolvedValue(true) }));
vi.mock('@/lib/store-context', () => ({ getStoreContext: vi.fn().mockResolvedValue({ storeId: 'store-1' }) }));
vi.mock('@/lib/supabase-server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
  }),
}));
vi.mock('@/lib/shipping', () => ({ calculateShippingCost: vi.fn().mockReturnValue(100) }));

vi.mock('@/lib/supabase-admin', () => {
  function cr(data: unknown) {
    const p = Promise.resolve({ data, error: data === null ? null : null });
    return new Proxy(p, {
      get(_t, prop: string | symbol) {
        if (prop === 'then') return p.then.bind(p);
        if (prop === 'catch') return p.catch.bind(p);
        if (prop === 'finally') return p.finally.bind(p);
        if (prop === 'single') return vi.fn().mockResolvedValue({ data, error: data === null ? { message: 'not found' } : null });
        return () => cr(data);
      },
    });
  }
  return {
    supabaseAdmin: {
      from: vi.fn(() => ({
        select: vi.fn(() => cr(null)),
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: { id: 'order-id' }, error: null }),
          })),
        })),
        delete: vi.fn(() => cr(null)),
      })),
      rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    },
  };
});

import { POST } from '@/app/api/checkout/route';
import { checkRateLimit } from '@/lib/rate-limit';
import { getIdempotencyResult, setIdempotencyResult } from '@/lib/idempotency';
import { supabaseAdmin } from '@/lib/supabase-admin';

const mockCheckRL = checkRateLimit as ReturnType<typeof vi.fn>;
const mockFrom = supabaseAdmin.from as ReturnType<typeof vi.fn>;
const mockRpc = supabaseAdmin.rpc as ReturnType<typeof vi.fn>;

// Store mock responses per table
interface MockResponses {
  products?: unknown;
  flash_sales?: unknown;
  coupons?: unknown;
  orders?: { id: string };
}
let mockResponses: MockResponses = {};

function makeReq(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const validOrderBody = {
  items: [{ product_id: 'prod-1', size: 'M', quantity: 1 }],
  customer_name: 'Test User',
  phone: '01012345678',
  governorate: 'Cairo',
  city: 'Cairo',
  address: '123 Test St',
  payment_method: 'cash_on_delivery',
};

beforeEach(() => {
  vi.clearAllMocks();
  mockCheckRL.mockResolvedValue(true);
  mockResponses = {};
  mockRpc.mockResolvedValue({ data: null, error: null });

  const cr = (data: unknown) => {
    const p = Promise.resolve({ data, error: data === null ? null : null });
    return new Proxy(p, {
      get(_t, prop: string | symbol) {
        if (prop === 'then') return p.then.bind(p);
        if (prop === 'catch') return p.catch.bind(p);
        if (prop === 'finally') return p.finally.bind(p);
        if (prop === 'single') return vi.fn().mockResolvedValue({ data, error: data === null ? { message: 'not found' } : null });
        return () => cr(data);
      },
    });
  };

  mockFrom.mockImplementation((table: string) => {
    const resp = mockResponses[table as keyof MockResponses];
    const data = resp !== undefined ? resp : null;
    return {
      select: vi.fn(() => cr(data)),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: { id: (mockResponses.orders?.id) || 'order-id' }, error: null }),
        })),
      })),
      delete: vi.fn(() => cr(null)),
    };
  });
});

describe('POST /api/checkout — idempotency', () => {
  it('processes new request when no idempotency key given', async () => {
    mockResponses = {
      products: [{ id: 'prod-1', name: 'Test', price: 500, main_image: null, stock: 10, reserved_stock: 0 }],
      orders: { id: 'new-order-id' },
    };

    const res = await POST(makeReq(validOrderBody));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.orderId).toBe('new-order-id');
  });

  it('returns existing order for duplicate idempotency key', async () => {
    // First request stores the key
    setIdempotencyResult('dup-key', 'existing-order-id');

    const res = await POST(makeReq({ ...validOrderBody, idempotency_key: 'dup-key' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ success: true, orderId: 'existing-order-id', idempotent: true });
    // Should NOT have created a new order
    expect(mockFrom().insert).not.toHaveBeenCalled();
  });

  it('stores idempotency key after successful new order', async () => {
    mockResponses = {
      products: [{ id: 'prod-1', name: 'Test', price: 500, main_image: null, stock: 10, reserved_stock: 0 }],
      orders: { id: 'order-42' },
    };

    const res = await POST(makeReq({ ...validOrderBody, idempotency_key: 'fresh-key' }));
    expect(res.status).toBe(201);
    expect(getIdempotencyResult('fresh-key')).toBe('order-42');
  });
});

describe('POST /api/checkout — validation', () => {
  it('rejects empty cart', async () => {
    const res = await POST(makeReq({ ...validOrderBody, items: [] }));
    expect(res.status).toBe(400);
  });

  it('rejects missing customer info', async () => {
    const res = await POST(makeReq({ items: [{ product_id: 'p1', size: 'M', quantity: 1 }] }));
    expect(res.status).toBe(400);
  });

  it('rejects invalid Egyptian phone', async () => {
    const res = await POST(makeReq({ ...validOrderBody, phone: '12345' }));
    expect(res.status).toBe(400);
  });

  it('rate-limits excessive requests', async () => {
    mockCheckRL.mockResolvedValue(false);
    const res = await POST(makeReq(validOrderBody));
    expect(res.status).toBe(429);
  });
});
