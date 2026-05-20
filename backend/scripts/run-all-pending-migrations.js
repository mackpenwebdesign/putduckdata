#!/usr/bin/env node
/**
 * Consolidated pending migrations runner.
 * Safe to run multiple times — all statements use IF NOT EXISTS / ON CONFLICT DO NOTHING.
 */
import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dir, '../../.env') });
dotenv.config({ path: join(__dir, '../.env') });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error('❌ DATABASE_URL not set'); process.exit(1); }

const sql = neon(DATABASE_URL);

const steps = [
  // ── v3: users columns ──
  {
    name: 'users — v3 columns (phone_number, is_admin, is_blocked, last_login_ip, last_login_at, updated_at)',
    fn: () => sql`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS phone_number  VARCHAR(20),
        ADD COLUMN IF NOT EXISTS is_admin      BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS is_blocked    BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS last_login_ip VARCHAR(45),
        ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP,
        ADD COLUMN IF NOT EXISTS updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    `,
  },
  {
    name: 'users — index on is_admin',
    fn: () => sql`CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users(is_admin)`,
  },

  // ── v3: data_plans columns ──
  {
    name: 'data_plans — v3 columns (cost_price, provider_plan_id, volume_mb, updated_at)',
    fn: () => sql`
      ALTER TABLE data_plans
        ADD COLUMN IF NOT EXISTS plan_name        VARCHAR(100),
        ADD COLUMN IF NOT EXISTS data_volume      VARCHAR(50),
        ADD COLUMN IF NOT EXISTS cost_price       DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        ADD COLUMN IF NOT EXISTS provider_plan_id INTEGER,
        ADD COLUMN IF NOT EXISTS volume_mb        INTEGER,
        ADD COLUMN IF NOT EXISTS updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    `,
  },

  // ── v3: transactions columns ──
  {
    name: 'transactions — v3 columns (recipient_phone, data_plan_id, payment_locked, updated_at)',
    fn: () => sql`
      ALTER TABLE transactions
        ADD COLUMN IF NOT EXISTS recipient_phone VARCHAR(20),
        ADD COLUMN IF NOT EXISTS data_plan_id    INTEGER REFERENCES data_plans(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS payment_locked  BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    `,
  },
  {
    name: 'transactions — indexes (type, created_at)',
    fn: () => sql`
      CREATE INDEX IF NOT EXISTS idx_transactions_type       ON transactions(type);
      CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at)
    `,
  },

  // ── momo_payments table ──
  {
    name: 'momo_payments — create table',
    fn: () => sql`
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
      )
    `,
  },
  {
    name: 'momo_payments — indexes',
    fn: () => sql`
      CREATE INDEX IF NOT EXISTS idx_momo_user_id   ON momo_payments(user_id);
      CREATE INDEX IF NOT EXISTS idx_momo_status    ON momo_payments(status);
      CREATE INDEX IF NOT EXISTS idx_momo_reference ON momo_payments(reference)
    `,
  },

  // ── notifications metadata ──
  {
    name: 'notifications — add metadata column',
    fn: () => sql`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS metadata JSONB`,
  },

  // ── broadcasts table ──
  {
    name: 'broadcasts — create table',
    fn: () => sql`
      CREATE TABLE IF NOT EXISTS broadcasts (
        id         SERIAL PRIMARY KEY,
        title      VARCHAR(200) NOT NULL,
        message    TEXT NOT NULL,
        url        TEXT,
        targets    VARCHAR(50) NOT NULL DEFAULT 'all',
        is_active  BOOLEAN DEFAULT true,
        expires_at TIMESTAMP,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `,
  },
  {
    name: 'broadcasts — indexes',
    fn: () => sql`
      CREATE INDEX IF NOT EXISTS idx_broadcasts_active  ON broadcasts(is_active);
      CREATE INDEX IF NOT EXISTS idx_broadcasts_targets ON broadcasts(targets);
      CREATE INDEX IF NOT EXISTS idx_broadcasts_created ON broadcasts(created_at DESC)
    `,
  },
  {
    name: 'broadcasts — expires_at column (idempotent)',
    fn: () => sql`ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP`,
  },
  {
    name: 'broadcasts — active view (with expiry)',
    fn: () => sql`
      CREATE OR REPLACE VIEW active_broadcasts AS
      SELECT id, title, message, url, targets, is_active, created_at
      FROM broadcasts
      WHERE is_active = true
        AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
      ORDER BY created_at DESC
      LIMIT 5
    `,
  },

  // ── system_settings defaults ──
  {
    name: 'system_settings — maintenance + security defaults',
    fn: () => sql`
      INSERT INTO system_settings (setting_key, setting_value, description) VALUES
        ('maintenance_mode',              'false', 'Enable/disable maintenance mode'),
        ('maintenance_message',           '""',    'Message shown during maintenance'),
        ('maintenance_scheduled_start',   '""',    'Scheduled maintenance start time'),
        ('maintenance_scheduled_end',     '""',    'Scheduled maintenance end time'),
        ('max_login_attempts',            '5',     'Failed attempts before lockout'),
        ('lockout_duration_minutes',      '15',    'Lockout duration in minutes'),
        ('password_reset_expiry_minutes', '15',    'Password reset token expiry')
      ON CONFLICT (setting_key) DO NOTHING
    `,
  },

  // ── reseller system (idempotent — already run, but safe) ──
  {
    name: 'users — reseller columns',
    fn: () => sql`
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
        ADD COLUMN IF NOT EXISTS favicon_url          VARCHAR(255)
    `,
  },
  {
    name: 'data_plans — reseller pricing columns',
    fn: () => sql`
      ALTER TABLE data_plans
        ADD COLUMN IF NOT EXISTS reseller_price     DECIMAL(10,2),
        ADD COLUMN IF NOT EXISTS reseller_pro_price DECIMAL(10,2)
    `,
  },
  {
    name: 'transactions — reseller tracking columns',
    fn: () => sql`
      ALTER TABLE transactions
        ADD COLUMN IF NOT EXISTS reseller_id       INTEGER REFERENCES users(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS commission_amount DECIMAL(10,2)
    `,
  },
  {
    name: 'reseller_pricing — create table',
    fn: () => sql`
      CREATE TABLE IF NOT EXISTS reseller_pricing (
        id                SERIAL PRIMARY KEY,
        reseller_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        data_plan_id      INTEGER NOT NULL REFERENCES data_plans(id) ON DELETE CASCADE,
        custom_price      DECIMAL(10,2) NOT NULL,
        markup_amount     DECIMAL(10,2),
        markup_percentage DECIMAL(5,2),
        is_active         BOOLEAN DEFAULT true,
        updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(reseller_id, data_plan_id)
      )
    `,
  },
  {
    name: 'reseller_cost_overrides — create table',
    fn: () => sql`
      CREATE TABLE IF NOT EXISTS reseller_cost_overrides (
        id           SERIAL PRIMARY KEY,
        reseller_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        data_plan_id INTEGER NOT NULL REFERENCES data_plans(id) ON DELETE CASCADE,
        cost_price   DECIMAL(10,2) NOT NULL,
        updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(reseller_id, data_plan_id)
      )
    `,
  },
  {
    name: 'referral_codes — create table',
    fn: () => sql`
      CREATE TABLE IF NOT EXISTS referral_codes (
        id              SERIAL PRIMARY KEY,
        user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        referral_code   VARCHAR(20) NOT NULL UNIQUE,
        commission_rate DECIMAL(5,2) DEFAULT 1.00,
        total_referrals INTEGER DEFAULT 0,
        total_earnings  DECIMAL(12,2) DEFAULT 0.00,
        is_active       BOOLEAN DEFAULT true,
        created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `,
  },
  {
    name: 'referrals — create table',
    fn: () => sql`
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
      )
    `,
  },
  {
    name: 'commissions — create table (referred_user_id nullable for guest purchases)',
    fn: () => sql`
      CREATE TABLE IF NOT EXISTS commissions (
        id               SERIAL PRIMARY KEY,
        referrer_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        referred_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        transaction_id   INTEGER REFERENCES transactions(id) ON DELETE SET NULL,
        amount           DECIMAL(10,2) NOT NULL,
        commission_rate  DECIMAL(5,2) NOT NULL,
        status           VARCHAR(20) DEFAULT 'pending',
        created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `,
  },
  {
    name: 'commissions — make referred_user_id nullable (if table already existed with NOT NULL)',
    fn: () => sql`ALTER TABLE commissions ALTER COLUMN referred_user_id DROP NOT NULL`,
  },
  {
    name: 'withdrawal_requests — create table',
    fn: () => sql`
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
      )
    `,
  },

  // ── indexes ──
  { name: 'index: reseller_pricing.reseller_id',  fn: () => sql`CREATE INDEX IF NOT EXISTS idx_reseller_pricing_reseller ON reseller_pricing(reseller_id)` },
  { name: 'index: reseller_pricing.data_plan_id', fn: () => sql`CREATE INDEX IF NOT EXISTS idx_reseller_pricing_plan ON reseller_pricing(data_plan_id)` },
  { name: 'index: referrals.referrer_id',          fn: () => sql`CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id)` },
  { name: 'index: referrals.referred_id',          fn: () => sql`CREATE INDEX IF NOT EXISTS idx_referrals_referred ON referrals(referred_id)` },
  { name: 'index: commissions.referrer_id',        fn: () => sql`CREATE INDEX IF NOT EXISTS idx_commissions_referrer ON commissions(referrer_id)` },
  { name: 'index: commissions.status',             fn: () => sql`CREATE INDEX IF NOT EXISTS idx_commissions_status ON commissions(status)` },
  { name: 'index: withdrawal_requests.user_id',    fn: () => sql`CREATE INDEX IF NOT EXISTS idx_withdrawal_user ON withdrawal_requests(user_id)` },
  { name: 'index: transactions.reseller_id',       fn: () => sql`CREATE INDEX IF NOT EXISTS idx_transactions_reseller ON transactions(reseller_id)` },
  { name: 'index: users.referral_code',            fn: () => sql`CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code)` },
  { name: 'index: users.referred_by',              fn: () => sql`CREATE INDEX IF NOT EXISTS idx_users_referred_by ON users(referred_by)` },
];

const run = async () => {
  console.log(`🚀 Running ${steps.length} migration steps...\n`);
  let ok = 0, fail = 0;
  for (const step of steps) {
    try {
      await step.fn();
      console.log(`  ✅ ${step.name}`);
      ok++;
    } catch (e) {
      console.error(`  ❌ ${step.name}: ${e.message}`);
      fail++;
    }
  }
  console.log(`\n${fail === 0 ? '✅' : '⚠️ '} Done — ${ok} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
};

run().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
