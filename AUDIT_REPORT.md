# OG Old Gold — Full Audit Report
**Date:** 2026-05-29 | **Project:** Next.js 16 + Supabase + Tailwind CSS v4

---

## 🔴 CRITICAL ISSUES

### C1. `admin_sessions` table has OLD schema (missing columns)
- **File:** `schema.sql` (definition) vs `scripts/setup-admin-sessions.sql` (old script)
- **Root Cause:** `admin_sessions` was created by old script with only `token`, `expires_at`, `created_at`. The new `schema.sql` uses `CREATE TABLE IF NOT EXISTS` which **skips** existing tables. The code in `auth.ts:92-98` inserts `store_id`, `user_id`, `user_role` columns that don't exist.
- **Impact:** Admin login fails — `createSession()` throws DB error "column does not exist". User enters password, gets no error but page doesn't open.
- **Fix:** Drop old table and recreate:

```sql
-- Run in Supabase SQL Editor
DROP TABLE IF EXISTS admin_sessions CASCADE;
-- Then run the full schema.sql
```

### C2. Reviews API uses `product_slug` column — schema has `product_id` (UUID)
- **File:** `src/app/api/products/[slug]/reviews/route.ts:16,57`
- **Root Cause:** Schema defines `reviews.product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE`. But code queries/inserts using `product_slug` (TEXT).
- **Impact:** GET returns empty reviews always. POST throws `column "product_slug" does not exist`.
- **Fix:** Update API route to use `product_id`:

```typescript
// src/app/api/products/[slug]/reviews/route.ts
// GET - first resolve slug to product_id
const { data: product } = await supabase
  .from('products')
  .select('id')
  .eq('slug', slug)
  .single();

if (!product) {
  return NextResponse.json({ reviews: [], averageRating: 0, totalReviews: 0 });
}

const { data: reviews, error } = await filterByStore(
  supabase.from('reviews').select('*').eq('product_id', product.id),
  storeId,
).order('created_at', { ascending: false });

// POST - use product_id instead of product_slug
const { data: product } = await supabase
  .from('products')
  .select('id')
  .eq('slug', slug)
  .single();

if (!product) {
  return NextResponse.json({ error: 'Product not found' }, { status: 404 });
}

const { error } = await supabase
  .from('reviews')
  .insert({
    product_id: product.id,
    name: name.trim(),
    rating: parsedRating,
    comment: comment.trim(),
    store_id: storeId
  });
```

### C3. Paymob callback inserts `payment.success`/`payment.failed` — CHECK constraint only allows `transaction.*`
- **File:** `src/app/api/paymob/callback/route.ts:146`
- **Root Cause:** Line 146: `const eventType = success ? 'payment.success' : 'payment.failed'`. Schema CHECK: `CHECK (event_type IN ('transaction.created','transaction.succeeded','transaction.failed','transaction.refunded','transaction.pending','transaction.canceled'))`.
- **Impact:** `writeEvent()` throws CHECK constraint violation. Payment callbacks are silently lost. Also affects reconciliation (`src/app/api/admin/reconciliation/route.ts:54` checks for `payment.success`).
- **Fix:** Update the event type values to match the schema:

```typescript
// src/app/api/paymob/callback/route.ts:146
const eventType = success ? 'transaction.succeeded' : 'transaction.failed';
```

And update reconciliation route:
```typescript
// src/app/api/admin/reconciliation/route.ts:54
if (event.event_type === 'transaction.succeeded') { ... }
```

