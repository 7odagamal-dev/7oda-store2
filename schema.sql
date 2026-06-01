-- ============================================================
-- OG Old Gold - Complete Database Schema for Supabase
-- ============================================================

-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TABLE: stores
-- ============================================================
CREATE TABLE IF NOT EXISTS stores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  domain TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  address TEXT,
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO stores (id, name, slug, is_active)
VALUES ('00000000-0000-0000-0000-000000000001', 'OG Old Gold', 'og-old-gold', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- TABLE: store_users
-- ============================================================
CREATE TABLE IF NOT EXISTS store_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('superadmin', 'owner', 'admin', 'staff')),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: products
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001' REFERENCES stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  price INTEGER NOT NULL,
  old_price INTEGER,
  discount_percentage INTEGER,
  sizes TEXT[] DEFAULT ARRAY['M', 'L', 'XL'],
  category TEXT NOT NULL,
  is_featured BOOLEAN DEFAULT false,
  stock INTEGER DEFAULT 0,
  reserved_stock INTEGER DEFAULT 0 CHECK (reserved_stock >= 0),
  main_image TEXT NOT NULL,
  second_image TEXT,
  third_image TEXT,
  fourth_image TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (store_id, slug)
);

-- ============================================================
-- TABLE: orders
-- ============================================================
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001' REFERENCES stores(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  governorate TEXT NOT NULL,
  city TEXT NOT NULL,
  address TEXT NOT NULL,
  notes TEXT,
  payment_method TEXT DEFAULT 'cash_on_delivery',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'preparing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled')),
  delivery_status TEXT DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'confirmed', 'preparing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled')),
  total INTEGER NOT NULL,
  items JSONB NOT NULL,
  paymob_txn_id TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: messages
-- ============================================================
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001' REFERENCES stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'unread',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: admin_sessions
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_sessions (
  token TEXT PRIMARY KEY,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  user_id UUID REFERENCES store_users(id) ON DELETE CASCADE,
  user_role TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM admin_sessions WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- TABLE: reviews
-- ============================================================
CREATE TABLE IF NOT EXISTS reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001' REFERENCES stores(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: coupons
-- ============================================================
CREATE TABLE IF NOT EXISTS coupons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001' REFERENCES stores(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value INTEGER NOT NULL,
  min_order INTEGER DEFAULT 0,
  max_uses INTEGER,
  used_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (store_id, code)
);

-- ============================================================
-- TABLE: shipping_rates
-- ============================================================
CREATE TABLE IF NOT EXISTS shipping_rates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  governorate TEXT UNIQUE NOT NULL,
  cost INTEGER NOT NULL,
  estimated_days TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO shipping_rates (governorate, cost, estimated_days) VALUES
  ('Alexandria', 40, '1-2 days'),
  ('Cairo', 50, '1-2 days'),
  ('Giza', 50, '1-2 days'),
  ('Qalyubia', 55, '1-3 days'),
  ('Beheira', 55, '1-3 days'),
  ('Kafr El Sheikh', 65, '1-3 days'),
  ('Dakahlia', 65, '1-3 days'),
  ('Gharbia', 60, '1-3 days'),
  ('Monufia', 60, '1-3 days'),
  ('Sharqia', 65, '1-3 days'),
  ('Damietta', 60, '1-3 days'),
  ('Port Said', 65, '2-4 days'),
  ('Ismailia', 65, '2-4 days'),
  ('Suez', 65, '2-4 days'),
  ('North Sinai', 90, '3-5 days'),
  ('South Sinai', 90, '3-5 days'),
  ('Red Sea', 80, '3-5 days'),
  ('Luxor', 75, '3-5 days'),
  ('Aswan', 80, '3-5 days'),
  ('Minya', 70, '2-4 days'),
  ('Assiut', 70, '2-4 days'),
  ('Sohag', 75, '2-4 days'),
  ('Qena', 75, '2-4 days'),
  ('Fayoum', 60, '2-4 days'),
  ('Beni Suef', 65, '2-4 days'),
  ('New Valley', 100, '4-7 days'),
  ('Matrouh', 90, '3-5 days')
ON CONFLICT (governorate) DO NOTHING;

-- ============================================================
-- TABLE: payment_events
-- ============================================================
CREATE TABLE IF NOT EXISTS payment_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001' REFERENCES stores(id) ON DELETE CASCADE,
  paymob_txn_id TEXT NOT NULL,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('transaction.created', 'transaction.succeeded', 'transaction.failed', 'transaction.refunded', 'transaction.pending', 'transaction.canceled')),
  status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'processing', 'processed', 'failed')),
  raw_payload JSONB NOT NULL,
  error_message TEXT,
  correlation_id TEXT NOT NULL,
  received_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: payment_errors
