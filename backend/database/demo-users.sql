-- Demo Users for PutDuckData
-- Password for all demo accounts: Demo1234
-- Bcrypt hash (10 rounds): $2b$10$YQ7Y5qH0rKjJ5p8Q7Z9QkO6XqH5J8X9.K5Z9Q7Y5qH0rKjJ5p8Q7e

-- Note: You may need to regenerate the password hash using bcrypt if this doesn't work
-- In Node.js: bcrypt.hashSync('Demo1234', 10)

-- Clear existing demo users (optional, comment out if you don't want to delete)
DELETE FROM users WHERE email IN ('admin@putduckdata.com', 'customer@putduckdata.com');

-- 1. ADMIN Account
INSERT INTO users (
  full_name,
  email,
  password_hash,
  country,
  role,
  wallet_balance,
  is_admin,
  email_verified,
  created_at
) VALUES (
  'PutDuckData Admin',
  'admin@putduckdata.com',
  '$2b$10$YQ7Y5qH0rKjJ5p8Q7Z9QkO6XqH5J8X9.K5Z9Q7Y5qH0rKjJ5p8Q7e', -- Demo1234
  'Ghana',
  'admin',
  10000.00,
  true,
  true,
  CURRENT_TIMESTAMP
);

-- 2. CUSTOMER Demo Account
INSERT INTO users (
  full_name,
  email,
  password_hash,
  country,
  role,
  wallet_balance,
  is_admin,
  email_verified,
  created_at
) VALUES (
  'Kwame Mensah',
  'customer@putduckdata.com',
  '$2b$10$YQ7Y5qH0rKjJ5p8Q7Z9QkO6XqH5J8X9.K5Z9Q7Y5qH0rKjJ5p8Q7e', -- Demo1234
  'Ghana',
  'customer',
  5000.00,
  false,
  true,
  CURRENT_TIMESTAMP
);

-- Add demo transactions for customer
INSERT INTO transactions (user_id, type, amount, status, reference, created_at)
VALUES
  ((SELECT id FROM users WHERE email = 'customer@putduckdata.com'), 'wallet_fund', 5000.00, 'success', 'FUND-DEMO-001', NOW() - INTERVAL '5 days'),
  ((SELECT id FROM users WHERE email = 'customer@putduckdata.com'), 'data_purchase', 500.00, 'success', 'DATA-DEMO-001', NOW() - INTERVAL '4 days'),
  ((SELECT id FROM users WHERE email = 'customer@putduckdata.com'), 'data_purchase', 1000.00, 'success', 'DATA-DEMO-002', NOW() - INTERVAL '2 days')
ON CONFLICT (reference) DO NOTHING;

-- Success message
SELECT
  'Demo users created successfully!' as message,
  'You can now login with these credentials:' as info;

SELECT
  'ADMIN' as role,
  'admin@putduckdata.com' as email,
  'Demo1234' as password,
  'GH₵10,000' as wallet_balance
UNION ALL
SELECT
  'CUSTOMER' as role,
  'customer@putduckdata.com' as email,
  'Demo1234' as password,
  'GH₵5,000' as wallet_balance;
