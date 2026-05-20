-- ============================================================
-- RESELLER SYSTEM MIGRATION
-- Run this against your database to add the reseller system.
-- Safe to run multiple times (IF NOT EXISTS / DO blocks).
-- ============================================================

-- ── 1. users table — reseller columns ───────────────────────
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_reseller         BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS referral_code        VARCHAR(20) UNIQUE,
  ADD COLUMN IF NOT EXISTS commission_balance   DECIMAL(12,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS total_withdrawn      DECIMAL(12,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS referred_by          VARCHAR(20),
  ADD COLUMN IF NOT EXISTS reseller_store_name  VARCHAR(100),
  ADD COLUMN IF NOT EXISTS branding_enabled     BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS brand_pro_active     BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS brand_pro_setup_paid BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS branding_config      JSONB,
  ADD COLUMN IF NOT EXISTS brand_custom_domain  VARCHAR(100),
  ADD COLUMN IF NOT EXISTS favicon_url          VARCHAR(255);

-- ── 2. data_plans table — reseller pricing columns ──────────
ALTER TABLE data_plans
  ADD COLUMN IF NOT EXISTS reseller_price     DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS reseller_pro_price DECIMAL(10,2);

-- ── 3. transactions table — reseller tracking ───────────────
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS reseller_id       INTEGER REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS commission_amount DECIMAL(10,2);

-- ── 4. reseller_pricing — per-reseller custom selling prices ─
CREATE TABLE IF NOT EXISTS reseller_pricing (
  id                 SERIAL PRIMARY KEY,
  reseller_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  data_plan_id       INTEGER NOT NULL REFERENCES data_plans(id) ON DELETE CASCADE,
  custom_price       DECIMAL(10,2) NOT NULL,
  markup_amount      DECIMAL(10,2),
  markup_percentage  DECIMAL(5,2),
  is_active          BOOLEAN DEFAULT true,
  updated_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(reseller_id, data_plan_id)
);

-- ── 5. reseller_cost_overrides — admin VIP wholesale prices ──
CREATE TABLE IF NOT EXISTS reseller_cost_overrides (
  id            SERIAL PRIMARY KEY,
  reseller_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  data_plan_id  INTEGER NOT NULL REFERENCES data_plans(id) ON DELETE CASCADE,
  cost_price    DECIMAL(10,2) NOT NULL,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(reseller_id, data_plan_id)
);

-- ── 6. referral_codes ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS referral_codes (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referral_code   VARCHAR(20) NOT NULL UNIQUE,
  commission_rate DECIMAL(5,2) DEFAULT 1.00,
  total_referrals INTEGER DEFAULT 0,
  total_earnings  DECIMAL(12,2) DEFAULT 0.00,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── 7. referrals — who recruited whom ───────────────────────
CREATE TABLE IF NOT EXISTS referrals (
  id                SERIAL PRIMARY KEY,
  referrer_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referral_code     VARCHAR(20) NOT NULL,
  commission_rate   DECIMAL(5,2) DEFAULT 1.00,
  total_earned      DECIMAL(12,2) DEFAULT 0.00,
  commission_paid   BOOLEAN DEFAULT false,
  commission_amount DECIMAL(10,2) DEFAULT 0.00,
  first_purchase_at TIMESTAMP,
  status            VARCHAR(20) DEFAULT 'active',
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(referrer_id, referred_id)
);

-- ── 8. commissions ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS commissions (
  id               SERIAL PRIMARY KEY,
  referrer_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  transaction_id   INTEGER REFERENCES transactions(id) ON DELETE SET NULL,
  amount           DECIMAL(10,2) NOT NULL,
  commission_rate  DECIMAL(5,2) NOT NULL,
  status           VARCHAR(20) DEFAULT 'pending',
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── 9. withdrawal_requests ───────────────────────────────────
CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id                      SERIAL PRIMARY KEY,
  user_id                 INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount                  DECIMAL(12,2) NOT NULL,
  commission_ids          INTEGER[],
  account_details         JSONB NOT NULL,
  status                  VARCHAR(30) DEFAULT 'pending',
  reference               VARCHAR(100) UNIQUE,
  paystack_recipient_code VARCHAR(100),
  paystack_transfer_code  VARCHAR(100),
  transfer_error          TEXT,
  admin_note              TEXT,
  reviewed_by             INTEGER REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at             TIMESTAMP,
  created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── Indexes ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_reseller_pricing_reseller ON reseller_pricing(reseller_id);
CREATE INDEX IF NOT EXISTS idx_reseller_pricing_plan ON reseller_pricing(data_plan_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON referrals(referred_id);
CREATE INDEX IF NOT EXISTS idx_commissions_referrer ON commissions(referrer_id);
CREATE INDEX IF NOT EXISTS idx_commissions_status ON commissions(status);
CREATE INDEX IF NOT EXISTS idx_withdrawal_user ON withdrawal_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_reseller ON transactions(reseller_id);
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);
CREATE INDEX IF NOT EXISTS idx_users_referred_by ON users(referred_by);
