-- ================================
-- CLEANUP: Remove Reseller Infrastructure
-- ================================
-- Run this migration to remove all reseller/referral/commission/withdrawal
-- tables and columns from the database.
--
-- WARNING: This is destructive. Back up your database before running.
-- ================================

-- Drop reseller-related tables
DROP TABLE IF EXISTS commissions CASCADE;
DROP TABLE IF EXISTS referrals CASCADE;
DROP TABLE IF EXISTS referral_codes CASCADE;
DROP TABLE IF EXISTS withdrawal_requests CASCADE;

-- Remove reseller columns from users
ALTER TABLE users DROP COLUMN IF EXISTS is_reseller;
ALTER TABLE users DROP COLUMN IF EXISTS commission_balance;
ALTER TABLE users DROP COLUMN IF EXISTS total_withdrawn;

-- Remove reseller columns from data_plans
ALTER TABLE data_plans DROP COLUMN IF EXISTS reseller_price;

-- Remove reseller columns from transactions
ALTER TABLE transactions DROP COLUMN IF EXISTS reseller_id;
ALTER TABLE transactions DROP COLUMN IF EXISTS commission_amount;
