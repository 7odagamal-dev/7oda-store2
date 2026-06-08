# OG Old Gold — Final Security & Stability Report

## Overview
This report covers all findings addressed in the final production hardening pass, including 3 security findings (B, C, F + earlier D+E, A) and 1 critical bug fix (Turbopack dev crash).

---

## ✅ Finding D+E — Review Image Upload (HIGH)

**File**: `src/app/api/upload/review/route.ts` (new)

6 security defenses implemented:
| Defense | Implementation |
|---------|---------------|
| Rate limiting | 10 req/hr/IP via `checkRateLimit()` |
| MIME type allowlist | JPG, PNG, WebP, GIF only |
| SVG rejection | Explicit MIME + extension reject |
| Magic bytes validation | Full JPEG/PNG/GIF/WebP signatures checked **before** buffer allocation |
| Extension allowlist | `.jpg/.jpeg/.png/.webp/.gif` — unknown → forced to `.jpg` |
| Filename safety | `crypto.randomUUID()` — no user-controlled filenames |
| Size limit | 2MB max (checked before buffer allocation) |

---

## ✅ Finding A — Stock DELETE (HIGH)

**File**: `src/app/api/admin/orders/route.ts` (DELETE handler)

Before: DELETE deleted the order directly, **stranding reserved stock** in the database.

After:
1. SELECT order with store-scoped query
2. If status is `confirmed` or `pending`, call `release_order_stock()` RPC
3. Only then proceed with DELETE

---

## ✅ Finding B — Coupon System (CRITICAL)

**Problem**: Coupon `used_count` was incremented at checkout — if payment failed later, the coupon was never decremented.

### Fix — 4 files changed:

| File | Change |
|------|--------|
| `schema.sql` | Added `atomic_decrement_coupon` RPC + `coupon_id` column migration |
| `checkout/route.ts` | Removed `atomic_increment_coupon` call; stores `coupon_id` on order instead |
| `callback/route.ts` | Increments coupon on payment success; decrements on failure |
| `admin/orders/route.ts` (PUT) | Increments on confirm; decrements on cancel |

**New invariant**: Coupon is incremented **only** when payment is confirmed (Paymob callback or admin confirm), never at checkout.

---

## ✅ Finding C — Shipping RBAC (HIGH)

**File**: `src/app/api/admin/shipping/route.ts`

Before: PUT allowed any admin to modify shipping rates (global table, no store isolation).

After: Added `session.role !== 'superadmin'` guard — only superadmin can modify.

---

## ✅ Finding F — Bucket Optimization (LOW)

**File**: `src/app/api/admin/upload/route.ts`

Before: `createBucket()` called on every upload (409 errors in logs if bucket exists).

After: `getBucket()` check first — only creates if absent.

---

## 🐛 Bug Fix — Turbopack Dev Crash

**Problem**: `npm run dev` immediately failed with:
```
Error: You cannot use different slug names for the same dynamic path
```

**Root cause**: Coexistence of `product/[slug]` (old redirect) and `product/[category]/[id]` (new route) — Turbopack does not allow different dynamic parameter names at the same depth.

**Fix**:
1. Deleted `src/app/product/[slug]/page.tsx` + `layout.tsx`
2. Moved the slug→new-URL redirect to `src/proxy.ts:51-75` (middleware)

Old `/product/:slug` URLs now get a **301 redirect** to `/product/:category/:id` via the proxy layer.

---

## 📊 Final Metrics

| Metric | Before | After |
|--------|--------|-------|
| Routes | 82 | 81 (removed duplicate) |
| Build errors | 0 | 0 |
| Type errors | 0 | 0 |
| Tests passing | 57/57 | 57/57 |
| `npm run dev` | ❌ Crashes | ✅ Works |
| `npm run build` | ✅ | ✅ |

---

## 📋 Remaining Manual Steps

| Step | Details |
|------|---------|
| Deploy `schema.sql` | Run in Supabase SQL Editor — adds `atomic_decrement_coupon` RPC + `coupon_id` column |
| Set Paymob env vars | Uncomment `PAYMOB_HMAC_SECRET`, `PAYMOB_API_KEY`, `PAYMOB_INTEGRATION_ID`, `PAYMOB_IFRAME_ID` in `.env.local` |
| Set payment details | Uncomment `PAYMENT_VODAFONE_CASH`, `PAYMENT_INSTAPAY`, `PAYMENT_INSTAGRAM_URL` |
| Create storage buckets | `product-images` and `review-images` buckets must exist in Supabase Storage |

---

*Generated: June 2026 — Final production hardening complete.*
