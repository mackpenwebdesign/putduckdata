-- Fix cost prices to match provider reseller prices (2026-03-30)
-- Run this once manually. Going forward, use the sync endpoint.

-- ─── MTN ─────────────────────────────────────────────────────────────────────
UPDATE data_plans SET cost_price = 4.90,  updated_at = CURRENT_TIMESTAMP WHERE network = 'MTN' AND UPPER(REPLACE(data_volume,' ','')) = '1GB';
UPDATE data_plans SET cost_price = 13.50, updated_at = CURRENT_TIMESTAMP WHERE network = 'MTN' AND UPPER(REPLACE(data_volume,' ','')) = '3GB';
UPDATE data_plans SET cost_price = 18.70, updated_at = CURRENT_TIMESTAMP WHERE network = 'MTN' AND UPPER(REPLACE(data_volume,' ','')) = '4GB';
UPDATE data_plans SET cost_price = 23.20, updated_at = CURRENT_TIMESTAMP WHERE network = 'MTN' AND UPPER(REPLACE(data_volume,' ','')) = '5GB';
UPDATE data_plans SET cost_price = 26.50, updated_at = CURRENT_TIMESTAMP WHERE network = 'MTN' AND UPPER(REPLACE(data_volume,' ','')) = '6GB';
UPDATE data_plans SET cost_price = 30.50, updated_at = CURRENT_TIMESTAMP WHERE network = 'MTN' AND UPPER(REPLACE(data_volume,' ','')) = '7GB';
UPDATE data_plans SET cost_price = 36.50, updated_at = CURRENT_TIMESTAMP WHERE network = 'MTN' AND UPPER(REPLACE(data_volume,' ','')) = '8GB';
UPDATE data_plans SET cost_price = 41.50, updated_at = CURRENT_TIMESTAMP WHERE network = 'MTN' AND UPPER(REPLACE(data_volume,' ','')) = '10GB';
UPDATE data_plans SET cost_price = 61.50, updated_at = CURRENT_TIMESTAMP WHERE network = 'MTN' AND UPPER(REPLACE(data_volume,' ','')) = '15GB';
UPDATE data_plans SET cost_price = 82.00, updated_at = CURRENT_TIMESTAMP WHERE network = 'MTN' AND UPPER(REPLACE(data_volume,' ','')) = '20GB';
UPDATE data_plans SET cost_price = 103.00,updated_at = CURRENT_TIMESTAMP WHERE network = 'MTN' AND UPPER(REPLACE(data_volume,' ','')) = '25GB';
UPDATE data_plans SET cost_price = 122.00,updated_at = CURRENT_TIMESTAMP WHERE network = 'MTN' AND UPPER(REPLACE(data_volume,' ','')) = '30GB';
UPDATE data_plans SET cost_price = 160.00,updated_at = CURRENT_TIMESTAMP WHERE network = 'MTN' AND UPPER(REPLACE(data_volume,' ','')) = '40GB';
UPDATE data_plans SET cost_price = 199.00,updated_at = CURRENT_TIMESTAMP WHERE network = 'MTN' AND UPPER(REPLACE(data_volume,' ','')) = '50GB';

-- Insert MTN plans that may be missing (price = cost + ~20% markup)
INSERT INTO data_plans (network, plan_name, data_volume, validity_days, price, cost_price, volume_mb, is_active)
VALUES
  ('MTN', 'MTN 1GB',  '1GB',  30,  5.90,  4.90,  1000,  true),
  ('MTN', 'MTN 3GB',  '3GB',  30, 16.50, 13.50,  3000,  true),
  ('MTN', 'MTN 4GB',  '4GB',  30, 22.50, 18.70,  4000,  true),
  ('MTN', 'MTN 5GB',  '5GB',  30, 28.00, 23.20,  5000,  true),
  ('MTN', 'MTN 6GB',  '6GB',  30, 32.00, 26.50,  6000,  true),
  ('MTN', 'MTN 7GB',  '7GB',  30, 37.00, 30.50,  7000,  true),
  ('MTN', 'MTN 8GB',  '8GB',  30, 44.00, 36.50,  8000,  true),
  ('MTN', 'MTN 10GB', '10GB', 30, 50.00, 41.50, 10000,  true),
  ('MTN', 'MTN 15GB', '15GB', 30, 74.00, 61.50, 15000,  true),
  ('MTN', 'MTN 20GB', '20GB', 30, 99.00, 82.00, 20000,  true),
  ('MTN', 'MTN 25GB', '25GB', 30,124.00,103.00, 25000,  true),
  ('MTN', 'MTN 30GB', '30GB', 30,147.00,122.00, 30000,  true),
  ('MTN', 'MTN 40GB', '40GB', 30,192.00,160.00, 40000,  true),
  ('MTN', 'MTN 50GB', '50GB', 30,239.00,199.00, 50000,  true)
ON CONFLICT DO NOTHING;

