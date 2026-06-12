-- ============================================================
-- 7H  — Full Database Schema
-- Run this in Supabase SQL Editor to create all tables
-- ============================================================

-- 0. Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Stores (multi-tenant)
CREATE TABLE IF NOT EXISTS stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  domain TEXT UNIQUE,
  contact_email TEXT,
  contact_phone TEXT,
  address TEXT,
  logo_url TEXT,
  favicon_url TEXT,
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Store Users (admin accounts per store)
CREATE TABLE IF NOT EXISTS store_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('superadmin', 'owner', 'admin', 'staff')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(store_id, email)
);

-- 3. Admin Sessions
CREATE TABLE IF NOT EXISTS admin_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  user_id UUID REFERENCES store_users(id) ON DELETE CASCADE,
  user_role TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON admin_sessions(token);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires ON admin_sessions(expires_at);

-- 4. Products
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT DEFAULT '',
  price INTEGER NOT NULL CHECK (price >= 0),
  old_price INTEGER CHECK (old_price >= 0),
  discount_percentage INTEGER CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
  sizes TEXT[] DEFAULT '{}',
  category TEXT DEFAULT '',
  is_featured BOOLEAN DEFAULT false,
  stock INTEGER DEFAULT 0 CHECK (stock >= 0),
  reserved_stock INTEGER DEFAULT 0 CHECK (reserved_stock >= 0),
  main_image TEXT DEFAULT '',
  second_image TEXT,
  third_image TEXT,
  fourth_image TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(store_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_products_store ON products(store_id);
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(store_id, slug);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(store_id, category);

-- 5. Orders
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  display_id TEXT,
  user_id UUID, -- References auth.users(id) when Supabase Auth is used
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  phone TEXT NOT NULL,
  governorate TEXT NOT NULL,
  city TEXT NOT NULL,
  address TEXT NOT NULL,
  notes TEXT,
  payment_method TEXT DEFAULT 'cash_on_delivery',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'preparing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled')),
  delivery_status TEXT DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'confirmed', 'preparing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled')),
  total INTEGER NOT NULL DEFAULT 0,
  items JSONB DEFAULT '[]',
  paymob_txn_id TEXT,
  idempotency_key TEXT,
  coupon_id UUID REFERENCES coupons(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_paymob_txn_id ON orders(paymob_txn_id) WHERE paymob_txn_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_idempotency_key ON orders(idempotency_key) WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_store ON orders(store_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(store_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_phone ON orders(phone);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_display ON orders(display_id);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_ip_address ON orders(ip_address);

-- 6. Coupons
CREATE TABLE IF NOT EXISTS coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  code TEXT NOT NULL,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value INTEGER NOT NULL CHECK (discount_value > 0),
  min_order INTEGER DEFAULT 0 CHECK (min_order >= 0),
  max_uses INTEGER,
  used_count INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  coupon_type TEXT NOT NULL DEFAULT 'admin' CHECK (coupon_type IN ('newsletter', 'admin', 'public', 'targeted')),
  linked_email TEXT,
  subscriber_id UUID REFERENCES subscribers(id) ON DELETE SET NULL,
  used_by_order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  used_at TIMESTAMPTZ,
  used_by_ip TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(store_id, code)
);

CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(store_id, code);
CREATE INDEX IF NOT EXISTS idx_coupons_linked_email ON coupons(linked_email);
CREATE INDEX IF NOT EXISTS idx_coupons_subscriber_id ON coupons(subscriber_id);

-- 7. Shipping Rates
CREATE TABLE IF NOT EXISTS shipping_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  governorate TEXT NOT NULL UNIQUE,
  cost INTEGER NOT NULL CHECK (cost >= 0),
  estimated_days TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Messages (contact form)
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT DEFAULT '',
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_store ON messages(store_id);

-- 9. Reviews
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT NOT NULL,
  image TEXT,
  is_approved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_store ON reviews(store_id);

-- 10. Payment Events (append-only log)
CREATE TABLE IF NOT EXISTS payment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  paymob_txn_id TEXT,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  event_type TEXT,
  status TEXT DEFAULT 'received',
  raw_payload JSONB,
  correlation_id TEXT,
  error_message TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payevents_txn ON payment_events(paymob_txn_id);
CREATE INDEX IF NOT EXISTS idx_payevents_order ON payment_events(order_id);

-- 11. Payment Errors
CREATE TABLE IF NOT EXISTS payment_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  event_id UUID,
  order_id UUID,
  error_type TEXT,
  error_message TEXT,
  raw_payload JSONB,
  correlation_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 12. Inventory Log
CREATE TABLE IF NOT EXISTS inventory_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  change INTEGER NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invlog_product ON inventory_log(product_id);

-- 13. Rate Limits
CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  count INTEGER DEFAULT 1,
  reset_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ratelimit_unique ON rate_limits(ip, endpoint);

-- 14. Blog Posts
CREATE TABLE IF NOT EXISTS blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT,
  cover_image TEXT,
  category TEXT DEFAULT 'Style Guide',
  tags TEXT[] DEFAULT '{}',
  published BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(store_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_blog_store ON blog_posts(store_id);
CREATE INDEX IF NOT EXISTS idx_blog_slug ON blog_posts(store_id, slug);

-- 15. Subscribers (newsletter)
CREATE TABLE IF NOT EXISTS subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  name TEXT,
  discount_code TEXT,
  discount_used BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  subscribed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(store_id, email)
);

CREATE INDEX IF NOT EXISTS idx_subscribers_store ON subscribers(store_id);
CREATE INDEX IF NOT EXISTS idx_subscribers_discount_code ON subscribers(discount_code);
CREATE INDEX IF NOT EXISTS idx_subscribers_email ON subscribers(email);

-- 16. Flash Sales
CREATE TABLE IF NOT EXISTS flash_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  discount_percentage INTEGER NOT NULL CHECK (discount_percentage >= 1 AND discount_percentage <= 100),
  ends_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_flashsales_store ON flash_sales(store_id);
CREATE INDEX IF NOT EXISTS idx_flashsales_active ON flash_sales(store_id, is_active);

-- 17. Bundles
CREATE TABLE IF NOT EXISTS bundles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  products JSONB NOT NULL DEFAULT '[]',
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value INTEGER NOT NULL CHECK (discount_value > 0),
  image TEXT,
  image_source TEXT DEFAULT 'custom',
  image_layout TEXT DEFAULT 'side-by-side',
  image_data JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bundles_store ON bundles(store_id);

-- ============================================================
-- STORED PROCEDURES / RPCs
-- ============================================================

-- reserve_order_stock: Reserves stock when an order is placed
CREATE OR REPLACE FUNCTION reserve_order_stock(order_id UUID, items JSONB)
RETURNS VOID AS $$
DECLARE
  item JSONB;
  order_store_id UUID;
BEGIN
  SELECT store_id INTO order_store_id FROM orders WHERE id = order_id;
  FOR item IN SELECT * FROM jsonb_array_elements(items)
  LOOP
    UPDATE products
    SET reserved_stock = reserved_stock + (item->>'quantity')::INTEGER
    WHERE id = (item->>'product_id')::UUID
      AND (stock - reserved_stock) >= (item->>'quantity')::INTEGER;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Insufficient stock for product %', (item->>'product_id');
    END IF;

    INSERT INTO inventory_log (store_id, order_id, product_id, change, reason)
    VALUES (order_store_id, order_id, (item->>'product_id')::UUID, -(item->>'quantity')::INTEGER, 'reserve');
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- commit_order_stock: Commits reserved stock (confirms the order)
-- IDEMPOTENT: guarded by reserved_stock >= quantity — second call is a no-op
CREATE OR REPLACE FUNCTION commit_order_stock(order_id UUID, items JSONB)
RETURNS VOID AS $$
DECLARE
  item JSONB;
  order_store_id UUID;
  updated_rows INTEGER;
BEGIN
  SELECT store_id INTO order_store_id FROM orders WHERE id = order_id;
  FOR item IN SELECT * FROM jsonb_array_elements(items)
  LOOP
    UPDATE products
    SET stock = stock - (item->>'quantity')::INTEGER,
        reserved_stock = reserved_stock - (item->>'quantity')::INTEGER
    WHERE id = (item->>'product_id')::UUID
      AND reserved_stock >= (item->>'quantity')::INTEGER;

    GET DIAGNOSTICS updated_rows = ROW_COUNT;
    IF updated_rows = 0 THEN
      RAISE EXCEPTION 'Stock already committed or insufficient reserved_stock for product %', (item->>'product_id')::UUID;
    END IF;

    INSERT INTO inventory_log (store_id, order_id, product_id, change, reason)
    VALUES (order_store_id, order_id, (item->>'product_id')::UUID, -(item->>'quantity')::INTEGER, 'commit');
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- release_order_stock: Releases reserved stock (cancels the order)
-- Handles both cases:
--   1. Reserved but not committed: decrements reserved_stock only
--   2. Already committed (reserved_stock < qty): restores stock AND reserved_stock
CREATE OR REPLACE FUNCTION release_order_stock(order_id UUID, items JSONB)
RETURNS VOID AS $$
DECLARE
  item JSONB;
  order_store_id UUID;
  qty INTEGER;
  current_reserved INTEGER;
BEGIN
  SELECT store_id INTO order_store_id FROM orders WHERE id = order_id;
  FOR item IN SELECT * FROM jsonb_array_elements(items)
  LOOP
    qty := (item->>'quantity')::INTEGER;
    SELECT reserved_stock INTO current_reserved
    FROM products WHERE id = (item->>'product_id')::UUID;

    IF current_reserved >= qty THEN
      -- Case 1: Stock was reserved but not committed
      UPDATE products
      SET reserved_stock = reserved_stock - qty
      WHERE id = (item->>'product_id')::UUID;
    ELSE
      -- Case 2: Stock was already committed (or partially), restore it
      UPDATE products
      SET stock = stock + qty,
          reserved_stock = GREATEST(reserved_stock - qty, 0)
      WHERE id = (item->>'product_id')::UUID;
    END IF;

    INSERT INTO inventory_log (store_id, order_id, product_id, change, reason)
    VALUES (order_store_id, order_id, (item->>'product_id')::UUID, -(item->>'quantity')::INTEGER, 'release');
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS on all tenant tables
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE flash_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE bundles ENABLE ROW LEVEL SECURITY;

-- Public read access for products, flash_sales, bundles, blog_posts
DROP POLICY IF EXISTS "Public read products" ON products;
CREATE POLICY "Public read products" ON products FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public read flash_sales" ON flash_sales;
CREATE POLICY "Public read flash_sales" ON flash_sales FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public read bundles" ON bundles;
CREATE POLICY "Public read bundles" ON bundles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public read blog_posts" ON blog_posts;
CREATE POLICY "Public read blog_posts" ON blog_posts FOR SELECT USING (published = true);

-- Authenticated user access for orders (own orders only)
DROP POLICY IF EXISTS "Users read own orders" ON orders;
CREATE POLICY "Users read own orders" ON orders FOR SELECT USING (auth.uid() = user_id);

-- Public insert for orders (checkout creates orders for guests and logged-in users)
DROP POLICY IF EXISTS "Public insert orders" ON orders;
CREATE POLICY "Public insert orders" ON orders FOR INSERT WITH CHECK (true);

-- Public insert for messages (contact form)
DROP POLICY IF EXISTS "Public insert messages" ON messages;
CREATE POLICY "Public insert messages" ON messages FOR INSERT WITH CHECK (true);

-- Coupon read restricted — all API routes use supabaseAdmin (service role), so no public SELECT needed.
-- RPC-based coupon validation prevents enumeration.
DROP POLICY IF EXISTS "Public read coupons" ON coupons;

-- Grant EXECUTE on RPCs that anon needs (reserve_order_stock for checkout)
-- SECURITY DEFINER so they run with owner privileges regardless of caller
ALTER FUNCTION reserve_order_stock(UUID, JSONB) SECURITY DEFINER;
ALTER FUNCTION atomic_check_rate_limit(TEXT, INTEGER, INTEGER) SECURITY DEFINER;

-- Service-role (admin) bypasses RLS — access controlled via getAdminSession()
-- Admin routes use supabaseAdmin (service-role key) so they are unaffected by RLS

-- ⚠️ Important: public API routes (checkout, payment, contact, bundles) should use
--    supabaseAnon (anon key) so that RLS policies are enforced.
--    The callback route MUST keep using supabaseAdmin because Paymob webhooks
--    are server-to-server without a user session and need to write payment_events,
--    payment_errors, and call commit/release_order_stock RPCs.

-- ============================================================
-- DEFAULT STORE
-- ============================================================
INSERT INTO stores (id, name, slug, domain, is_active)
VALUES ('00000000-0000-0000-0000-000000000001', '7H ', '7H-old-gold', NULL, true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- DEFAULT SHIPPING RATES
-- ============================================================
INSERT INTO shipping_rates (governorate, cost) VALUES
  ('Alexandria', 60),
  ('Cairo', 100),
  ('Giza', 100),
  ('Dakahlia', 100),
  ('Red Sea', 100),
  ('Beheira', 100),
  ('Fayoum', 100),
  ('Gharbia', 100),
  ('Ismailia', 100),
  ('Menoufia', 100),
  ('Minya', 100),
  ('New Valley', 100),
  ('Qalyubia', 100),
  ('Suez', 100),
  ('Aswan', 100),
  ('Assiut', 100),
  ('Beni Suef', 100),
  ('Port Said', 100),
  ('Damietta', 100),
  ('Sharkia', 100),
  ('South Sinai', 100),
  ('Kafr El Sheikh', 100),
  ('Matrouh', 100),
  ('Luxor', 100),
  ('Qena', 100),
  ('North Sinai', 100),
  ('Sohag', 100)
ON CONFLICT (governorate) DO NOTHING;

-- ============================================================
-- Atomic Coupon Usage Increment (prevents overuse)
-- ============================================================
CREATE OR REPLACE FUNCTION atomic_increment_coupon(p_coupon_id UUID)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE coupons
  SET used_count = used_count + 1
  WHERE id = p_coupon_id
    AND is_active = true
    AND (max_uses IS NULL OR used_count < max_uses)
    AND (expires_at IS NULL OR expires_at > NOW());

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  RETURN TRUE;
END;
$$;

-- ============================================================
-- Atomic Rate Limit Check (prevents race conditions)
-- ============================================================
-- Usage: SELECT atomic_check_rate_limit('ip', 'endpoint', 5, 900000);
-- Returns: true if allowed, false if rate limited
CREATE OR REPLACE FUNCTION atomic_check_rate_limit(
  p_ip TEXT,
  p_endpoint TEXT,
  p_max_attempts INT,
  p_window_ms INT
) RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  v_count INT;
  v_reset_at TIMESTAMPTZ;
BEGIN
  -- Try to insert first attempt (ignore if already exists)
  INSERT INTO rate_limits (ip, endpoint, count, reset_at)
  VALUES (p_ip, p_endpoint, 1, NOW() + (p_window_ms || ' milliseconds')::INTERVAL)
  ON CONFLICT (ip, endpoint) WHERE (ip = p_ip AND endpoint = p_endpoint) DO NOTHING;

  -- Atomic: update only if not exceeded, returns affected row count
  UPDATE rate_limits
  SET count = CASE
    WHEN reset_at <= NOW() THEN 1        -- Window expired, reset
    ELSE count + 1                        -- Increment
  END,
  reset_at = CASE
    WHEN reset_at <= NOW() THEN NOW() + (p_window_ms || ' milliseconds')::INTERVAL
    ELSE reset_at
  END
  WHERE ip = p_ip
    AND endpoint = p_endpoint
    AND (
      (reset_at <= NOW())                            -- Window expired, always allow
      OR
      (reset_at > NOW() AND count < p_max_attempts)  -- Within window, only if under limit
    )
  RETURNING count, reset_at INTO v_count, v_reset_at;

  IF NOT FOUND THEN
    RETURN FALSE;  -- Rate limited
  END IF;

  RETURN TRUE;     -- Allowed
END;
$$;

-- ============================================================
-- Migration: Add ip_address to orders (audit trail for security)
-- ============================================================
ALTER TABLE orders ADD COLUMN IF NOT EXISTS ip_address TEXT;

-- ============================================================
-- Migration: Add reserved_stock to products (for stock reservation)
-- ============================================================
ALTER TABLE products ADD COLUMN IF NOT EXISTS reserved_stock INTEGER DEFAULT 0 CHECK (reserved_stock >= 0);

-- ============================================================
-- Migration: Add image_source + image_layout + image_data to bundles
-- ============================================================
ALTER TABLE bundles ADD COLUMN IF NOT EXISTS image_source TEXT DEFAULT 'custom';
ALTER TABLE bundles ADD COLUMN IF NOT EXISTS image_layout TEXT DEFAULT 'side-by-side';
ALTER TABLE bundles ADD COLUMN IF NOT EXISTS image_data JSONB DEFAULT '{}'::jsonb;

-- ============================================================
-- Atomic Coupon Usage Decrement (for cancellations / failures)
-- ============================================================
CREATE OR REPLACE FUNCTION atomic_decrement_coupon(p_coupon_id UUID)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE coupons
  SET used_count = GREATEST(0, used_count - 1)
  WHERE id = p_coupon_id;
  RETURN FOUND;
END;
$$;
