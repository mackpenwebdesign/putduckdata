-- DATABASE CONSTRAINTS & TRIGGERS
-- Run this after schema.sql

-- ============================================================
-- Helper: add a constraint only if it doesn't already exist
-- ============================================================
DO $$
BEGIN

  -- USERS
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_wallet_balance_non_negative') THEN
    ALTER TABLE users ADD CONSTRAINT chk_wallet_balance_non_negative CHECK (wallet_balance >= 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_email_format') THEN
    ALTER TABLE users ADD CONSTRAINT chk_email_format
      CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
  END IF;

  -- TRANSACTIONS
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_tx_amount_positive') THEN
    ALTER TABLE transactions ADD CONSTRAINT chk_tx_amount_positive CHECK (amount > 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_tx_status_valid') THEN
    ALTER TABLE transactions ADD CONSTRAINT chk_tx_status_valid
      CHECK (status IN ('pending', 'processing', 'success', 'completed', 'failed'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_tx_type_valid') THEN
    ALTER TABLE transactions ADD CONSTRAINT chk_tx_type_valid
      CHECK (type IN (
        'wallet_fund', 'data_purchase', 'admin_fund',
        'admin_deduct', 'guest_data_purchase', 'refund'
      ));
  END IF;

  -- DATA PLANS
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_plan_price_positive') THEN
    ALTER TABLE data_plans ADD CONSTRAINT chk_plan_price_positive CHECK (price > 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_plan_validity_positive') THEN
    ALTER TABLE data_plans ADD CONSTRAINT chk_plan_validity_positive CHECK (validity_days > 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_plan_network_valid') THEN
    ALTER TABLE data_plans ADD CONSTRAINT chk_plan_network_valid
      CHECK (network IN ('MTN', 'TELECEL', 'AIRTEL_TIGO'));
  END IF;

  -- MOMO PAYMENTS
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_momo_amount_positive') THEN
    ALTER TABLE momo_payments ADD CONSTRAINT chk_momo_amount_positive CHECK (amount > 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_momo_status_valid') THEN
    ALTER TABLE momo_payments ADD CONSTRAINT chk_momo_status_valid
      CHECK (status IN ('pending', 'approved', 'rejected'));
  END IF;

END $$;

-- ============================================================
-- updated_at TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'users', 'data_plans', 'transactions', 'momo_payments', 'ads'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger WHERE tgname = 'trg_' || tbl || '_updated_at'
    ) THEN
      EXECUTE format(
        'CREATE TRIGGER trg_%I_updated_at BEFORE UPDATE ON %I
         FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
        tbl, tbl
      );
    END IF;
  END LOOP;
END;
$$;
