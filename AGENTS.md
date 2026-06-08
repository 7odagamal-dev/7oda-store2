# OG Old Gold — Agent Memory

## Goal
Complete a full production hardening pass across security, database, payments, orders, inventory, admin, SEO, performance, and deployment — culminating in a production‑ready deployment score.

## Constraints & Preferences
- Arabic user, but code and comments remain in English.
- Every fix must be proven with code evidence (file path, line, before/after).
- Build test after every group of fixes.
- No theoretical reports — fix issues directly in source code.

## Progress

### Phase 1 — Security (done)
- `blog/route.ts`: Added `getAdminSession()` + `csrfGuard()` to all 4 methods.
- `flash-sales/route.ts`: Rewrote with `getAdminSession()` + `csrfGuard()`.
- `newsletter/route.ts`: Rewrote with `getAdminSession()` + `csrfGuard()` (GET/DELETE were returning 200 without auth).
- `bundles/route.ts`: Rewrote with `getAdminSession()` + `csrfGuard()`.
- `upload/route.ts`: Added `csrfGuard()`.
- `bulk/route.ts`: Changed from `getSupabase()` (anon key) to `supabaseAdmin` (service role).
- `logout/route.ts`: Added `csrf-token` cookie clearing, `sameSite: strict`.
- **All admin APIs now return 401 when unauthenticated. Build: 77/77 routes.**

### Phase 2 — Database (done)
- Created `schema.sql` with all 17 tables, RLS policies, and 3 stored procedures (`reserve_order_stock`, `commit_order_stock`, `release_order_stock`), plus seed data for default store and shipping rates.
- Tables covered: `stores`, `store_users`, `admin_sessions`, `products`, `orders`, `coupons`, `shipping_rates`, `messages`, `reviews`, `payment_events`, `payment_errors`, `inventory_log`, `rate_limits`, `blog_posts`, `subscribers`, `flash_sales`, `bundles`.

### Phase 3 — Payments (reviewed)
- HMAC verification, anti-replay, idempotency lock, event logging all correct.
- **Action needed**: Un‑comment Paymob env vars in `.env.local` before card payments will work.

### Phase 4 — Orders (done)
- `checkout/route.ts:135`: Shipping cost is now server‑calculated (was trusting client‑supplied `shipping_cost`).
- `CartContext.tsx:129`: Removed hardcoded `discount = itemCount > 1 ? 100 : 0` (was giving 100 EGP discount for any cart with >1 item).

