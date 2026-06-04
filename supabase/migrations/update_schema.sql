-- ============================================================
-- SQL Migration to Fix Missing Tables and Columns
-- Ensure you have run deduplicate_categories.js before running this script
-- to prevent duplicate key errors on the categories table.
-- ============================================================

-- 1. ADD MISSING COLUMNS
-- Add payment_status to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid', 'partially_paid'));

-- 2. FIX CATEGORIES CONSTRAINT
-- Drop the existing composite unique constraint and add a strict unique constraint on name
ALTER TABLE categories DROP CONSTRAINT IF EXISTS uq_user_category;
ALTER TABLE categories ADD CONSTRAINT uq_categories_name UNIQUE (name);

-- 3. CREATE MISSING TABLES

-- EXPENSES
CREATE TABLE IF NOT EXISTS expenses (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount      NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  category    TEXT        NOT NULL,
  description TEXT,
  date        DATE        NOT NULL DEFAULT CURRENT_DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses (user_id);
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- ACTIVITY LOGS
CREATE TABLE IF NOT EXISTS activity_logs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        REFERENCES users(id) ON DELETE SET NULL,
  user_role   TEXT,
  action      TEXT        NOT NULL,
  entity      TEXT        NOT NULL,
  entity_id   UUID,
  description TEXT,
  ip_address  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs (user_id);
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- SUPPLIER RATINGS
CREATE TABLE IF NOT EXISTS supplier_ratings (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewer_id UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  supplier_id UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating      INTEGER     NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_reviewer_supplier UNIQUE (reviewer_id, supplier_id)
);
CREATE INDEX IF NOT EXISTS idx_supplier_ratings_supplier ON supplier_ratings (supplier_id);
ALTER TABLE supplier_ratings ENABLE ROW LEVEL SECURITY;

-- CUSTOMERS
CREATE TABLE IF NOT EXISTS customers (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name            TEXT        NOT NULL,
  phone           TEXT,
  email           TEXT,
  loyalty_points  INTEGER     NOT NULL DEFAULT 0 CHECK (loyalty_points >= 0),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers (user_id);
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- LOYALTY TRANSACTIONS
CREATE TABLE IF NOT EXISTS loyalty_transactions (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id     UUID        NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  points_added    INTEGER     NOT NULL DEFAULT 0 CHECK (points_added >= 0),
  points_redeemed INTEGER     NOT NULL DEFAULT 0 CHECK (points_redeemed >= 0),
  reason          TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_loyalty_tx_customer ON loyalty_transactions (customer_id);
ALTER TABLE loyalty_transactions ENABLE ROW LEVEL SECURITY;

-- DISCOUNT RULES
CREATE TABLE IF NOT EXISTS discount_rules (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rule_type           TEXT        NOT NULL,
  discount_percentage NUMERIC(5, 2) NOT NULL CHECK (discount_percentage >= 0),
  min_order_value     NUMERIC(12, 2) NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE discount_rules ENABLE ROW LEVEL SECURITY;

-- CUSTOMER FEEDBACK
CREATE TABLE IF NOT EXISTS customer_feedback (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID        NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  order_id    UUID        REFERENCES orders(id) ON DELETE SET NULL,
  rating      INTEGER     NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE customer_feedback ENABLE ROW LEVEL SECURITY;

-- CREDIT ACCOUNTS
CREATE TABLE IF NOT EXISTS credit_accounts (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seller_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  credit_limit NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (credit_limit >= 0),
  balance_used NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (balance_used >= 0),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_credit_account UNIQUE (buyer_id, seller_id)
);
ALTER TABLE credit_accounts ENABLE ROW LEVEL SECURITY;

-- CREDIT TRANSACTIONS
CREATE TABLE IF NOT EXISTS credit_transactions (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id       UUID        NOT NULL REFERENCES credit_accounts(id) ON DELETE CASCADE,
  amount           NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  transaction_type TEXT        NOT NULL CHECK (transaction_type IN ('credit', 'payment')),
  reference_id     UUID,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

-- SUBSCRIPTIONS
CREATE TABLE IF NOT EXISTS subscriptions (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id           UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seller_id          UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id         UUID        NOT NULL REFERENCES wholesaler_products(id) ON DELETE CASCADE,
  quantity           INTEGER     NOT NULL CHECK (quantity > 0),
  frequency          TEXT        NOT NULL,
  status             TEXT        NOT NULL DEFAULT 'active',
  next_delivery_date DATE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- DELIVERIES
CREATE TABLE IF NOT EXISTS deliveries (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID        NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  delivery_date   DATE        NOT NULL,
  status          TEXT        NOT NULL DEFAULT 'pending',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;

-- Auto-update updated_at triggers for new tables
DO $$
DECLARE
    t TEXT;
BEGIN
    FOR t IN 
        SELECT unnest(ARRAY['customers', 'credit_accounts', 'subscriptions', 'deliveries']) 
    LOOP
        EXECUTE format('
            DROP TRIGGER IF EXISTS trg_%I_updated_at ON %I;
            CREATE TRIGGER trg_%I_updated_at
            BEFORE UPDATE ON %I
            FOR EACH ROW EXECUTE FUNCTION set_updated_at();
        ', t, t, t, t);
    END LOOP;
END;
$$;
