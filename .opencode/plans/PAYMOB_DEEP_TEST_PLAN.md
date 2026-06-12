# 🧾 Paymob Deep Test Plan — OG Old Gold

## 1. Executive Summary

**حالة بوابة الدفع: تحتاج إصلاحات قبل الاختبار — غير آمنة للإطلاق حاليًا**

| العنصر | الحالة |
|--------|--------|
| الدفع بالبطاقة (Paymob) | ⛔ معطّل — `csrfGuard()` يمنع كل الطلبات (bug) |
| الدفع اليدوي (Vodafone Cash / InstaPay) | ✅ شبه جاهز (يدوي) |
| الدفع عند الاستلام (COD) | ✅ جاهز |
| الأمان | ⚠️ يوجد bug خطير في CSRF |
| UX | ✅ جيد — تحسينات F5-F6 مُطبّقة |
| Build / Tests | ✅ 81 routes, 57/57 pass |

---

## 2. خريطة التدفق الكامل لكل طريقة دفع

### 2.1 الدفع بالبطاقة (`payment_method: "paymob"`)

```
[المستخدم يملأ الفورم] → POST /api/checkout
                                    │
                                    ├─ 201 { orderId } ← CSRF cookie لا يُعيَّن هنا!
                                    │
                         POST /api/paymob/payment
                                    │
                           ┌─────── csrfGuard() ─────────────┐
                           │  يفحص csrf-token cookie + header │
                           │  ⛔ كلاهما مفقود → 403 FORBIDDEN │
                           └─────────────────────────────────┘
                                    │
                            (السطر لا يصل أبدًا)
                        │
            ولو وصل: gets paymentKey → Paymob iframe
                                    │
              المستخدم يدفع ← Paymob redirect GET /api/paymob/callback
                                    │
                            ┌── POST webhook (HMAC) ──┐
                            │  (قد لا يصل في dev mode) │
                            └─────────────────────────┘
                                    │
                            commit_order_stock
                            idempotency lock
                            update status → confirmed
                            coupon increment
                                    │
                        redirect → /order-success
```

### 2.2 الدفع اليدوي (`payment_method: "online_transfer"`)

```
[المستخدم يملأ الفورم] → POST /api/checkout
                                    │
                        ┌────────── 201 { orderId } ──────────────┐
                        │  لا يوجد تفاعل مع Paymob API             │
                        │  لا داعي لـ /api/paymob/payment          │
                        └──────────────────────────────────────────┘
                                    │
        عرض OrderSuccess مع تعليمات التحويل (Vodafone Cash + InstaPay)
                                    │
        [المستخدم يرسل إيصال التحويل عبر Instagram] ← يدوي بالكامل
                                    │
        [التاجر يؤكد الطلب يدويًا من لوحة الإدارة]
```

### 2.3 الدفع عند الاستلام (`payment_method: "cash_on_delivery"`)

```
[المستخدم يملأ الفورم] → POST /api/checkout → 201 { orderId }
                                    │
                        عرض OrderSuccess مع رسالة COD
                                    │
        [التاجر يؤكد الطلب بعد التسليم يدويًا]
```

---

## 3. جدول طرق الدفع

| الطريقة | المعرف (payment_method) | مدعومة من Paymob API؟ | القرار المقترح |
|---------|------------------------|----------------------|---------------|
| بطاقة (Visa/Mastercard/Meeza) | `paymob` | ✅ نعم — عبر Paymob Egypt Accept (iframe) | **إبقاء — مع إصلاح CSRF bug** |
| تحويل بنكي (Vodafone Cash / InstaPay) | `online_transfer` | ❌ لا — يدوي بالكامل | **إبقاء كيدوي — إعادة تسمية التوضيح** |
| الدفع عند الاستلام | `cash_on_delivery` | ❌ لا — ليس بوابة دفع | **إبقاء** |

**ملاحظة مهمة على `online_transfer`**: الكود الحالي لا يستخدم Paymob API لهذا الخيار. هو مجرد عرض تعليمات تحويل يدوية (Vodafone Cash: `PAYMENT_VODAFONE_CASH` و InstaPay: `PAYMENT_INSTAPAY`). ليس هناك تكامل API مع InstaPay أو أي محفظة إلكترونية.

### Paymob Egypt — الدعم الفعلي لطرق الدفع

| الطريقة | مدعومة من Paymob | تتطلب integration_id منفصل |
|---------|------------------|---------------------------|
| Visa/Mastercard (Card) | ✅ نعم | ✅ `PAYMOB_INTEGRATION_ID` (موجود: 5654553) |
| Vodafone Cash (Wallet) | ✅ نعم — عبر Paymob Wallet | ✅ تحتاج integration_id منفصل (غير موجود في الكود) |
| InstaPay | ✅ نعم — عبر Paymob Wallet | ✅ تحتاج integration_id منفصل (غير موجود في الكود) |
| COD | ❌ لا — ليس خدمة Paymob | — |

