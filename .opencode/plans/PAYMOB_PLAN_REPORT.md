# PAYMOB_PLAN_REPORT — Paymob Payment Gateway Comprehensive Audit
**Date:** 2026-06-09 | **Status:** PAUSED (Plan Mode)

---

## 1. ملخص تنفيذي

| المنطقة | الحالة |
|---------|--------|
| تدفق الدفع الأساسي 🏗️ | **قيد التشغيل** — الـ 3 RPCs تم إصلاحها لتطابق `inventory_log` الفعلي |
| Paymob API Integration | **غير مكتمل** — webhook لا يصل في dev mode + env vars معلقة |
| الأمان 🔐 | **جيد جداً** — HMAC, anti-replay, idempotency lock, amount verification موجودة |
| الـ UX | **يحتاج تحسين** — لا مؤشر تحميل قبل redirect + CSRF مفقود على routes الدفع |
| **الخلاصة** | يحتاج **6 إصلاحات عاجلة** و **4 تحسينات** قبل الإنتاج |

---

## 2. خريطة التدفق الحالي

```
[User clicks "Place Order"]
        │
        ├── paymob? ─────────► POST /api/checkout (create order + reserve stock)
        │                          │
        │                          ▼
        │                    POST /api/paymob/payment
        │                    1. getAuthToken()      ──► Paymob /auth/tokens
        │                    2. createOrder()        ──► Paymob /ecommerce/orders
        │                    3. getPaymentKey()       ──► Paymob /acceptance/payment_keys
        │                          │
        │                          ▼
        │                    Redirect to Paymob iframe
        │                    [User enters card]
        │                          │
        │                    Paymob webhook POST ──► /api/paymob/callback
        │                    1. HMAC (SHA-512)
        │                    2. Anti-replay (5 min)
        │                    3. Write payment_events
        │                    4. Verify order + amount
        │                    5. Validate state transition
        │                    6. commitOrderStock (RPC)
        │                    7. Idempotency lock
        │                    8. Coupon increment
        │                          │
        │                    Redirect to /order-success
        │
        ├── online_transfer? ──► POST /api/checkout
        │                          │
        │                          ▼
        │                    OrderSuccess (manual transfer details)
        │
        └── cash_on_delivery? ──► POST /api/checkout
                                   │
                                   ▼
                             OrderSuccess (COD message)
```

---

## 3. طرق الدفع الحالية

| الطريقة | المعرف البرمجي | مدعومة من Paymob؟ | الحالة |
|---------|---------------|-------------------|--------|
| **Online Transfer (Vodafone Cash / InstaPay)** | `online_transfer` | ❌ لا (يدوي) | ⚠️ شغال يدوي — بيظهر رقم الحساب للتحويل |
| **Pay with Card (Visa/Mastercard)** | `paymob` | ✅ نعم (iframe) | 🔴 مش شغال في dev (webhook لا يصل) |
| **Cash on Delivery** | `cash_on_delivery` | ❌ لا | ✅ تمام |

**ملاحظة:** InstaPay في الواجهة هو مجرد تعليمات لتحويل يدوي — ليس تكامل Paymob API. Paymob لا تدعم InstaPay كطريقة دفع API مباشرة.

---

## 4. فحص الأمان — جدول كامل

| النقطة | الموقع | الحالة | ملاحظات |
|--------|--------|--------|---------|
| Amount verification (server-side) | `payment/route.ts:51-55` | ✅ | يقارن مع `order.total` من DB |
| HMAC verification | `callback/route.ts:134-148` | ✅ | SHA-512 مع `PAYMOB_HMAC_SECRET` |
| Anti-replay (timestamp) | `callback/route.ts:163-168` | ✅ | نافذة 5 دقائق |
| Idempotency lock | `callback/route.ts:229-230` | ✅ | `.is('paymob_txn_id', null)` |
| Idempotency key (checkout) | `checkout/route.ts:50-55` | ✅ | 24h TTL + cleanup |
| Rate limiting | `payment/route.ts:11-15` | ✅ | 5/min لكل IP |
| **CSRF على payment route** | `payment/route.ts` | 🔴 **مفقود** |
| **CSRF على callback route** | `callback/route.ts` | 🔴 **مفقود** | HMAC يعوض جزئياً في POST |
| Store isolation | `checkout/route.ts:90` | ✅ | `.eq('store_id', storeId)` |
| Ownership check | `payment/route.ts:42-48` | ✅ | user_id مطابقة |
| XSS prevention | `checkout/route.ts:38-43` | ✅ | stripHtml() |
| Fail-closed rate limit | `rate-limit.ts:64-68` | ✅ | DB down → in-memory |
| Service role usage | كل routes | ✅ | supabaseAdmin |
| **Payment env vars** | `.env.local:44-46` | 🔴 **معلقين** |

