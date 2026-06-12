# 🔍 تقرير التحليل الشامل — المشاكل الحالية

## 1️⃣ Hydration Mismatch في Header

**السبب**: ThemeProvider في `ThemeContext.tsx:41`:
```tsx
if (!mounted) return <>{children}</>;
```

السيرفر يـرندر بدون `<ThemeContext.Provider>`، وعند الـ Hydration على العميل، React تبدأ المطابقة. الـ `@sentry/nextjs` يضيف Wrapper على المكونات مما يسبب تغيير في ترتيب شجرة المكونات بين السيرفر والعميل.

**النتيجة**: اللينكات "Blog" و "Wishlist" يتبادلان المواقع أثناء الـ Hydration.

**الحل**: إزالة شرط `mounted` من ThemeProvider واستخدام `useEffect` فقط لتعديل `classList` بعد التحميل.

## 2️⃣ Track Page — Authentication مطلوبة

**السبب**: `api/orders/[id]/route.ts:17-22`:
```typescript
const { data: { user } } = await supabase.auth.getUser();
if (!user) {
  return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
}
```

هذا الكود يمنع **أي زائر غير مسجل** من البحث عن طلباته. الـ Track page يعتمد على هذا الـ API.

**الحل**: السماح للزوار غير المسجلين بالبحث عن الطلبات عبر `orderId` فقط، مع الإبقاء على التحقق من `user_id` فقط لو الطلب له مالك مسجل.

## 3️⃣ الدفع — يحتاج تدقيق بعد الإصلاحات

بعد إزالة `csrfGuard` من `payment/route.ts`، الدفع بالبطاقة يجب أن يعمل. لكن خلينا نتأكد بعد حل المشاكل أعلاه.

---

## خطة الإصلاح (مقترحة)

### الخطوة 1: إصلاح ThemeProvider
- **الملف**: `src/context/ThemeContext.tsx`
- إزالة `if (!mounted) return <>{children}</>`
- تحريك منطق dark mode إلى `useEffect` فقط

### الخطوة 2: إصلاح Track API
- **الملف**: `src/app/api/orders/[id]/route.ts`
- إزالة شرط `user` الإلزامي
- الإبقاء على التحقق لو الطلب له `user_id` (ownership check فقط)

### الخطوة 3: Build + Test
- تأكيد 81 routes, 0 errors
- تأكيد 57/57 tests

---

عايز توافق على الخطة عشان أبدأ التنفيذ؟