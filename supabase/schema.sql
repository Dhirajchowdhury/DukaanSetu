-- ============================================================
-- DukaanSetu — Supabase (PostgreSQL) Schema
-- Run this in the Supabase SQL Editor to initialise the database.
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── ENUMS ─────────────────────────────────────────────────────────────────────

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('shop_owner', 'distributor', 'wholesaler', 'producer');
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'scan_action') THEN
        CREATE TYPE scan_action AS ENUM ('view', 'update', 'add');
    END IF;
END$$;

-- ── USERS ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email                TEXT        NOT NULL UNIQUE,
  password_hash        TEXT,                          -- NULL for Google-only accounts
  google_id            TEXT        UNIQUE,
  role                 user_role   NOT NULL DEFAULT 'shop_owner',
  shop_name            TEXT        NOT NULL,
  phone_number         TEXT,
  email_verified       BOOLEAN     NOT NULL DEFAULT FALSE,
  -- Notification preferences (flattened — avoids JSONB for simple booleans)
  notif_email          BOOLEAN     NOT NULL DEFAULT TRUE,
  notif_sms            BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email     ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users (google_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── OTP STORE ─────────────────────────────────────────────────────────────────
-- Replaces the in-memory Map used in the original Mongoose code.

CREATE TABLE IF NOT EXISTS otp_store (
  email      TEXT        PRIMARY KEY,
  otp        TEXT        NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── CATEGORIES ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS categories (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        REFERENCES users (id) ON DELETE CASCADE,  -- NULL for defaults
  name       TEXT        NOT NULL,
  icon       TEXT        NOT NULL DEFAULT '📦',
  is_default BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- A user cannot have two categories with the same name
  CONSTRAINT uq_user_category UNIQUE (user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_categories_user_id   ON categories (user_id);
CREATE INDEX IF NOT EXISTS idx_categories_is_default ON categories (is_default);

DROP TRIGGER IF EXISTS trg_categories_updated_at ON categories;
CREATE TRIGGER trg_categories_updated_at
BEFORE UPDATE ON categories
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── PRODUCTS ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS products (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  category_id         UUID        NOT NULL REFERENCES categories (id),
  product_name        TEXT        NOT NULL,
  brand               TEXT,
  batch_number        TEXT,
  expiry_date         DATE,
  manufacture_date    DATE,
  quantity            INTEGER     NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  unit                TEXT        NOT NULL DEFAULT 'pieces',
  cost_price          NUMERIC(12, 2),
  selling_price       NUMERIC(12, 2),
  supplier            TEXT,
  last_restock_date   TIMESTAMPTZ,
  image_url           TEXT,
  minimum_order_quantity INTEGER,
  -- Alert flags (set by cron job)
  alert_low_stock     BOOLEAN     NOT NULL DEFAULT FALSE,
  alert_expiring_soon BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Safely drop barcode column if it exists (from older schema runs)
ALTER TABLE products DROP COLUMN IF EXISTS barcode;

-- Safely add any columns that may be missing from an existing table
-- (CREATE TABLE IF NOT EXISTS skips the body if the table already exists)
ALTER TABLE products ADD COLUMN IF NOT EXISTS brand               TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS batch_number        TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS expiry_date         DATE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS manufacture_date    DATE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS unit                TEXT        NOT NULL DEFAULT 'pieces';
ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_price          NUMERIC(12, 2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS selling_price       NUMERIC(12, 2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS supplier            TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS last_restock_date   TIMESTAMPTZ;
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url           TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS minimum_order_quantity INTEGER;
ALTER TABLE products ADD COLUMN IF NOT EXISTS alert_low_stock     BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS alert_expiring_soon BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_products_user_id     ON products (user_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products (category_id);
-- idx_products_barcode removed (barcode field no longer used)
CREATE INDEX IF NOT EXISTS idx_products_expiry_date ON products (expiry_date);
CREATE INDEX IF NOT EXISTS idx_products_quantity    ON products (quantity);
-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_products_fts ON products
  USING GIN (to_tsvector('english', product_name || ' ' || COALESCE(brand, '')));

DROP TRIGGER IF EXISTS trg_products_updated_at ON products;
CREATE TRIGGER trg_products_updated_at
BEFORE UPDATE ON products
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── SCAN HISTORY ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS scan_history (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  product_id UUID        REFERENCES products (id) ON DELETE SET NULL,
  action     scan_action NOT NULL,
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Safely drop barcode column from scan_history if it exists (from older schema runs)
ALTER TABLE scan_history DROP COLUMN IF EXISTS barcode;

CREATE INDEX IF NOT EXISTS idx_scan_history_user_id    ON scan_history (user_id);
CREATE INDEX IF NOT EXISTS idx_scan_history_scanned_at ON scan_history (scanned_at DESC);

-- ── WHOLESALER PRODUCTS ──────────────────────────────────────────────────────
-- Products listed by wholesalers/producers for shop owners to browse & order

CREATE TABLE IF NOT EXISTS wholesaler_products (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  wholesaler_id   UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  product_name    TEXT        NOT NULL,
  category        TEXT        NOT NULL DEFAULT 'General',
  price_per_unit  NUMERIC(12, 2) NOT NULL CHECK (price_per_unit > 0),
  moq             INTEGER     NOT NULL DEFAULT 1 CHECK (moq > 0),
  stock_available INTEGER     NOT NULL DEFAULT 0 CHECK (stock_available >= 0),
  unit            TEXT        NOT NULL DEFAULT 'pieces',
  location        TEXT,
  description     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wp_wholesaler_id  ON wholesaler_products (wholesaler_id);
CREATE INDEX IF NOT EXISTS idx_wp_product_name   ON wholesaler_products (product_name);
CREATE INDEX IF NOT EXISTS idx_wp_category       ON wholesaler_products (category);
CREATE INDEX IF NOT EXISTS idx_wp_price          ON wholesaler_products (price_per_unit ASC);
CREATE INDEX IF NOT EXISTS idx_wp_fts ON wholesaler_products
  USING GIN (to_tsvector('english', product_name || ' ' || COALESCE(category, '')));

DROP TRIGGER IF EXISTS trg_wp_updated_at ON wholesaler_products;
CREATE TRIGGER trg_wp_updated_at
BEFORE UPDATE ON wholesaler_products
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── ORDERS ────────────────────────────────────────────────────────────────────

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
        CREATE TYPE order_status AS ENUM ('pending', 'accepted', 'dispatched', 'delivered', 'cancelled');
    END IF;
END$$;

CREATE TABLE IF NOT EXISTS orders (
  id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id          UUID         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  seller_id         UUID         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  product_id        UUID         NOT NULL REFERENCES wholesaler_products (id) ON DELETE CASCADE,
  quantity          INTEGER      NOT NULL CHECK (quantity > 0),
  total_price       NUMERIC(12, 2) NOT NULL CHECK (total_price > 0),
  delivery_location TEXT,
  status            order_status NOT NULL DEFAULT 'pending',
  notes             TEXT,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Safely add columns that may be missing from an existing orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_location TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS notes             TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_orders_buyer_id  ON orders (buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_seller_id ON orders (seller_id);
CREATE INDEX IF NOT EXISTS idx_orders_status    ON orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_created   ON orders (created_at DESC);

DROP TRIGGER IF EXISTS trg_orders_updated_at ON orders;
CREATE TRIGGER trg_orders_updated_at
BEFORE UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── CONNECTIONS ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS connections (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  connected_user_id UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_user_connection UNIQUE (user_id, connected_user_id)
);

CREATE INDEX IF NOT EXISTS idx_conn_user_id ON connections (user_id);
CREATE INDEX IF NOT EXISTS idx_conn_connected_user_id ON connections (connected_user_id);

-- ── LOCATION & PROFILE EXTENSIONS ───────────────────────────────────────────
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS latitude            DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude           DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS address             TEXT,
  ADD COLUMN IF NOT EXISTS city                 TEXT,
  ADD COLUMN IF NOT EXISTS state                TEXT,
  ADD COLUMN IF NOT EXISTS is_profile_complete BOOLEAN NOT NULL DEFAULT FALSE;

-- Clean deprecated fields
ALTER TABLE users DROP COLUMN IF EXISTS low_stock_threshold;
ALTER TABLE users DROP COLUMN IF EXISTS location_name;

-- ── DISCOVERY INDEXES ─────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_users_city ON users (city);
CREATE INDEX IF NOT EXISTS idx_users_location ON users (latitude, longitude);

-- ── SOFT DELETE ENHANCEMENTS ──────────────────────────────────────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;

-- ── PER-PRODUCT LOW-STOCK SETTINGS ────────────────────────────────────────────
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS low_stock_threshold    INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS low_stock_alert_enabled BOOLEAN NOT NULL DEFAULT TRUE;

-- ── PRODUCT MOQ VALIDATION ───────────────────────────────────────────────────
ALTER TABLE products DROP CONSTRAINT IF EXISTS chk_moq_positive;
ALTER TABLE products ADD CONSTRAINT chk_moq_positive CHECK (minimum_order_quantity IS NULL OR minimum_order_quantity >= 1);

-- ── PRODUCT QUANTITY VALIDATION ──────────────────────────────────────────────
ALTER TABLE products DROP CONSTRAINT IF EXISTS chk_quantity_non_negative;
ALTER TABLE products ADD CONSTRAINT chk_quantity_non_negative CHECK (quantity >= 0);

-- ── SELF-CONNECTION PREVENTION ───────────────────────────────────────────────
ALTER TABLE connections DROP CONSTRAINT IF EXISTS chk_no_self_connection;
ALTER TABLE connections ADD CONSTRAINT chk_no_self_connection CHECK (user_id <> connected_user_id);

-- ── SELF-ORDER PREVENTION ────────────────────────────────────────────────────
ALTER TABLE orders DROP CONSTRAINT IF EXISTS chk_no_self_order;
ALTER TABLE orders ADD CONSTRAINT chk_no_self_order CHECK (buyer_id <> seller_id);

-- ── CONVERSATIONS ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS conversations (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id   UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  user2_id   UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_conversation UNIQUE (user1_id, user2_id)
);

CREATE INDEX IF NOT EXISTS idx_conv_user1 ON conversations (user1_id);
CREATE INDEX IF NOT EXISTS idx_conv_user2 ON conversations (user2_id);

-- ── MESSAGES ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS messages (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID        NOT NULL REFERENCES conversations (id) ON DELETE CASCADE,
  sender_id       UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  text            TEXT        NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_conv_id    ON messages (conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created    ON messages (created_at ASC);
CREATE INDEX IF NOT EXISTS idx_messages_conv_created ON messages (conversation_id, created_at ASC);

-- ── INQUIRIES ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS inquiries (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id   UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  seller_id  UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  product_id UUID        NOT NULL REFERENCES wholesaler_products (id) ON DELETE CASCADE,
  quantity   INTEGER     NOT NULL DEFAULT 1 CHECK (quantity > 0),
  message    TEXT,
  status     TEXT        NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending','replied','closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inquiries_buyer  ON inquiries (buyer_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_seller ON inquiries (seller_id);

DROP TRIGGER IF EXISTS trg_inquiries_updated_at ON inquiries;
CREATE TRIGGER trg_inquiries_updated_at
BEFORE UPDATE ON inquiries
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── ROW LEVEL SECURITY ────────────────────────────────────────────────────────
-- The backend uses the service-role key which bypasses RLS.
-- These policies protect direct client access if you ever enable it.

ALTER TABLE users              ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories         ENABLE ROW LEVEL SECURITY;
ALTER TABLE products           ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_history       ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_store          ENABLE ROW LEVEL SECURITY;
ALTER TABLE wholesaler_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders             ENABLE ROW LEVEL SECURITY;
ALTER TABLE connections        ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations      ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages           ENABLE ROW LEVEL SECURITY;
ALTER TABLE inquiries          ENABLE ROW LEVEL SECURITY;

-- Service role bypasses all policies — no additional policies needed for backend.
-- Public read policy for authenticated user access to supplier directory
DROP POLICY IF EXISTS "Allow read users" ON users;
CREATE POLICY "Allow read users" ON users FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow read wholesaler_products" ON wholesaler_products;
CREATE POLICY "Allow read wholesaler_products" ON wholesaler_products FOR SELECT USING (true);

-- ── DEFAULT CATEGORIES SEED ───────────────────────────────────────────────────
-- Run after schema creation. user_id is NULL for defaults.

INSERT INTO categories (name, icon, is_default) VALUES
  ('Soaps & Detergents', '🧼', TRUE),
  ('Snacks & Biscuits',  '🍪', TRUE),
  ('Beverages',          '🥤', TRUE),
  ('Dairy Products',     '🥛', TRUE),
  ('Pulses & Grains',    '🌾', TRUE),
  ('Spices',             '🌶️', TRUE),
  ('Personal Care',      '💆', TRUE),
  ('Household Items',    '🏠', TRUE),
  ('Oils & Ghee',        '🛢️', TRUE),
  ('Stationery',         '📝', TRUE)
ON CONFLICT DO NOTHING;

-- ── TRANSACTION FUNCTIONS ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION place_order_tx(
  p_buyer_id UUID,
  p_product_id UUID,
  p_quantity INTEGER,
  p_delivery_location TEXT,
  p_notes TEXT
) RETURNS JSONB LANGUAGE plpgsql AS $$
DECLARE
  v_seller_id UUID;
  v_moq INTEGER;
  v_stock INTEGER;
  v_price NUMERIC;
  v_total_price NUMERIC;
  v_order_id UUID;
  v_product_name TEXT;
  v_unit TEXT;
  v_category TEXT;
  v_result JSONB;
BEGIN
  -- Lock the wholesaler_products row for update to prevent race conditions
  SELECT wholesaler_id, moq, stock_available, price_per_unit, product_name, unit, category
  INTO v_seller_id, v_moq, v_stock, v_price, v_product_name, v_unit, v_category
  FROM wholesaler_products
  WHERE id = p_product_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Product listing not found');
  END IF;

  -- Validation checks
  IF p_buyer_id = v_seller_id THEN
    RETURN jsonb_build_object('success', false, 'message', 'You cannot order your own listing');
  END IF;

  IF p_quantity < v_moq THEN
    RETURN jsonb_build_object('success', false, 'message', 'Minimum order quantity not met');
  END IF;

  IF p_quantity > v_stock THEN
    RETURN jsonb_build_object('success', false, 'message', 'Order quantity exceeds available stock');
  END IF;

  v_total_price := v_price * p_quantity;

  -- Create order
  INSERT INTO orders (buyer_id, seller_id, product_id, quantity, total_price, delivery_location, notes, status)
  VALUES (p_buyer_id, v_seller_id, p_product_id, p_quantity, v_total_price, p_delivery_location, p_notes, 'pending')
  RETURNING id INTO v_order_id;

  -- Decrement the stock
  UPDATE wholesaler_products
  SET stock_available = stock_available - p_quantity
  WHERE id = p_product_id;

  -- Return success
  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'total_price', v_total_price,
    'message', 'Order placed successfully'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;
