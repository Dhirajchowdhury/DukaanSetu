-- ==============================
-- Finance Module (Features #60, #63, #65)
-- ==============================

-- Credit / BNPL accounts
CREATE TABLE IF NOT EXISTS credit_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  credit_limit NUMERIC(12,2) NOT NULL DEFAULT 0,
  balance_used NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_credit_accounts_user ON credit_accounts(user_id);

-- Credit transactions ledger
CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_account_id UUID NOT NULL REFERENCES credit_accounts(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  amount NUMERIC(12,2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('debit', 'credit')),
  note TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_account ON credit_transactions(credit_account_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_order ON credit_transactions(order_id);

-- Enable RLS
ALTER TABLE credit_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

-- RLS policies (service-role bypasses these, but good practice)
DROP POLICY IF EXISTS credit_accounts_user ON credit_accounts;
CREATE POLICY credit_accounts_user ON credit_accounts
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS credit_transactions_user ON credit_transactions;
CREATE POLICY credit_transactions_user ON credit_transactions
  USING (credit_account_id IN (SELECT id FROM credit_accounts WHERE user_id = auth.uid()));
