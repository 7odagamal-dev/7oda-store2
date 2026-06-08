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

// Mock supabase-admin to prevent crashes on .from() call (though filterByStore handles the chain)
vi.mock('@/lib/supabase-admin', () => {
  const eq = vi.fn();
  return {
    supabaseAdmin: {
      from: vi.fn(() => ({
        select: vi.fn(() => ({ eq })),
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(),
          })),
        })),
        delete: vi.fn(() => ({ eq: vi.fn() })),
      })),
      rpc: vi.fn(),
    },
  };
});

import { POST } from '@/app/api/checkout/route';
import { checkRateLimit } from '@/lib/rate-limit';
import { getIdempotencyResult, setIdempotencyResult } from '@/lib/idempotency';
import { supabaseAdmin } from '@/lib/supabase-admin';

const mockCheckRL = checkRateLimit as ReturnType<typeof vi.fn>;
const mockFrom = supabaseAdmin.from as ReturnType<typeof vi.fn>;

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

  // Default: products are in stock
  const eq = vi.fn();
  mockFrom.mockReturnValue({
    select: vi.fn(() => ({ eq })),
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn().mockResolvedValue({ data: { id: 'new-order-id' }, error: null }),
      })),
    })),
    delete: vi.fn(() => ({ eq: vi.fn() })),
  });
  // .in('id', ...).eq('store_id', storeId) — products query
  // Actually we need .select().in().eq() for products lookup
  // Mock this more carefully:
});

describe('POST /api/checkout — idempotency', () => {
  it('processes new request when no idempotency key given', async () => {
    // Mock products query
    const selectChain = {
      eq: vi.fn(),
      in: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ data: [{ id: 'prod-1', name: 'Test', price: 500, main_image: null, stock: 10, reserved_stock: 0 }], error: null }) })),
    };
    mockFrom.mockReturnValue({
      select: vi.fn(() => selectChain),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: { id: 'new-order-id' }, error: null }),
        })),
      })),
      delete: vi.fn(() => ({ eq: vi.fn() })),
    });

    (supabaseAdmin.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({ data: null, error: null });

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
    const selectChain = {
      eq: vi.fn(),
      in: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ data: [{ id: 'prod-1', name: 'Test', price: 500, main_image: null, stock: 10, reserved_stock: 0 }], error: null }) })),
    };
    mockFrom.mockReturnValue({
      select: vi.fn(() => selectChain),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: { id: 'order-42' }, error: null }),
        })),
      })),
      delete: vi.fn(() => ({ eq: vi.fn() })),
    });
    (supabaseAdmin.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({ data: null, error: null });

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
