# تقرير المشاكل المتبقية — OG Old Gold

> مشاكل الأمن تم إصلاحها في هذه النسخة. الملفات دي بتتكلم عن المشاكل الفنية اللي لسه محتاجة تصليح.

---

## 🐛 المشاكل الفنية

### 1. Base64 Image Upload — كفاءة منخفضة
**الملف:** `src/app/admin/products/page.tsx` — `handleFileUpload()`  
**المشكلة:** لما الأدمن يرفع صورة من جهازه، الكود بيحولها لـ base64 string وبيحطها مباشرة في الـ database. ده بيعمل مشكلتين:
- حجم الـ database بيكبر بشكل غير طبيعي (صورة 200KB بتبقى 270KB+ في base64)
- تحميل الصور بيبقى بطيء جداً لأن الصور بتتنزل مع كل response

**الحل الصح:** استخدم Supabase Storage بدل كده
```typescript
// بدل FileReader + base64:
const { data, error } = await supabase.storage
  .from('product-images')
  .upload(`products/${Date.now()}-${file.name}`, file);
const { data: urlData } = supabase.storage
  .from('product-images')
  .getPublicUrl(data.path);
// استخدم urlData.publicUrl كـ image URL
```

---

### 2. Race Condition في Buy Now
**الملف:** `src/app/product/[slug]/page.tsx` أو `src/components/ProductCard.tsx`  
**المشكلة:** زر "Buy Now" بيفتح الـ checkout في نفس الوقت اللي بيضيف فيه المنتج للكارت. لو الـ addToCart غير synchronous (بيحدّث localStorage وbatch updates)، ممكن الـ checkout يفتح قبل ما الكارت يتحدث.

**الحل:** استنّ الـ addToCart يخلص قبل الـ navigate:
```typescript
const handleBuyNow = async () => {
  await addToCart(product, selectedSize); // تأكد إن addToCart بترجع Promise
  router.push('/checkout');
};
```

---

### 3. Stale State في Track Order — Recent Orders
**الملف:** `src/app/track/page.tsx`  
**المشكلة:** لما اليوزر يدور على أوردر جديد، الـ `recentOrders` state بتتحدث بـ `prev` value من الـ closure القديم:
```typescript
// المشكلة:
setRecentOrders(prev => [data.id, ...prev.slice(0, 4)]);
// ده بيشتغل، بس لو في update تاني بيجري في نفس الوقت ممكن يضيع
```
المشكلة بسيطة نسبياً لكن الأصح إنك تقرأ الـ localStorage مباشرة وقت الـ update:
```typescript
const orderIds = JSON.parse(localStorage.getItem('og-order-ids') || '[]');
if (!orderIds.includes(data.id)) {
  const updated = [data.id, ...orderIds].slice(0, 5);
  localStorage.setItem('og-order-ids', JSON.stringify(updated));
  setRecentOrders(updated);
}
```

---

## 🔧 تحسينات مقترحة (مش bugs لكن مهمة)

### 4. Admin Pages — تحديثها لاستخدام API Routes الجديدة
بعد إصلاح الأمن، صفحات الأدمن لسه بتكلم Supabase مباشرة. محتاج تحدّث:
- `admin/products/page.tsx` → يستخدم `/api/admin/products`
- `admin/orders/page.tsx` → يستخدم `/api/admin/orders`  
- `admin/messages/page.tsx` → يستخدم `/api/admin/messages`

راجع ملف `SECURITY_FIXES.md` للتفاصيل.

### 5. Input Validation في Checkout
**الملف:** `src/app/checkout/page.tsx`  
**المشكلة:** الـ phone number بيتحفظ زي ما هو بدون validation. ممكن يتبعت أي حاجة.  
**الحل:** أضف regex validation:
```typescript
const phoneRegex = /^(010|011|012|015)\d{8}$/;
if (!phoneRegex.test(phone)) {
  setError('رقم الهاتف يجب أن يكون رقم مصري صحيح');
  return;
}
```

### 6. Error Boundaries مفيش
لو أي component وقع في error، الصفحة كلها بتتعطل. أضف `error.tsx` و `not-found.tsx` في الـ app directory.

### 7. SEO — Metadata ناقصة
الصفحات مش عندها `generateMetadata()`. ده بيأثر على الـ SEO وـ social sharing.

---

## 📊 ملخص الأولويات

| # | المشكلة | الأولوية | الصعوبة |
|---|---------|----------|---------|
| 1 | Base64 images في DB | عالية | متوسطة |
| 2 | Race condition في Buy Now | متوسطة | سهلة |
| 3 | Stale state في Track | منخفضة | سهلة |
| 4 | تحديث Admin pages لـ API routes | عالية | متوسطة |
| 5 | Phone validation | متوسطة | سهلة |
| 6 | Error boundaries | منخفضة | سهلة |
| 7 | SEO metadata | منخفضة | سهلة |