---

## 5. المشاكل المكتشفة

### 🔴 حرجة (4)

| # | المشكلة | الموقع |
|---|---------|--------|
| C1 | **`JSON.stringify(items)` في 4 RPC calls** | `reconciliation/route.ts:104,111,207,212` |
| C2 | **Env vars payment details معلقة** | `.env.local:44-46` |
| C3 | **Paymob webhook لا يصل في dev mode** | `callback/route.ts` (localhost) |
| C4 | **GET handler لا يcommit stock** | `callback/route.ts:261-270` (redirect only) |

### 🟡 عالية (4)

| # | المشكلة | الموقع |
|---|---------|--------|
| H1 | **لا CSRF على payment routes** | `payment/route.ts`, `callback/route.ts` |
| H2 | **لا idempotency على payment initiation** | `payment/route.ts:59-76` — ضغط مزدوج يخلق Paymob orders مكررة |
| H3 | **shipping_cost يُرسل من العميل** | `checkout/page.tsx:145,195` (لكن السيرفر لا يستخدمه) |
| H4 | **Coupon increment deferred = TOCTOU** | `checkout/route.ts:253` — الكوبون لا يزاد عند الشراء |

### 🟢 متوسطة (3)

| # | المشكلة | الموقع |
|---|---------|--------|
| M1 | **لا مؤشر تحميل قبل redirect Paymob** | `checkout/page.tsx:176-178` |
| M2 | **Payment-details API فشل صامت** | `checkout/page.tsx:62` — `.catch(() => {})` |
| M3 | **amount_cents قد يختلف بين createOrder و paymentKey** | `paymob.ts:35,68` |

---

## 6. خطة الإصلاحات (10 تعديلات)

### 6.1 الكود (8)

| # | الأولوية | الملف | التعديل |
|---|---------|-------|---------|
| F1 | 🔴 | `reconciliation/route.ts:104,111,207,212` | `JSON.stringify(items)` → `items` (4 أماكن) |
| F2 | 🔴 | `.env.local:44-46` | شيل `#` من 3 env vars |
| F3 | 🔴 | `callback/route.ts:261-270` | GET handler يعمل commitOrderStock + تحديث حالة الطلب |
| F4 | 🟡 | `payment/route.ts` | إضافة `csrfGuard()` |
| F5 | 🟡 | `payment/route.ts:59` | إضافة idempotency key على payment initiation |
| F6 | 🟢 | `checkout/page.tsx:176-178` | إضافة مؤشر "Redirecting..." قبل `window.location.href` |
| F7 | 🟢 | `checkout/page.tsx:62` | عرض رسالة لو payment details مش متوفرة |
| F8 | 🟢 | `paymob.ts:68` | إضافة `callback_url` في getPaymentKey |

### 6.2 SQL (1)

| # | الأولوية | الملف | التعديل |
|---|---------|-------|---------|
| F9 | 🔴 | `schema.sql` | تشغيل في Supabase SQL Editor (إنشاء الجداول + RPCs + migrations) |

### 6.3 يدوي (1)

| # | الأولوية | الإجراء |
|---|---------|---------|
| F10 | 🟡 | ضبط `merchant_redirect_url` في Paymob Dashboard للـ production URL |

---

## 7. الملفات المتأثرة

| الملف | نوع التعديل |
|-------|-------------|
| `.env.local` | شيل `#` من 3 env vars |
| `src/app/api/paymob/callback/route.ts` | GET handler logic |
| `src/app/api/paymob/payment/route.ts` | CSRF + idempotency |
| `src/app/api/admin/reconciliation/route.ts` | JSON.stringify → items (4x) |
| `src/app/checkout/page.tsx` | UX تحسين |
| `src/lib/paymob.ts` | callback_url إضافة |
| `schema.sql` | تشغيل في Supabase |
| `tests/api-paymob.test.ts` | إضافة callback tests |

---

## 8. توصيات نهائية

1. **فوراً** — شيل `#` من env vars عشان Vodafone Cash يشتغل
2. **فوراً** — شغّل `schema.sql` في Supabase SQL Editor
3. **فوراً** — عدّل `reconciliation/route.ts` — JSON.stringify لسه موجود في 4 أماكن
4. **قبل الإنتاج** — أضف CSRF على routes الدفع
5. **للتطوير** — استخدم `ngrok http 3000` لفضح localhost — Paymob webhook هيشتغل
6. **بعد deployment** — كل حاجة هتشتغل تلقائياً