-- ─── AIRTEL_TIGO ──────────────────────────────────────────────────────────────
UPDATE data_plans SET cost_price = 8.80,  updated_at = CURRENT_TIMESTAMP WHERE network = 'AIRTEL_TIGO' AND UPPER(REPLACE(data_volume,' ','')) = '2GB';
UPDATE data_plans SET cost_price = 13.00, updated_at = CURRENT_TIMESTAMP WHERE network = 'AIRTEL_TIGO' AND UPPER(REPLACE(data_volume,' ','')) = '3GB';
UPDATE data_plans SET cost_price = 17.30, updated_at = CURRENT_TIMESTAMP WHERE network = 'AIRTEL_TIGO' AND UPPER(REPLACE(data_volume,' ','')) = '4GB';
UPDATE data_plans SET cost_price = 22.00, updated_at = CURRENT_TIMESTAMP WHERE network = 'AIRTEL_TIGO' AND UPPER(REPLACE(data_volume,' ','')) = '5GB';
UPDATE data_plans SET cost_price = 27.00, updated_at = CURRENT_TIMESTAMP WHERE network = 'AIRTEL_TIGO' AND UPPER(REPLACE(data_volume,' ','')) = '6GB';
UPDATE data_plans SET cost_price = 30.00, updated_at = CURRENT_TIMESTAMP WHERE network = 'AIRTEL_TIGO' AND UPPER(REPLACE(data_volume,' ','')) = '7GB';
UPDATE data_plans SET cost_price = 33.00, updated_at = CURRENT_TIMESTAMP WHERE network = 'AIRTEL_TIGO' AND UPPER(REPLACE(data_volume,' ','')) = '8GB';
UPDATE data_plans SET cost_price = 45.30, updated_at = CURRENT_TIMESTAMP WHERE network = 'AIRTEL_TIGO' AND UPPER(REPLACE(data_volume,' ','')) = '10GB';
UPDATE data_plans SET cost_price = 59.00, updated_at = CURRENT_TIMESTAMP WHERE network = 'AIRTEL_TIGO' AND UPPER(REPLACE(data_volume,' ','')) = '15GB';

-- Insert AIRTEL_TIGO plans that may be missing
INSERT INTO data_plans (network, plan_name, data_volume, validity_days, price, cost_price, volume_mb, is_active)
VALUES
  ('AIRTEL_TIGO', 'AT 2GB',  '2GB',  30, 10.50,  8.80,  2000, true),
  ('AIRTEL_TIGO', 'AT 3GB',  '3GB',  30, 15.50, 13.00,  3000, true),
  ('AIRTEL_TIGO', 'AT 4GB',  '4GB',  30, 20.50, 17.30,  4000, true),
  ('AIRTEL_TIGO', 'AT 5GB',  '5GB',  30, 26.50, 22.00,  5000, true),
  ('AIRTEL_TIGO', 'AT 6GB',  '6GB',  30, 32.50, 27.00,  6000, true),
  ('AIRTEL_TIGO', 'AT 7GB',  '7GB',  30, 36.00, 30.00,  7000, true),
  ('AIRTEL_TIGO', 'AT 8GB',  '8GB',  30, 39.50, 33.00,  8000, true),
  ('AIRTEL_TIGO', 'AT 10GB', '10GB', 30, 54.50, 45.30, 10000, true),
  ('AIRTEL_TIGO', 'AT 15GB', '15GB', 30, 71.00, 59.00, 15000, true)
ON CONFLICT DO NOTHING;

-- ─── TELECEL ──────────────────────────────────────────────────────────────────
UPDATE data_plans SET cost_price = 38.00, updated_at = CURRENT_TIMESTAMP WHERE network = 'TELECEL' AND UPPER(REPLACE(data_volume,' ','')) = '10GB';
UPDATE data_plans SET cost_price = 46.00, updated_at = CURRENT_TIMESTAMP WHERE network = 'TELECEL' AND UPPER(REPLACE(data_volume,' ','')) = '12GB';
UPDATE data_plans SET cost_price = 56.50, updated_at = CURRENT_TIMESTAMP WHERE network = 'TELECEL' AND UPPER(REPLACE(data_volume,' ','')) = '15GB';
UPDATE data_plans SET cost_price = 75.00, updated_at = CURRENT_TIMESTAMP WHERE network = 'TELECEL' AND UPPER(REPLACE(data_volume,' ','')) = '20GB';
UPDATE data_plans SET cost_price = 92.50, updated_at = CURRENT_TIMESTAMP WHERE network = 'TELECEL' AND UPPER(REPLACE(data_volume,' ','')) = '25GB';
UPDATE data_plans SET cost_price = 108.50,updated_at = CURRENT_TIMESTAMP WHERE network = 'TELECEL' AND UPPER(REPLACE(data_volume,' ','')) = '30GB';
UPDATE data_plans SET cost_price = 128.50,updated_at = CURRENT_TIMESTAMP WHERE network = 'TELECEL' AND UPPER(REPLACE(data_volume,' ','')) = '35GB';
UPDATE data_plans SET cost_price = 143.50,updated_at = CURRENT_TIMESTAMP WHERE network = 'TELECEL' AND UPPER(REPLACE(data_volume,' ','')) = '40GB';

-- Insert TELECEL plans that may be missing
INSERT INTO data_plans (network, plan_name, data_volume, validity_days, price, cost_price, volume_mb, is_active)
VALUES
  ('TELECEL', 'Telecel 10GB', '10GB', 30,  45.50,  38.00, 10000, true),
  ('TELECEL', 'Telecel 12GB', '12GB', 30,  55.50,  46.00, 12000, true),
  ('TELECEL', 'Telecel 15GB', '15GB', 30,  68.00,  56.50, 15000, true),
  ('TELECEL', 'Telecel 20GB', '20GB', 30,  90.00,  75.00, 20000, true),
  ('TELECEL', 'Telecel 25GB', '25GB', 30, 111.00,  92.50, 25000, true),
  ('TELECEL', 'Telecel 30GB', '30GB', 30, 130.00, 108.50, 30000, true),
  ('TELECEL', 'Telecel 35GB', '35GB', 30, 154.00, 128.50, 35000, true),
  ('TELECEL', 'Telecel 40GB', '40GB', 30, 172.00, 143.50, 40000, true)
ON CONFLICT DO NOTHING;
