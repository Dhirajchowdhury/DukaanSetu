-- ==============================
-- Discount Engine (#72)
-- ==============================

CREATE TABLE IF NOT EXISTS discount_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('bulk', 'expiry', 'festival', 'manual')),
  condition_json JSONB NOT NULL,
  discount_pct NUMERIC(5,2) NOT NULL CHECK (discount_pct > 0 AND discount_pct <= 100),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_discount_rules_owner ON discount_rules(owner_id);
