# Production Readiness Audit — OG Old Gold

**Date:** 2026-06-04
**Scope:** Full codebase audit across Security, Performance, SEO, Accessibility, Responsive Design, Database, API Security, Authentication, Authorization, Payment Flow, Error Handling, and Edge Cases.

---

## Severity Key

| Level | Meaning | Action Required |
|-------|---------|----------------|
| **CRITICAL** | Direct compromise of data, auth bypass, financial fraud, or system crash | Fix immediately |
| **HIGH** | Significant security gap, data loss risk, or broken core functionality | Fix within 24h |
| **MEDIUM** | Notable weakness requiring additional conditions to exploit, UX degradation | Fix within 1 week |
| **LOW** | Best practice violation, minor info leak, or hardening opportunity | Fix when convenient |

---

# 🔴 CRITICAL (5 issues)

## C-1: `store_users` table missing `name` column — admin login always fails

**File:** `schema.sql:28-36`
```sql
CREATE TABLE IF NOT EXISTS store_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,     -- ← no `name` column!
  role TEXT NOT NULL DEFAULT 'admin',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Root cause:** The `store_users` table has `email` and `password_hash` but no `name` column. The login API (`src/app/api/admin/login/route.ts:31`) does `.select('id, email, name, password_hash, role, store_id, is_active')` — referencing a non-existent column.

**Exact fix:** Add `name TEXT NOT NULL` to `store_users` in `schema.sql`:
```sql
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
```

**Production impact:** **All admin login attempts fail with a database error.** No one can access the admin panel. Zero admin functionality works.

---

## C-2: Paymob callback `event_type` doesn't match reconciliation check

**File:** `src/app/api/paymob/callback/route.ts:146` vs `src/app/api/admin/reconciliation/route.ts:58`

**Callback writes:**
```typescript
const eventType = success ? 'transaction.succeeded' : 'transaction.failed';
```

**Reconciliation checks:**
```typescript
const success = event.event_type === 'payment.success';  // ← never matches!
```

**Root cause:** The callback uses `transaction.succeeded`/`transaction.failed` as event types, but the reconciliation route checks for `payment.success`/`payment.failed`. These strings will never match — reconciliation will always treat every event as a **failure**.

**Exact fix:** Make them consistent. Change the callback to write `payment.success`/`payment.failed`:
```typescript
const eventType = success ? 'payment.success' : 'payment.failed';
```

**Production impact:** The reconciliation "Retry" button for payment events will never work. Every payment event is marked as a failure in reconciliation. Admin cannot reprocess failed payments.

---

## C-3: Unauthenticated endpoint returns live Paymob auth token

**File:** `src/app/api/paymob/auth/route.ts:4-11`
```typescript
export async function GET() {
  try {
    const token = await getAuthToken();
    return NextResponse.json({ token });  // ← no auth, no rate limit!
  } catch {
    return NextResponse.json({ error: 'Paymob auth failed' }, { status: 500 });
  }
}
```

**Root cause:** `GET /api/paymob/auth` has zero authentication, zero rate limiting. Anyone can call it to get a live Paymob API token that can create payment orders and payment keys.

**Exact fix:** Add `getAdminSession()` + `csrfGuard()` + `checkRateLimit()`, or remove the endpoint entirely (paymob.ts handles auth internally for all other routes).

**Production impact:** An attacker can obtain a live Paymob auth token and create fraudulent payment orders. Financial fraud risk.

---

## C-4: Unauthenticated service-role email confirmation

**File:** `src/app/api/auth/confirm/route.ts:4-26`
```typescript
export async function POST(req: NextRequest) {
  const { userId } = await req.json();
  // ← no auth, no CSRF, no rate limit!
  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    email_confirm: true,  // ← anyone can confirm any user
  });
```

**Root cause:** No authentication on an endpoint that uses the service_role key to modify user accounts. An attacker who knows a user's UUID can auto-confirm their email.

**Exact fix:** Add `getAdminSession()` + `csrfGuard()` + `checkRateLimit()`, or remove this endpoint if it's unused.

**Production impact:** Attackers can bypass email verification for any user account. Account takeover risk.

---

## C-5: Unauthenticated file upload with service role

**File:** `src/app/api/upload/review/route.ts:4-46`
```typescript
export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  // ← no auth, no CSRF, no rate limit!
  const { data, error } = await supabaseAdmin.storage
    .from('review-images')
    .upload(fileName, buffer, { ... });  // ← uses service_role!
