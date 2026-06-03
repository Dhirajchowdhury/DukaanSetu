-- =============================================================
-- Migration: Easy Wins — New tables and columns for 12 features
-- =============================================================

-- 1. Activity Audit Trail
CREATE TABLE IF NOT EXISTS activity_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action      TEXT NOT NULL,          -- e.g. 'CREATE_ORDER', 'UPDATE_PRODUCT', 'SEND_CONNECTION'
  entity_type TEXT NOT NULL,          -- e.g. 'order', 'product', 'connection'
  entity_id   UUID,                   -- the record that was affected
  metadata    JSONB DEFAULT '{}',     -- extra context (old/new values, request body)
  ip_address  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id   ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);

-- 2. Supplier Ratings
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

-- 3. Payment Status on Orders (for Pending Dues feature)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status TEXT CHECK (payment_status IN ('paid', 'unpaid', 'partial')) DEFAULT 'unpaid';

-- 4. Scan History (for Stock History / Scan Log feature)
CREATE TABLE IF NOT EXISTS scan_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID REFERENCES products(id) ON DELETE SET NULL,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  barcode     TEXT,
  action      TEXT NOT NULL DEFAULT 'scan',  -- 'scan', 'lookup'
  result      JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scan_history_user_id    ON scan_history(user_id);
CREATE INDEX IF NOT EXISTS idx_scan_history_product_id ON scan_history(product_id);

-- 5. Product Rankings view (read-only convenience)
CREATE OR REPLACE VIEW product_ranking AS
SELECT
  p.id AS product_id,
  p."productName" AS product_name,
  p.quantity AS stock_available,
  p."costPrice",
  p."sellingPrice",
  COALESCE(SUM(oi.quantity), 0) AS total_sold,
  COUNT(DISTINCT oi.order_id) AS order_count,
  MAX(o.created_at) AS last_sold_at
FROM products p
LEFT JOIN order_items oi ON oi.product_id = p.id
LEFT JOIN orders o ON o.id = oi.order_id AND o.status != 'cancelled'
GROUP BY p.id;