-- ============================================================
CREATE TABLE IF NOT EXISTS payment_errors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001' REFERENCES stores(id) ON DELETE CASCADE,
  event_id UUID REFERENCES payment_events(id) ON DELETE SET NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  error_type TEXT NOT NULL CHECK (error_type IN ('hmac_failure', 'order_not_found', 'amount_mismatch', 'stock_decrement_failed', 'db_error', 'unknown')),
  error_message TEXT NOT NULL,
  raw_payload JSONB,
  correlation_id TEXT,
  retry_count INTEGER DEFAULT 0,
  last_retry_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- ============================================================
-- TABLE: inventory_log
-- ============================================================
CREATE TABLE IF NOT EXISTS inventory_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001' REFERENCES stores(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('reserve', 'commit', 'release', 'admin_adjust')),
  quantity INT NOT NULL,
  stock_before INT NOT NULL,
  reserved_before INT NOT NULL,
  stock_after INT NOT NULL,
  reserved_after INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: rate_limits
-- ============================================================
CREATE TABLE IF NOT EXISTS rate_limits (
  ip TEXT,
  endpoint TEXT,
  count INTEGER DEFAULT 1,
  reset_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (ip, endpoint)
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipping_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS POLICIES
-- ============================================================
DROP POLICY IF EXISTS "Anyone can insert products" ON products;
DROP POLICY IF EXISTS "Anyone can update products" ON products;
DROP POLICY IF EXISTS "Anyone can delete products" ON products;
DROP POLICY IF EXISTS "Anyone can create orders" ON orders;
DROP POLICY IF EXISTS "Customer can view own order by id" ON orders;
DROP POLICY IF EXISTS "Anyone can view orders" ON orders;
DROP POLICY IF EXISTS "Anyone can update orders" ON orders;
DROP POLICY IF EXISTS "Anyone can view messages" ON messages;
DROP POLICY IF EXISTS "Anyone can update messages" ON messages;

CREATE POLICY "Stores are viewable by everyone" ON stores FOR SELECT USING (true);

CREATE POLICY "Products are viewable by everyone" ON products FOR SELECT USING (true);

CREATE POLICY "Deny all public access to orders" ON orders FOR ALL USING (false) WITH CHECK (false);

CREATE POLICY "Anyone can create messages" ON messages FOR INSERT WITH CHECK (true);

CREATE POLICY "Reviews are viewable by everyone" ON reviews FOR SELECT USING (true);
CREATE POLICY "Anyone can create reviews" ON reviews FOR INSERT WITH CHECK (true);

CREATE POLICY "Deny all public access to coupons" ON coupons FOR ALL USING (false) WITH CHECK (false);

CREATE POLICY "Shipping rates viewable by everyone" ON shipping_rates FOR SELECT USING (true);

-- ============================================================
-- FUNCTIONS: updated_at triggers
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- TRIGGERS: updated_at
-- ============================================================
DROP TRIGGER IF EXISTS stores_set_updated_at ON stores;
CREATE TRIGGER stores_set_updated_at BEFORE UPDATE ON stores FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS store_users_set_updated_at ON store_users;
CREATE TRIGGER store_users_set_updated_at BEFORE UPDATE ON store_users FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS products_set_updated_at ON products;
CREATE TRIGGER products_set_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS orders_set_updated_at ON orders;
CREATE TRIGGER orders_set_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS coupons_set_updated_at ON coupons;
CREATE TRIGGER coupons_set_updated_at BEFORE UPDATE ON coupons FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- TRIGGER: enforce order state transitions
-- ============================================================
CREATE OR REPLACE FUNCTION enforce_order_transition()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF OLD.status IN ('delivered', 'cancelled') THEN
      RAISE EXCEPTION 'Cannot transition from terminal state "%" to "%"', OLD.status, NEW.status;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_order_transition ON orders;
CREATE TRIGGER trg_enforce_order_transition
  BEFORE INSERT OR UPDATE OF status ON orders
  FOR EACH ROW EXECUTE FUNCTION enforce_order_transition();

-- ============================================================
-- FUNCTIONS: inventory stock management
-- ============================================================
DROP FUNCTION IF EXISTS commit_order_stock(items JSONB);
DROP FUNCTION IF EXISTS release_order_stock(items JSONB);

CREATE OR REPLACE FUNCTION reserve_order_stock(order_id UUID, items JSONB)
RETURNS void AS $$
DECLARE
  item RECORD;
  current_stock INT;
  current_reserved INT;
  order_store_id UUID;
BEGIN
  SELECT store_id INTO order_store_id FROM orders WHERE id = order_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order % not found', order_id;
  END IF;
  FOR item IN SELECT * FROM jsonb_to_recordset(items) AS x(product_id UUID, quantity INT)
  LOOP
    SELECT stock, reserved_stock INTO current_stock, current_reserved
    FROM products WHERE id = item.product_id FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product % not found', item.product_id;
    END IF;
    IF (current_stock - current_reserved) < item.quantity THEN
      RAISE EXCEPTION 'Insufficient available stock for product %: have %, need %',
        item.product_id, (current_stock - current_reserved), item.quantity;
    END IF;
    UPDATE products SET reserved_stock = reserved_stock + item.quantity WHERE id = item.product_id;
    INSERT INTO inventory_log (store_id, order_id, product_id, action, quantity,
      stock_before, reserved_before, stock_after, reserved_after)
    VALUES (order_store_id, order_id, item.product_id, 'reserve', item.quantity,
      current_stock, current_reserved, current_stock, current_reserved + item.quantity);
  END LOOP;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION commit_order_stock(order_id UUID, items JSONB)
RETURNS void AS $$
DECLARE
  item RECORD;
  current_stock INT;
  current_reserved INT;
  order_store_id UUID;
BEGIN
  SELECT store_id INTO order_store_id FROM orders WHERE id = order_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order % not found', order_id;
  END IF;
  FOR item IN SELECT * FROM jsonb_to_recordset(items) AS x(product_id UUID, quantity INT)
  LOOP
    SELECT stock, reserved_stock INTO current_stock, current_reserved
    FROM products WHERE id = item.product_id FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product % not found', item.product_id;
    END IF;
    IF current_reserved >= item.quantity THEN
      UPDATE products
        SET stock = stock - item.quantity,
            reserved_stock = reserved_stock - item.quantity
        WHERE id = item.product_id;
      INSERT INTO inventory_log (store_id, order_id, product_id, action, quantity,
        stock_before, reserved_before, stock_after, reserved_after)
      VALUES (order_store_id, order_id, item.product_id, 'commit', item.quantity,
        current_stock, current_reserved, current_stock - item.quantity, current_reserved - item.quantity);
    ELSIF current_reserved = 0 AND current_stock >= item.quantity THEN
      UPDATE products SET stock = stock - item.quantity WHERE id = item.product_id;
      INSERT INTO inventory_log (store_id, order_id, product_id, action, quantity,
        stock_before, reserved_before, stock_after, reserved_after)
      VALUES (order_store_id, order_id, item.product_id, 'commit', item.quantity,
        current_stock, 0, current_stock - item.quantity, 0);
    ELSE
      RAISE EXCEPTION 'Cannot commit stock for product %: reserved=%, stock=%',
        item.product_id, current_reserved, current_stock;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION release_order_stock(order_id UUID, items JSONB)
RETURNS void AS $$
DECLARE
  item RECORD;
  current_reserved INT;
  current_stock INT;
  order_store_id UUID;
BEGIN
  SELECT store_id INTO order_store_id FROM orders WHERE id = order_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order % not found', order_id;
  END IF;
  FOR item IN SELECT * FROM jsonb_to_recordset(items) AS x(product_id UUID, quantity INT)
  LOOP
    SELECT stock, reserved_stock INTO current_stock, current_reserved
    FROM products WHERE id = item.product_id FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product % not found', item.product_id;
    END IF;
    IF current_reserved >= item.quantity THEN
      UPDATE products SET reserved_stock = reserved_stock - item.quantity WHERE id = item.product_id;
      INSERT INTO inventory_log (store_id, order_id, product_id, action, quantity,
        stock_before, reserved_before, stock_after, reserved_after)
      VALUES (order_store_id, order_id, item.product_id, 'release', item.quantity,
        current_stock, current_reserved, current_stock, current_reserved - item.quantity);
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_store_users_email ON store_users (email);
CREATE INDEX IF NOT EXISTS idx_store_users_store ON store_users (store_id);

CREATE INDEX IF NOT EXISTS idx_products_slug ON products (slug);
CREATE INDEX IF NOT EXISTS idx_products_category ON products (category);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products (is_featured);
CREATE INDEX IF NOT EXISTS idx_products_store ON products (store_id);

CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_store ON orders (store_id);
CREATE INDEX IF NOT EXISTS idx_orders_paymob_txn ON orders (paymob_txn_id);

CREATE INDEX IF NOT EXISTS idx_messages_status ON messages (status);
CREATE INDEX IF NOT EXISTS idx_messages_store ON messages (store_id);

CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews (product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_store ON reviews (store_id);
CREATE INDEX IF NOT EXISTS idx_reviews_created ON reviews (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons (code);
CREATE INDEX IF NOT EXISTS idx_coupons_store ON coupons (store_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_events_txn ON payment_events (paymob_txn_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_status ON payment_events (status);
CREATE INDEX IF NOT EXISTS idx_payment_events_order ON payment_events (order_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_store ON payment_events (store_id);

CREATE INDEX IF NOT EXISTS idx_payment_errors_unresolved ON payment_errors (resolved_at) WHERE resolved_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_payment_errors_store ON payment_errors (store_id);

CREATE INDEX IF NOT EXISTS idx_inventory_log_order ON inventory_log (order_id);
CREATE INDEX IF NOT EXISTS idx_inventory_log_product ON inventory_log (product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_log_store ON inventory_log (store_id);
CREATE INDEX IF NOT EXISTS idx_inventory_log_created ON inventory_log (created_at DESC);
