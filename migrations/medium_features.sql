-- =============================================================
-- Migration: Medium Features — New tables and columns
-- =============================================================

-- 1. Expenses table (Feature #59)
CREATE TABLE IF NOT EXISTS expenses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount      DECIMAL(12, 2) NOT NULL,
  category    TEXT NOT NULL CHECK (category IN ('rent', 'salary', 'utilities', 'transport', 'misc')),
  description TEXT DEFAULT '',
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_expenses_user_id   ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date      ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_category  ON expenses(category);

-- 2. Add last_reminder_sent to orders (Feature #79)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS last_reminder_sent TIMESTAMPTZ;

-- 3. Ensure payment_status column exists on orders (re-run for safety)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status TEXT CHECK (payment_status IN ('paid', 'unpaid', 'partial')) DEFAULT 'unpaid';

-- 4. Ensure order_items table has proper indexes for analytics queries (Features #42, #43, #46)
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id   ON order_items(order_id);

-- 5. Ensure activity_logs table exists (for dues reminder logging — Feature #79)
CREATE TABLE IF NOT EXISTS activity_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  user_role   TEXT,
  action      TEXT NOT NULL,
  entity      TEXT,
  entity_id   UUID,
  description TEXT,
  ip_address  TEXT,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id   ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action    ON activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);

-- 6. Supplier ratings (always create if missing)
CREATE TABLE IF NOT EXISTS supplier_ratings (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewer_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  supplier_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating       SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text  TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(reviewer_id, supplier_id)
);

CREATE INDEX IF NOT EXISTS idx_supplier_ratings_supplier ON supplier_ratings(supplier_id);
