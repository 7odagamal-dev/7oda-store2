# FINAL FIX EXTENDED REPORT — OG Old Gold (CSP / XSS)

**Date:** 2026-06-04  
**Phase:** XSS / CSP hardening  
**Build:** ✅ Compiled successfully, 0 type errors, 79 routes  
**Tests:** ✅ 57/57 passing (7 test files)

---

## Executive Summary

Six security issues were identified and fixed, focusing on Content Security Policy (CSP) hardening, XSS prevention in blog content, missing HSTS, and a tabnabbing vulnerability. The CSP now includes `frame-src` for Paymob iframe, `form-action` and `base-uri` restrictions, and Paymob API domains in `connect-src`. Blog HTML content is sanitized both on save (API route) and on render (blog page) using `sanitize-html`. HSTS header added for HTTPS enforcement. A `target="_blank"` link without `rel="noopener noreferrer"` was fixed.

---

## Issue Matrix

| # | Issue | Severity | File | Status |
|---|-------|----------|------|--------|
| 1 | CSP missing `frame-src` for Paymob iframe | 🔴 Critical | `next.config.ts` | ✅ Fixed |
| 2 | CSP missing `connect-src` for Paymob API | 🔴 High | `next.config.ts` | ✅ Fixed |
| 3 | Missing HSTS (`Strict-Transport-Security`) | 🟠 High | `next.config.ts` | ✅ Fixed |
| 4 | Blog `dangerouslySetInnerHTML` without HTML sanitization | 🔴 High | `blog/route.ts`, `blog/[slug]/page.tsx` | ✅ Fixed |
| 5 | CSP missing `form-action` + `base-uri` | 🟡 Medium | `next.config.ts` | ✅ Fixed |
| 6 | `target="_blank"` without `rel="noopener noreferrer"` | 🟢 Low | `OrderSuccess.tsx` | ✅ Fixed |

---

## Detailed Fix Documentation

### Issue 1 & 2 & 5: CSP Enhancement — `frame-src`, `connect-src`, `form-action`, `base-uri`

**File:** `next.config.ts:3-18`

**Root cause:** The CSP had no `frame-src` directive, so Paymob's iframe (`https://accept.paymob.com/api/acceptance/iframes/...`) would be blocked by the browser. The `connect-src` only allowed Supabase — Paymob API calls from browser would be blocked. Missing `form-action` and `base-uri` left the site vulnerable to form-jacking and base tag injection attacks.

**Before CSP:**
```
default-src 'self'
script-src 'self' 'unsafe-inline'
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com
font-src 'self' https://fonts.gstatic.com
img-src 'self' data: blob: https:
connect-src 'self' https://*.supabase.co
worker-src 'self' blob:
frame-ancestors 'none'
```

**After CSP:**
```
default-src 'self'
script-src 'self' 'unsafe-inline'
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com
font-src 'self' https://fonts.gstatic.com
img-src 'self' data: blob: https:
connect-src 'self' https://*.supabase.co https://accept.paymob.com https://*.paymob.com
frame-src 'self' https://accept.paymob.com
frame-ancestors 'none'
form-action 'self'
base-uri 'self'
worker-src 'self' blob:
```

**Key changes:**
1. `frame-src 'self' https://accept.paymob.com` — allows embedding Paymob payment iframe
2. `connect-src` extended with `https://accept.paymob.com https://*.paymob.com` — allows Paymob API calls
3. `form-action 'self'` — restricts form submission to same origin only
4. `base-uri 'self'` — prevents `<base>` tag injection attacks

---

### Issue 3: Missing HSTS Header

**File:** `next.config.ts:21`

**Root cause:** No `Strict-Transport-Security` header was set. Users could be downgraded to HTTP via man-in-the-middle attacks.

**Before:** (absent from `securityHeaders`)

**After:**
```javascript
{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' }
```

---

### Issue 4: Blog HTML XSS — Server-Side Sanitization

**Files:**
- `src/app/api/admin/blog/route.ts` — API route (save)
- `src/app/blog/[slug]/page.tsx` — public page (render)

**Root cause:** The blog API's `sanitize()` function only trimmed and truncated string length. It did **not** strip HTML tags. Blog content with `<script>` tags or event handlers (`onclick`, `onerror`) would be stored as-is and rendered with `dangerouslySetInnerHTML`, creating a stored XSS vulnerability.

**Before (`sanitize` function in `blog/route.ts:47-49`):**
```typescript
function sanitize(str: string, max = 5000): string {
  return str.trim().slice(0, max);
}
```

**After — new `sanitizeBlogContent` function:**
```typescript
import sanitizeHtml from 'sanitize-html';

function sanitizeBlogContent(str: string): string {
  return sanitizeHtml(str, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(
      ['img', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'figure', 'figcaption', 'hr']
    ),
    allowedAttributes: {
      a: ['href', 'target', 'rel'],
      img: ['src', 'alt', 'width', 'height', 'loading'],
      '*': ['class', 'id'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    disallowedTagsMode: 'discard',
    allowedSchemesByTag: { img: ['https', 'data'] },
  });
}
```

**Usage in POST (`blog/route.ts:65`):**
```typescript
const content = sanitizeBlogContent(sanitize(body.content ?? '', 50000));
```

