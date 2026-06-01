# Security Fixes Applied — OG Old Gold

## ✅ Fixed Issues

### 1. Hardcoded Admin Password (CRITICAL)
**Before:** `const ADMIN_PASSWORD = 'OGAdmin2026'` — visible to anyone in DevTools  
**After:** Password moved to `ADMIN_PASSWORD` env variable, validated server-side via `/api/admin/login`

**Setup required:**
```bash
# In .env.local
ADMIN_PASSWORD=your_strong_password_here
```

### 2. Client-Side Auth Bypass (CRITICAL)
**Before:** Admin layout only checked `localStorage.getItem('og-admin-auth')` — any user could set this manually in DevTools console  
**After:** Layout now calls `/api/admin/verify` on every load, validating a server-issued random token. No token = redirect to login.

### 3. Open RLS Policies (CRITICAL)
**Before:** Anyone with the Supabase URL could INSERT/UPDATE/DELETE products, read all orders and messages  
**After:** 
- Products: public SELECT only. Mutations require service-role key (server API routes)
- Orders: public INSERT (customers), public SELECT (for order tracking). No UPDATE/DELETE from browser
- Messages: public INSERT only. No SELECT/UPDATE from browser

**Apply the new policies:**
```sql
-- Run schema.sql in your Supabase SQL editor
-- Or run just the DROP + CREATE POLICY sections
```

### 4. Admin Operations Now Use Service Role (CRITICAL)
**Before:** Admin panel sent product/order mutations directly from the browser using the anon key  
**After:** New API routes added:
- `POST/PUT/DELETE /api/admin/products` — product CRUD
- `GET/PUT /api/admin/orders` — order listing & status updates
- `GET/PUT /api/admin/messages` — message listing & status updates

All routes validate the session token before any DB operation.

**Setup required:**
```bash
# In .env.local — get from Supabase dashboard → Settings → API
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

### 5. Rate Limiting on Login
**Before:** Unlimited login attempts  
**After:** 5 failed attempts per IP triggers a 15-minute lockout

---

## 📋 Remaining Steps (Manual)

### Update Admin Pages to Use New API Routes
The following admin pages still call Supabase directly from the browser.
They need to be updated to call the new API routes instead:

- `src/app/admin/products/page.tsx` → use `/api/admin/products`
- `src/app/admin/orders/page.tsx` → use `/api/admin/orders`
- `src/app/admin/messages/page.tsx` → use `/api/admin/messages`

Example update for `handleDelete` in products page:
```typescript
// Before:
const supabase = getSupabase();
if (supabase) await supabase.from('products').delete().eq('id', id);

// After:
const token = localStorage.getItem('og-admin-auth');
await fetch('/api/admin/products', {
  method: 'DELETE',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  },
  body: JSON.stringify({ id }),
});
```

### Production: Replace In-Memory Session Store
The current session store uses a `Map` on the Node.js global object.
This resets on every server restart and doesn't work across multiple instances.

For production, replace with Redis or a Supabase `admin_sessions` table.