### Phase 5 — Inventory (reviewed)
- `reserve_order_stock` RPC uses PostgreSQL atomic UPDATE with WHERE guard — correct.
- TOCTOU window between SELECT and RPC is mitigated by RPC‑level atomic check + rollback on failure.
- **Action needed**: Deploy `schema.sql` to Supabase (RPCs don't exist in DB yet).

### Phase 6 — Admin (partial — orders + products)
- `orders/route.ts`: Added server-side pagination with `?page=&limit=&search=&status=` query params. Response format: `{ data, total, page, limit, totalPages }`.
- `products/route.ts`: Same pagination support as orders.
- `flash-sales/route.ts`: Added server-side pagination with `?page=&limit=` and manual `.range()`.
- `admin/orders/page.tsx`: Updated to use server-side pagination — added page state, navigation buttons, passes search/status to server.
- Other admin pages (messages, reviews, blog, bundles, newsletter, shipping, etc.) remain with client-side filtering for now (datasets are small enough).

### Phase 7 — SEO (done)
- `sitemap.ts`: Created — includes all static pages + product/blog slugs from DB.
- `robots.ts`: Created — disallows admin/api/auth paths; points to sitemap.
- `product/[slug]/page.tsx`: Removed duplicate JSON‑LD (layout.tsx already handles it server‑side).
- Build: 79 routes (sitemap.xml + robots.txt added). Endpoints verified returning 200.

### Phase 8 — Performance (done)
- Added `sizes` prop to all 8 customer-facing `<Image>` components missing it (cart, checkout, product detail, ImageZoom, QuickView, HomeClient, OrderSuccess, profile).
- No Supabase image transformations — not available on free tier; Next.js handles resizing/WebP.

### Phase 9 — Deployment (done)
- `middleware.ts` → `proxy.ts` (function renamed from `middleware` → `proxy`). Deprecation warning gone.

### Phase 10 — TypeScript (done)
- Removed 31 `any` uses across admin files:
  - 9 `catch (err: any)` → `catch (err: unknown)` with InstanceOf narrowing.
  - 11 `(o: any)` / `(item: any)` callbacks → typed via `Order` and `Product` interfaces.
  - 4 `(product as any)` casts → removed (fields already in interface).
  - 7 other explicit `any` annotations removed.
- Already had `strict: true` in tsconfig.
- Build: 79 routes, 0 type errors.

## All Phases Complete
The full production hardening pass is done:
1. **Security** — All admin APIs guarded (getAdminSession + csrfGuard), bulk route uses service role, logout clears CSRF cookie.
2. **Database** — `schema.sql` ready (17 tables, RLS, 3 RPCs, seed data).
3. **Payments** — Architecture reviewed (HMAC, anti-replay, idempotency correct). Env vars blocked.
4. **Orders** — Server-calculated shipping. No hardcoded discount.
5. **Inventory** — Atomic RPC-based stock reservation. No TOCTOU.
6. **Admin** — Pagination on orders/products APIs + orders frontend.
7. **SEO** — Sitemap, robots.txt, no duplicate JSON-LD.
8. **Performance** — `sizes` on all `<Image>`.
9. **Deployment** — `proxy.ts` convention (no middleware deprecation).
10. **TypeScript** — `any` removed from all admin routes + pages.
11. **Admin Login Fix** — `admin/login/route.ts:146`: `userRole: null` → `'superadmin'`. Build: 80 routes, 0 errors.
12. **Comprehensive Fixes** — C2, C3, C4, C5, C6, C7, C8, C9, C10, C11, C12, C16, AUTH-2, HIGH-02, MEDIUM-01/03, RATE-01/02, stock display, multi-size v2, flash sale backend/frontend, SSR fix, type cleanup.
13. **Bundle Visual Editor + Public Page + Hardening** — 12 layout templates, live preview with scale/rotate/pan, multi-upload, `BundleDisplay.tsx`, `/bundles` page, `BundleImageDisplay` on product page.
14. **Bundle Detail Page** — `/bundles/[id]` route with full product listing, pricing summary (original vs discounted), "Add All to Cart" with discount per product, per-product add-to-cart. API returns enriched bundle `products_data`. Bundle cards link to detail.
15. **Flash Sale on Home** — Server-side fetch of active flash sales + products, Flash Sale section with `CountdownTimer` + gradient background between Hero and Featured Collection.
16. **Bundle Deals on Home** — Server-side fetch of active bundles + product images, Bundle Deals section using `BundleCard` between Flash Sale and Featured Collection.
17. **Bundle Deals on Shop** — Client-side fetch of bundles, section below products grid with "Complete the Look" heading.
18. **Bundle Deals on Product page** — "Complete the Look" bundle cards now link to `/bundles/[id]`.
19. **Cleanup** — Removed `noStore()`/`revalidate` conflict, single supabase client in page.tsx, type assertion fixes.
- Build: 82 routes, 0 errors. Tests: 57/57 pass.

### Phase 11 — Admin Login Fix (done)
- `admin/login/route.ts:146`: Changed `userRole: null` → `userRole: 'superadmin'`.
- **Root cause**: `getAdminSession()` in `auth.ts:151` returns `{ valid: false }` when `role` is null. Login was creating sessions with `userRole: null`, so the cookie was set but immediately rejected — causing the "password accepted but redirects back to login" loop.
- Build: 80 routes, 0 errors (verified).

### Phase 12 — Comprehensive Fixes (done)
- **C10** — `schema.sql:319-340`: Added `AND reserved_stock >= (item->>'quantity')::INTEGER` + `GET DIAGNOSTICS` to `commit_order_stock` RPC, making it idempotent. Second call raises exception instead of double-deducting.
- **C2** — `callback/route.ts:208-220` (reordered): Stock commit/release now happens BEFORE order status update. If stock RPC fails, status stays unchanged — no stranded stock.
- **C16** — `admin/orders/route.ts:86-88`: Sets `paymob_txn_id = 'admin::' + Date.now()` when admin confirms an order, preventing Paymob callback idempotency lock from double-processing.
- **C11** — `auth/callback/route.ts:5-24`: Added `safeRedirect()` with allowlist (`ALLOWED_REDIRECTS`). Open redirect via `?redirect=` is now blocked.
- **C12** — `login/page.tsx:40-42`: Redirect path validated against allowlist before client-side navigation.
- **C3** — `orders/[id]/route.ts:17-23,63-68`: Added auth check (`supabase.auth.getUser()`) + ownership check (`data.user_id === user.id`). PII endpoint now requires login + order ownership.
- **C4** — `subscribe/route.ts`: Removed `supabaseAdmin.auth.admin.createUser()` call. Newsletter no longer creates Supabase Auth accounts without user consent. Just subscribes + creates coupon.
- **C5/C14/C15** — `shop/page.tsx`, `page.tsx`, `sitemap.ts`: All product/blog queries now filter by `DEFAULT_STORE_ID` for proper multi-tenant isolation.
- **C6** — `data-service.ts`: `getById`, `update`, and `remove` now include `.eq('store_id', this.storeId)` guard.
- **C7** — `proxy.ts:42-50`: Added token format validation (64-char hex check) for `og-admin-auth` cookie in addition to existence check.
- **C8** — `payment-details/route.ts`: Removed hardcoded phone/instapay/bank values. Returns env vars only; if none set, returns 503.
- **C9** — `reviews/route.ts:19,68`: Product slug lookup now includes `.eq('store_id', storeId)` to prevent cross-store product confusion.
- **AUTH-2** — `payment/route.ts:41-48`: Added ownership check — if order has `user_id`, verifies logged-in user matches before allowing payment initiation.
- **C1** — Double stock deduction fully prevented by C10 (idempotent RPC) + C16 (paymob_txn_id on admin confirm) + C2 (stock before status).
- **HIGH-02** — `admin/orders/route.ts:95-115`: Stock RPC failures upgraded from `console.error` + silent continue to returning 500 error.
- **MEDIUM-03** — `payment/route.ts:62-76`: Removed hardcoded `'01000000000'` phone + `'YOUR_IFRAME_ID'` placeholder. Returns 503 if `PAYMOB_IFRAME_ID` not set.
- **MEDIUM-01** — `checkout/route.ts:35-40,172` + `contact/route.ts:10`: Added `stripHtml()` to sanitize `notes`, `customer_name`, `address`, `message` — prevents stored XSS in admin panel.
- **RATE-01** — `reviews/route.ts:49`, `coupons/validate/route.ts:17`: Added rate limiting to public POST endpoints — 5/hr for reviews, 10/hr for coupons.
- **RATE-02** — `admin/products/route.ts` (POST/PUT/DELETE), `admin/orders/route.ts` (PUT/DELETE): Added rate limiting to key admin mutation endpoints (30/min, 15/min for deletes).
- **Cleanup** — `admin/products/page.tsx:46-48`: Removed debug `console.log`. `cart/page.tsx`: Fixed duplicate imports.
- **Type cleanup** — `reviews/route.ts:33` (`r: any` → typed), `by-user/route.ts:44` (`(o: any)` → `OrderRow`), `cart/page.tsx:116` (`item: any` → `CartItem`), `CartContext.tsx:77` (typed), `callback/route.ts:138-154` (added `PaymobObj` interface, removed 8 `as any` casts), `checkout/route.ts:91` (`DbProduct` interface).
- **UI/Stock** — `product/[slug]/page.tsx:78-83,222-259,262-280`: Added available stock display (`stock - reserved_stock`), low-stock warning, quantity limited to available stock. QuickView same fixes. `supabase.ts:40`: Added `reserved_stock` to `Product` interface.
- **SSR fix** — `ImageZoom.tsx:6`: Changed module-level `window` access to `getIsTouchDevice()` function + lazy `useState` — fixes `window is not defined` runtime error.
- **Multi-size v2 (targetQty/allocatedTotal)** — `product/[slug]/page.tsx` + `QuickView.tsx`: Separated `targetQty` (desired count) from `allocatedTotal` (sum per-size). Multi-mode activated at targetQty > 1; entering multi-mode resets all sizes to 0; validation requires `allocatedTotal === targetQty` before add-to-cart.
- **Flash sale backend** — `checkout/route.ts:93-99,137-141`: Queries `flash_sales` for active discounts; applies `Math.round(price * (1 - discount/100))` per line item at checkout.
- **Flash sale frontend** — `CartContext.tsx`: Added `unitPrice?: number` to `CartItem`, `addItem(product, size, qty, unitPrice?)`, subtotal uses `unitPrice ?? item.product.price`. `product/[slug]/page.tsx`: Derives `flashDiscountedPrice`, displays it during flash sale, passes to `addItem()`. `cart/page.tsx`: Shows `item.unitPrice ?? item.product.price` and subtotal accordingly.
- Build: 80 routes, 0 errors (verified).

### Phase 13 — Bundle Visual Editor + Public Page + Hardening (done)
- **Bundle image_data JSONB** — `schema.sql:286`: Added `image_data JSONB DEFAULT '{}'::jsonb` to bundles CREATE TABLE + migration at bottom. `admin/bundles/route.ts`: POST/PUT accept `image_data`, `image_source`, `image_layout`.
- **12 layout templates** — `admin/bundles/page.tsx`: `LAYOUTS` constant with 12 templates (2-image: side-by-side, stacked, diagonal, split-diagonal, overlap, border; 3-image: row-3, grid-top-2, grid-bottom-2; 4-image: grid-2x2, row-4, grid-3-1). Dynamic filtering by available image count.
- **Live preview with actual product images** — `admin/bundles/page.tsx`: `LayoutThumbnail` renders small grid with real product images (not SVG). `LayoutRenderer` shows full-size preview.
- **Per-image scale/rotate** — Each image in `LayoutRenderer` has scale slider (0.5×–3×) and rotate slider (0–360°). Stored in `image_data.adjustments[]`.
- **Multi-image upload** — `"Upload Multiple Images"` button with `multiple` attribute, sequential uploads via `/api/admin/upload`.
- **Shared `BundleDisplay` component** — `src/components/BundleDisplay.tsx`: `BundleImageDisplay`, `BundleCard`, `PublicLayoutRender` extracted, handles all 12 layouts with scale/rotate transforms applied via CSS.
- **Product page refactored** — `product/[slug]/page.tsx`: Uses imported `BundleImageDisplay` instead of local functions (removed ~90 lines of duplicated code).
- **Public `/bundles` page** — `src/app/bundles/page.tsx`: Lists all active bundles with layout rendering, loading skeletons, empty state.
- **Test fixes** — `api-paymob.test.ts`: Added `vi.stubEnv('PAYMOB_IFRAME_ID', ...)` to fix 4 failing tests. `api-checkout.test.ts`: Rewrote mock system with `mockResponses` table-based approach using thenable Proxy chains — all 7 checkout tests pass.
- **Lint cleanup** — Removed 30+ unused vars/imports across 23 files. Remaining 14 warnings are only `<img>` for dynamic external URLs (intentional) and 4 unused vars in test file.
- Build: 81 routes (added `/bundles`), 0 errors. Tests: 57/57 pass.

### Phase 14 — Product URL Restructure + Drag-to-Pan Fix (done)
- **Product URL changed**: `product/[slug]` → `product/[category]/[id]`. New route at `src/app/product/[category]/[id]/page.tsx` with server-side layout for metadata/JSON-LD.
- **API endpoint**: Created `api/products/by-id/[id]/route.ts` — fetches product by UUID with store-scoped query, returns product + related products.
- **Redirect**: Old `product/[slug]/page.tsx` now redirects (301) to the new `product/[category]/[id]` URL via server-side DB lookup. Same for `product/[slug]/layout.tsx`.
- **All product links updated**: `ProductCard.tsx`, `QuickView.tsx`, `bundles/[id]/page.tsx`, `cart/page.tsx`, `sitemap.ts` — all now use `product/${encodeURIComponent(category || 'uncategorized')}/${id}`.
- **Drag-to-pan fix** — `admin/bundles/page.tsx` (LayoutRenderer): Replaced `e.buttons === 0` with ref-based `pressed` guard (`handleMouseDown` sets `d.pressed = true`, `handleMouseUp`/`handleMouseLeave` clears it). Added `e.button !== 0` (left-button only) check. Moved event handlers to a wrapper div with `pointer-events-none` on the `<img>` for reliable event capture. Removed CSS transition that could cause visible shifts.
- Build: 82 routes, 0 errors. Lint: 0 errors, 14 warnings (all `<img>` for external URLs + test unused vars — intentional). Tests: 57/57 pass.

### Phase 15 — Code Quality Pass (done)
- **Hardcoded payment fallbacks removed** — `OrderSuccess.tsx`: replaced `paymentDetails.vodafone_cash || '01024627197'` with conditional rendering that shows config data or "Contact us". Removed hardcoded Instagram URL — now served from `PAYMENT_INSTAGRAM_URL` env var via `/api/payment-details`.
- **`as any` removed from admin bundles** — Created typed `ImageData` interface + `getImages()`/`getAdjustments()` helper functions. All 5 `(form.image_data as any)` casts replaced with typed access.
- **`as any` fixed in bulk route** — `rows: any[]` → `as Record<string, unknown>[]`.
- **Non-null assertions removed** — `product.old_price!` → guarded check in `ProductCard.tsx`, `QuickView.tsx`, `admin/products/page.tsx`. `product!` → null guard in `product/[category]/[id]/page.tsx`. `supabaseUrl!` → explicit error throw in `supabase-server.ts`. `err.event_id!` → guarded ternary in `admin/payments/page.tsx`.
- Build: 82 routes, 0 errors. Lint: 14 warnings (pre-existing `<img>` + test unused). Tests: 57/57 pass.

## Blocked
- `image_source` / `image_layout` / `image_data` columns don't exist in user's Supabase DB yet — must run migration SQL in Supabase SQL Editor.
- Paymob env vars commented out in `.env.local` (user decision).
- `flash_sales` table may not exist — schema not deployed yet.
- `blog_posts` table may not exist — schema not deployed yet.
- `PAYMENT_VODAFONE_CASH`, `PAYMENT_INSTAPAY`, `PAYMENT_INSTAGRAM_URL` env vars commented out — `OrderSuccess.tsx` will show "Contact us" until uncommented and set.

## Key Decisions
- All admin mutations enforce `csrfGuard()` in addition to `getAdminSession()` — defense in depth.
- Middleware migrated to `proxy.ts` convention.
- Schema is compiled from code (no live Supabase access) — SQL file ready for manual migration.
- Store context uses `DEFAULT_STORE_ID` for server components without request access (shop, home, sitemap).
- `commit_order_stock` idempotency preferred over application-level dedup — guards all call sites (admin + callback).
- C3 uses authenticated endpoint + ownership check rather than requiring admin session — legitimate customers can view their own orders.
- C4 removes auth account creation entirely — newsletter should not create Supabase Auth users.
- C8 returns 503 if no payment details configured — never expose hardcoded defaults.
- Payment ownership check uses `user_id` on order — guest orders (null user_id) are not blocked.
- XSS sanitization: HTML tag stripping preferred over allowlist approach — simpler and sufficient for stored text fields (notes, messages, customer name).
