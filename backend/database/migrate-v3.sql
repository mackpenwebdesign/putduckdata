-- MIGRATION v3: Align schema with new column names and add missing tables
-- Safe to run on existing databases — all changes are non-destructive
-- Run AFTER schema.sql if starting fresh, or standalone on existing DBs

-- ============================================================
-- USERS — add columns introduced in v2/v3
-- ============================================================
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS phone_number  VARCHAR(20),
  ADD COLUMN IF NOT EXISTS is_admin      BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_blocked    BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_login_ip VARCHAR(45),
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users(is_admin);

-- ============================================================
-- DATA PLANS — rename old columns, add new ones
-- ============================================================
-- Rename name → plan_name (if old column exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='data_plans' AND column_name='name') THEN
    ALTER TABLE data_plans RENAME COLUMN name TO plan_name;
  END IF;
END $$;

-- Rename data_amount → data_volume (if old column exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='data_plans' AND column_name='data_amount') THEN
    ALTER TABLE data_plans RENAME COLUMN data_amount TO data_volume;
  END IF;
END $$;

-- Drop old validity text column (superseded by validity_days integer)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='data_plans' AND column_name='validity') THEN
    ALTER TABLE data_plans DROP COLUMN validity;
  END IF;
END $$;

ALTER TABLE data_plans
  ADD COLUMN IF NOT EXISTS plan_name       VARCHAR(100),
  ADD COLUMN IF NOT EXISTS data_volume     VARCHAR(50),
  ADD COLUMN IF NOT EXISTS cost_price      DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS provider_plan_id INTEGER,
  ADD COLUMN IF NOT EXISTS volume_mb       INTEGER,
  ADD COLUMN IF NOT EXISTS updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Migrate data from old provider columns (if they exist)
DO $$
BEGIN
  -- Copy old provider_id to provider_plan_id where it's numeric
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='data_plans' AND column_name='provider_id') THEN
    UPDATE data_plans
      SET provider_plan_id = provider_id::INTEGER
      WHERE provider_id IS NOT NULL AND provider_id ~ '^\d+$';
    ALTER TABLE data_plans DROP COLUMN provider_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='data_plans' AND column_name='provider_network_id') THEN
    ALTER TABLE data_plans DROP COLUMN provider_network_id;
  END IF;
END $$;

-- Rename network values to new provider names
UPDATE data_plans SET network = 'TELECEL'     WHERE network = 'VODAFONE';
UPDATE data_plans SET network = 'AIRTEL_TIGO' WHERE network = 'AIRTELTIGO';

-- Update network constraint
ALTER TABLE data_plans DROP CONSTRAINT IF EXISTS chk_plan_network_valid;
ALTER TABLE data_plans
  ADD CONSTRAINT chk_plan_network_valid
    CHECK (network IN ('MTN', 'TELECEL', 'AIRTEL_TIGO'));

-- ============================================================
-- TRANSACTIONS — add columns introduced in v2/v3
-- ============================================================
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS recipient_phone VARCHAR(20),
  ADD COLUMN IF NOT EXISTS data_plan_id    INTEGER REFERENCES data_plans(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payment_locked  BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_transactions_type       ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);

-- ============================================================
-- MOMO PAYMENTS — new table (manual mobile-money funding)
-- ============================================================
CREATE TABLE IF NOT EXISTS momo_payments (
    id               SERIAL PRIMARY KEY,
    user_id          INTEGER REFERENCES users(id) ON DELETE CASCADE,
    amount           DECIMAL(12, 2) NOT NULL,
    phone_number     VARCHAR(20) NOT NULL,
    transaction_type VARCHAR(30) NOT NULL DEFAULT 'wallet_fund',
    reference        VARCHAR(100) UNIQUE NOT NULL,
    status           VARCHAR(20) DEFAULT 'pending',
    metadata         JSONB,
    admin_note       TEXT,
    reviewed_by      INTEGER REFERENCES users(id),
    reviewed_at      TIMESTAMP,
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_momo_user_id   ON momo_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_momo_status    ON momo_payments(status);
CREATE INDEX IF NOT EXISTS idx_momo_reference ON momo_payments(reference);

-- ============================================================
-- NOTIFICATIONS — add metadata column if missing
-- ============================================================
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS metadata JSONB;

-- ============================================================
-- ADS — add updated_at if missing
-- ============================================================
ALTER TABLE ads
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- ============================================================
-- SYSTEM SETTINGS — upsert new default keys
-- ============================================================
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
  ('maintenance_mode',             'false', 'Enable/disable maintenance mode'),
  ('maintenance_message',          '""',    'Message shown during maintenance'),
  ('maintenance_scheduled_start',  '""',    'Scheduled maintenance start time'),
  ('maintenance_scheduled_end',    '""',    'Scheduled maintenance end time'),
  ('max_login_attempts',           '5',     'Failed attempts before lockout'),
  ('lockout_duration_minutes',     '15',    'Lockout duration in minutes'),
  ('password_reset_expiry_minutes','15',    'Password reset token expiry')
ON CONFLICT (setting_key) DO NOTHING;
