-- ============================================================
-- DukaanSetu — Supabase (PostgreSQL) Schema
-- Run this in the Supabase SQL Editor to initialise the database.
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── ENUMS ─────────────────────────────────────────────────────────────────────

CREATE TYPE user_role AS ENUM ('shop_owner', 'distributor', 'wholesaler', 'producer');
CREATE TYPE scan_action AS ENUM ('view', 'update', 'add');

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
  low_stock_threshold  INTEGER     NOT NULL DEFAULT 10,
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

CREATE TRIGGER trg_categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── PRODUCTS ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS products (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  category_id         UUID        NOT NULL REFERENCES categories (id),
  product_name        TEXT        NOT NULL,
  barcode             TEXT,
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
  -- Alert flags (set by cron job)
  alert_low_stock     BOOLEAN     NOT NULL DEFAULT FALSE,
  alert_expiring_soon BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_user_id     ON products (user_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products (category_id);
CREATE INDEX IF NOT EXISTS idx_products_barcode     ON products (barcode);
CREATE INDEX IF NOT EXISTS idx_products_expiry_date ON products (expiry_date);
CREATE INDEX IF NOT EXISTS idx_products_quantity    ON products (quantity);
-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_products_fts ON products
  USING GIN (to_tsvector('english', product_name || ' ' || COALESCE(brand, '')));

CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── SCAN HISTORY ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS scan_history (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  product_id UUID        REFERENCES products (id) ON DELETE SET NULL,
  barcode    TEXT,
  action     scan_action NOT NULL,
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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

CREATE TRIGGER trg_wp_updated_at
  BEFORE UPDATE ON wholesaler_products
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── ORDERS ────────────────────────────────────────────────────────────────────

CREATE TYPE order_status AS ENUM ('pending', 'accepted', 'dispatched', 'delivered', 'cancelled');

CREATE TABLE IF NOT EXISTS orders (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id      UUID         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  seller_id     UUID         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  product_id    UUID         NOT NULL REFERENCES wholesaler_products (id) ON DELETE CASCADE,
  quantity      INTEGER      NOT NULL CHECK (quantity > 0),
  total_price   NUMERIC(12, 2) NOT NULL CHECK (total_price > 0),
  status        order_status NOT NULL DEFAULT 'pending',
  notes         TEXT,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_buyer_id  ON orders (buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_seller_id ON orders (seller_id);
CREATE INDEX IF NOT EXISTS idx_orders_status    ON orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_created   ON orders (created_at DESC);

CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── CONNECTIONS ───────────────────────────────────────────────────────────────

CREATE TYPE connection_status AS ENUM ('pending', 'accepted', 'rejected');

CREATE TABLE IF NOT EXISTS connections (
  id             UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_owner_id  UUID              NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  wholesaler_id  UUID              NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  status         connection_status NOT NULL DEFAULT 'pending',
  initiator_id   UUID              REFERENCES users (id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_connection UNIQUE (shop_owner_id, wholesaler_id)
);

CREATE INDEX IF NOT EXISTS idx_conn_shop_owner  ON connections (shop_owner_id);
CREATE INDEX IF NOT EXISTS idx_conn_wholesaler  ON connections (wholesaler_id);
CREATE INDEX IF NOT EXISTS idx_conn_status      ON connections (status);

CREATE TRIGGER trg_connections_updated_at
  BEFORE UPDATE ON connections
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── LOCATION & PROFILE EXTENSIONS ───────────────────────────────────────────
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS latitude            DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude           DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS address             TEXT,
  ADD COLUMN IF NOT EXISTS is_profile_complete BOOLEAN NOT NULL DEFAULT FALSE;

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
  message         TEXT        NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_conv_id ON messages (conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages (created_at ASC);

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
-- If you add a frontend Supabase client, add user-scoped policies here.

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