```

**Root cause:** No authentication on file upload that uses the service-role Supabase client. Only client-side `file.type` check (easily forged). Anyone can fill the storage bucket with junk.

**Exact fix:** Add auth check. Use an anon-key client with RLS instead of `supabaseAdmin`.

**Production impact:** Storage bucket can be filled with arbitrary files. Service-role key exposed through unguarded endpoint.

---

# 🟠 HIGH (12 issues)

## H-1: Paymob env vars are placeholder values — card payments dead

**File:** `.env.local:38-41`
```
PAYMOB_API_KEY=your_paymob_api_key
PAYMOB_INTEGRATION_ID=your_integration_id
PAYMOB_IFRAME_ID=your_iframe_id
PAYMOB_HMAC_SECRET=your_hmac_secret
```

**Root cause:** All Paymob credentials are placeholder strings. Card payment flow calls `getAuthToken()` with `api_key: "your_paymob_api_key"` which Paymob rejects.

**Exact fix:** Replace with real Paymob credentials from https://accept.paymob.com

**Production impact:** **All card payments fail 100%.** Customers cannot pay by credit/debit card. Only COD works.

---

## H-2: Stock/coupon RPCs not deployed — orders silently lose stock reservation

**File:** `src/app/api/checkout/route.ts:190-210`
```typescript
const { error: rpcError } = await supabaseAdmin.rpc('reserve_order_stock', { ... });
// If RPC doesn't exist (not deployed), this throws an error
// Order is deleted, stock is NOT reserved
// Coupon increment RPC silently fails — coupon can be reused infinitely
```

**Root cause:** The `reserve_order_stock`, `commit_order_stock`, `release_order_stock`, and `atomic_increment_coupon` RPCs are defined in `schema.sql` but **never deployed** to the Supabase database. All stock management and coupon usage tracking is non-functional.

**Exact fix:** Deploy `schema.sql` to Supabase SQL Editor. Or add fallback logic if RPCs don't exist.

**Production impact:** No stock reservation = overselling. No coupon usage tracking = coupons reusable infinitely. All inventory management is broken.

---

## H-3: Cross-store data access on Bundles PUT/DELETE

**File:** `src/app/api/admin/bundles/route.ts:122-127,153-156`

**PUT (line 122):**
```typescript
.eq('id', body.id)           // ← NO store_id filter!
```

**DELETE (line 153):**
```typescript
.eq('id', id);               // ← NO store_id filter!
```

**Root cause:** GET and POST correctly filter by `store_id`, but PUT and DELETE do not. An admin in one store can modify/delete bundles in any other store.

**Exact fix:** Add `.eq('store_id', storeId)` to both PUT and DELETE queries.

**Production impact:** Cross-tenant data corruption. Admin from Store A can delete Store B's bundles.

---

## H-4: Missing `store_id` on Newsletter DELETE

**File:** `src/app/api/admin/newsletter/route.ts:41-44`
```typescript
const { error } = await supabaseAdmin
  .from('subscribers')
  .delete()
  .eq('id', id);             // ← NO store_id filter!