**Usage in PUT (`blog/route.ts:136`):**
```typescript
if (body.content !== undefined) updates.content = sanitizeBlogContent(sanitize(body.content, 50000));
```

**Defense-in-depth on render (`blog/[slug]/page.tsx`):**
Added identical `sanitizeHtml` call on `post.content` before passing to `dangerouslySetInnerHTML`:
```typescript
const safeContent = sanitizeHtml(post.content, { /* same config */ });
// ...
dangerouslySetInnerHTML={{ __html: safeContent }}
```

**Tags that ARE allowed:** `h1`-`h6`, `p`, `br`, `strong`, `em`, `a`, `img`, `ul`, `ol`, `li`, `blockquote`, `pre`, `code`, `figure`, `figcaption`, `hr`, and other basic formatting tags.

**Tags that are STRIPPED:** `script`, `style`, `iframe`, `object`, `embed`, `form`, `input`, `textarea`, `button`, `select`, `marquee`, `meta`, `link`, `base`, etc.

**Attributes that are STRIPPED:** All event handlers (`onclick`, `onerror`, `onload`, `onmouseover`, etc.), `style`, `javascript:` URIs, `data:` URIs (except for images).

---

### Issue 6: Tabnabbing — Missing `rel="noopener noreferrer"`

**File:** `src/components/OrderSuccess.tsx:107`

**Root cause:** The Instagram link used `target="_blank"` without `rel="noopener noreferrer"`. The opened page could access `window.opener` and redirect the original tab to a phishing site.

**Before:**
```tsx
<a href="https://www.instagram.com/..." target="_blank" className="...">
```

**After:**
```tsx
<a href="https://www.instagram.com/..." target="_blank" rel="noopener noreferrer" className="...">
```

---

## Files Modified

| File | Change |
|------|--------|
| `next.config.ts` | Added `frame-src`, `connect-src` (Paymob), `form-action`, `base-uri` to CSP + HSTS header |
| `src/app/api/admin/blog/route.ts` | Added `sanitizeBlogContent()` using `sanitize-html` for content field in POST/PUT |
| `src/app/blog/[slug]/page.tsx` | Added `sanitizeHtml` on render as defense-in-depth |
| `src/components/OrderSuccess.tsx` | Added `rel="noopener noreferrer"` to Instagram link |

## Dependencies Added

| Package | Version | Purpose |
|---------|---------|---------|
| `sanitize-html` | latest | HTML sanitization for blog content |
| `@types/sanitize-html` | latest | TypeScript types |

---

## Updated Risk Matrix

| Risk Area | Before | After | Residual Risk |
|-----------|--------|-------|---------------|
| Paymob iframe blocked by CSP | Critical | None | None |
| Blog stored XSS via admin compromise | Critical | None | Low (sanitizer config must be maintained) |
| HTTPS downgrade (missing HSTS) | High | None | None |
| Form-jacking (no `form-action`) | Medium | None | None |
| Base tag injection (no `base-uri`) | Medium | None | None |
| Tabnabbing (`target="_blank"`) | Low | None | None |

---

## Verification Tests

### Manual Tests

1. **Paymob iframe**: Visit checkout → select card payment → verify Paymob iframe loads without CSP console errors
2. **CSP headers**: `curl -I https://example.com | findstr "Content-Security-Policy"` — verify `frame-src`, `form-action`, `base-uri` present
3. **HSTS**: `curl -I https://example.com | findstr "Strict-Transport-Security"` — verify `max-age=31536000; includeSubDomains`
4. **Blog XSS**: Create blog post with `<script>alert(1)</script>` in content → verify script is stripped when saved and when rendered
5. **Blog safe HTML**: Create blog post with `<p>Hello</p><strong>Bold</strong>` → verify HTML formatting preserved
6. **Instagram link**: Inspect element → verify `rel="noopener noreferrer"` on the anchor tag

### Automated Tests

Run `npm test` — all 57 tests must pass:
```
✓ tests/idempotency.test.ts (5 tests)
✓ tests/admin-fetch.test.ts (4 tests)
✓ tests/rate-limit.test.ts (12 tests)
✓ tests/csrf.test.ts (12 tests)
✓ tests/auth.test.ts (9 tests)
✓ tests/api-paymob.test.ts (8 tests)
✓ tests/api-checkout.test.ts (7 tests)
```

---

## Next Steps

1. **Deploy `schema.sql`** to Supabase SQL Editor (if not already done) — enables RPCs (`reserve_order_stock`, `atomic_increment_coupon`, etc.)
2. **Un-comment Paymob env vars** in `.env.local` — replace placeholder values with real Paymob API keys
3. **Production deploy** — `npm run build` then deploy to Vercel/your hosting provider
4. **Monitor CSP reports** — add `report-uri` or `report-to` directive to CSP once a reporting endpoint is available
5. **Consider `nonce`-based CSP** — for stricter XSS protection, migrate from `'unsafe-inline'` to per-request nonces (requires application-wide changes)

---

_Report generated after completing all 6 XSS/CSP fixes. Build verified: ✅ 79 routes, 0 errors. Tests: ✅ 57/57 passing._