**خلاصة**: `online_transfer` حاليًا هو **يدوي** فقط. لتحويله إلى تكامل API حقيقي، سيحتاج:
- Integration ID منفصل لكل طريقة دفع (Vodafone Cash, InstaPay)
- تعديل `paymob.ts` لاستخدام integration_id مختلف أو تمرير `payment_methods` في طلب payment key
- تعديل `payment/route.ts` لإرسال integration_id المناسب بناءً على طريقة الدفع المختارة

---

## 4. قائمة المشاكل الأمنية

### 🔴 [CRITICAL] CSRF Bug يمنع الدفع بالبطاقة بالكامل

| الحقل | القيمة |
|-------|--------|
| **الملف** | `src/app/api/paymob/payment/route.ts:10-11` |
| **الوصف** | `csrfGuard()` يتطلب `csrf-token` cookie + `x-csrf-token` header. لكن CSRF cookie لا يُعيَّن أبدًا للمستخدمين العاديين. `checkout/route.ts` يستخدم `NextResponse.json()` (سطر 260) بدلاً من `safeJson()`، لذا لا يوجد `csrf-token` cookie في أي استجابة. |
| **النتيجة** | كل طلب POST إلى `/api/paymob/payment` يرجع 403. |
| **الخطورة** | 🔴 **حرجة** — الدفع بالبطاقة معطّل تمامًا. |
| **الإصلاح المقترح** | أحد الخيارات: |
| | 1. إزالة `csrfGuard()` من payment route (لأن payment route يتطلب orderId صالح من checkout API — CSRF لا يضيف قيمة أمنية كبيرة) |
| | 2. أو جعل `checkout/route.ts` يستخدم `safeJson()` ليعيّن CSRF cookie، مع جعل العميل يقرأ `x-csrf-token` من الاستجابة ويرسله في الطلب التالي |
| | 3. أو إنشاء endpoint منفصل لإعطاء CSRF token للعميل قبل الدفع |

### 🟡 [MEDIUM] GET callback لا يتحقق من HMAC

| الحقل | القيمة |
|-------|--------|
| **الملف** | `src/app/api/paymob/callback/route.ts:261-334` |
| **الوصف** | GET handler (المستخدم لتوجيه المستخدم بعد الدفع) لا يتحقق من أي توقيع. يعتمد على أن Paymob فقط من يعرف `merchant_order_id`. |
| **المخاطرة** | منخفضة — لأن `merchant_order_id` هو UUID عشوائي، و POST handler الأصلي لديه HMAC. لكن من الممكن spoof لو عرف المهاجم orderId صالح. |
| **الإصلاح المقترح** | إضافة `origin` / `referer` check في GET handler (يجب أن يأتي فقط من Paymob domain). لكن هذا ليس ضروريًا لأن idempotency lock يمنع الضرر. |

### 🟢 [OK] نقاط أمان أخرى

| النقطة | الحالة | الموقع |
|--------|--------|--------|
| Amount Verification | ✅ صحيح — يُقارن مع order.total من DB | `payment/route.ts:54-58` |
| Idempotency (checkout) | ✅ `idempotency_key` يُمرّر ويُحفظ | `checkout/route.ts:49-55, 255-257` |
| Idempotency (callback) | ✅ `.is('paymob_txn_id', null)` | `callback/route.ts:230` (POST) و `:307` (GET) |
| HMAC Verification | ✅ SHA-512 HMAS | `callback/route.ts:134-148` |
| Rate Limiting | ✅ fail-closed مع ذاكرة احتياطية | `rate-limit.ts`, `checkout/route.ts:31-35`, `payment/route.ts:15-19` |
| Env Vars | ✅ جميع متغيرات Paymob مفعلة | `.env.local:38-41` |
| XSS Sanitization | ✅ `stripHtml()` على notes/name/address | `checkout/route.ts:38,42-43` |
| Ownership Check | ✅ user_id verification | `payment/route.ts:46-52` |
| Anti-Replay | ✅ timestamp window 5 min | `callback/route.ts:162-168` |

---

## 5. قائمة مشاكل UX / التصميم

### 🔴 [HIGH] CSRF يمنع الدفع — المستخدم يرى 403 بدون رسالة

عند اختيار الدفع بالبطاقة، `paymobError` سيحتوي على `"Payment initiation failed"` (من `payment/route.ts:92` أو `checkout/page.tsx:180`). المستخدم لن يفهم المشكلة — سيظن أن الموقع معطّل.

### 🟡 [MEDIUM] paymentMethod type cast

