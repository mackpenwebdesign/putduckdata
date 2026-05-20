-- PutDuckData — COMPLETE DATABASE SCHEMA
-- Run this once on a fresh Neon PostgreSQL database
-- Order matters: users → data_plans → transactions → everything else

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id               SERIAL PRIMARY KEY,
    full_name        VARCHAR(100),
    email            VARCHAR(100) UNIQUE NOT NULL,
    password_hash    TEXT NOT NULL,
    phone_number     VARCHAR(20),
    is_admin         BOOLEAN DEFAULT false,
    is_blocked       BOOLEAN DEFAULT false,
    wallet_balance   DECIMAL(12, 2) DEFAULT 0.00,
    country          VARCHAR(50) DEFAULT 'Ghana',
    last_login_ip    VARCHAR(45),
    last_login_at    TIMESTAMP,
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email    ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users(is_admin);

-- ============================================================
-- DATA PLANS
-- ============================================================
CREATE TABLE IF NOT EXISTS data_plans (
    id               SERIAL PRIMARY KEY,
    network          VARCHAR(20) NOT NULL,          -- MTN | TELECEL | AIRTEL_TIGO
    plan_name        VARCHAR(100) NOT NULL,
    data_volume      VARCHAR(50) NOT NULL,          -- e.g. "1GB", "5GB"
    validity_days    INTEGER NOT NULL DEFAULT 90,
    price            DECIMAL(10, 2) NOT NULL,       -- retail price (GHS)
    cost_price       DECIMAL(10, 2) NOT NULL DEFAULT 0.00, -- wholesale cost from provider (GHS)
    provider_plan_id INTEGER,                       -- Smart Data Hub plan ID (from GET /plans)
    volume_mb        INTEGER,                       -- data volume in MB (display/info only)
    is_active        BOOLEAN DEFAULT true,
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_data_plans_network ON data_plans(network);
CREATE INDEX IF NOT EXISTS idx_data_plans_active  ON data_plans(is_active);

-- ============================================================
-- TRANSACTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS transactions (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER REFERENCES users(id) ON DELETE CASCADE,
    type            VARCHAR(30) NOT NULL,
    -- wallet_fund | data_purchase | admin_fund | admin_deduct | guest_data_purchase | refund
    amount          DECIMAL(12, 2) NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'pending',
    -- pending | processing | success | completed | failed
    reference       VARCHAR(100) UNIQUE NOT NULL,
    recipient_phone VARCHAR(20),
    data_plan_id    INTEGER REFERENCES data_plans(id) ON DELETE SET NULL,
    payment_locked  BOOLEAN DEFAULT false,
    metadata        JSONB,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id    ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_reference  ON transactions(reference);
CREATE INDEX IF NOT EXISTS idx_transactions_status     ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_type       ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);

-- ============================================================
-- MOMO PAYMENTS  (manual mobile-money wallet funding)
-- ============================================================
CREATE TABLE IF NOT EXISTS momo_payments (
    id               SERIAL PRIMARY KEY,
    user_id          INTEGER REFERENCES users(id) ON DELETE CASCADE,
    amount           DECIMAL(12, 2) NOT NULL,
    phone_number     VARCHAR(20) NOT NULL,
    transaction_type VARCHAR(30) NOT NULL DEFAULT 'wallet_fund',
    reference        VARCHAR(100) UNIQUE NOT NULL,
    status           VARCHAR(20) DEFAULT 'pending',  -- pending | approved | rejected
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
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
    type       VARCHAR(50) NOT NULL,
    title      VARCHAR(200) NOT NULL,
    message    TEXT NOT NULL,
    metadata   JSONB,
    is_read    BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_user    ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read    ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at);

-- ============================================================
-- JWT BLACKLIST  (token revocation on logout / password change)
-- ============================================================
CREATE TABLE IF NOT EXISTS jwt_blacklist (
    id          SERIAL PRIMARY KEY,
    token_jti   VARCHAR(100) UNIQUE NOT NULL,
    user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,
    reason      VARCHAR(100),
    expires_at  TIMESTAMP NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_jwt_jti     ON jwt_blacklist(token_jti);
CREATE INDEX IF NOT EXISTS idx_jwt_expires ON jwt_blacklist(expires_at);

-- ============================================================
-- PASSWORD RESET TOKENS
-- ============================================================
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,
    token_hash  VARCHAR(64) NOT NULL,
    expires_at  TIMESTAMP NOT NULL,
    used        BOOLEAN DEFAULT false,
    ip_address  VARCHAR(45),
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_prt_token   ON password_reset_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_prt_user    ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_prt_expires ON password_reset_tokens(expires_at);

-- ============================================================
-- SECURITY — failed login attempts & account lockouts
-- ============================================================
CREATE TABLE IF NOT EXISTS failed_login_attempts (
    id           SERIAL PRIMARY KEY,
    email        VARCHAR(100),
    ip_address   VARCHAR(45) NOT NULL,
    user_agent   TEXT,
    attempt_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_failed_login_email ON failed_login_attempts(email);
CREATE INDEX IF NOT EXISTS idx_failed_login_ip    ON failed_login_attempts(ip_address);
CREATE INDEX IF NOT EXISTS idx_failed_login_time  ON failed_login_attempts(attempt_time);

CREATE TABLE IF NOT EXISTS account_lockouts (
    id           SERIAL PRIMARY KEY,
    email        VARCHAR(100) NOT NULL,
    user_id      INTEGER REFERENCES users(id) ON DELETE CASCADE,
    locked_until TIMESTAMP NOT NULL,
    reason       VARCHAR(100),
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_lockouts_email   ON account_lockouts(email);
CREATE INDEX IF NOT EXISTS idx_lockouts_until   ON account_lockouts(locked_until);

-- ============================================================
-- SECURITY AUDIT LOG
-- ============================================================
CREATE TABLE IF NOT EXISTS security_audit_log (
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
    event_type VARCHAR(50) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    status     VARCHAR(20),
    details    JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_user    ON security_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_event   ON security_audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_created ON security_audit_log(created_at);

-- ============================================================
-- ADS
-- ============================================================
CREATE TABLE IF NOT EXISTS ads (
    id          SERIAL PRIMARY KEY,
    title       VARCHAR(150) NOT NULL,
    image_url   TEXT NOT NULL,
    target_link TEXT,
    is_active   BOOLEAN DEFAULT true,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ads_active ON ads(is_active);

-- ============================================================
-- SYSTEM SETTINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS system_settings (
    id          SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value JSONB NOT NULL,
    description TEXT,
    updated_by  INTEGER REFERENCES users(id),
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO system_settings (setting_key, setting_value, description) VALUES
  ('maintenance_mode',             'false', 'Enable/disable maintenance mode'),
  ('maintenance_message',          '""',    'Message shown during maintenance'),
  ('maintenance_scheduled_start',  '""',    'Scheduled maintenance start time'),
  ('maintenance_scheduled_end',    '""',    'Scheduled maintenance end time'),
  ('max_login_attempts',           '5',     'Failed attempts before lockout'),
  ('lockout_duration_minutes',     '15',    'Lockout duration in minutes'),
  ('password_reset_expiry_minutes','15',       'Password reset token expiry'),
  ('data_provider',                '"1papi"',   'Active data fulfilment provider')
ON CONFLICT (setting_key) DO NOTHING;

-- ============================================================
-- SEED DATA — default data plans
-- ============================================================
-- Seed plans — update provider_plan_id via Admin > Provider > Sync after first deploy
INSERT INTO data_plans (network, plan_name, data_volume, validity_days, price, cost_price, volume_mb) VALUES
-- MTN
('MTN', 'MTN 1GB Daily',    '1GB',  1,  5.00,  4.00,  1000),
('MTN', 'MTN 2GB Weekly',   '2GB',  7,  15.00, 12.00, 2000),
('MTN', 'MTN 5GB Monthly',  '5GB',  30, 35.00, 28.00, 5000),
('MTN', 'MTN 10GB Monthly', '10GB', 30, 60.00, 48.00, 10000),
('MTN', 'MTN 20GB Monthly', '20GB', 30, 100.00,80.00, 20000),
-- Telecel
('TELECEL', 'Telecel 1GB Weekly',   '1GB',  7,  12.00, 9.50,  1000),
('TELECEL', 'Telecel 3GB Monthly',  '3GB',  30, 30.00, 24.00, 3000),
('TELECEL', 'Telecel 6GB Monthly',  '6GB',  30, 50.00, 40.00, 6000),
('TELECEL', 'Telecel 15GB Monthly', '15GB', 30, 90.00, 72.00, 15000),
-- AirtelTigo
('AIRTEL_TIGO', 'AirtelTigo 1GB Weekly',   '1GB',  7,  10.00, 8.00,  1000),
('AIRTEL_TIGO', 'AirtelTigo 2GB Monthly',  '2GB',  30, 22.00, 18.00, 2000),
('AIRTEL_TIGO', 'AirtelTigo 5GB Monthly',  '5GB',  30, 45.00, 36.00, 5000),
('AIRTEL_TIGO', 'AirtelTigo 10GB Monthly', '10GB', 30, 70.00, 56.00, 10000)
ON CONFLICT DO NOTHING;
