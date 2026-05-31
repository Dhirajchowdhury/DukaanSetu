-- ============================================================
-- Seed: Sample Suppliers for "Discover Sellers"
-- Run this AFTER schema.sql has been applied.
-- ============================================================

-- Ensure columns exist (idempotent)
ALTER TABLE users ADD COLUMN IF NOT EXISTS shop_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE users ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;

-- Fix: any user with NULL shop_name gets a fallback (so filters don't remove them)
UPDATE users SET shop_name = email WHERE shop_name IS NULL;

-- RLS: allow public reads on users table

DROP POLICY IF EXISTS "Allow read users" ON users;
CREATE POLICY "Allow read users" ON users FOR SELECT USING (true);

-- Insert sample distributor/wholesaler/producer users
INSERT INTO users (id, email, role, shop_name, city, state, latitude, longitude, email_verified, password_hash)
VALUES
  (gen_random_uuid(), 'kalyani.traders@example.com',  'distributor', 'Kalyani Traders',  'Kalyani', 'WB', 22.9751,  88.4345,  TRUE,  '$2b$10$placeholder'),
  (gen_random_uuid(), 'freshmart@example.com',        'wholesaler',  'FreshMart Supply',  'Kalyani', 'WB', 22.9760,  88.4330,  TRUE,  '$2b$10$placeholder'),
  (gen_random_uuid(), 'bengal.agro@example.com',      'distributor', 'Bengal Agro Foods',  'Kolkata', 'WB', 22.5726,  88.3639,  TRUE,  '$2b$10$placeholder'),
  (gen_random_uuid(), 'metro.wholesale@example.com',  'wholesaler',  'Metro Wholesale Co', 'Kolkata', 'WB', 22.5740,  88.3650,  TRUE,  '$2b$10$placeholder'),
  (gen_random_uuid(), 'eastside.produce@example.com', 'producer',    'EastSide Produce',   'Siliguri','WB', 26.7271,  88.3953,  TRUE,  '$2b$10$placeholder')
ON CONFLICT (email) DO NOTHING;

-- Verify
SELECT id, email, role, shop_name, city, state, latitude, longitude
FROM users
WHERE role IN ('distributor', 'wholesaler', 'producer')
  AND is_deleted = FALSE
ORDER BY shop_name;