| الملف | السطر | المشكلة |
|-------|-------|---------|
| `checkout/page.tsx` | 340 | `onChange={() => setPaymentMethod(option.value as any)}` — استخدم `as 'paymob' \| 'cash_on_delivery' \| 'online_transfer'` بدلاً من `as any` |

### 🟢 [OK] نقاط UX جيدة

| النقطة | الحالة |
|--------|--------|
| زر submit يُعطّل (disabled) أثناء التحميل | ✅ `disabled={loading}` سطر 357 |
| شاشة "Redirecting to payment gateway..." | ✅ أضيفت في F5, سطر 252-261 |
| رسالة خطأ payment-details غير متاحة | ✅ أضيفت في F5, سطر 350-352 |
| تعليمات الدفع تظهر فقط لـ `online_transfer` | ✅ `OrderSuccess.tsx:77-112` |
| رسالة نجاح البطاقة منفصلة | ✅ `OrderSuccess.tsx:84-89` |

---

## 6. خطة الإصلاحات المقترحة

### 6.1 إصلاح CSRF — الخيار الموصى به

**إزالة `csrfGuard()` من `/api/paymob/payment`** لأن:
1. لا توجد آلية لتوزيع CSRF token للمستخدمين العاديين حاليًا
2. Payment route لديه بالفعل Rate Limiting + Amount Verification + Ownership Check + Order Status Check
3. بناء CSRF token flow كامل للمستخدمين العاديين (غير المسجلين) يستغرق وقتًا طويلاً وليس ضروريًا لهذا السياق

**الملفات المتأثرة**:
- `src/app/api/paymob/payment/route.ts` — إزالة `csrfGuard` call و import

### 6.2 تحسين الـ GET callback (اختياري)

- إضافة `origin` check للتأكد من أن الطلب من Paymob domains
- **الملف**: `src/app/api/paymob/callback/route.ts`

### 6.3 إعادة تسمية `online_transfer` (اختياري)

- تغيير النص من `"Online Transfer (Vodafone Cash / InstaPay)"` إلى `"Bank Transfer (Vodafone Cash / InstaPay)"` لتوضيح أنه تحويل يدوي وليس دفع فوري

**الملفات المتأثرة**:
- `src/app/checkout/page.tsx:330`

### 6.4 إصلاح `as any` في paymentMethod (اختياري)

**الملفات المتأثرة**:
- `src/app/checkout/page.tsx:340`

### 6.5 ترتيب أولويات الإصلاحات (Required vs Optional)

| الأولوية | الإصلاح | ملفات | هل هو ضروري للإطلاق؟ |
|----------|---------|-------|---------------------|
| P0 | إزالة csrfGuard من payment route | `payment/route.ts` | ✅ **نعم** — بدونه الدفع بالبطاقة معطل |
| P1 | إعادة تسمية `online_transfer` | `checkout/page.tsx` | ❌ اختياري — توضيح فقط |
| P2 | إصلاح `as any` | `checkout/page.tsx` | ❌ اختياري — نوع TypeScript فقط |
| P3 | Origin check في GET callback | `callback/route.ts` | ❌ اختياري — أمان إضافي |

---

## 7. الاستنتاج النهائي

### هل InstaPay سيبقى أم يُزال؟

**يبقى** — كخيار تحويل يدوي (`online_transfer`). التوصية:

1. إعادة تسمية الخيار إلى `"Bank Transfer (Vodafone Cash / InstaPay)"` بدلاً من `"Online Transfer"` لتكون أكثر دقة
2. يعرض تعليمات التحويل بعد الطلب (رقم Vodafone Cash و InstaPay address)
3. المستخدم يرسل إيصال التحويل عبر Instagram يدويًا (يظهر زر "Confirm on Instagram" في OrderSuccess)

### ما مصير المحافظ اليدوية؟

- **تبقى كيدوي** — إذا أراد التاجر مستقبلًا تفعيل الدفع الفوري عبر Vodafone Cash أو InstaPay، سيحتاج:
  1. الحصول على Wallet Integration IDs من Paymob dashboard
  2. إضافة منطق `getPaymentKey` مع integration_id مختلف لكل طريقة
  3. تعديل `checkout/route.ts` و `payment/route.ts` ليتعامل مع طرق الدفع المتعددة
  4. هذه مهمة مستقلة (مرحلة تالية) — ليست ضرورية للإطلاق

### الخلاصة

```diff
+ ✅ COD: جاهز تمامًا
+ ✅ Online Transfer (يدوي): جاهز — env vars مفعلة
- ⛔ Paymob Card: معطل — CSRF bug يمنع كل الطلبات
```

قبل أي اختبار للدفع بالبطاقة، يجب إزالة `csrfGuard()` من `/api/paymob/payment`. بعد الإصلاح:
- Paymob في production: يعمل عبر webhook HMAC
- Paymob في dev: يعمل عبر GET handler (المُحسَّن في F4)
