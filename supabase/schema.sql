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

-- ── ROW LEVEL SECURITY ────────────────────────────────────────────────────────
-- The backend uses the service-role key which bypasses RLS.
-- These policies protect direct client access if you ever enable it.

ALTER TABLE users        ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories   ENABLE ROW LEVEL SECURITY;
ALTER TABLE products     ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_store    ENABLE ROW LEVEL SECURITY;

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