### C4. `rate_limits` table doesn't exist — rate limiting silently disabled
- **File:** `src/lib/rate-limit.ts:16-20`
- **Root Cause:** Table `rate_limits` was never created (only in schema.sql which wasn't fully applied). Code has `fail open` — on DB error, returns `true` (allow request).
- **Impact:** No rate limiting on admin login. Brute force attack possible.
- **Fix:** Run schema.sql to create all tables including `rate_limits`.

### C5. Missing tables: `stores`, `store_users`, `coupons`, `shipping_rates`, `payment_events`, `payment_errors`, `inventory_log`, `rate_limits`
- **Root Cause:** schema.sql wasn't fully executed or failed halfway.
- **Impact:** Multiple features broken:
  - Checkout can't validate coupons → coupon_code silently ignored
  - Shipping costs can't be looked up → fallback to hardcoded 100 EGP
  - Paymob callbacks can't write events/errors → reconciliation dead
  - Inventory tracking non-functional
  - Multi-tenant store isolation non-functional
- **Fix:** Run the complete schema.sql (see deployment steps at end).

---

## 🟠 HIGH ISSUES

### H1. Three sources of truth for shipping costs
- **Sources:**
  1. `src/lib/shipping.ts:34-35` — hardcoded: `Alexandria=60, others=100`
  2. `shipping_rates` DB table (if exists): `Alexandria=40, Cairo=50, others=55-100`
  3. `src/app/shipping-policy/page.tsx` — static HTML: `Alexandria=40, Cairo=50`
  4. `src/app/api/checkout/route.ts:118` — fallback: `shipping_cost || 100`
- **Impact:** Customer sees one price on checkout, different price recorded in order, different price shown on shipping policy page.
- **Fix:** Centralize shipping cost calculation:

```typescript
// src/lib/shipping.ts — always query the DB
export async function getShippingCost(governorate: string): Promise<number> {
  const { data } = await supabaseAdmin
    .from('shipping_rates')
    .select('cost')
    .eq('governorate', governorate)
    .single();
  return data?.cost ?? 100; // fallback
}
```

### H2. No pagination — will crash at scale
- **Files:** `src/app/shop/page.tsx`, `src/app/api/admin/products/route.ts`, `src/app/api/admin/orders/route.ts`, `src/app/api/admin/messages/route.ts`
- **Impact:** With >1000 products or >5000 orders, the shop page and admin pages will timeout or crash.
- **Fix:** Add pagination to all list queries:

```typescript
const page = parseInt(searchParams.get('page') || '1');
const limit = 50;
const offset = (page - 1) * limit;

const { data, count } = await supabaseAdmin
  .from('products')
  .select('*', { count: 'exact' })
  .range(offset, offset + limit - 1);
```

### H3. Finance page loads ALL orders to client
- **File:** `src/app/admin/finance/page.tsx:81`
- **Impact:** Sends entire `orders` table to browser. Security issue (customer data exposed in JS) + performance issue.
- **Fix:** Move stats computation to server-side API route that aggregates in SQL.

### H4. Checkout reserves stock BEFORE Paymob payment
- **File:** `src/app/api/checkout/route.ts:148`
- **Impact:** If user abandons Paymob iframe, stock stays reserved forever. No timeout/release mechanism.
- **Fix:** Add a scheduled cleanup or release on order timeout:

```sql
-- Run in Supabase SQL Editor
CREATE OR REPLACE FUNCTION release_expired_reservations()
RETURNS void AS $$
BEGIN
  UPDATE products p
  SET reserved_stock = 0
  WHERE reserved_stock > 0
  AND EXISTS (
    SELECT 1 FROM orders o
    JOIN inventory_log il ON il.order_id = o.id
    WHERE il.product_id = p.id
    AND il.action = 'reserve'
    AND o.status = 'pending'
    AND o.created_at < NOW() - INTERVAL '2 hours'
  );
END;
$$ LANGUAGE plpgsql;
```

Or handle the return from Paymob in the GET callback to release if failed:
```typescript
// src/app/api/paymob/callback/route.ts:232 (GET handler)
// Already partially handled — but need to ensure release on cancelled
if (success === 'false' && orderId) {
  await releaseOrderStock(orderId);
}
```

---

## 🟡 MEDIUM ISSUES

### M1. Silent catch blocks hide errors
- **Files:**
  - `src/app/api/admin/payments/route.ts:44` — empty catch
  - `src/app/api/admin/shipping/route.ts:24` — empty catch
  - `src/app/api/admin/coupons/route.ts:39` — empty catch
  - `src/app/admin/finance/page.tsx:86` — `console.error(error)` but no user feedback
  - `src/app/admin/messages/page.tsx:46` — no user feedback on failure
- **Impact:** Admin user thinks action succeeded but it failed silently.
- **Fix:** Replace with proper error handling:

```typescript
catch (error) {
  console.error('Failed to X:', error);
  setIsError(true);
  setErrorMessage('Failed to load data. Please try again.');
}
```

### M2. Inconsistent DELETE patterns
- **JSON body:** `products`, `coupons`, `reviews` → `DELETE` with `{ "id": "..." }`
- **Query params:** `orders`, `messages` → `DELETE ?id=...`
- **Fix:** Standardize to query params (more RESTful):

```typescript
// src/app/api/admin/products/route.ts
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  // ...delete by id
}
```

### M3. No `store_id` isolation on homepage and shop page
- **File:** `src/app/page.tsx:12`, `src/app/shop/page.tsx:15`
- **Impact:** In multi-tenant setup, these pages show products from ALL stores instead of the current store.
- **Fix:** Use `getStoreContext()` like API routes do:

```typescript
import { createClient } from '@supabase/supabase-js';

// Instead of direct createClient, use the store context
export const revalidate = 60;
export const dynamic = 'force-dynamic';

export default async function Home() {
  // Get store from cookies/headers
  const supabase = createClient(...);
  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('is_featured', true)
    .limit(4);
  // ...
}
```

### M4. Order-success page expects `item.image` but API strips it
- **Files:** `src/app/api/orders/[id]/route.ts:65-70` strips image, `src/app/order-success/page.tsx` expects it
- **Impact:** Order items shown without images on order-success and track pages.
- **Fix:** Either stop stripping image in API, or add it back:

```typescript
// src/app/api/orders/[id]/route.ts — remove the image stripping or add it back
const sanitizedItems = (order.items as any[]).map((item: any) => ({
  product_id: item.product_id,
  name: item.name,
  size: item.size,
  quantity: item.quantity,
  price: item.price,
  image: item.image || null,  // keep image
}));
```

### M5. `store_users` missing from `TENANT_TABLES`
- **File:** `src/lib/db.ts:39-48`
- **Impact:** `DataService` generic helpers won't work with `store_users`.
- **Fix:** Add to the list:

```typescript
// src/lib/db.ts
export const TENANT_TABLES = [
  'products', 'orders', 'messages', 'reviews',
  'coupons', 'inventory_log', 'payment_events', 'payment_errors',
  'store_users',  // ADD THIS
] as const;
```

---

## 🟢 LOW ISSUES

### L1. Multiple `any` types in TypeScript
- **Files:** `src/app/cart/page.tsx:121`, `src/app/api/paymob/callback/route.ts:138-145`, `src/app/api/checkout/route.ts:65`, `src/app/api/products/[slug]/reviews/route.ts:22`
- **Fix:** Replace `any` with proper types.

### L2. Cart `useCallback` uses object properties as dependencies
- **File:** `src/app/cart/page.tsx:122-124`
- **Impact:** Memoization is broken — callbacks re-create every render anyway.
- **Fix:** Use primitive values as dependencies:

```typescript
const handleRemove = useCallback((productId: string, size: string) => {
  removeItem(productId, size);
}, [removeItem]);
```

### L3. Double saving of order-ids to localStorage
- **Files:** `src/app/checkout/page.tsx:214` + `src/app/order-success/page.tsx:41`
- **Impact:** Duplicate order IDs in localStorage history.
- **Fix:** Remove the save from checkout (order-success handles it):

```typescript
// src/app/checkout/page.tsx — remove or comment out orderStorage.update('order-ids', ...)
```

### L4. Admin layout re-fetches `/api/admin/verify` on every navigation
- **File:** `src/app/admin/layout.tsx:27`
- **Impact:** Unnecessary API call on every page transition.
- **Fix:** Cache the verify result or skip on client navigation (middleware already checks).

### L5. Shop page has no `error.tsx` or `global-error.tsx`
- **Impact:** Any unhandled React error crashes the page with white screen.
- **Fix:** Add `error.tsx` to route groups.

---

## 🔄 SIMULATION: User Flow Failures

### User Flow 1: Browse Products → Add to Cart → Checkout
```
1. Homepage → ✅ Works (ISR, fetches featured products)
2. Shop page → ✅ Works (but no pagination — slow with >500 products)
3. Product Detail → ✅ Works (adds to cart)
4. Cart → ✅ Works (displays items, calculates total)
5. Checkout → ❌ FAILS:
   - Coupon validation → ❌ silently ignored (coupons table doesn't exist)
   - Shipping cost → ❌ fallback to 100 EGP (shipping_rates table doesn't exist)
   - Order creation → ✅ Works (orders table exists)
   - Paymob payment → ❌ FAILS (event_type CHECK constraint mismatch)
6. Order Success → ✅ Works (displays order data, but no item images)
```

### User Flow 2: Leave Review
```
1. View Product → ✅ Works
2. Write Review → ❌ FAILS: POST /api/products/[slug]/reviews
   → DB Error: column "product_slug" does not exist
   → User sees "Failed to submit review" generic error
```

### User Flow 3: Contact Form
```
1. Fill Contact Form → ✅ Works (POST /api/contact writes to messages table)
2. Submit → ✅ Success
```

### Admin Flow 1: Login
```
1. Visit /admin-login → ✅ Works (shows login form)
2. Enter password → ❌ FAILS:
   - createSession() tries INSERT with store_id, user_id, user_role
   - admin_sessions table doesn't have these columns
   - DB error → 503 "خطأ غير متوقع أثناء الاتصال بـ Supabase"
   - User never reaches /admin
```

### Admin Flow 2: Manage Products
```
1. Login → ❌ Can't login (C1)
   If login worked:
2. View Products → ✅ Would work
3. Add Product → ✅ Would work
4. Delete Product → ✅ Would work
```

### Admin Flow 3: View Orders / Change Status
```
1. View Orders → ✅ Would work (orders table exists)
2. Change Status → ✅ Would work (state machine validates)
3. Delete Order → ✅ Would work
```

### Admin Flow 4: Payment Reconciliation
```
1. View Payments → ❌ FAILS:
   - payment_events table doesn't exist
   - payment_errors table doesn't exist
   - Both silently return empty (catch blocks)
```

---

## 📋 DEPLOYMENT FIX STEPS (Ordered)

### Step 1: Fix database
Run in Supabase SQL Editor **in this order**:

```sql
-- 1a. Drop old admin_sessions (will recreate with correct columns)
DROP TABLE IF EXISTS admin_sessions CASCADE;

-- 1b. Copy and run the ENTIRE content of schema.sql
-- (file: E:\houda store\schema.sql)
```

### Step 2: Fix Reviews API
Edit `src/app/api/products/[slug]/reviews/route.ts`:
- Replace `.eq('product_slug', slug)` with `.eq('product_id', product.id)`
- Replace `.insert({ product_slug: slug, ... })` with `.insert({ product_id: product.id, ... })`
- Add slug → id resolution query before both GET and POST

### Step 3: Fix Paymob callback event types
Edit `src/app/api/paymob/callback/route.ts:146`:
- Change `'payment.success'` → `'transaction.succeeded'`
- Change `'payment.failed'` → `'transaction.failed'`

Edit `src/app/api/admin/reconciliation/route.ts:54`:
- Change `event.event_type === 'payment.success'` → `event.event_type === 'transaction.succeeded'`

### Step 4: Verify all tables exist
```sql
-- Run in Supabase SQL Editor
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

Expected output (13 tables):
```
admin_sessions, coupons, inventory_log, messages, orders,
payment_errors, payment_events, products, rate_limits, reviews,
shipping_rates, store_users, stores
```

### Step 5: Test admin login
```bash
npm run dev
# Open http://localhost:3000/admin-login
# Enter password: OldGold000#
```

### Step 6: Add shipping rates (if table was created but empty)
```sql
-- Run in Supabase SQL Editor (already in schema.sql, just in case)
INSERT INTO shipping_rates (governorate, cost, estimated_days) VALUES
  ('Alexandria', 40, '1-2 days'),
  ('Cairo', 50, '1-2 days'),
  ('Giza', 50, '1-2 days'),
  -- ... all 27 governorates
ON CONFLICT (governorate) DO NOTHING;
```

---

## 📊 DATABASE STATE SUMMARY

| Table | Status | Has Data? | Impact |
|-------|--------|-----------|--------|
| `products` | ✅ Exists | ✅ 3+ products | Working |
| `orders` | ✅ Exists | ✅ 3+ orders | Working |
| `messages` | ✅ Exists | ❌ Empty | Working |
| `admin_sessions` | ⚠️ OLD schema | ❌ Empty | ❌ Login broken |
| `stores` | ❌ Missing | — | ❌ Multi-tenant broken |
| `store_users` | ❌ Missing | — | ❌ Auth broken |
| `reviews` | ❌ Missing | — | ❌ Reviews broken |
| `coupons` | ❌ Missing | — | ❌ Coupons broken |
| `shipping_rates` | ❌ Missing | — | ❌ Shipping broken |
| `payment_events` | ❌ Missing | — | ❌ Payments broken |
| `payment_errors` | ❌ Missing | — | ❌ DLQ broken |
| `inventory_log` | ❌ Missing | — | ❌ Inventory broken |
| `rate_limits` | ❌ Missing | — | ❌ Rate limit broken |

---

## 🎯 IMMEDIATE FIX (Get admin working NOW)

1. Go to Supabase Dashboard → SQL Editor
2. Run: `DROP TABLE IF EXISTS admin_sessions CASCADE;`
3. Paste the ENTIRE `schema.sql` file and run it
4. Verify all 13 tables appear
5. Restart server: `npm run dev`
6. Login at `/admin-login` with password: `OldGold000#`

This will fix the admin login + create all missing tables in one shot.