```

**Same root cause/fix/impact as H-3.**

---

## H-5: Public order endpoint exposes PII without auth

**File:** `src/app/api/orders/[id]/route.ts:62-74`
```typescript
return NextResponse.json({
  customer_name: data.customer_name,  // ← PII leaked
  governorate: data.governorate,
  city: data.city,
  total: data.total,
  items: sanitizedItems,              // ← product names, prices
  // phone and address excluded, but name + location is still PII
});
```

**Root cause:** No authentication required. Anyone who knows a `display_id` (predictable format, see L-x) or UUID can retrieve order details including customer name and location.

**Exact fix:** Require auth OR tie the lookup to the current user's session (like `/api/orders/by-user` does).

**Production impact:** Customer name + location + order details are publicly accessible. PII exposure. Combined with predictable display IDs, order enumeration is possible.

---

## H-6: Native `<img>` tags instead of Next.js `<Image>` in ReviewSection

**File:** `src/components/ReviewSection.tsx:163,216`
```jsx
<img src={review.image} alt="Review photo" ... />   // ← no optimization
<img src={URL.createObjectURL(imageFile)} alt="Preview" ... />
```

**Root cause:** Using native `<img>` instead of Next.js `<Image>`. No WebP/AVIF conversion, no lazy loading, no responsive sizes.

**Exact fix:** Replace with `<Image>` from `next/image`:
```jsx
<Image src={review.image} alt="Review photo" fill className="object-cover" sizes="400px" />
```

**Production impact:** Images are served in original format (likely JPEG/PNG) at full resolution. Slower page loads, higher bandwidth costs, worse Core Web Vitals.

---

## H-7: Missing `htmlFor`/`id` on all form labels — screen readers broken

**Files:** ALL pages with forms:
- `src/app/checkout/page.tsx:283-300`
- `src/app/auth/login/page.tsx:57-77`
- `src/app/auth/register/page.tsx:85-129`
- `src/app/auth/forgot-password/page.tsx:50-58`
- `src/app/admin-login/page.tsx:115-121`
- `src/components/NewsletterPopup.tsx:127-156`

**Pattern:**
```jsx
<label className="...">Full Name</label>      // ← no htmlFor
<input type="text" className="..." />          // ← no id
```

**Root cause:** All forms use label elements without `htmlFor` attribute and inputs without `id`. Screen readers cannot associate labels with inputs. Clicking labels does not focus inputs.

**Exact fix:** Add matching `id`/`htmlFor` pairs to all inputs:
```jsx
<label htmlFor="fullName" className="...">Full Name</label>
<input id="fullName" type="text" className="..." />
```

**Production impact:** **Zero accessibility for screen reader users.** WCAG 1.3.1 and 4.1.2 violations. Legal liability in accessibility-regulated markets.

---

## H-8: Admin page status change doesn't validate state transitions

**File:** `src/app/api/admin/orders/route.ts:65-74`
```typescript
if (status && !isValidOrderStatus(status)) {
  return NextResponse.json({ error: `Invalid status: "${status}"` }, { status: 422 });
}
// ← only validates enum, NOT transition!
// assertValidOrderTransition() exists in order-state.ts but is NEVER called here
```

**Root cause:** The `isValidOrderStatus()` only checks if the target status is a valid string value. The `assertValidOrderTransition()` function exists in `order-state.ts` but is never imported or called in the admin orders route.

**Exact fix:** Import and call `assertValidOrderTransition()`:
```typescript
import { assertValidOrderTransition } from '@/lib/order-state';
// Before applying update:
assertValidOrderTransition(current.status, status);
```

**Production impact:** Admin can set invalid transitions like `cancelled → confirmed` or `pending → delivered`. Stock can be double-committed or never released.

---

## H-9: No `loading.tsx` or `error.tsx` files anywhere

**Files:** Missing throughout:
- `src/app/shop/loading.tsx`
- `src/app/product/[slug]/loading.tsx`
- `src/app/admin/loading.tsx`
- `src/app/error.tsx` exists at root only, no nested boundaries

**Root cause:** Zero `loading.tsx` files in the entire application. Only one `error.tsx` at root level. Page transitions show no loading state. Any crash in admin crashes the entire app.

**Exact fix:** Add `loading.tsx` at minimum for shop, product, admin, profile routes. Add nested `error.tsx` for admin route group.

**Production impact:** Poor UX on slow connections. Full-page crash on any component error. No graceful degradation.

---

## H-10: Silently swallowed errors in 8+ API routes

**Files:**
- `src/app/api/flash-sales/route.ts:22-23`
- `src/app/api/bundles/route.ts:21-22`
- `src/app/api/orders/by-user/route.ts:64-65`
- `src/app/api/products/wishlist/route.ts:28-30`
- `src/app/api/shipping/cost/route.ts:24-26`
- `src/app/api/products/[slug]/reviews/route.ts:38-41`

**Pattern:**
```typescript
catch {
  return NextResponse.json({ sales: [] });  // ← silent empty response
}
```

**Root cause:** Catch blocks return empty data instead of error responses. Production monitoring cannot detect DB failures. Client sees empty data with no error indication.

**Exact fix:** Log the error server-side and return an error response:
```typescript
catch (error) {
  console.error('Flash sales fetch error:', error);
  return NextResponse.json({ error: 'Failed to fetch sales' }, { status: 500 });
}
```

**Production impact:** Silent failures. Support team sees "no data" but has no way to distinguish between "no sales exist" and "database is down."

---

## H-11: CSRF token derived from session token prefix, readable by JS

**File:** `src/lib/auth.ts:198-204`
```typescript
response.cookies.set('csrf-token', token.slice(0, 16), {
  httpOnly: false,          // ← readable by JavaScript!
```

**Root cause:** The CSRF token is `token.slice(0, 16)` where `token = randomBytes(32).toString('hex')` (64 hex chars). The CSRF cookie is NOT HttpOnly, meaning any injected JS can read it. This leaks the first 16 chars of the 64-char session token, reducing effective entropy.

**Exact fix:** Generate a completely independent random CSRF token:
```typescript
const csrfToken = randomBytes(16).toString('hex');
```

**Production impact:** Low practical risk (requires XSS to exploit), but couples two independent security mechanisms. If XSS exists, attacker knows 25% of the session token.

---

## H-12: Checkout TOCTOU — order created before stock reserved, no transaction

**File:** `src/app/api/checkout/route.ts:177-201`
```typescript
const { data: order, error: orderErr } = await supabaseAdmin
  .from('orders').insert([...]).select().single();  // Step 1: Order created

const { error: rpcError } = await supabaseAdmin.rpc('reserve_order_stock', ...);
// Step 2: Stock reserved (or fails)

if (rpcError) {
  await supabaseAdmin.from('orders').delete().eq('id', order.id);
  // Step 3: Order deleted if stock fails (but what if crash between 1 & 2?)
}
```

**Root cause:** Three-step process with no database transaction. If the server crashes between order creation (step 1) and stock reservation (step 2), the order exists with `pending` status but **no stock is reserved**. If crash between step 2 and the response, stock is reserved but order is deleted → leaked stock.

**Exact fix:** Use a Supabase transaction (RPC that both creates the order and reserves stock atomically), or add a reconciliation job to clean up orphaned pending orders.

**Production impact:** Orphan pending orders accumulate. Reserved stock is never released. Inventory slowly depletes with false reservations.

---

# 🟡 MEDIUM (15 issues)

## M-1: No rate limiting on public review submission

**File:** `src/app/api/products/[slug]/reviews/route.ts:44-93`
```typescript
export async function POST(request: NextRequest, { params }: ...) {
  // ← no checkRateLimit() anywhere
```

**Fix:** Add `checkRateLimit(ip, 'reviews', 3, 60000)` — max 3 reviews per minute per IP.

**Impact:** Attackers can spam product reviews, skew ratings, and fill the database.

---

## M-2: No rate limiting on coupon validation endpoint

**File:** `src/app/api/coupons/validate/route.ts:5-58`
```typescript
export async function POST(request: NextRequest) {
  // ← no checkRateLimit()
```

**Fix:** Add rate limiting. The endpoint returns different messages for "invalid code" vs "expired" vs "max uses" — making it a coupon oracle for brute-forcing.

**Impact:** Coupon codes can be brute-forced. Valid vs invalid vs expired vs used codes can be distinguished.

---

## M-3: Rate limiting bypass via `'unknown'` IP

**File:** `src/lib/rate-limit.ts:3-4`
```typescript
if (ip === 'unknown' || !ip) return true;  // ← bypass!
```

Multiple routes fall back to `'unknown'` when no `x-forwarded-for` header is present:
- `checkout/route.ts:23`
- `admin/login/route.ts:36`
- `contact/route.ts:15-17`
- `newsletter/subscribe/route.ts:22`
- `auth/login/route.ts:11`
- `auth/register/route.ts:11`

**Fix:** Default to the request's remote address instead of the literal string `'unknown'`.

**Impact:** Any attacker who omits or spoofs the `x-forwarded-for` header bypasses all rate limiting. All public endpoints are unprotected.

---

## M-4: Public order lookup has no rate limiting

**File:** `src/app/api/orders/[id]/route.ts:6-78`

**Fix:** Add rate limiting. Combined with predictable display IDs (M-x), this allows order enumeration.

---

## M-5: Admin logout has no CSRF guard

**File:** `src/app/api/admin/logout/route.ts:5-28`
```typescript
export async function POST(req: NextRequest) {
  // ← no csrfGuard()!
```

**Fix:** Add `csrfGuard(req)` before processing. All other admin mutations have this.

**Impact:** An attacker can forge a logout request, causing admin DoS.

---

## M-6: NewsletterPopup modal is not accessible

**File:** `src/components/NewsletterPopup.tsx:97-106`
```jsx
<motion.div ...>                     // ← no role="dialog"
  <button onClick={handleDismiss} /> // ← no focus trap
```

Missing: `role="dialog"`, `aria-modal="true"`, focus trap, `aria-labelledby`.

**Fix:** Add ARIA attributes and implement focus trap:
```jsx
<motion.div role="dialog" aria-modal="true" aria-labelledby="newsletter-title">
```

---

## M-7: No metadata on auth/wishlist/profile/admin pages

**Files:**
- `src/app/auth/login/page.tsx`
- `src/app/auth/register/page.tsx`
- `src/app/auth/forgot-password/page.tsx`
- `src/app/wishlist/page.tsx`
- `src/app/profile/page.tsx`
- `src/app/offline/page.tsx`
- `src/app/admin-login/page.tsx`
- All `/admin/*` pages

**Fix:** Add `metadata` export to each:
```typescript
export const metadata: Metadata = { title: 'Sign In — OG Old Gold', description: '...' };
```

**Impact:** These pages show segment path as title (e.g., "auth/login | OG Old Gold"). Poor SEO.

---

## M-8: No canonical URLs except on product pages

**Fix:** Add `alternates: { canonical: url }` to all pages.

**Impact:** Duplicate content risk (e.g., `/shop?category=x` and `/shop` are different URLs for same content).

---

## M-9: Star rating not keyboard accessible

**File:** `src/components/ReviewSection.tsx:200`

**Fix:** Add `tabIndex={0}`, `role="button"`, and keyboard handlers (`onKeyDown` for Enter/Space).

**Impact:** Keyboard-only users cannot submit ratings.

---

## M-10: Missing `sizes` on some Image components

**Fix:** Audit all `<Image>` components for missing `sizes` prop. Critical for CLS (Cumulative Layout Shift).

**Impact:** Layout shift on image load, worse Core Web Vitals.

---

## M-11: Reserved stock never cleaned up for abandoned checkouts

**Fix:** Add a database trigger or scheduled job to release `reserved_stock` after N minutes for orders still in `pending` status without a `paymob_txn_id`.

**Impact:** Reserved stock accumulates, causing false "out of stock" for legitimate customers.

---

## M-12: Admin finance page fetches ALL orders without pagination

**File:** `src/app/admin/finance/page.tsx:82`
```typescript
const res = await fetch('/api/admin/orders');  // ← no page/limit!
```

**Fix:** Add server-side pagination with `?page=1&limit=50` and a date range filter.

**Impact:** Loading thousands of orders into the browser on every visit. Memory exhaustion for large stores.

---

## M-13: Admin PUT order route has no transition validation (duplicate of H-8, but on different impact axis)

**File:** `src/app/api/admin/orders/route.ts:65-74`

Already covered in H-8.

---

## M-14: No error boundaries for admin — crash crashes everything

**Fix:** Add `src/app/admin/error.tsx`:
```tsx
'use client';
export default function AdminError({ error, reset }) {
  return <div>Admin error: {error.message}</div>;
}
```

**Impact:** A crash in any admin page component renders a broken page with no recovery option.

---

## M-15: Coupon increment failure silently swallowed

**File:** `src/app/api/checkout/route.ts:204-211`
```typescript
if (couponIncrError) {
  console.error('[Checkout] Failed to increment coupon usage:', couponIncrError.message);
  // ← order still returns success: true
}
```

**Fix:** Either return a partial error, or retry the increment, or roll back the order.

**Impact:** Coupon discount is applied but usage not counted. Coupon can be reused.

---

# 🟢 LOW (18 issues)

| # | File | Issue | Fix |
|---|------|-------|-----|
| L-1 | `src/app/api/payment-details/route.ts:3-9` | Hardcoded fallback phone/instapay in source code | Remove defaults, return error if env vars not set |
| L-2 | `.env.local:38-41` | Paymob credentials are placeholders | Replace with real values |
| L-3 | `src/app/api/auth/logout/route.ts:15` | Inconsistent `sameSite: 'lax'` vs `'strict'` on admin | Change to `sameSite: 'strict'` |
| L-4 | `src/proxy.ts` | Missing security headers (CSP, HSTS, X-Frame-Options, etc.) | Add helmet-style headers |
| L-5 | `src/app/api/admin/products/bulk/route.ts:16` | No file type/extension validation on bulk upload | Add `.xlsx`/`.csv` check + magic bytes |
| L-6 | `src/app/api/checkout/route.ts:150-158` | `Math.random()` for display_id (not crypto-secure) | Use `crypto.randomBytes()` |
| L-7 | `src/app/api/paymob/callback/route.ts:149-154` | Anti-replay timestamp check skippable (gated by `created_at` existence) | Remove the gate; always check timestamp |
| L-8 | `src/app/api/paymob/callback/route.ts:166-178` | Callback doesn't verify order's payment_method is 'paymob' | Add `.eq('payment_method', 'paymob')` |
| L-9 | `src/lib/paymob.ts:82-94` vs `callback/route.ts:98-108` | Duplicate HMAC building logic | Callback should use shared `verifyHmac()` |
| L-10 | `schema.sql` | Missing `created_at DESC` composite index on orders | Add `CREATE INDEX idx_orders_store_date ON orders(store_id, created_at DESC)` |
| L-11 | `src/app/admin/orders/page.tsx:59` | Untyped `catch (error)` | Use `catch (err: unknown)` |
| L-12 | `src/app/api/admin/stats/route.ts:54-61` | Fetches ALL orders, filters in memory for stats | Push aggregation to SQL |
| L-13 | `schema.sql:28` | `store_users` missing `UNIQUE(store_id, email)` constraint | Add unique constraint |
| L-14 | `schema.sql:189` | `payment_errors.order_id` has no FK constraint | Add `REFERENCES orders(id) ON DELETE SET NULL` |
| L-15 | `src/components/NewsletterPopup.tsx` | Typo in WhatsApp number format | Fix validation |
| L-16 | `src/components/Header.tsx:74-80` | Logo image missing `priority` prop | Add `priority` |
| L-17 | `src/app/layout.tsx:63` | Hardcoded `lang="en"` — store targets Egyptian market | Add Arabic language support / hreflang |
| L-18 | All admin page files | Hardcoded colors (`text-[#1A1A1A]`, `bg-[#F8F9FB]`, etc.) instead of CSS variables | Migrate to `text-foreground`, `bg-card`, etc. |

---

# Summary

| Severity | Count | Action |
|----------|-------|--------|
| 🔴 **CRITICAL** | 5 | Fix immediately — auth bypass, data loss, login broken |
| 🟠 **HIGH** | 12 | Fix within 24h — security gaps, card payments dead, stock broken |
| 🟡 **MEDIUM** | 15 | Fix within 1 week — rate limiting, a11y, SEO, UX |
| 🟢 **LOW** | 18 | Fix when convenient — hardening, best practices |
| **TOTAL** | **50** | |

## Quick Wins (fix in <5 minutes each)

1. 🔴 **C-1**: Add `name` column to `store_users` in `schema.sql`
2. 🔴 **C-2**: Fix `event_type` string in `callback/route.ts:146`
3. 🟠 **H-3**: Add `.eq('store_id', storeId)` to bundles PUT/DELETE
4. 🟠 **H-4**: Add `.eq('store_id', storeId)` to newsletter DELETE
5. 🟠 **H-9**: Create `loading.tsx` files for main routes
6. 🟡 **M-5**: Add `csrfGuard()` to admin logout

## Deployment Blockers (non-negotiable)

1. 🔴 **C-1**: `store_users.name` column missing → admin login always fails
2. 🟠 **H-1**: Paymob env vars are placeholders → card payments dead
3. 🟠 **H-2**: RPCs not deployed → stock reservation + coupon tracking broken
